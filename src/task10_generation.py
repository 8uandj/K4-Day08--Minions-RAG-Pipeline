"""
Task 10 — Generation Có Citation.

Hướng dẫn:
    1. Chọn top_k, top_p phù hợp (giải thích lý do)
    2. Sắp xếp lại chunks sau reranking để tránh "lost in the middle"
    3. Inject context vào prompt
    4. Yêu cầu LLM trả lời có citation
    5. Nếu không đủ evidence → "I cannot verify this information"

Gợi ý LLM: OpenRouter có nhiều model gắn hậu tố ":free" không tính phí — xem
https://openrouter.ai/models?max_price=0 — phù hợp nếu chưa có credit trả phí.
Base URL: "https://openrouter.ai/api/v1", dùng chung interface với OpenAI SDK.

Tại sao generation cần citation:
    - RAG cho chủ đề du lịch dễ bị hallucination về giá, lịch trình, visa hoặc
      an toàn. Citation buộc câu trả lời bám vào chunk đã retrieve.
    - Source label trong context giúp người dùng kiểm chứng lại guide/legal
      document, đồng thời giúp Role 5 đánh giá faithfulness bằng RAGAS.

Tại sao reorder chunks:
    - LLM thường chú ý tốt hơn ở đầu và cuối prompt. Sau retrieval/rerank, ta
      đặt chunk mạnh nhất ở đầu và một chunk mạnh khác ở cuối để giảm hiệu ứng
      "lost in the middle".
"""

import os
import re
from pathlib import Path
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# Thiết lập mặc định EMBEDDING_PROVIDER=sentence_transformers
os.environ.setdefault("EMBEDDING_PROVIDER", "sentence_transformers")

from .task9_retrieval_pipeline import retrieve



# =============================================================================
# CONFIGURATION — Giải thích lựa chọn
# =============================================================================

# top_k: Số chunks đưa vào context
# Chọn 5 vì: đủ evidence mà không quá dài gây lost in the middle
TOP_K = 5

# top_p (nucleus sampling): Xác suất tích luỹ cho token generation
# Chọn 0.9 vì: đủ diverse nhưng không quá random
TOP_P = 0.9

# temperature: Độ ngẫu nhiên của output
# Chọn 0.3 vì: RAG cần factual, ít sáng tạo
TEMPERATURE = 0.3

# TODO: Chọn LLM model (OpenRouter model ID)
LLM_MODEL = os.getenv("LLM_MODEL") or ("openai/gpt-4o-mini" if os.getenv("OPENROUTER_API_KEY") else "gpt-4o-mini")

SYSTEM_PROMPT = """Bạn là trợ lý hướng dẫn viên du lịch thông minh cho Việt Nam.
Bạn trả lời về lịch trình, điểm đến, di chuyển, ẩm thực, văn hóa ứng xử, visa,
sức khỏe và an toàn dựa trên tài liệu du lịch/chính thống được cung cấp.

Quy tắc bắt buộc:
1. Tổng hợp thông tin từ context được cung cấp để đưa ra câu trả lời hữu ích, đẹp mắt, chi tiết, mạch lạc.
2. Mỗi thông tin, địa điểm, món ăn hoặc thủ tục chính phải kèm trích dẫn nguồn ngay sau (ví dụ: [Source: tên_file.md] hoặc [Document X]).
3. Trình bày đẹp mắt và sạch sẽ: KHÔNG dùng các ký tự thô như '###' hoặc '####' ở đầu dòng. Hãy dùng emoji sinh động để làm tiêu đề các phần (ví dụ: 🗓️ **Ngày 1: ...**, 🌅 **Sáng:**, ☀️ **Trưa:**, 🌆 **Chiều:**, 🌙 **Tối:**, 📍 **Địa chỉ:**, 🍽️ **Món ăn:**).
4. Nếu người dùng hỏi lịch trình (ví dụ 3N2Đ, 2N1Đ), hãy linh hoạt tổng hợp các điểm tham quan, ẩm thực có trong context thành lịch trình gợi ý theo ngày hợp lý.
5. Chỉ khi context hoàn toàn rỗng hoặc không có bất kỳ thông tin nào liên quan mới trả lời "Tôi không thể xác minh thông tin này từ nguồn hiện có"."""


# =============================================================================
# DOCUMENT REORDERING (tránh lost in the middle)
# =============================================================================

def reorder_for_llm(chunks: list[dict]) -> list[dict]:
    """
    Sắp xếp chunks để tránh "lost in the middle" effect.

    LLM nhớ tốt thông tin ở ĐẦU và CUỐI prompt, quên thông tin ở GIỮA.
    Strategy: đặt chunks quan trọng nhất ở đầu và cuối, kém quan trọng ở giữa.

    Input order (by score):  [1, 2, 3, 4, 5]
    Output order:            [1, 3, 5, 4, 2]
    (best first, worst in middle, second-best last)

    Args:
        chunks: List sorted by score descending (from retrieval)

    Returns:
        List reordered để maximize LLM attention.
    """
    
    if len(chunks) <= 2:
        return chunks
    
    front = chunks[::2]   # index 0, 2, 4 -> đặt ở đầu
    back = chunks[1::2]   # index 1, 3    -> đặt ở cuối (reversed)
    return front + back[::-1]


