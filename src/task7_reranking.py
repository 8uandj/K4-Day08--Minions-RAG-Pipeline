"""
Task 7 — Reranking Module.

Chọn 1 trong các phương pháp:
    - Cross-encoder reranker: Jina Reranker v2 (multilingual) hoặc Qwen3-Reranker
    - MMR (Maximal Marginal Relevance): tự implement
    - RRF (Reciprocal Rank Fusion): tự implement — khuyến nghị vì không cần API key

Nếu dùng MMR hoặc RRF, đảm bảo hiểu và giải thích được cơ chế.

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

    Mặc định thử Jina Reranker API (nếu có JINA_API_KEY);
    nếu không có API key hoặc lỗi network, fallback về heuristic
    kết hợp lexical overlap + score gốc.
    """
    api_key = os.getenv("JINA_API_KEY", "")
    if api_key:
        try:
            import requests
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
            reranked = []
            for r in data.get("results", []):
                item = candidates[r["index"]].copy()
                item["score"] = float(r["relevance_score"])
                reranked.append(item)
            return reranked[:top_k]
        except Exception:
            # Fall through to heuristic
            pass

    # Heuristic fallback: 0.7 * lexical overlap + 0.3 * original score
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

    MMR = λ * sim(query, doc) - (1-λ) * max(sim(doc, selected_docs))
    """
    if not candidates:
        return []

    selected: list[int] = []
    remaining = list(range(len(candidates)))

    # Pre-compute query similarities
    rel_scores = []
    for c in candidates:
        if query_embedding and c.get("embedding"):
            rel = _cosine(query_embedding, c["embedding"])
        else:
            # Fallback: dùng score gốc + lexical overlap với query
            rel = 0.5 * float(c.get("score", 0.0)) + 0.5 * _lexical_overlap(
                c.get("metadata", {}).get("query", ""), c.get("content", "")
            )
        rel_scores.append(rel)

    for _ in range(min(top_k, len(candidates))):
        best_idx = None
        best_score = float("-inf")

        for idx in remaining:
            relevance = rel_scores[idx]

            # Max similarity to already-selected
            max_sim_sel = 0.0
            for sel_idx in selected:
                ei = candidates[idx].get("embedding")
                es = candidates[sel_idx].get("embedding")
                if ei and es:
                    sim = _cosine(ei, es)
                    max_sim_sel = max(max_sim_sel, sim)
                else:
                    # Fallback: lexical Jaccard giữa content
                    sim = _lexical_overlap(
                        candidates[idx].get("content", ""),
                        candidates[sel_idx].get("content", ""),
                    )
                    max_sim_sel = max(max_sim_sel, sim)

            mmr = lambda_param * relevance - (1 - lambda_param) * max_sim_sel
            if mmr > best_score:
                best_score = mmr
                best_idx = idx

        if best_idx is None:
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

    RRF(d) = Σ 1 / (k + rank_r(d))

    Args:
        ranked_lists: List of ranked result lists (mỗi list từ 1 ranker).
                      Mỗi item có 'content' để làm key dedup.
        top_k: Số lượng kết quả cuối cùng.
        k: Smoothing constant (default=60, từ paper Cormack et al. 2009).

    Returns:
        List of top_k candidates sorted by RRF score descending.
    """
    rrf_scores: dict[str, float] = {}
    content_map: dict[str, dict] = {}

    for ranked_list in ranked_lists:
        for rank, item in enumerate(ranked_list, start=1):
            key = item.get("content", "")
            if not key:
                continue
            rrf_scores[key] = rrf_scores.get(key, 0.0) + 1.0 / (k + rank)
            if key not in content_map:
                content_map[key] = item
            else:
                # Gộp metadata nếu có nhiều ranker cùng match
                found_in = content_map[key].get("found_in", [])
                source = item.get("source") or item.get("metadata", {}).get("source", "unknown")
                if source not in found_in:
                    found_in.append(source)
                    content_map[key]["found_in"] = found_in

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
        - Ranker A: theo 'score' gốc (giả định dense)
        - Ranker B: theo lexical overlap giữa query và content
    """
    ranker_a = sorted(candidates, key=lambda x: x.get("score", 0.0), reverse=True)
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
    Unified reranking interface.

    Args:
        query: Câu truy vấn.
        candidates: Danh sách candidates từ retrieval.
        top_k: Số lượng kết quả sau rerank.
        method: "rrf" | "cross_encoder" | "mmr".

    Returns:
        List of top_k reranked candidates.
    """
    if not candidates:
        return []

    method = method.lower()

    if method == "cross_encoder":
        return rerank_cross_encoder(query, candidates, top_k=top_k)

    if method == "mmr":
        # Không có query_embedding ở đây → dùng score gốc làm proxy
        return rerank_mmr(None, candidates, top_k=top_k)

    if method == "rrf":
        ranked_lists = _build_two_rankers(query, candidates)
        return rerank_rrf(ranked_lists, top_k=top_k)

    raise ValueError(f"Unknown rerank method: {method}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    dummy_candidates = [
        {"content": "Chính sách trả hàng và hoàn tiền Shopee trong 15 ngày", "score": 0.8, "metadata": {}},
        {"content": "Các phương thức thanh toán hỗ trợ trên Shopee Vietnam", "score": 0.6, "metadata": {}},
        {"content": "Quy định đăng bán sản phẩm dành cho người bán", "score": 0.5, "metadata": {}},
    ]
    results = rerank("chính sách trả hàng shopee", dummy_candidates, top_k=2)
    for r in results:
        print(f"[{r['score']:.3f}] {r['content']}")
