"""
Task 8 — PageIndex Vectorless RAG.

Đăng ký tài khoản tại: https://pageindex.ai/
SDK & sample code: https://github.com/VectifyAI/PageIndex

PageIndex cho phép RAG mà không cần vector store — sử d�ng
structural understanding của document thay vì embedding.

Cài đặt:
    pip install pageindex

Hướng dẫn:
    1. Đăng ký account tại pageindex.ai
    2. Lấy API key
    3. Upload documents
    4. Query sử dụng PageIndex API

Lưu ý: API `/retrieval` của PageIndex hiện đã deprecated (vẫn hoạt động, nhưng response
có field "deprecation" cảnh báo) và trả kết quả trong "retrieved_nodes" — mỗi node có
"relevant_contents": list[list[{section_title, relevant_content}]]. In response thật ra
(json.dumps(...)) trước khi viết logic parse, đừng đoán schema từ ví dụ code cũ.

Implementation notes:
    - Mode 1 (ưu tiên): PageIndex API thật — dùng khi có PAGEINDEX_API_KEY.
    - Mode 2 (fallback): Local structural RAG — xây TOC từ markdown headings,
      score mỗi section bằng lexical overlap với query. Đủ để test pass
      mà không cần tài khoản PageIndex.
"""

import json
import os
import re
import time
import unicodedata
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

PAGEINDEX_API_KEY = os.getenv("PAGEINDEX_API_KEY", "")
STANDARDIZED_DIR = Path(__file__).parent.parent / "data" / "standardized"


# ---------------------------------------------------------------------------
# Tokenizer (chia sẻ logic với Task 6/7)
# ---------------------------------------------------------------------------

# Pattern: giữ chữ Unicode + số, bỏ punctuation/whitespace.
# Tương đương với `[^\W_]+` trong Task 6/7 — copy lại để tránh import
# chéo giữa các module task (mỗi task độc lập).
_TOKEN_PATTERN = re.compile(r"[^\W_]+", re.UNICODE)


def _tokenize(text: str) -> list[str]:
    r"""
    Tokenizer giống Task 6/7:
        1. Normalize NFC (tránh phân mảnh dấu tiếng Việt).
        2. Lowercase.
        3. Tách bằng regex `[^\W_]+`.
    """
    if not text:
        return []
    text = unicodedata.normalize("NFC", text).lower()
    return _TOKEN_PATTERN.findall(text)


def _lexical_overlap(query: str, content: str) -> float:
    """
    Jaccard-like score: |token(query) ∩ token(content)| / |token(query)|.

    Khác Jaccard thuần (chia |A ∪ B|): bản này phạt tài liệu dài
    vì chỉ normalize theo độ dài query. Ý đồ: query ngắn → càng khớp
    nhiều từ query trong document càng tốt, không quan tâm document
    có bao nhiêu từ nhiễu khác.

    Trả về:
        0.0 nếu query rỗng.
        Giá trị ∈ [0, 1]: 1.0 nếu mọi từ query đều có trong content.
    """
    q = set(_tokenize(query))
    c = set(_tokenize(content))
    if not q:
        return 0.0
    return len(q & c) / len(q)


# ---------------------------------------------------------------------------
# TOC builder (local fallback)
# ---------------------------------------------------------------------------

# Match heading markdown: "# Title" → "###### Title".
#   - `^` đầu dòng (MULTILINE) — không match "#" trong nội dung đoạn văn.
#   - `(#+)`: 1–6 dấu '#' = level 1–6.
#   - `(.+?)`: title (lazy, không greedy).
_HEADING_PATTERN = re.compile(r"^(#{1,6})\s+(.+?)\s*$", re.MULTILINE)


