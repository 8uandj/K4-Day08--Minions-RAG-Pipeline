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

# Pattern: giữ chữ cái (Unicode) + số, bỏ mọi punctuation/whitespace.
#   - \W = non-word (mọi ký tự KHÔNG phải [a-zA-Z0-9_])
#   - [^\W_] = phủ định của \W, loại thêm '_' → chỉ giữ chữ Unicode + số
#   - re.UNICODE: \w/\W hiểu theo Unicode (quan trọng cho tiếng Việt)
_TOKEN_PATTERN = re.compile(r"[^\W_]+", re.UNICODE)


def _tokenize(text: str) -> list[str]:
    """
    Tokenizer đơn giản nhưng robust cho cả tiếng Việt và tiếng Anh.

    Bước:
        1. Normalize Unicode về NFC (tránh phân mảnh dấu — vd: "đột quỵ"
           có thể tồn tại ở 2 form NFC và NFD, normalize về 1 để so sánh
           token chính xác).
        2. Lowercase (Tiếng Việt không có case, nhưng corpus có thể lẫn
           tiếng Anh → case-insensitive match).
        3. Tách bằng regex giữ lại chữ/số.

    Ví dụ:
        "Đà Lạt, 3000m!"   → ["đà", "lạt", "3000m"]
        "return & refund"  → ["return", "refund"]
    """
    if not text:
        return []
    text = unicodedata.normalize("NFC", text).lower()
    return _TOKEN_PATTERN.findall(text)


def _tokenize_join(text: str) -> str:
    """
    Ghép token bằng space — đưa cho TfidfVectorizer analyzer='word'.

    Tại sao cần hàm này:
        TfidfVectorizer mặc định dùng regex `(?u)\\b\\w\\w+\\b` để token.
        Pattern đó KHÔNG match tiếng Việt đúng cách (vd: "đà" chỉ có 2 ký
        tự nhưng vẫn là từ hoàn chỉnh; với pattern mặc định có thể bị bỏ).
        → Pre-tokenize bằng `_tokenize` (đã dùng `[^\\W_]+` đúng chuẩn)
        rồi join lại bằng space, TfidfVectorizer chỉ cần split theo space.

    Cách này đảm bảo tokenizer của query và document LUÔN ĐỒNG NHẤT
    (cùng regex, cùng NFC normalization) — tránh "vocabulary mismatch".
    """
    return " ".join(_tokenize(text))


# ---------------------------------------------------------------------------
# Corpus loading
# ---------------------------------------------------------------------------

def _load_corpus_from_disk() -> list[dict]:
    """
    Load toàn bộ .md files từ data/standardized/ (nếu tồn tại).

    Mỗi file .md trở thành 1 document:
        {
            "content": <toàn bộ text của file .md>,
            "metadata": {
                "source": <tên file, vd: "luat-du-lich.md">,
                "type": "legal" | "news"  # suy ra từ thư mục cha
            }
        }

    Lưu ý:
        - KHÔNG đọc file ở thư mục `landing/` (file gốc PDF/HTML) — chỉ đọc
          file đã convert sang markdown trong `standardized/`. Lý do: file
          markdown đã sạch (không cần parser PDF phức tạp), chạy nhanh.
        - Đệm bằng `errors="ignore"` cho fallback nếu file có byte lỗi
          encoding — vẫn load được phần lớn nội dung.
    """
    standardized_dir = Path(__file__).parent.parent / "data" / "standardized"
    if not standardized_dir.exists():
        return []

    docs: list[dict] = []
    for md_file in standardized_dir.rglob("*.md"):
        try:
            content = md_file.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            # File không phải UTF-8 thuần → đọc lại, bỏ qua byte lỗi
            content = md_file.read_text(encoding="utf-8", errors="ignore")
        # Phân loại document: parent dir chứa "legal" → legal, ngược lại → news
        doc_type = "legal" if "legal" in str(md_file.parent).lower() else "news"
        docs.append({
            "content": content,
            "metadata": {"source": md_file.name, "type": doc_type},
        })
    return docs


def set_corpus(corpus: list[dict]) -> None:
    """
    Inject corpus từ bên ngoài (hữu ích cho test, eval, hoặc thay đổi
    data runtime mà không cần đụng vào file system).

    Sau khi set_corpus, cả 2 global state phải được reset:
        - CORPUS: danh sách document mới.
        - _VECTORIZER, _DOC_VECTORS: ép None để `_get_tfidf` rebuild lazy
          ở lần search kế tiếp (vì vectorizer cũ đã fit trên vocabulary
          của corpus cũ — không dùng được cho corpus mới).

    Args:
        corpus: List of {'content': str, 'metadata': dict}.
    """
    global CORPUS, _VECTORIZER, _DOC_VECTORS
    CORPUS = list(corpus)  # copy để tránh mutation từ bên ngoài
    _VECTORIZER = None
    _DOC_VECTORS = None


