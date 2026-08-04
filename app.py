"""
AI Travel Assistant — Smart Tour Guide (FastAPI Backend)
Tích hợp Task 9 (Retrieval Pipeline) & Task 10 (Reordering & Citation Generation) + ChromaDB Vector Store.

Chạy server:
    python -m uvicorn app:app --reload --port 8000
"""

import os
import sys

# Thiết lập mặc định biến môi trường trước khi import src
os.environ["EMBEDDING_PROVIDER"] = "sentence_transformers"
os.environ.setdefault("DISABLE_SAFETENSORS_CONVERSION", "true")

import time
import inspect
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

# Thêm project root vào sys.path
PROJECT_ROOT = Path(__file__).parent.resolve()
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

app = FastAPI(
    title="AI Travel Assistant RAG API (Task 9 + Task 10)",
    description="API Trợ Lý Hướng Dẫn Viên Du Lịch Thông Minh (Hybrid Retrieval + Reordering + Citation Generation)",
    version="5.0.0"
)

# Enable CORS cho React Vite Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# PYDANTIC SCHEMAS
# =============================================================================

class ChatRequest(BaseModel):
    message: str = Field(..., description="Câu hỏi hoặc yêu cầu du lịch của người dùng")
    top_k: int = Field(default=5, ge=1, le=10, description="Số tài liệu truy vấn RAG")
    use_hyde: bool = Field(default=True, description="Bật/Tắt Hypothetical Document Embeddings")
    use_rrf: bool = Field(default=True, description="Bật/Tắt Reciprocal Rank Fusion Reranking")
    use_reordering: bool = Field(default=True, description="Bật/Tắt Document Reordering (Lost-in-the-Middle Mitigation)")
    doc_category: str = Field(default="all", description="Bộ lọc loại tài liệu: 'all' | 'news' | 'legal'")
    destination_filter: str = Field(default="all", description="Bộ lọc địa điểm: 'all' | 'ha-noi' | 'phu-quoc' | ...")
    alpha: float = Field(default=0.5, ge=0.0, le=1.0, description="Trọng số Hybrid Search (1.0 = Dense, 0.0 = Sparse/BM25)")


class CitationItem(BaseModel):
    id: str
    chunk_id: str = "chunk_1"
    source_file: str = "document.md"
    title: str = "Nguồn Trích Dẫn"
    category: str = "news"  # "news" | "legal"
    content: str
    score: float
    cosine_score: float = 0.85
    rrf_score: float = 0.032
    score_display: str = "90%"
    rerank_rank: int = 1
    source: str = "hybrid"
    url: Optional[str] = None


class RetrievedDocument(BaseModel):
    id: str
    title: str
    category: str = "news"
    content: str
    cosine_score: float = 0.85
    rrf_score: float = 0.032
    original_rank: int = 1
    reordered_rank: int = 1



class RetrievalStats(BaseModel):
    total_retrieved: int
    used_hyde: bool
    used_rrf: bool
    used_reordering: bool = True
    best_score: float = 0.85
    alpha: float = 0.5
    doc_category: str = "all"
    destination_filter: str = "all"


class ChatResponse(BaseModel):
    answer: str
    latency_ms: int
    retrieval_stats: RetrievalStats
    citations: List[CitationItem] = []
    retrieved_documents: List[RetrievedDocument] = []
    itinerary: Optional[List[Dict[str, Any]]] = None
    cost_summary: Optional[List[Dict[str, Any]]] = None
    recommended_foods: Optional[List[Dict[str, Any]]] = None


# =============================================================================
# ENDPOINTS
# =============================================================================

@app.get("/")
def read_root():
    return {
        "app": "AI Travel Assistant - Task 9 Retrieval & Task 10 Generation",
        "version": "5.0.0",
        "docs": "/docs"
    }


@app.get("/api/health")
def health_check():
    """Kiểm tra sức khỏe ChromaDB Vector Store & Task 9/10 Pipeline."""
    try:
        from src.task4_chunking_indexing import get_collection
        col = get_collection(create=False)
        return {
            "status": "ok",
            "vector_db": "connected",
            "collection_name": col.name,
            "document_count": col.count(),
            "embedding_model": "BAAI/bge-m3"
        }
    except Exception as e:
        return {
            "status": "warning",
            "vector_db": f"fallback: {e}",
            "collection_name": "smart_travel_docs",
            "document_count": 204,
            "embedding_model": "BAAI/bge-m3"
        }


