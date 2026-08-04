"""
Task 9 — Retrieval Pipeline Hoàn Chỉnh.

Kết hợp semantic search + lexical search + reranking + PageIndex fallback
thành một pipeline thống nhất.

Tại sao chọn hybrid retrieval:
    - Semantic search tìm theo ý nghĩa, tốt cho câu hỏi tự nhiên và paraphrase.
    - Lexical search giữ exact match, tốt cho tên địa danh, tên món, số văn bản,
      "e-visa", "Mã Pí Lèng", "Vinasun", hoặc các từ khóa hiếm.
    - Hybrid giúp giảm rủi ro mỗi retriever: dense có thể mơ hồ, sparse có thể
      quá cứng theo từ khóa. Kết hợp cả hai cho recall tốt hơn.

Tại sao dùng RRF để merge:
    - Dense và sparse có score khác bản chất, nên weighted sum cần calibrate
      khó và dễ lệch theo corpus.
    - RRF dùng rank thay vì score, vì vậy ổn định hơn khi gộp nhiều retriever.
      Chunk được cả dense và sparse xếp cao sẽ nổi lên tự nhiên.

Tại sao fallback dùng semantic cosine gốc:
    - RRF score chỉ là điểm fuse theo thứ hạng, không đo độ liên quan tuyệt đối.
      Fallback cần biết "câu hỏi này có khớp corpus không", nên phải nhìn vào
      dense cosine gốc trước khi merge/rerank.

Logic:
    1. Chạy semantic_search + lexical_search song song
    2. Merge kết quả (RRF hoặc weighted fusion)
    3. Rerank
    4. Nếu top result score < threshold → fallback sang PageIndex
    5. Return top_k results

⚠️ BẪY THƯỜNG GẶP — đọc kỹ trước khi code:
    Nếu bạn dùng điểm RRF đã fuse (Task 7) để so với score_threshold, bạn sẽ gặp bug
    thật: RRF max score luôn ≈ 1/(k+1) ≈ 0.0164 (k=60) BẤT KỂ nội dung có liên quan
    hay không. Nếu đặt threshold thấp (như 0.005) để "hợp" với thang điểm RRF, thực
    chất KHÔNG câu hỏi nào đủ thấp để trigger fallback nữa — kể cả query hoàn toàn vô
    nghĩa vẫn trả về kết quả "hybrid" (rác) thay vì fallback đúng như thiết kế.

    Cách sửa đúng: giữ điểm cosine similarity GỐC của semantic_search (trước khi qua
    RRF) làm căn cứ quyết định fallback, tách biệt khỏi điểm RRF dùng để sắp xếp kết
    quả cuối cùng. Calibrate threshold bằng cách tự đo: chạy vài câu hỏi chắc chắn
    liên quan và vài câu chắc chắn lạc đề/rác qua semantic_search, xem khoảng cách
    điểm số giữa hai nhóm rồi chọn ngưỡng nằm giữa.
"""

from .task5_semantic_search import semantic_search
from .task6_lexical_search import lexical_search
from .task7_reranking import rerank, rerank_rrf
from .task8_pageindex_vectorless import pageindex_search


# =============================================================================
# CONFIGURATION
# =============================================================================

# TODO: Calibrate threshold này bằng cách tự đo điểm cosine của semantic_search
# cho câu hỏi liên quan vs câu hỏi lạc đề (xem ghi chú ở trên) — ĐỪNG copy nguyên
# giá trị mẫu, mỗi corpus/embedding model sẽ cho khoảng điểm khác nhau.
SCORE_THRESHOLD = 0.3   # Nếu best score (cosine gốc) < threshold → fallback PageIndex
DEFAULT_TOP_K = 5
RERANK_METHOD = "rrf"  # "cross_encoder" | "mmr" | "rrf"


def _tag_results(results: list[dict], source: str) -> list[dict]:
    """Return shallow-copied results with a pipeline source marker."""

    tagged: list[dict] = []
    for item in results:
        copied = item.copy()
        copied["metadata"] = dict(copied.get("metadata") or {})
        copied["source"] = source
        tagged.append(copied)
    return tagged


