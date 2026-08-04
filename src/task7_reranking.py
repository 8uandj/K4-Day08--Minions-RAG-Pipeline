"""
Task 7 — Reranking Module.

Chọn 1 trong các phương pháp:
    - Cross-encoder reranker: Jina Reranker v2 (multilingual) hoặc Qwen3-Reranker
    - MMR (Maximal Marginal Relevance): tự implement
    - RRF (Reciprocal Rank Fusion): tự implement — khuyến nghị vì không cần API key

Nếu dùng MMR hoặc RRF, đảm bảo hiểu và giải thích được cơ chế.

Tại sao chọn RRF làm mặc định:
    - Pipeline có ít nhất hai ranker khác thang điểm: dense cosine từ Chroma và
      sparse TF-IDF cosine. So sánh trực tiếp hai score này dễ lệch vì mỗi
      retriever có phân phối điểm riêng.
    - RRF chỉ dùng thứ hạng, nên gộp kết quả ổn định mà không cần calibrate
      weight thủ công. Chunk xuất hiện cao ở cả dense và sparse sẽ được đẩy lên.
    - RRF không cần API key/model reranker, chạy local nhanh và phù hợp demo lab.

Khi nào không dùng RRF:
    - Nếu có cross-encoder multilingual đủ mạnh và chi phí chấp nhận được, dùng
      nó sau bước retrieve để đánh giá trực tiếp query-document pair.
    - Nếu muốn đa dạng hóa context, MMR hữu ích hơn vì phạt các chunk quá giống
      nhau, tránh đưa nhiều đoạn lặp vào LLM.

Lưu ý quan trọng về RRF (sẽ dùng lại ở Task 9): điểm RRF fused CHỈ phụ thuộc thứ hạng,
không phải độ tương đồng thật. Top-1 sau khi fuse luôn xấp xỉ 1/(k+1) ≈ 0.0164 (k=60),
bất kể nội dung đó có thật sự liên quan đến câu hỏi hay không. Đừng dùng điểm RRF để
quyết định fallback ở Task 9 — xem ghi chú ở đó.

Implementation notes:
    - `rerank()` (main interface) được gọi từ Task 9 với nhiều ranked lists.
      Trong trường hợp test (Task 7 test suite) gọi `rerank(query, candidates, top_k)`
      với 1 list candidates duy nhất, ta internally sinh 2 ranked lists:
          (a) theo score gốc (giả định đã là dense score)
          (b) theo lexical overlap giữa query và content
      rồi fuse bằng RRF để rerank đa-tiêu-chí.
    - MMR dùng embedding cosine — fallback về lexical overlap nếu thiếu.
    - Cross-encoder dùng Jina API nếu có key, fallback heuristic.
"""

import os
import re
import unicodedata
from typing import Optional


# ---------------------------------------------------------------------------
# Tokenizer (chia sẻ với Task 6 cho đồng bộ)
# ---------------------------------------------------------------------------

_TOKEN_PATTERN = re.compile(r"[^\W_]+", re.UNICODE)


def _tokenize(text: str) -> list[str]:
    if not text:
        return []
    text = unicodedata.normalize("NFC", text).lower()
    return _TOKEN_PATTERN.findall(text)


def _lexical_overlap(query: str, content: str) -> float:
    """Đếm tỉ lệ token query xuất hiện trong content (Jaccard-like)."""
    q = set(_tokenize(query))
    c = set(_tokenize(content))
    if not q:
        return 0.0
    return len(q & c) / len(q)


# ---------------------------------------------------------------------------
# Cosine similarity (cho MMR nếu có embedding)
# ---------------------------------------------------------------------------

