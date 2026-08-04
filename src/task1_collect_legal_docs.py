"""Task 1 - Download official documents for the smart travel assistant.

The raw PDFs are intentionally kept in ``data/landing/legal``.  Although the
starter repository calls this directory ``legal``, the project uses it for
official, authoritative documents: tourism law and two national travel guides.

Run from the repository root::

    python -m src.task1_collect_legal_docs
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests


PROJECT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_DIR / "data" / "landing" / "legal"
MANIFEST_PATH = DATA_DIR / "manifest.json"

# Use direct PDF links from official Vietnamese government websites.  Keeping
# the URLs in code makes the landing dataset auditable and reproducible.
DOCUMENT_SOURCES: tuple[dict[str, str], ...] = (
    {
        "document_id": "luat-du-lich-09-2017-qh14",
        "filename": "luat-du-lich-09-2017-qh14.pdf",
        "title": "Luật Du lịch số 09/2017/QH14",
        "authority": "Quốc hội nước Cộng hòa Xã hội Chủ nghĩa Việt Nam",
        "url": "https://congbaocdn.chinhphu.vn/CongBaoCP/VanBan/2017/7/24641/19163-1-2017695-69605-vbhn-vpqh.pdf",
        "topic": "quyền và nghĩa vụ của khách du lịch; quản lý hoạt động du lịch",
        "language": "vi",
        "source_type": "official_legal_document",
    },
    {
        "document_id": "adventure-trails-vietnam",
        "filename": "cam-nang-cung-duong-phieu-luu-viet-nam.pdf",
        "title": "Adventure Trails Vietnam",
        "authority": "Cục Du lịch Quốc gia Việt Nam (Vietnam Tourism)",
        "url": "https://vietnam.travel/sites/default/files/2021-04/Adventure_Trails_Vietnam.pdf",
        "topic": "lịch trình gợi ý; di chuyển; du lịch phiêu lưu theo vùng",
        "language": "en",
        "source_type": "official_tourism_guide",
    },
    {
        "document_id": "cam-nang-du-lich-ben-vung-viet-nam",
        "filename": "cam-nang-du-lich-ben-vung-viet-nam.pdf",
        "title": "A Sustainable Travel Guide to Viet Nam",
        "authority": "Cục Du lịch Quốc gia Việt Nam (Vietnam Tourism)",
        "url": "https://vietnam.travel/sites/default/files/2020-09/Sustainable-Travel-Guide.pdf",
        "topic": "du lịch có trách nhiệm; văn hóa ứng xử; hỗ trợ cộng đồng địa phương",
        "language": "en",
        "source_type": "official_tourism_guide",
    },
)


def setup_directory() -> None:
    """Create the raw-document directory when it does not exist."""

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    print(f"✓ Thư mục đã sẵn sàng: {DATA_DIR}")


def _validate_pdf(content: bytes, source: dict[str, str]) -> None:
    """Reject HTML error pages and suspiciously small downloads."""

    if len(content) <= 1024:
        raise ValueError(f"{source['filename']} quá nhỏ ({len(content)} bytes)")
    if not content.lstrip().startswith(b"%PDF"):
        preview = content[:80].decode("utf-8", errors="replace")
        raise ValueError(
            f"{source['url']} không trả về PDF (nội dung đầu: {preview!r})"
        )


def download_document(
    source: dict[str, str], *, overwrite: bool = False, timeout: int = 60
) -> dict[str, Any]:
    """Download one official PDF and return its manifest record."""

    output_path = DATA_DIR / source["filename"]
    if output_path.exists() and not overwrite:
        content = output_path.read_bytes()
        _validate_pdf(content, source)
        print(f"→ Giữ file đã có: {output_path.name}")
    else:
        response = requests.get(
            source["url"],
            timeout=timeout,
            headers={"User-Agent": "Minions-RAG-Travel-Student-Project/1.0"},
        )
        response.raise_for_status()
        content = response.content
        _validate_pdf(content, source)
        temp_path = output_path.with_suffix(".pdf.part")
        temp_path.write_bytes(content)
        temp_path.replace(output_path)
        print(f"✓ Đã tải: {output_path.name} ({len(content):,} bytes)")

    return {
        **source,
        "local_path": str(output_path.relative_to(PROJECT_DIR)),
        "size_bytes": len(content),
        "language": source.get("language", "vi"),
        "source_type": source.get("source_type", "official_document"),
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
    }


def collect_all(*, overwrite: bool = False) -> list[dict[str, Any]]:
    """Download all configured sources and write an auditable manifest."""

    setup_directory()
    records = [
        download_document(source, overwrite=overwrite)
        for source in DOCUMENT_SOURCES
    ]
    MANIFEST_PATH.write_text(
        json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"✓ Manifest: {MANIFEST_PATH}")
    return records


if __name__ == "__main__":
    collect_all()
