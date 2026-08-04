# Bài Tập Nhóm — E-commerce Support RAG Chatbot

## Mục Tiêu

Sau khi hoàn thành bài cá nhân, nhóm ngồi lại để xây dựng **1 trong 2 sản phẩm**:

---

## Yêu cầu 1: Sản phẩm nhóm RAG Chatbot

Xây dựng chatbot trả lời câu hỏi về chính sách thương mại điện tử và hỗ trợ khách hàng liên quan.

**Yêu cầu:**
- Giao diện chat (Streamlit / Gradio / Chainlit)
- Trả lời có citation (dựa trên Task 10)
- Hỗ trợ follow-up questions (conversation memory)
- Hiển thị source documents đã dùng

**Stack gợi ý:**
```
Chainlit/Streamlit → Retrieval (Task 9) → Generation (Task 10) → Display
```

---

## Yêu cầu 2: RAG Evaluation Pipeline

Sử dụng **1 trong 3 framework** sau để evaluate pipeline RAG của nhóm:

### Framework lựa chọn

| Framework | Cài đặt | Đặc điểm |
|-----------|---------|-----------|
| [DeepEval](https://github.com/confident-ai/deepeval) | `pip install deepeval` | Nhiều metric built-in, dễ integrate với pytest |
| [RAGAS](https://github.com/explodinggradients/ragas) | `pip install ragas` | Chuẩn industry cho RAG eval, 3 trục chính |
| [TruLens](https://github.com/truera/trulens) | `pip install trulens` | Dashboard UI, feedback functions mạnh |

### Yêu cầu Evaluation

1. **Tạo Golden Dataset** — tối thiểu 15 cặp Q&A (question, expected_answer, expected_context)
2. **Chạy evaluation** trên toàn bộ golden dataset với các metrics sau:
   - **Faithfulness** — câu trả lời có bám đúng context không?
   - **Answer Relevance** — câu trả lời có đúng câu hỏi không?
   - **Context Recall** — retriever có lấy đủ evidence không?
   - **Context Precision** — trong context lấy về, bao nhiêu % thực sự hữu ích?
3. **So sánh A/B** — chạy eval trên ít nhất 2 config khác nhau (ví dụ: có reranking vs không reranking, hoặc hybrid vs dense-only)
4. **Báo cáo** — bảng điểm + phân tích worst performers + đề xuất cải tiến

Xem code mẫu (DeepEval/RAGAS/TruLens) chi tiết trong `README.md` gốc mục "Yêu cầu 2".

### Deliverable Evaluation

- [x] File `group_project/evaluation/golden_dataset.json` — 15+ cặp Q&A
- [x] File `group_project/evaluation/eval_pipeline.py` — script chạy evaluation
- [x] File `group_project/evaluation/results.md` — bảng điểm + phân tích
- [x] So sánh A/B ít nhất 2 configs

---

## Yêu Cầu Chung

1. **Tích hợp pipeline** từ bài cá nhân của các thành viên
2. **Demo hoạt động được** trong buổi trình bày (chạy local hoặc deploy)
3. **Evaluation pipeline** chạy được và có báo cáo kết quả
4. **Code push lên repository** chung của nhóm
5. **README** mô tả kiến trúc và phân công (điền bên dưới)

---

## Kiến Trúc Hệ Thống

Kiến trúc RAG gồm hai giai đoạn: lập chỉ mục tài liệu và xử lý câu hỏi.

```mermaid
flowchart LR
    subgraph INDEXING[1. Indexing Pipeline]
        DOC[Tài liệu Markdown<br/>kèm metadata]
        CHUNK[Task 4<br/>Chunk theo heading<br/>size 1000, overlap 120]
        EMB[Embedding Model]
        CHROMA[(ChromaDB<br/>Dense Index)]
        TFIDF[(TF-IDF<br/>Sparse Index)]
        TOC[(Markdown TOC<br/>Structural Index)]

        DOC --> CHUNK
        CHUNK --> EMB --> CHROMA
        CHUNK --> TFIDF
        DOC --> TOC
    end

    subgraph RAG[2. RAG Query Pipeline]
        direction TB
        USER[User Query] --> T9[Task 9<br/>Retrieval Orchestrator]
        T9 --> DENSE[Task 5<br/>Semantic Search<br/>Query Expansion]
        T9 --> SPARSE[Task 6<br/>Lexical Search]
        DENSE --> RRF[Task 7<br/>RRF Merge và Reranking]
        SPARSE --> RRF
        RRF --> CHECK{Dense cosine score<br/>đạt ngưỡng 0.15?}
        CHECK -->|Có| TOPK[Top-k chunks]
        CHECK -->|Không| PI[Task 8<br/>PageIndex hoặc<br/>Local Structural Search]
        PI --> TOPK
        TOPK --> REORDER[Task 10<br/>Reorder chống<br/>lost-in-the-middle]
        REORDER --> PROMPT[Context + Source Labels<br/>+ User Query]
        PROMPT --> LLM[LLM<br/>OpenAI hoặc OpenRouter]
        LLM --> ANSWER[Câu trả lời<br/>có Citation]
    end

    CHROMA --> DENSE
    TFIDF --> SPARSE
    TOC --> PI
```

## Phân Công Công Việc

| Thành viên | MSSV | Nhiệm vụ | Trạng thái |
|-----------|------|----------|------------|
| Hoàng Duy Hưng | 2A202601908 | Team Leader & RAG Architect | Done |
| Mai Văn Phương | 2A202601418 | Sparse Search & Advanced Reranking Dev | Done |
| Sẻ Thế Hưng | 2A202601822 | Frontend & Chatbot Developer | Done |
| Nguyễn Văn Đạt | 2A202601968 | Evaluation & QA Engineer | Done |
| Nguyễn Đặng Thành Vinh | 2A202602021 | Data & Dense Search Dev | Done |

---

## Hướng Dẫn Chạy

```bash
# Cài đặt dependencies
pip install -r requirements.txt

# Chạy app
streamlit run app.py
# hoặc
chainlit run app.py
```

---

## Lưu ý

Hãy giữ lại repo này nếu như bạn học track 3 giai đoạn 2, chúng ta sẽ phát triển tiếp dự án lên knowledge graph để khắc phục các câu hỏi hóc búa khi có các câu hỏi khó.
