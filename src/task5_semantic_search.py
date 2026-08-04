"""Task 5 - Dense retrieval with optional local query expansion."""

from __future__ import annotations

import os
import re
import unicodedata
from typing import Any

from .task4_chunking_indexing import embed_texts, get_collection


_DOMAIN_EXPANSIONS = (
    (("lich trinh", "itinerary", "may ngay"), "lộ trình route schedule ngày đêm tham quan"),
    (("xe may", "motorbike"), "thuê xe cung đường đèo an toàn road trip"),
    (("mon an", "am thuc", "quan an", "food"), "đặc sản cuisine restaurant địa chỉ quán"),
    (("chi phi", "tiet kiem", "gia", "budget"), "ngân sách cost price giá vé giá phòng"),
    (("van hoa", "ung xu", "culture"), "phong tục etiquette tôn trọng cộng đồng"),
    (("an toan", "safety"), "cảnh báo thời tiết giao thông sức khỏe"),
    (("ha giang",), "Đồng Văn Mã Pí Lèng Mèo Vạc Quản Bạ Nho Quế"),
    (("quy nhon",), "Kỳ Co Eo Gió Bình Định ẩm thực hải sản"),
    (("da nang",), "Mỹ Khê Sơn Trà Ngũ Hành Sơn mì Quảng"),
    (("da lat",), "Lâm Đồng thác Datanla hồ Tuyền Lâm cà phê"),
    (("ha noi",), "phố cổ Hồ Gươm ẩm thực Thăng Long"),
)


def _normalise(value: str) -> str:
    value = unicodedata.normalize("NFD", value.casefold())
    value = "".join(char for char in value if unicodedata.category(char) != "Mn")
    return re.sub(r"\s+", " ", value).strip()


def expand_query(query: str) -> list[str]:
    """Create one domain-enriched bilingual variant without calling an LLM."""

    normalised = _normalise(query)
    additions: list[str] = []
    for markers, expansion in _DOMAIN_EXPANSIONS:
        if any(marker in normalised for marker in markers):
            additions.append(expansion)
    if not additions:
        return [query]
    return [query, f"{query}. Từ khóa liên quan: {'; '.join(additions)}"]


def _query_expansion_enabled() -> bool:
    return os.getenv("QUERY_EXPANSION", "true").strip().lower() not in {
        "0",
        "false",
        "no",
        "off",
    }


def _empty_or_nested(values: Any, index: int) -> list[Any]:
    if not values or len(values) <= index or values[index] is None:
        return []
    return list(values[index])


def semantic_search(query: str, top_k: int = 10) -> list[dict]:
    """Search ChromaDB with BGE-M3 and return results sorted by similarity.

    Query expansion is enabled by default.  Each variant is embedded with the
    same BGE-M3 model used for indexing; duplicate chunks are fused by keeping
    their best cosine similarity.
    """

    query = query.strip()
    if not query:
        raise ValueError("query không được rỗng")
    if top_k <= 0:
        return []

    try:
        collection = get_collection(create=False)
    except Exception:
        return []
    collection_size = collection.count()
    if collection_size == 0:
        return []

    queries = expand_query(query) if _query_expansion_enabled() else [query]
    embeddings = embed_texts(queries)
    per_query_limit = min(collection_size, max(top_k * 3, top_k))
    raw = collection.query(
        query_embeddings=embeddings,
        n_results=per_query_limit,
        include=["documents", "metadatas", "distances"],
    )

    fused: dict[str, dict] = {}
    for query_index in range(len(queries)):
        ids = _empty_or_nested(raw.get("ids"), query_index)
        documents = _empty_or_nested(raw.get("documents"), query_index)
        metadatas = _empty_or_nested(raw.get("metadatas"), query_index)
        distances = _empty_or_nested(raw.get("distances"), query_index)
        for chunk_id, content, metadata, distance in zip(
            ids, documents, metadatas, distances
        ):
            score = round(max(0.0, min(1.0, 1.0 - float(distance))), 4)
            candidate = {
                "content": content or "",
                "score": score,
                "metadata": dict(metadata or {}),
            }
            previous = fused.get(str(chunk_id))
            if previous is None or score > previous["score"]:
                fused[str(chunk_id)] = candidate

    ranked = sorted(
        fused.values(),
        key=lambda item: (item["score"], len(item["content"])),
        reverse=True,
    )
    return ranked[:top_k]


if __name__ == "__main__":
    demo_query = "Lịch trình Hà Giang 3 ngày 2 đêm tự túc bằng xe máy"
    for result in semantic_search(demo_query, top_k=5):
        metadata = result["metadata"]
        print(
            f"[{result['score']:.3f}] {metadata.get('location')} | "
            f"{metadata.get('category')} | {metadata.get('source')}"
        )
        print(result["content"][:180].replace("\n", " "), "\n")