def _deduplicate(results: list[dict]) -> list[dict]:
    """Remove duplicate chunks while keeping the highest-score candidate."""

    deduped: dict[str, dict] = {}
    for item in results:
        key = item.get("content", "").strip()
        if not key:
            continue
        previous = deduped.get(key)
        if previous is None or float(item.get("score", 0.0)) > float(
            previous.get("score", 0.0)
        ):
            deduped[key] = item
    return sorted(
        deduped.values(), key=lambda item: float(item.get("score", 0.0)), reverse=True
    )


def retrieve(
    query: str,
    top_k: int = DEFAULT_TOP_K,
    score_threshold: float = SCORE_THRESHOLD,
    use_reranking: bool = True,
) -> list[dict]:
    """
    Retrieval pipeline hoàn chỉnh với fallback logic.

    Pipeline:
        Query
          ├→ Semantic Search → dense_results (giữ điểm cosine gốc)
          ├→ Lexical Search  → sparse_results
          │
          ├→ Merge (RRF) → merged_results
          ├→ Rerank → reranked_results
          │
          └→ If dense_results[0]["score"] < threshold:
                └→ PageIndex Vectorless → fallback_results

    Args:
        query: Câu truy vấn
        top_k: Số lượng kết quả cuối cùng
        score_threshold: Ngưỡng điểm cosine gốc tối thiểu (KHÔNG phải điểm RRF)
        use_reranking: Có áp dụng reranking hay không

    Returns:
        List of {
            'content': str,
            'score': float,
            'metadata': dict,
            'source': str  # 'hybrid' hoặc 'pageindex'
        }
    """
    query = query.strip()
    if not query or top_k <= 0:
        return []

    retrieval_k = max(top_k * 3, top_k)

    try:
        dense_results = semantic_search(query, top_k=retrieval_k)
    except Exception as exc:
        print(f"  ⚠ Semantic search failed: {exc}")
        dense_results = []

    try:
        sparse_results = lexical_search(query, top_k=retrieval_k)
    except Exception as exc:
        print(f"  ⚠ Lexical search failed: {exc}")
        sparse_results = []

    dense_tagged = _tag_results(dense_results, "hybrid")
    sparse_tagged = _tag_results(sparse_results, "hybrid")
    best_semantic_score = (
        max(float(item.get("score", 0.0)) for item in dense_results)
        if dense_results
        else 0.0
    )

    if dense_tagged and sparse_tagged:
        merged = rerank_rrf([dense_tagged, sparse_tagged], top_k=retrieval_k)
    else:
        merged = _deduplicate(dense_tagged + sparse_tagged)[:retrieval_k]

    for item in merged:
        item["source"] = "hybrid"

    if use_reranking and merged:
        final_results = rerank(query, merged, top_k=top_k, method=RERANK_METHOD)
    else:
        final_results = merged[:top_k]

    for item in final_results:
        item["source"] = "hybrid"

    # Nếu dense search chạy và có điểm thấp, fallback theo thiết kế. Nếu dense
    # không khả dụng trong môi trường local nhưng lexical vẫn có kết quả, giữ
    # hybrid để pipeline không bị phụ thuộc cứng vào vector dependency.
    should_fallback = not final_results or (
        bool(dense_results) and best_semantic_score < score_threshold
    )
    if should_fallback:
        print(
            "  ⚠ Semantic best score "
            f"({best_semantic_score:.3f}) < threshold ({score_threshold})"
        )
        fallback = pageindex_search(query, top_k=top_k)
        if fallback:
            return fallback[:top_k]

    return final_results[:top_k]


if __name__ == "__main__":
    test_queries = [
        "Lịch trình Hà Giang 3 ngày 2 đêm nên đi thế nào?",
        "Du khách cần lưu ý gì khi xin e-visa Việt Nam?",
        "Ở Đà Nẵng nên ăn món gì và tham quan đâu?",
        "xyzabc123nonsense",  # Query không có kết quả → test fallback
    ]

    for q in test_queries:
        print(f"\nQuery: {q}")
        print("-" * 60)
        results = retrieve(q, top_k=3)
        for i, r in enumerate(results, 1):
            print(f"  {i}. [{r['score']:.3f}] [{r['source']}] {r['content'][:80]}...")