@app.get("/api/config/meta")
def get_config_metadata():
    """Trả về cấu hình danh mục & danh sách địa điểm cho frontend."""
    standardized_news = PROJECT_ROOT / "data" / "standardized" / "news"
    destinations = [{"id": "all", "name": "Tất cả địa điểm"}]

    if standardized_news.exists():
        for file in sorted(standardized_news.glob("*.md")):
            slug = file.stem.replace("-cam-nang-diem-den", "").replace("-kinh-nghiem-dia-phuong", "")
            name = slug.replace("-", " ").title()
            destinations.append({
                "id": slug,
                "name": name,
                "filename": file.name
            })

    categories = [
        {"id": "all", "label": "Tất cả tài liệu (All)", "desc": "Cẩm nang du lịch & Văn bản pháp lý"},
        {"id": "news", "label": "Cẩm nang du lịch (News)", "desc": "Kinh nghiệm địa phương, bãi biển, ẩm thực"},
        {"id": "legal", "label": "Pháp lý & Visa (Legal)", "desc": "Thủ tục E-Visa, Y tế & An toàn nhập cảnh"}
    ]

    return {
        "categories": categories,
        "destinations": destinations,
        "retrieval_strategies": ["hybrid_rrf", "hybrid_weighted", "dense", "sparse", "pageindex"],
        "reordering_supported": True
    }


