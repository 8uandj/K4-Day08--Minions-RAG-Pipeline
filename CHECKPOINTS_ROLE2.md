# Role 2 - Checkpoint 0, 1 và 2

## Chủ đề

**Trợ lý Hướng dẫn viên Du lịch Thông minh**: lịch trình tự túc, ẩm thực,
văn hóa ứng xử, an toàn và mẹo tiết kiệm chi phí theo địa phương.

## Checkpoint 0 - Môi trường

Dự án dùng Python 3.11. Tại thư mục gốc:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -c "import chromadb, sentence_transformers; print('CP0 Passed')"
```

Nếu máy dùng `uv`:

```bash
uv venv --python 3.11
uv pip install -r requirements.txt
```

Không commit `.env` hay API key. Checkpoint 0 của Role 2 không cần gọi LLM.

## Checkpoint 1 - Thu thập và chuẩn hóa

Chạy lần lượt:

```bash
python -m src.task1_collect_legal_docs
python -m src.task2_crawl_news
python -m src.task3_convert_markdown
pytest tests/test_individual.py -v -k 'Task1 or Task2 or Task3'
```

Kết quả mong đợi:

- `data/landing/legal/`: 3 PDF gốc về Luật Du lịch, cung đường phiêu lưu
  và du lịch bền vững/có trách nhiệm.
- `data/landing/news/`: 7 bài cẩm nang/review có URL, thời điểm crawl,
  địa phương và nhóm chủ đề.
- `data/standardized/`: 10 file Markdown có YAML front matter để Task 4
  có thể chunk và giữ citation/metadata.

Ba script đều có thể chạy lại. Task 1 giữ PDF đã tải nếu file hợp lệ;
Task 2 chỉ chấp nhận checkpoint khi crawl thành công ít nhất 5 bài; Task 3
từ chối output quá ngắn hoặc thiếu URL nguồn.

## Nguồn dữ liệu và nguyên tắc

- Văn bản: Cổng Thông tin/Công báo Chính phủ và Bộ Văn hóa, Thể thao
  và Du lịch.
- Cẩm nang: website chính thức của Cục Du lịch Quốc gia Việt Nam.
- Review: Traveloka GoLocal (bài trải nghiệm Quy Nhơn).
- Mọi bản ghi đều giữ URL nguồn; thông tin giá/quán ăn có thể thay đổi
  và cần hiển thị ngày crawl khi trả lời người dùng.

## Checkpoint 2 - Chunking, ChromaDB và semantic search

Task 4 dùng pipeline chunking hai tầng:

1. `MarkdownHeaderTextSplitter` giữ ngữ cảnh tiêu đề/section.
2. `RecursiveCharacterTextSplitter` giới hạn `CHUNK_SIZE=1000` và
   `CHUNK_OVERLAP=120` (đơn vị ký tự theo starter).

Mỗi chunk giữ `source`, `location`, `category`, `year`, title, section và
chỉ số chunk. Dense embedding dùng `BAAI/bge-m3` multilingual, 1.024 chiều,
chuẩn hóa trước khi upsert vào Chroma collection `smart_travel_docs` với
cosine distance.

```bash
python -m src.task4_chunking_indexing
python -m src.task5_semantic_search
pytest -q tests/test_individual.py::TestTask4 tests/test_individual.py::TestTask5
```

Task 5 trả về đúng schema `content`, `score`, `metadata`, sắp xếp score giảm
dần. Query expansion song ngữ theo ngữ cảnh du lịch được bật mặc định để
bonus; đặt `QUERY_EXPANSION=false` nếu cần chạy baseline không expansion.

BGE-M3 chạy local nên Task 4–5 không cần OpenAI API key. Không ghi key vào
`.env.example`, mã nguồn, log hoặc commit.