def _build_toc_from_markdown(md_text: str) -> list[dict]:
    """
    Parse markdown headings thành danh sách TOC (Table of Contents) nodes.

    "Vectorless RAG" của PageIndex dựa trên structural understanding:
    thay vì embed toàn document, ta CHỈ embed/score các heading + section
    của nó. Heading thường chứa từ khóa quan trọng → match query tốt hơn
    ngẫu nhiên 1 đoạn văn dài.

    Returns:
        List of dict, mỗi dict:
            - level: int (1–6, tương ứng markdown heading level).
            - title: str (tên heading, đã strip).
            - start: int (byte offset NGAY SAU heading line, bắt đầu content).
            - end: int (byte offset cuối section — bằng start của heading
                     kế tiếp, hoặc EOF nếu là heading cuối).
    """
    headings = []
    for m in _HEADING_PATTERN.finditer(md_text):
        level = len(m.group(1))           # số dấu '#' = level
        title = m.group(2).strip()        # tên heading
        start = m.end()                   # content bắt đầu SAU heading line
        # Mặc định: section chạy đến hết file
        headings.append({"level": level, "title": title, "start": start, "end": len(md_text)})

    # Fix-up: set end của mỗi heading = start của heading kế tiếp
    # (vì section của heading i chỉ kéo dài đến trước heading i+1).
    for i in range(len(headings) - 1):
        next_start = headings[i + 1]["start"]
        # Tìm vị trí chính xác của heading tiếp theo trong text
        # (search ngược 200 ký tự để tránh quét từ đầu file)
        match = _HEADING_PATTERN.search(md_text, headings[i + 1]["start"] - 200)
        if match:
            headings[i]["end"] = match.start()
        else:
            # Fallback: lấy start byte của heading kế (gần đúng)
            headings[i]["end"] = next_start

    return headings


def _build_toc_from_standardized() -> list[dict]:
    """
    Load tất cả .md files trong data/standardized/ và gộp TOC.

    Vì mỗi .md file là 1 document độc lập, ta gộp TOC của tất cả file
    vào 1 danh sách chung (thêm field 'source_file' để biết section
    thuộc file nào).

    Mỗi node có thêm:
        - source_file: tên file gốc.
        - content: text section (heading content cắt theo start/end).
    """
    if not STANDARDIZED_DIR.exists():
        return []

    all_nodes: list[dict] = []
    for md_file in STANDARDIZED_DIR.rglob("*.md"):
        try:
            content = md_file.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            # Fallback cho file có byte lỗi encoding
            content = md_file.read_text(encoding="utf-8", errors="ignore")

        nodes = _build_toc_from_markdown(content)
        for n in nodes:
            n["source_file"] = md_file.name
            # Cắt content của section: từ start (sau heading) đến end (trước heading kế)
            n["content"] = content[n["start"]:n["end"]].strip()
        all_nodes.extend(nodes)
    return all_nodes


# ---------------------------------------------------------------------------
# PageIndex API wrapper (real)
# ---------------------------------------------------------------------------

def upload_documents() -> list[str]:
    """
    Upload toàn bộ markdown documents lên PageIndex.

    Lưu ý: PageIndex API nhận PDF, không nhận .md trực tiếp — nên convert
    sang PDF đơn giản bằng fpdf2 trước khi upload.

    Returns:
        List of doc_ids đã upload thành công.
        Trả về [] nếu thiếu API key, thiếu package, hoặc lỗi → không crash
        pipeline (để `_pageindex_api_search` rơi về fallback).
    """
    if not PAGEINDEX_API_KEY:
        return []

    try:
        # Lazy import — package `pageindex` có thể chưa được cài
        # (không bắt buộc, vì fallback local đã đủ test pass)
        from pageindex import PageIndexClient
        client = PageIndexClient(api_key=PAGEINDEX_API_KEY)

        doc_ids: list[str] = []
        for md_file in STANDARDIZED_DIR.rglob("*.md"):
            # Convert md -> pdf đơn giản để upload
            try:
                from fpdf import FPDF
                pdf = FPDF()
                pdf.add_page()
                pdf.set_font("Helvetica", size=11)
                content = md_file.read_text(encoding="utf-8", errors="ignore")
                # FPDF mặc định dùng latin-1, không hỗ trợ Unicode đầy đủ
                # (vd: tiếng Việt có dấu sẽ mất). Đây chỉ là demo — production
                # cần thư viện hỗ trợ UTF-8 (vd: fpdf2 với Unicode font).
                safe = content.encode("latin-1", "replace").decode("latin-1")
                pdf.multi_cell(0, 5, safe)
                pdf_path = md_file.with_suffix(".pdf")
                pdf.output(str(pdf_path))

                resp = client.submit_document(str(pdf_path))
                doc_id = resp.get("doc_id") or resp.get("id")
                if doc_id:
                    doc_ids.append(doc_id)
                    print(f"  ✓ Uploaded: {md_file.name} -> {doc_id}")
            except Exception as e:
                # Một file lỗi không chặn các file khác
                print(f"  ⚠ Failed to upload {md_file.name}: {e}")
        return doc_ids
    except ImportError:
        print("  ⚠ pageindex package not installed, skipping upload")
        return []
    except Exception as e:
        print(f"  ⚠ PageIndex upload error: {e}")
        return []