reorder_documents = reorder_for_llm
reorder_chunks = reorder_for_llm


# =============================================================================
# CONTEXT FORMATTING
# =============================================================================

def format_context(chunks: list[dict]) -> str:
    """
    Format chunks thành context string cho prompt.
    Mỗi chunk có label source để LLM có thể cite.

    Args:
        chunks: List of {'content': str, 'metadata': dict, 'score': float}

    Returns:
        Formatted context string.
    """

    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        metadata = chunk.get("metadata", {})
        source = metadata.get("title") or metadata.get("source") or f"Source {i}"
        doc_type = metadata.get("doc_type") or metadata.get("type", "unknown")
        context_parts.append(
            f"[Document {i} | Source: {source} | Type: {doc_type}]\n"
            f"{chunk['content']}\n"
        )
    return "\n---\n".join(context_parts)


def _citation_label(chunk: dict, index: int) -> str:
    metadata = chunk.get("metadata", {})
    source_path = metadata.get("source_path") or metadata.get("source") or ""
    if source_path:
        filename = Path(str(source_path)).name
        if filename:
            return filename
    title = metadata.get("title") or metadata.get("section")
    if title:
        return str(title)
    return f"Document {index}"


def _clean_excerpt(content: str, max_chars: int = 420) -> str:
    """Return a short readable excerpt for local extractive fallback."""

    content = re.sub(r"\s+", " ", content).strip()
    if len(content) <= max_chars:
        return content
    clipped = content[:max_chars].rsplit(" ", 1)[0].strip()
    return f"{clipped}..."


def _extractive_answer(query: str, chunks: list[dict]) -> str:
    """Create a citation-backed answer when no LLM API key is available."""

    if not chunks:
        return "Tôi không thể xác minh thông tin này từ nguồn hiện có"

    lines = [
        "Dựa trên các nguồn đã truy xuất, đây là thông tin liên quan nhất:",
    ]
    for index, chunk in enumerate(chunks[:3], 1):
        citation = _citation_label(chunk, index)
        excerpt = _clean_excerpt(chunk.get("content", ""))
        if excerpt:
            lines.append(f"{index}. {excerpt} [{citation}]")
    if len(lines) == 1:
        return "Tôi không thể xác minh thông tin này từ nguồn hiện có"
    return "\n".join(lines)


# =============================================================================
# GENERATION
# =============================================================================

def generate_with_citation(query: str, top_k: int = TOP_K, chunks: Optional[list[dict]] = None) -> dict:
    """
    End-to-end RAG generation có citation.

    Pipeline:
        1. Retrieve relevant chunks (nếu chưa truyền vào)
        2. Reorder để tránh lost in the middle
        3. Format context với source labels
        4. Build prompt (system + context + query)
        5. Call LLM
        6. Return answer + sources

    Args:
        query: Câu hỏi của user
        top_k: Số tài liệu truy xuất
        chunks: Optional list of retrieved chunks

    Returns:
        {
            'answer': str,           # Câu trả lời có citation
            'sources': list[dict],   # Các chunks đã dùng
            'retrieval_source': str  # 'hybrid' hoặc 'pageindex'
        }
    """

    # Step 1: Retrieve
    chunks = retrieve(query, top_k=top_k)
    
    # Step 2: Reorder
    reordered = reorder_for_llm(chunks)
    
    # Step 3: Format context
    context = format_context(reordered)
    
    # Step 4: Build prompt
    user_message = f"""Context:\n{context}\n\n---\n\nQuestion: {query}"""
    
    api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
    if api_key:
        try:
            # Step 5: Call LLM (OpenRouter — OpenAI-compatible API)
            from openai import OpenAI

            if os.getenv("OPENROUTER_API_KEY"):
                client = OpenAI(
                    api_key=api_key, base_url="https://openrouter.ai/api/v1"
                )
            else:
                client = OpenAI(api_key=api_key)

            response = client.chat.completions.create(
                model=LLM_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                temperature=TEMPERATURE,
                top_p=TOP_P,
            )
            answer = response.choices[0].message.content or ""
        except Exception as exc:
            print(f"  ⚠ LLM generation failed, using extractive fallback: {exc}")
            answer = _extractive_answer(query, reordered)
    else:
        answer = _extractive_answer(query, reordered)
    
    # Step 6: Return
    return {
        "answer": answer,
        "sources": chunks,
        "retrieval_source": chunks[0].get("source", "hybrid") if chunks else "none"
    }


if __name__ == "__main__":
    test_queries = [
        "Lịch trình Hà Giang 3 ngày 2 đêm nên đi thế nào?",
        "Du khách cần lưu ý gì khi xin e-visa Việt Nam?",
        "Ở Đà Nẵng nên ăn món gì và tham quan đâu?",
    ]

    for q in test_queries:
        print(f"\n{'='*70}")
        print(f"Q: {q}")
        print("=" * 70)
        result = generate_with_citation(q)
        print(f"\nA: {result['answer']}")
        print(f"\n[Sources: {len(result['sources'])} chunks | via {result['retrieval_source']}]")
