# Frontend Requirements & Run Guide

Frontend này dùng React + Vite và gọi backend FastAPI qua proxy `/api`.

## Requirements

- Node.js >= 20
- npm >= 10
- Backend chạy tại `http://localhost:8000`

## Install

Chạy trong thư mục `frontend`:

```bash
npm install
```

## Run Frontend

```bash
npm run dev
```

Mở trình duyệt tại:

```text
http://localhost:5173
```

## Run Backend

Từ thư mục gốc của project:

```bash
python -m uvicorn app:app --reload --port 8000
```

## Build

```bash
npm run build
```

## Lint

```bash
npm run lint
```