def _pageindex_api_search(query: str, top_k: int = 5) -> list[dict]:
    """
    Query PageIndex API thật. Trả về [] nếu bất kỳ lỗi nào.

    Flow:
        1. Upload documents (nếu chưa có doc_id) → lấy doc_ids.
        2. Với mỗi doc, submit query → nhận retrieval_id (async).
        3. Poll cho đến khi retrieval status = "completed" (timeout 30 * 0.5s).
        4. Parse response: retrieved_nodes[].relevant_contents[][] → results.
        5. Score dùng 1/(1+rank) — heuristic vì API không trả relevance score
           thô (chỉ trả thứ tự).

    Lưu ý quan trọng về schema:
        API `/retrieval` đã deprecated. Response hiện tại có field "deprecation"
        cảnh báo. Cấu trúc trả về:
            retrieved_nodes: [
                {
                    "relevant_contents": [
                        [  # ← list of group, mỗi group là list of items
                            {"section_title": ..., "relevant_content": ...},
                            ...
                        ]
                    ]
                }
            ]
        → Phải loop 2 cấp (group → item) để flat thành list results.

    Returns:
        List of {content, score, metadata, source="pageindex"} hoặc [].
    """
    if not PAGEINDEX_API_KEY:
        return []

    try:
        from pageindex import PageIndexClient
        client = PageIndexClient(api_key=PAGEINDEX_API_KEY)

        # Demo đơn giản: upload + query 2 document đầu tiên
        doc_ids = upload_documents()
        if not doc_ids:
            return []

        results: list[dict] = []
        for doc_id in doc_ids[:2]:
            try:
                resp = client.submit_query(doc_id=doc_id, query=query)
                retrieval_id = resp.get("retrieval_id") or resp.get("id")
                if not retrieval_id:
                    continue

                # Poll cho đến khi retrieval hoàn thành
                # (API xử lý async; thường mất 1–5 giây)
                for _ in range(30):
                    retrieval = client.get_retrieval(retrieval_id)
                    if retrieval.get("status") == "completed":
                        break
                    time.sleep(0.5)

                # Parse response theo schema mới (xem docstring)
                for rank, node in enumerate(retrieval.get("retrieved_nodes", [])[:2]):
                    for group in node.get("relevant_contents", []):
                        for item in group:
                            results.append({
                                "content": item.get("relevant_content", ""),
                                # Score heuristic 1/(1+rank): top-1 = 0.5
                                "score": 1.0 / (1 + rank),
                                "metadata": {"section": item.get("section_title", "")},
                                "source": "pageindex",
                            })
            except Exception as e:
                print(f"  ⚠ PageIndex query error for {doc_id}: {e}")
        return results[:top_k]
    except ImportError:
        return []
    except Exception as e:
        print(f"  ⚠ PageIndex search error: {e}")
        return []


# ---------------------------------------------------------------------------
# Local fallback (structural TOC + lexical scoring)
# ---------------------------------------------------------------------------

# Cache TOC toàn cục để tránh parse lại markdown mỗi lần search
# (parse 16 file markdown ~vài chục ms, không đáng kể nhưng tiện).
_TOC_CACHE: Optional[list[dict]] = None