def _build_tfidf_index(corpus: list[dict] | None = None):
    """
    Xây dựng TF-IDF index từ corpus.

    Args:
        corpus: List of {'content': str, 'metadata': dict}.
                Nếu None, dùng CORPUS global (và load từ disk nếu rỗng).

    Returns:
        (vectorizer, doc_vectors):
            - vectorizer: TfidfVectorizer đã fit — dùng để transform query.
            - doc_vectors: sparse matrix shape (n_docs, n_features), mỗi
              row là vector TF-IDF của 1 document.
        Trả về (None, None) nếu corpus rỗng (test sẽ skip).

    Tham số TfidfVectorizer (giải thích):
        - analyzer="word" + token_pattern: dùng word-level thay vì char.
        - token_pattern=r"[^\\W_]+": giữ chữ Unicode + số (match `_tokenize`).
        - lowercase=True: chuẩn hóa về lowercase.
        - norm="l2": vector mỗi document được chuẩn hóa về unit length →
          cosine_similarity(u, v) = dot(u, v), không cần tính norm thủ công.
        - sublinear_tf=True: thay tf bằng log(1+tf). 1 từ xuất hiện 10 lần
          trong document không nên có trọng số gấp 10 lần 1 từ xuất hiện 1
          lần — sublinear_tf giảm ảnh hưởng này.
        - min_df=1: giữ cả từ hiếm (chỉ xuất hiện 1 lần). Với corpus nhỏ
          (~16 file), min_df=2+ sẽ làm mất từ quan trọng trong query.
    """
    from sklearn.feature_extraction.text import TfidfVectorizer

    if corpus is not None:
        target = corpus
    elif CORPUS:
        target = CORPUS
    else:
        target = _load_corpus_from_disk()
        if not target:
            # Trả về None thay vì crash — test sẽ skip với skipTest()
            return None, None

    # Pre-tokenize để áp dụng CÙNG logic với tokenizer tiếng Việt
    tokenized_docs = [_tokenize_join(doc["content"]) for doc in target]

    vectorizer = TfidfVectorizer(
        analyzer="word",
        token_pattern=r"[^\W_]+",  # giữ chữ Unicode + số
        lowercase=True,
        norm="l2",                # chuẩn hóa L2 để cosine similarity đúng nghĩa
        sublinear_tf=True,        # áp dụng log(1+tf) — giảm ảnh hưởng term lặp lại nhiều
        min_df=1,                 # giữ cả từ hiếm (corpus nhỏ)
    )
    # fit_transform: HỌC vocabulary từ corpus VÀ build vector mỗi document.
    # Output là sparse matrix (CSR) — tiết kiệm memory vì phần lớn entries = 0.
    doc_vectors = vectorizer.fit_transform(tokenized_docs)
    return vectorizer, doc_vectors


def _get_tfidf():
    """
    Lấy TF-IDF index; build lazy nếu chưa có.

    Tại sao lazy:
        - Build TfidfVectorizer tốn ~vài trăm ms với corpus 16 file.
        - User có thể chỉ muốn set_corpus() để test mà chưa search → đỡ phí.
        - Khi search thật sự, mới build.
    """
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

    Flow xử lý:
        1. Lazy-load corpus từ disk nếu chưa có.
        2. Lazy-build TF-IDF index (vectorizer + doc vectors).
        3. Tokenize query theo CÙNG logic với corpus (đảm bảo vocabulary khớp).
        4. Transform query thành vector (dùng vectorizer đã fit trên corpus).
        5. Cosine similarity query vs tất cả documents → vector điểm 1D.
        6. Filter score > 0, sort desc, lấy top_k.
        7. Trả về list of {content, score, metadata}.

    Args:
        query: Câu truy vấn (tiếng Việt hoặc tiếng Anh đều OK).
        top_k: Số lượng kết quả tối đa. Nếu corpus có ít hơn top_k
               document match → trả về bao nhiêu có.

    Returns:
        List of {
            'content': str,        # nguyên văn document content
            'score': float,        # cosine similarity ∈ [0, 1]
            'metadata': dict       # {source, type}
        }
        Sorted by score descending. Trả về [] nếu:
        - corpus rỗng / không tồn tại
        - query rỗng / không có token nào
        - không document nào có từ trùng với query
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

    # Tokenize query để kiểm tra nhanh query có token hợp lệ không
    tokenized_query = _tokenize(query)
    if not tokenized_query:
        # Query toàn punctuation/whitespace → không match document nào
        return []

    # Vector hóa query bằng CÙNG vectorizer đã fit trên corpus.
    # QUAN TRỌNG: phải dùng vectorizer này (đã học vocabulary + IDF từ corpus),
    # không được fit lại — nếu không query sẽ có vector vocabulary khác document.
    query_vec = vectorizer.transform([_tokenize_join(query)])

    # Cosine similarity: query (1, F) × doc_vectors.T (F, N) → (1, N)
    # .ravel() để thành 1D array, dễ enumerate
    scores = cosine_similarity(query_vec, doc_vectors).ravel()

    # Lấy top_k chỉ số có score > 0, sorted desc.
    # Filter score > 0 trước sort để tránh kết quả "match giả" do vector thưa
    # (vector 0 = cosine 0 = không liên quan).
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
    # Demo: query bằng tiếng Việt, corpus là du lịch VN → thường match tốt
    results = lexical_search("phương thức thanh toán shopee", top_k=5)
    if not results:
        print("Không có kết quả nào match (corpus rỗng hoặc query không khớp).")
    for r in results:
        print(f"[{r['score']:.3f}] {r['metadata'].get('source', '?')}: {r['content'][:100]}...")
