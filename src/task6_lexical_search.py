"""
Task 6 — Lexical Search Module (BM25).

Mặc định sử dụng BM25. Nếu dùng phương pháp khác (TF-IDF, Elasticsearch,
Weaviate BM25 built-in), hãy giải thích cơ chế trong buổi demo → +5 bonus.

Cài đặt:
    pip install rank-bm25

BM25 hoạt động thế nào:
    - Term Frequency (TF): từ xuất hiện nhiều trong document → điểm cao
    - Inverse Document Frequency (IDF): từ hiếm → quan trọng hơn
    - Document length normalization: document dài không bị ưu tiên quá mức
    - Formula: score(q,d) = Σ IDF(qi) * (tf(qi,d) * (k1+1)) / (tf(qi,d) + k1*(1-b+b*|d|/avgdl))
    - k1=1.5 (term saturation), b=0.75 (length normalization)

Implementation notes:
    - Tokenizer tiếng Việt: lowercase + strip punctuation + normalize NFC (tránh
      "đột quỵ" (NFC) vs "đột quỵ" (NFD) thành 2 token khác nhau).
    - Corpus được load lazily từ data/standardized/ lần đầu gọi lexical_search().
    - Có thể inject corpus qua set_corpus() để test không cần I/O.
"""

import re
import unicodedata
from pathlib import Path

# ---------------------------------------------------------------------------
# Corpus storage — global state, lazy init
# ---------------------------------------------------------------------------

CORPUS: list[dict] = []  # List of {'content': str, 'metadata': dict}
_BM25 = None  # rank_bm25.BM25Okapi instance (rebuilt khi corpus đổi)


# ---------------------------------------------------------------------------
# Tokenizer (tiếng Việt + Latin, robust)
# ---------------------------------------------------------------------------

# Pattern: giữ chữ cái (Unicode) + số, bỏ mọi punctuation/whitespace
_TOKEN_PATTERN = re.compile(r"[^\W_]+", re.UNICODE)


def _tokenize(text: str) -> list[str]:
    """
    Tokenizer đơn giản nhưng robust cho cả tiếng Việt và tiếng Anh.

    Bước:
        1. Normalize Unicode về NFC (tránh phân mảnh dấu)
        2. Lowercase
        3. Tách bằng regex giữ lại chữ/số
    """
    if not text:
        return []
    text = unicodedata.normalize("NFC", text).lower()
    return _TOKEN_PATTERN.findall(text)


# ---------------------------------------------------------------------------
# Corpus loading
# ---------------------------------------------------------------------------

def _load_corpus_from_disk() -> list[dict]:
    """
    Load toàn bộ .md files từ data/standardized/ (nếu tồn tại).
    """
    standardized_dir = Path(__file__).parent.parent / "data" / "standardized"
    if not standardized_dir.exists():
        return []

    docs: list[dict] = []
    for md_file in standardized_dir.rglob("*.md"):
        try:
            content = md_file.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            content = md_file.read_text(encoding="utf-8", errors="ignore")
        doc_type = "legal" if "legal" in str(md_file.parent).lower() else "news"
        docs.append({
            "content": content,
            "metadata": {"source": md_file.name, "type": doc_type},
        })
    return docs


def set_corpus(corpus: list[dict]) -> None:
    """
    Inject corpus từ bên ngoài (hữu ích cho test).
    Reset BM25 index cho lần search kế tiếp.
    """
    global CORPUS, _BM25
    CORPUS = list(corpus)
    _BM25 = None


def build_bm25_index(corpus: list[dict] | None = None):
    """
    Xây dựng BM25 index từ corpus.

    Args:
        corpus: List of {'content': str, 'metadata': dict}.
                Nếu None, dùng CORPUS global (và load từ disk nếu rỗng).

    Returns:
        BM25Okapi instance, hoặc None nếu corpus rỗng.
    """
    from rank_bm25 import BM25Okapi

    if corpus is not None:
        target = corpus
    elif CORPUS:
        target = CORPUS
    else:
        target = _load_corpus_from_disk()
        if not target:
            # Trả về None thay vì crash — test sẽ skip
            return None

    tokenized_corpus = [_tokenize(doc["content"]) for doc in target]
    bm25 = BM25Okapi(tokenized_corpus)
    return bm25


def _get_bm25():
    """Lấy BM25 index; build lazy nếu chưa có."""
    global _BM25
    if _BM25 is None:
        _BM25 = build_bm25_index()
    return _BM25


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def lexical_search(query: str, top_k: int = 10) -> list[dict]:
    """
    Tìm kiếm từ khóa sử dụng BM25.

    Args:
        query: Câu truy vấn
        top_k: Số lượng kết quả tối đa

    Returns:
        List of {
            'content': str,
            'score': float,      # BM25 score
            'metadata': dict
        }
        Sorted by score descending. Có thể trả về [] nếu corpus rỗng.
    """
    # Đảm bảo corpus đã load
    if not CORPUS:
        loaded = _load_corpus_from_disk()
        if loaded:
            set_corpus(loaded)

    bm25 = _get_bm25()
    if bm25 is None or not CORPUS:
        return []

    tokenized_query = _tokenize(query)
    if not tokenized_query:
        return []

    scores = bm25.get_scores(tokenized_query)

    # Lấy top_k chỉ số có score > 0, sorted desc
    indexed = [(i, float(s)) for i, s in enumerate(scores) if s > 0]
    indexed.sort(key=lambda x: x[1], reverse=True)
    top = indexed[:top_k]

    results: list[dict] = []
    for idx, score in top:
        results.append({
            "content": CORPUS[idx]["content"],
            "score": score,
            "metadata": CORPUS[idx].get("metadata", {}),
        })
    return results


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    results = lexical_search("phương thức thanh toán shopee", top_k=5)
    for r in results:
        print(f"[{r['score']:.3f}] {r['content'][:100]}...")