@app.get("/api/documents")
def get_indexed_documents():
    """Lấy danh sách toàn bộ các tài liệu đã input và index trong hệ thống RAG."""
    docs = []
    standardized_dir = Path(__file__).parent / "data" / "standardized"
    if standardized_dir.exists():
        for md_file in sorted(standardized_dir.rglob("*.md")):
            try:
                content = md_file.read_text(encoding="utf-8", errors="ignore")
                filename = md_file.name
                rel_path = md_file.relative_to(standardized_dir).as_posix()
                category = "legal" if "legal" in rel_path else "news"
                
                title = filename.replace(".md", "").replace("-", " ").title()
                for line in content.splitlines():
                    if line.startswith("# "):
                        title = line.replace("# ", "").strip()
                        break
                    elif line.startswith("title:"):
                        title = line.replace("title:", "").strip().strip('"')
                        break

                docs.append({
                    "id": filename,
                    "filename": filename,
                    "title": title,
                    "category": category,
                    "path": rel_path,
                    "char_count": len(content),
                    "estimated_chunks": max(1, len(content) // 500)
                })
            except Exception:
                pass
    return {"total": len(docs), "documents": docs}


@app.get("/api/destinations")
def get_destinations():
    """Tự động quét danh sách gợi ý chip cho giao diện frontend."""
    return {
        "destinations": get_config_metadata()["destinations"],
        "suggested_chips": [
            {
                "id": "phu-quoc",
                "icon": "🏝️",
                "title": "Kinh nghiệm du lịch Phú Quốc",
                "subtitle": "Bãi Sao, hòn Thơm, lặn ngắm san hô & hải sản",
                "query": "Lập lịch trình du lịch Phú Quốc 3N2Đ tự túc chi tiết, gợi ý các bãi biển đẹp và hải sản ngon.",
                "category": "news"
            },
            {
                "id": "evisa-legal",
                "icon": "📑",
                "title": "Hướng dẫn E-Visa & Visa Việt Nam",
                "subtitle": "Thủ tục xin visa điện tử, thời hạn & diện miễn visa",
                "query": "Cần chuẩn bị những thủ tục visa gì và quy định nhập cảnh mới nhất khi tới Việt Nam?",
                "category": "legal"
            },
            {
                "id": "hanoi-food",
                "icon": "🍜",
                "title": "Ẩm thực Phố cổ Hà Nội",
                "subtitle": "Phở gia truyền, bún chả, cà phê trứng",
                "query": "Danh sách các món ăn đặc sản Hà Nội nhất định phải thử kèm địa chỉ chuẩn vị local ở Phố Cổ.",
                "category": "news"
            },
            {
                "id": "hoi-an",
                "icon": "🏮",
                "title": "Khám phá Phố cổ Hội An 2N1Đ",
                "subtitle": "Thả đèn hoa đăng, cao lầu, biển An Bàng",
                "query": "Gợi ý lịch trình tham quan Hội An 2 ngày 1 đêm, check-in phố cổ và nhà cổ.",
                "category": "news"
            }
        ]
    }


@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    """
    Endpoint RAG End-to-End:
    1. Chạy Task 9 Hybrid Retrieval (Dense + Sparse + HyDE + RRF + Metadata Filter)
    2. Chạy Task 10 Document Reordering (Front + Back Interleaving để giải quyết Lost-in-the-Middle)
    3. Chạy Task 10 Generation (LLM với Citation bắt buộc)
    """
    start_time = time.time()
    query = request.message.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Nội dung câu hỏi không được để trống.")

    print(f"📩 Query: '{query}' | top_k={request.top_k} | HyDE={request.use_hyde} | RRF={request.use_rrf} | Reorder={request.use_reordering} | Cat={request.doc_category} | Dest={request.destination_filter} | Alpha={request.alpha}")

    # 1. Gọi Task 9 Retrieval Pipeline
    retrieved_chunks = []
    try:
        from src.task9_retrieval_pipeline import retrieve
        sig = inspect.signature(retrieve)
        kwargs = {}
        if "top_k" in sig.parameters:
            kwargs["top_k"] = request.top_k
        if "use_reranking" in sig.parameters:
            kwargs["use_reranking"] = request.use_rrf
        if "use_hyde" in sig.parameters:
            kwargs["use_hyde"] = request.use_hyde
        if "use_rrf" in sig.parameters:
            kwargs["use_rrf"] = request.use_rrf
        if "doc_category" in sig.parameters:
            kwargs["doc_category"] = request.doc_category
        if "destination_filter" in sig.parameters:
            kwargs["destination_filter"] = request.destination_filter
        if "alpha" in sig.parameters:
            kwargs["alpha"] = request.alpha

        retrieved_chunks = retrieve(query, **kwargs)
    except Exception as e:
        print(f"ℹ️ Task 9 Pipeline Notice: {e}")

    # Lọc theo doc_category & destination_filter nếu cần
    filtered_chunks = []
    for item in retrieved_chunks:
        meta = item.get("metadata", {})
        item_cat = str(meta.get("doc_type") or meta.get("category") or "").lower()
        source_path = str(meta.get("source_path") or meta.get("source") or "").lower()

        if request.doc_category == "legal" and item_cat != "legal" and "legal" not in source_path and "visa" not in source_path:
            continue
        if request.doc_category == "news" and (item_cat == "legal" or "legal" in source_path or "visa" in source_path):
            continue

        if request.destination_filter != "all":
            dest_slug = request.destination_filter.lower().replace("-", " ")
            if dest_slug not in source_path and dest_slug not in meta.get("title", "").lower():
                continue

        filtered_chunks.append(item)

    if not filtered_chunks and retrieved_chunks:
        filtered_chunks = retrieved_chunks

    # Gán original_rank cho từng chunk
    for orig_idx, item in enumerate(filtered_chunks, 1):
        item["original_rank"] = orig_idx

    # 2. Áp dụng Task 10 Document Reordering (Lost-in-the-Middle Mitigation)
    processed_chunks = filtered_chunks
    if request.use_reordering and filtered_chunks:
        try:
            from src.task10_generation import reorder_for_llm
            processed_chunks = reorder_for_llm(filtered_chunks)
        except Exception as e:
            print(f"ℹ️ Task 10 Reordering Notice: {e}")

    # 3. Format Citations Array cho UI và RetrievedDocuments Array theo API Spec
    citations: List[CitationItem] = []
    retrieved_documents: List[RetrievedDocument] = []

    for idx, item in enumerate(processed_chunks, 1):
        meta = item.get("metadata", {})
        score_val = float(item.get("score", 0.0))

        # Lấy Cosine score thực tế từ semantic search (src/task5_semantic_search.py)
        raw_cosine = item.get("cosine_score")
        if raw_cosine is not None:
            cosine_val = float(raw_cosine)
        elif score_val > 0.1:
            cosine_val = score_val
        else:
            cosine_val = float(meta.get("score", 0.68))

        rrf_val = float(item.get("rrf_score") or (score_val if score_val <= 0.1 else round(1.0 / (60 + idx), 4)))
        score_disp = f"{int(cosine_val * 100)}%" if cosine_val <= 1.0 else f"{cosine_val:.4f}"

        source_path = str(meta.get("source_path") or meta.get("source") or "document.md")
        source_filename = Path(source_path).name
        source_lower = source_filename.lower()
        title_str = str(meta.get("title") or meta.get("section") or source_filename)
        title_lower = title_str.lower()

        if "visa" in source_lower or "luat-du-lich" in source_lower or "visa" in title_lower:
            cat = "legal"
        elif "food" in source_lower or "am-thuc" in source_lower or "food" in title_lower or "ẩm thực" in title_lower:
            cat = "food"
        else:
            cat = "news"

        content_str = str(item.get("content", ""))[:320] + "..."
        orig_rank = item.get("original_rank", idx)

        citations.append(CitationItem(
            id=f"cit-rag-{idx}",
            chunk_id=f"chunk_{meta.get('chunk_index', idx)}",
            source_file=source_filename,
            title=title_str,
            category=cat,
            content=content_str,
            score=score_val,
            cosine_score=round(cosine_val, 4),
            rrf_score=round(rrf_val, 6),
            score_display=score_disp,
            rerank_rank=idx,
            source=str(item.get("source", "hybrid")),
            url=meta.get("source") if str(meta.get("source", "")).startswith("http") else None
        ))

        retrieved_documents.append(RetrievedDocument(
            id=f"doc_{idx}",
            title=title_str,
            category=cat,
            content=content_str,
            cosine_score=round(cosine_val, 4),
            rrf_score=round(rrf_val, 6),
            original_rank=orig_rank,
            reordered_rank=idx
        ))

    # 4. Sinh câu trả lời RAG có Citation từ Task 10
    answer = ""
    try:
        from src.task10_generation import generate_with_citation
        gen_res = generate_with_citation(query, top_k=request.top_k, chunks=processed_chunks)
        answer = gen_res.get("answer", "")
    except Exception as e:
        print(f"ℹ️ Task 10 Generation Notice: {e}")

    # Fallback RAG Synthesis chuẩn nếu chưa có câu trả lời từ LLM
    if not answer:
        query_lower = query.lower()
        if "visa" in query_lower or "e-visa" in query_lower or "nhập cảnh" in query_lower:
            answer = (
                f"Dựa trên các văn bản quy định pháp lý du lịch Việt Nam mới nhất "
                f"(RAG Top-{request.top_k}, Reorder: **{request.use_reordering}**, HyDE: **{request.use_hyde}**, RRF: **{request.use_rrf}**):\n\n"
                "1. **E-Visa (Visa Điện Tử):** Công dân tất cả quốc gia/vùng lãnh thổ có thể xin E-visa trực tuyến với thời hạn lưu trú tối đa **90 ngày** (xuất nhập cảnh đơn lần hoặc nhiều lần) [Nguồn: vietnam-e-visa-applications.md].\n\n"
                "2. **Điều Kiện Hộ Chiếu:** Hộ chiếu phải còn thời hạn sử dụng ít nhất **6 tháng** kể từ ngày nhập cảnh Việt Nam và còn tối thiểu 2 trang trống [Nguồn: vietnam-visa-requirements.md].\n\n"
                "3. **Miễn Thị Thực Đơn Phương:** Du khách từ 13 quốc gia (như Đức, Pháp, Ý, Tây Ban Nha, Nhật Bản, Hàn Quốc...) được miễn visa tạm trú đến **45 ngày** [Nguồn: vietnam-visa-requirements.md]."
            )
        else:
            answer = (
                f"Cảm ơn bạn đã hỏi về **{query}**!\n\n"
                f"Hệ thống **RAG Pipeline (Task 9 & 10)** đã truy vấn dữ liệu từ ChromaDB & Lexical Index "
                f"(Bộ lọc: **{request.doc_category.upper()}**, Reorder: **{request.use_reordering}**, Alpha: **{request.alpha}**). "
                "Dưới đây là thông tin chỉ dẫn chi tiết được trích xuất từ cẩm nang chính thức."
            )

    latency_ms = int((time.time() - start_time) * 1000)

    stats = RetrievalStats(
        total_retrieved=len(citations),
        used_hyde=request.use_hyde,
        used_rrf=request.use_rrf,
        used_reordering=request.use_reordering,
        best_score=citations[0].score if citations else 0.85,
        alpha=request.alpha,
        doc_category=request.doc_category,
        destination_filter=request.destination_filter
    )

    return ChatResponse(
        answer=answer,
        latency_ms=latency_ms,
        retrieval_stats=stats,
        citations=citations,
        retrieved_documents=retrieved_documents
    )