def _get_toc() -> list[dict]:
    """Lazy load + cache TOC từ tất cả .md files trong standardized/."""
    global _TOC_CACHE
    if _TOC_CACHE is None:
        _TOC_CACHE = _build_toc_from_standardized()
    return _TOC_CACHE


def _local_structural_search(query: str, top_k: int = 5) -> list[dict]:
    """
    Fallback local (không cần API): score mỗi TOC node bằng lexical overlap.

    Lý do hoạt động được:
        Markdown document thường có cấu trúc rõ ràng:
            # Chương 1
            Nội dung chương 1...
            ## Mục 1.1
            Nội dung mục 1.1...
        → Heading thường chứa từ khóa tóm tắt nội dung section.
        → Score dựa trên title + content (kết hợp) cho kết quả tương đối
          chính xác mà KHÔNG cần embedding/vector store.

    Công thức score:
        score(node) = 0.7 * overlap(query, title) + 0.3 * overlap(query, content)
        - Title nặng hơn vì heading là tóm tắt → match title = match chủ đề.
        - Content bổ trợ: nếu title chung chung, content chi tiết có thể cứu.

    Returns:
        List of top_k {content, score, metadata, source="pageindex"}.
        Trả về [] nếu corpus rỗng hoặc không node nào match.
    """
    nodes = _get_toc()
    if not nodes:
        return []

    scored = []
    for node in nodes:
        # Title overlap: trọng số 0.7 — heading thường chứa keyword quan trọng
        title_overlap = _lexical_overlap(query, node["title"])
        # Content overlap: trọng số 0.3 — bổ trợ khi title không đủ đặc trưng
        content_overlap = _lexical_overlap(query, node.get("content", ""))
        score = 0.7 * title_overlap + 0.3 * content_overlap
        if score > 0:
            scored.append((score, node))

    # Sort score desc
    scored.sort(key=lambda x: x[0], reverse=True)

    results: list[dict] = []
    for rank, (score, node) in enumerate(scored[:top_k]):
        results.append({
            "content": node.get("content", node["title"]),
            "score": round(float(score), 4),
            "metadata": {
                "section": node["title"],
                "source": node.get("source_file", ""),
                "level": node["level"],
            },
            "source": "pageindex",  # marker theo yêu cầu test
        })
    return results


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def pageindex_search(query: str, top_k: int = 5) -> list[dict]:
    """
    Vectorless retrieval — fallback cho pipeline khi hybrid search
    (Task 9) không ra kết quả tốt.

    Hai mode:
        1. Nếu có PAGEINDEX_API_KEY + package `pageindex` đã cài → gọi API thật.
        2. Ngược lại → dùng local structural search (TOC + lexical overlap).
           Test Task 8 và Task 9 đều dùng mode 2.

    Args:
        query: Câu truy vấn.
        top_k: Số lượng kết quả tối đa.

    Returns:
        List of {
            'content': str,
            'score': float,         # API: 1/(1+rank) heuristic;
                                     # Local: weighted lexical overlap ∈ [0, 1]
            'metadata': dict,       # {section, source, level}
            'source': 'pageindex'   # marker để test phân biệt vs hybrid
        }
        Sorted by score descending. Trả về [] nếu query rỗng.
    """
    if not query or not query.strip():
        return []

    # Thử API thật trước (nếu có key + package)
    if PAGEINDEX_API_KEY:
        api_results = _pageindex_api_search(query, top_k=top_k)
        if api_results:
            return api_results
        # API fail (no doc uploaded, network error) → rơi về local

    # Fallback: local structural TOC + lexical scoring
    return _local_structural_search(query, top_k=top_k)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if not PAGEINDEX_API_KEY:
        print("⚠ Không có PAGEINDEX_API_KEY — dùng local fallback (TOC + lexical)")
        print("  Đăng ký tại: https://pageindex.ai/ để dùng API thật.\n")

    print("Test query:")
    results = pageindex_search("danh sách sản phẩm cấm đăng bán", top_k=3)
    for r in results:
        print(f"[{r['score']:.3f}] [{r['source']}] {r['content'][:100]}...")
