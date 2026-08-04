"""
Task 6 — Lexical Search Module (TF-IDF + Cosine Similarity).

Phương pháp: TF-IDF vectorization + cosine similarity (scikit-learn).

Tại sao đổi từ BM25 sang TF-IDF:
    - BM25 tốt cho document dài/ngắn không đều (length normalization),
      nhưng đòi hỏi tuning k1, b. Với corpus nhỏ và query ngắn (vài từ),
      TF-IDF cosine cho kết quả tương đương và đơn giản hơn.
    - TF-IDF cũng là "lexical/sparse retrieval" — giữ đúng tinh thần Task 6.

Cách hoạt động của TF-IDF:
    - TF (Term Frequency): tần suất 1 từ xuất hiện trong 1 document.
    - IDF (Inverse Document Frequency): log(N / (1 + df)) — từ hiếm → trọng số cao.
    - Cosine similarity: so vector query với vector mỗi document → score ∈ [0, 1].

Cài đặt:
    pip install scikit-learn

Implementation notes:
    - Tokenizer tiếng Việt: lowercase + strip punctuation + normalize NFC.
    - Corpus được load lazily từ data/standardized/ lần đầu gọi lexical_search().
    - Có thể inject corpus qua set_corpus() để test không cần I/O.
    - TfidfVectorizer dùng analyzer='word' + token_pattern để match tokenizer
      tiếng Việt (giữ chữ Unicode + số).
"""

import re
import unicodedata
from pathlib import Path

# ---------------------------------------------------------------------------
# Corpus storage — global state, lazy init
# ---------------------------------------------------------------------------

CORPUS: list[dict] = []  # List of {'content': str, 'metadata': dict}
_VECTORIZER = None  # sklearn TfidfVectorizer (rebuilt khi corpus đổi)
_DOC_VECTORS = None  # CSR matrix: vector TF-IDF của từng document


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


def _tokenize_join(text: str) -> str:
    """Ghép token bằng space — dùng cho TfidfVectorizer analyzer='word'."""
    return " ".join(_tokenize(text))


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
    Reset TF-IDF index cho lần search kế tiếp.
    """
    global CORPUS, _VECTORIZER, _DOC_VECTORS
    CORPUS = list(corpus)
    _VECTORIZER = None
    _DOC_VECTORS = None


def _build_tfidf_index(corpus: list[dict] | None = None):
    """
    Xây dựng TF-IDF index từ corpus.

    Args:
        corpus: List of {'content': str, 'metadata': dict}.
                Nếu None, dùng CORPUS global (và load từ disk nếu rỗng).

    Returns:
        (vectorizer, doc_vectors) — vectorizer là TfidfVectorizer đã fit,
                doc_vectors là sparse matrix (n_docs, n_features).
        Trả về (None, None) nếu corpus rỗng.
    """
    from sklearn.feature_extraction.text import TfidfVectorizer

    if corpus is not None:
        target = corpus
    elif CORPUS:
        target = CORPUS
    else:
        target = _load_corpus_from_disk()
        if not target:
            # Trả về None thay vì crash — test sẽ skip
            return None, None

    # Pre-tokenize để áp dụng cùng logic với tokenizer tiếng Việt
    tokenized_docs = [_tokenize_join(doc["content"]) for doc in target]

    vectorizer = TfidfVectorizer(
        analyzer="word",
        token_pattern=r"[^\W_]+",  # giữ chữ Unicode + số
        lowercase=True,
        norm="l2",                # chuẩn hóa L2 để cosine similarity đúng nghĩa
        sublinear_tf=True,        # áp dụng log(1+tf) — giảm ảnh hưởng term lặp lại nhiều
        min_df=1,                 # giữ cả từ hiếm (corpus nhỏ)
    )
    doc_vectors = vectorizer.fit_transform(tokenized_docs)
    return vectorizer, doc_vectors


def _get_tfidf():
    """Lấy TF-IDF index; build lazy nếu chưa có."""
    global _VECTORIZER, _DOC_VECTORS
    if _VECTORIZER is None or _DOC_VECTORS is None:
        _VECTORIZER, _DOC_VECTORS = _build_tfidf_index()
    return _VECTORIZER, _DOC_VECTORS


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def lexical_search(query: str, top_k: int = 10) -> list[dict]:
    """
    Tìm kiếm từ khóa sử dụng TF-IDF + cosine similarity.

    Args:
        query: Câu truy vấn
        top_k: Số lượng kết quả tối đa

    Returns:
        List of {
            'content': str,
            'score': float,      # cosine similarity ∈ [0, 1]
            'metadata': dict
        }
        Sorted by score descending. Có thể trả về [] nếu corpus rỗng
        hoặc không có document nào match.
    """
    from sklearn.metrics.pairwise import cosine_similarity

    # Đảm bảo corpus đã load
    if not CORPUS:
        loaded = _load_corpus_from_disk()
        if loaded:
            set_corpus(loaded)

    vectorizer, doc_vectors = _get_tfidf()
    if vectorizer is None or doc_vectors is None or not CORPUS:
        return []

    tokenized_query = _tokenize(query)
    if not tokenized_query:
        return []

    # Vector hóa query bằng cùng vectorizer đã fit trên corpus
    query_vec = vectorizer.transform([_tokenize_join(query)])

    # Cosine similarity: query (1, F) × doc_vectors.T (F, N) → (1, N)
    scores = cosine_similarity(query_vec, doc_vectors).ravel()

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
    if not results:
        print("Không có kết quả nào match (corpus rỗng hoặc query không khớp).")
    for r in results:
        print(f"[{r['score']:.3f}] {r['metadata'].get('source', '?')}: {r['content'][:100]}...")