def _cosine(a: list[float], b: list[float]) -> float:
    """Cosine similarity giữa 2 vectors. Trả về 0 nếu norm = 0."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(x * x for x in b) ** 0.5
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


# ---------------------------------------------------------------------------
# Cross-encoder rerank
# ---------------------------------------------------------------------------

def rerank_cross_encoder(
    query: str, candidates: list[dict], top_k: int = 5
) -> list[dict]:
    """
    Rerank candidates sử dụng cross-encoder model.

    Cross-encoder khác bi-encoder ở chỗ: nó đọc (query, document) CÙNG LÚC
    qua 1 lần forward pass, nên hiểu ngữ nghĩa sâu hơn nhưng chậm hơn
    (chỉ dùng để rerank top-K đã retrieve, không dùng để index cả corpus).

    Flow:
        1. Đọc JINA_API_KEY từ env. Nếu có → gọi Jina Reranker v2 API.
        2. Nếu API lỗi (network, quota, key sai) → fallback heuristic bên dưới.
        3. Nếu không có key → chạy thẳng heuristic.
    """
    # Lấy API key từ biến môi trường; rỗng = không dùng API, đi thẳng fallback
    api_key = os.getenv("JINA_API_KEY", "")
    if api_key:
        try:
            import requests
            # Jina Reranker v2 base-multilingual hỗ trợ cả tiếng Việt.
            # Gửi toàn bộ candidates; server trả về index đã sort theo relevance.
            response = requests.post(
                "https://api.jina.ai/v1/rerank",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "jina-reranker-v2-base-multilingual",
                    "query": query,
                    "documents": [c["content"] for c in candidates],
                    "top_n": top_k,
                },
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()
            # Map lại index từ Jina → candidate gốc để giữ metadata
            reranked = []
            for r in data.get("results", []):
                item = candidates[r["index"]].copy()
                item["score"] = float(r["relevance_score"])
                reranked.append(item)
            return reranked[:top_k]
        except Exception:
            # Bất kỳ lỗi nào (timeout, 4xx, 5xx, parse JSON) → rơi xuống heuristic
            pass

    # Heuristic fallback: kết hợp 2 tín hiệu.
    #   - lexical overlap (0.7): tỉ lệ token query xuất hiện trong document.
    #     Phạt nặng nếu thiếu từ khóa quan trọng.
    #   - score gốc (0.3): tin tưởng một phần vào retrieval phía trước
    #     (TF-IDF / dense) đã chọn candidate tốt.
    # Trọng số 0.7/0.3 ưu tiên "match từ khóa" hơn "score retrieval",
    # vì mục đích của rerank là sửa lỗi retrieval sai thứ hạng.
    scored = []
    for c in candidates:
        overlap = _lexical_overlap(query, c.get("content", ""))
        original = float(c.get("score", 0.0))
        combined = 0.7 * overlap + 0.3 * original
        new_item = c.copy()
        new_item["score"] = round(combined, 6)
        scored.append(new_item)
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]


# ---------------------------------------------------------------------------
# MMR
# ---------------------------------------------------------------------------

def rerank_mmr(
    query_embedding: list[float],
    candidates: list[dict],
    top_k: int = 5,
    lambda_param: float = 0.7,
) -> list[dict]:
    """
    Maximal Marginal Relevance — chọn candidates vừa relevant vừa diverse.

    Công thức (Carbonell & Goldstein, 1998):
        MMR(d) = λ * sim(query, d) - (1 - λ) * max(sim(d, d')) cho mọi d' đã chọn

    Trong đó:
        - λ ∈ [0, 1]: trọng số relevance vs diversity. λ=1 chỉ chọn theo
          relevance (giống top-K thường), λ=0 chỉ chọn diverse.
          Default 0.7 = ưu tiên relevance nhưng vẫn phạt document trùng.
        - sim(query, d): độ liên quan với query.
        - max(sim(d, d')): độ GIỐNG với các document ĐÃ CHỌN → phạt redundant.

    Kết quả: top-K không có 3–4 document gần như giống nhau.
    Hữu ích khi retrieval trả về nhiều bản sao / duplicate content.
    """
    if not candidates:
        return []

    # selected: index các candidate đã được chọn (theo thứ tự)
    # remaining: index các candidate còn lại để xét
    selected: list[int] = []
    remaining = list(range(len(candidates)))

    # Tính trước relevance của mỗi candidate với query (không đổi trong loop)
    rel_scores = []
    for c in candidates:
        if query_embedding and c.get("embedding"):
            # Có embedding → cosine similarity thật
            rel = _cosine(query_embedding, c["embedding"])
        else:
            # Không có embedding → proxy bằng score gốc + lexical overlap
            # (lưu ý: chỉ work nếu metadata.query khớp query hiện tại,
            #  nên thường chỉ là approximation)
            rel = 0.5 * float(c.get("score", 0.0)) + 0.5 * _lexical_overlap(
                c.get("metadata", {}).get("query", ""), c.get("content", "")
            )
        rel_scores.append(rel)

    # Greedy selection: chọn top_k document từng bước một.
    # Mỗi bước: candidate còn lại nào có MMR score cao nhất → chọn.
    for _ in range(min(top_k, len(candidates))):
        best_idx = None
        best_score = float("-inf")

        for idx in remaining:
            relevance = rel_scores[idx]

            # Tính max similarity giữa candidate idx và TẤT CẢ
            # candidate đã chọn (diversity penalty).
            max_sim_sel = 0.0
            for sel_idx in selected:
                ei = candidates[idx].get("embedding")
                es = candidates[sel_idx].get("embedding")
                if ei and es:
                    # Có embedding → cosine
                    sim = _cosine(ei, es)
                    max_sim_sel = max(max_sim_sel, sim)
                else:
                    # Fallback: lexical Jaccard giữa content của 2 document
                    sim = _lexical_overlap(
                        candidates[idx].get("content", ""),
                        candidates[sel_idx].get("content", ""),
                    )
                    max_sim_sel = max(max_sim_sel, sim)

            # MMR formula: relevance trừ diversity penalty
            mmr = lambda_param * relevance - (1 - lambda_param) * max_sim_sel
            if mmr > best_score:
                best_score = mmr
                best_idx = idx

        if best_idx is None:
            # Defensive: không nên xảy ra nhưng để safe
            break
        selected.append(best_idx)
        remaining.remove(best_idx)

    return [
        {**candidates[i], "score": float(rel_scores[i])}
        for i in selected
    ]


# ---------------------------------------------------------------------------
# RRF
# ---------------------------------------------------------------------------

def rerank_rrf(
    ranked_lists: list[list[dict]], top_k: int = 5, k: int = 60
) -> list[dict]:
    """
    Reciprocal Rank Fusion — gộp kết quả từ nhiều ranker.

    Công thức (Cormack et al., 2009):
        RRF(d) = Σ_{r ∈ rankers} 1 / (k + rank_r(d))

    Trong đó:
        - rank_r(d): thứ hạng của document d trong ranker r (bắt đầu từ 1).
        - k: hằng số "smoothing" — cộng vào mẫu số để giảm ảnh hưởng của
          top-1 (vì 1/(k+1) << 1/k). Paper gốc dùng k=60, cho kết quả tốt
          trên nhiều dataset → giữ mặc định.

    Tại sao RRF mạnh:
        - KHÔNG cần normalize score giữa các ranker (BM25, cosine, dense
          đều khác đơn vị nhau). RRF chỉ cần THỨ HẠNG → plug-and-play.
        - Document xuất hiện trong nhiều ranker → cộng dồn điểm → được đẩy lên.
        - Document "chỉ 1 ranker tìm thấy" vẫn có cơ hội nếu ở top.

    LƯU Ý QUAN TRỌNG (xem cảnh báo ở đầu file):
        RRF score CHỈ phụ thuộc thứ hạng, KHÔNG phản ánh độ tương đồng thật.
        Vì vậy top-1 RRF luôn ≈ 1/(k+1) ≈ 0.0164 (k=60) bất kể content.
        → Không dùng ngưỡng trên RRF score để quyết định fallback ở Task 9.

    Args:
        ranked_lists: List of ranked result lists (mỗi list từ 1 ranker).
                      Mỗi item có 'content' để làm key dedup.
        top_k: Số lượng kết quả cuối cùng.
        k: Smoothing constant (default=60).

    Returns:
        List of top_k candidates sorted by RRF score descending.
    """
    # rrf_scores: map content → điểm RRF cộng dồn
    # content_map: map content → candidate gốc (giữ metadata)
    rrf_scores: dict[str, float] = {}
    content_map: dict[str, dict] = {}

    # Duyệt từng ranker, cộng dồn 1/(k+rank) cho mỗi document
    for ranked_list in ranked_lists:
        for rank, item in enumerate(ranked_list, start=1):
            # Dùng content làm key dedup (giả định content là unique)
            key = item.get("content", "")
            if not key:
                continue
            rrf_scores[key] = rrf_scores.get(key, 0.0) + 1.0 / (k + rank)
            if key not in content_map:
                # Ranker đầu tiên nhìn thấy document này → giữ làm bản gốc
                content_map[key] = item
            else:
                # Đã thấy ở ranker trước → ghi nhận thêm "found_in"
                # để debug/audit biết document match ở những ranker nào.
                found_in = content_map[key].get("found_in", [])
                source = item.get("source") or item.get("metadata", {}).get("source", "unknown")
                if source not in found_in:
                    found_in.append(source)
                    content_map[key]["found_in"] = found_in

    # Sort theo RRF score desc, lấy top_k
    sorted_items = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    results = []
    for content, score in sorted_items[:top_k]:
        item = content_map[content].copy()
        item["score"] = round(score, 6)
        results.append(item)
    return results


# ---------------------------------------------------------------------------
# Helpers: tạo 2 ranked lists từ 1 candidates list (cho test/compatibility)
# ---------------------------------------------------------------------------

def _build_two_rankers(query: str, candidates: list[dict]) -> list[list[dict]]:
    """
    Từ 1 list candidates duy nhất, sinh 2 ranked lists để fuse bằng RRF:

        Ranker A — theo 'score' gốc của candidate (giả định là điểm dense
                   từ semantic search, hoặc TF-IDF cosine từ lexical search).
                   Ưu tiên: candidate mà retrieval pipeline đã "thấy giống".

        Ranker B — theo lexical overlap giữa query và content.
                   Ưu tiên: candidate chứa nhiều từ khóa của query.
                   Phạt các candidate retrieval xếp cao nhưng thực ra không
                   chứa từ khóa (vd: paraphrase, semantic gần nhưng lệch chủ đề).

    Lý do cần 2 ranker (thay vì dùng mỗi score gốc):
        - Score gốc từ retrieval thường chỉ dựa trên 1 tín hiệu (TF-IDF hoặc
          embedding). Khi query ngắn, retrieval có thể xếp sai.
        - Lexical overlap là tín hiệu BỔ SUNG, bắt được những candidate có
          từ khóa rõ ràng mà dense score có thể đánh giá thấp.
        - RRF sẽ "bỏ phiếu" giữa 2 ranker: candidate nào CẢ HAI đều xếp cao
          → thắng; candidate chỉ 1 ranker xếp cao → bị đẩy xuống.

    Tại sao gộp 2 list thay vì tính 1 điểm tổng:
        - Tránh phải chọn trọng số 0.7/0.3 (như cross-encoder fallback).
        - RRF dùng rank, không cần normalize → robust hơn.
    """
    # Ranker A: sắp xếp theo score gốc desc.
    # Lưu ý: KHÔNG chỉnh sửa list gốc — sorted() trả về list mới.
    ranker_a = sorted(candidates, key=lambda x: x.get("score", 0.0), reverse=True)
    # Ranker B: sắp xếp theo lexical overlap desc.
    # _lexical_overlap trả về [0, 1] → cùng thang với cosine → khi RRF gộp
    # vẫn cho kết quả hợp lý (rank mới là quan trọng, không phải giá trị).
    ranker_b = sorted(
        candidates,
        key=lambda x: _lexical_overlap(query, x.get("content", "")),
        reverse=True,
    )
    return [ranker_a, ranker_b]


# ---------------------------------------------------------------------------
# Main rerank interface
# ---------------------------------------------------------------------------

def rerank(
    query: str,
    candidates: list[dict],
    top_k: int = 5,
    method: str = "rrf",
) -> list[dict]:
    """
    Unified reranking interface — entry point duy nhất cho cả Task 7 test
    và Task 9 retrieval pipeline.

    Args:
        query: Câu truy vấn.
        candidates: Danh sách candidates từ retrieval (mỗi item có
                    'content' và 'score'; 'metadata' optional).
        top_k: Số lượng kết quả sau rerank.
        method: "rrf" | "cross_encoder" | "mmr".
                - "rrf" (mặc định): không cần API key, không cần embedding,
                  chạy được mọi lúc. Phù hợp demo + test.
                - "cross_encoder": chất lượng cao nhất nhưng cần JINA_API_KEY
                  (hoặc rơi về heuristic). Tốn latency.
                - "mmr": cần query_embedding để dùng cosine thật; nếu
                  thiếu embedding thì rơi về score gốc + lexical overlap
                  (chất lượng kém hơn RRF trong trường hợp này).

    Returns:
        List of top_k reranked candidates (mỗi item có 'score' mới).
    """
    if not candidates:
        return []

    # Normalize để user gõ "RRF" hay "Rrf" đều work
    method = method.lower()

    if method == "cross_encoder":
        return rerank_cross_encoder(query, candidates, top_k=top_k)

    if method == "mmr":
        # Không truyền query_embedding → MMR dùng fallback score gốc.
        # Đây là approximation, không phải MMR "đúng nghĩa" (cần cosine thật).
        return rerank_mmr(None, candidates, top_k=top_k)

    if method == "rrf":
        # Sinh 2 ranked lists (score gốc + lexical overlap) rồi fuse.
        # Đây là đường mặc định — không cần API key, deterministic, test ổn định.
        ranked_lists = _build_two_rankers(query, candidates)
        return rerank_rrf(ranked_lists, top_k=top_k)

    raise ValueError(f"Unknown rerank method: {method}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    dummy_candidates = [
        {"content": "Lịch trình Hà Giang Loop bằng xe máy trong bốn ngày", "score": 0.8, "metadata": {}},
        {"content": "Hướng dẫn e-visa Việt Nam cho du khách quốc tế", "score": 0.6, "metadata": {}},
        {"content": "Các món ăn địa phương nên thử khi đến Đà Nẵng", "score": 0.5, "metadata": {}},
    ]
    results = rerank("lịch trình Hà Giang bằng xe máy", dummy_candidates, top_k=2)
    for r in results:
        print(f"[{r['score']:.3f}] {r['content']}")
