"""Task 3 - Standardise landing documents as UTF-8 Markdown.

Run from the repository root::

    python -m src.task3_convert_markdown
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from markitdown import MarkItDown


PROJECT_DIR = Path(__file__).resolve().parent.parent
LANDING_DIR = PROJECT_DIR / "data" / "landing"
OUTPUT_DIR = PROJECT_DIR / "data" / "standardized"


def _yaml_value(value: Any) -> str:
    """Return a JSON-quoted scalar/list, which is valid YAML front matter."""

    return json.dumps(value, ensure_ascii=False)


def _front_matter(metadata: dict[str, Any]) -> str:
    lines = ["---"]
    for key, value in metadata.items():
        if value is not None:
            lines.append(f"{key}: {_yaml_value(value)}")
    lines.extend(["---", ""])
    return "\n".join(lines)


def _load_legal_manifest() -> dict[str, dict[str, Any]]:
    manifest_path = LANDING_DIR / "legal" / "manifest.json"
    if not manifest_path.exists():
        return {}
    records = json.loads(manifest_path.read_text(encoding="utf-8"))
    return {record["filename"]: record for record in records}


def convert_legal_docs() -> list[Path]:
    """Convert every PDF/DOC/DOCX/TXT and preserve manifest provenance."""

    legal_dir = LANDING_DIR / "legal"
    output_dir = OUTPUT_DIR / "legal"
    output_dir.mkdir(parents=True, exist_ok=True)
    if not legal_dir.exists():
        print(f"⚠ Không có thư mục: {legal_dir}")
        return []

    manifest = _load_legal_manifest()
    converter = MarkItDown()
    outputs: list[Path] = []
    for filepath in sorted(legal_dir.iterdir()):
        if filepath.suffix.lower() not in {".pdf", ".docx", ".doc", ".txt"}:
            continue
        print(f"Converting: {filepath.name}")
        if filepath.suffix.lower() == ".txt":
            text = filepath.read_text(encoding="utf-8").strip()
        else:
            result = converter.convert(str(filepath))
            text = (result.text_content or "").strip()
        if len(text) < 200:
            raise ValueError(f"{filepath.name} convert ra nội dung quá ngắn")
        record = manifest.get(filepath.name, {})
        metadata = {
            "title": record.get("title", filepath.stem),
            "source": record.get("url"),
            "authority": record.get("authority"),
            "document_id": record.get("document_id", filepath.stem),
            "topic": record.get("topic", "du lịch"),
            "source_type": record.get("source_type", "official_document"),
            "language": record.get("language", "vi"),
        }
        output_path = output_dir / f"{filepath.stem}.md"
        output_path.write_text(
            _front_matter(metadata) + f"# {metadata['title']}\n\n{text}\n",
            encoding="utf-8",
        )
        outputs.append(output_path)
        print(f"  ✓ Saved: {output_path}")
    return outputs


def convert_news_articles() -> list[Path]:
    """Convert JSON with metadata and keep teammate TXT inputs supported."""

    news_dir = LANDING_DIR / "news"
    output_dir = OUTPUT_DIR / "news"
    output_dir.mkdir(parents=True, exist_ok=True)
    if not news_dir.exists():
        print(f"⚠ Không có thư mục: {news_dir}")
        return []

    converter = MarkItDown()
    outputs: list[Path] = []
    for filepath in sorted(news_dir.iterdir()):
        suffix = filepath.suffix.lower()
        if suffix not in {".json", ".txt"}:
            continue
        print(f"Converting: {filepath.name}")
        output_path = output_dir / f"{filepath.stem}.md"

        if suffix == ".json":
            data = json.loads(filepath.read_text(encoding="utf-8"))
            content_markdown = data.get("content_markdown", "").strip()
            if len(content_markdown) < 200:
                raise ValueError(f"{filepath.name} thiếu nội dung bài viết")
            if not data.get("url"):
                raise ValueError(f"{filepath.name} thiếu metadata URL")

            metadata = {
                "title": data.get("title", filepath.stem),
                "source": data["url"],
                "source_name": data.get("source_name"),
                "source_type": data.get("source_type", "travel_article"),
                "location": data.get("location"),
                "categories": data.get("categories", []),
                "language": data.get("language", "vi"),
                "date_crawled": data.get("date_crawled"),
            }
            content = (
                _front_matter(metadata)
                + f"# {metadata['title']}\n\n{content_markdown}\n"
            )
        else:
            content = (converter.convert(str(filepath)).text_content or "").strip()
            if len(content) < 200:
                raise ValueError(f"{filepath.name} convert ra nội dung quá ngắn")

        output_path.write_text(content, encoding="utf-8")
        outputs.append(output_path)
        print(f"  ✓ Saved: {output_path}")
    return outputs


def convert_all() -> list[Path]:
    """Convert all supported landing files and return output paths."""

    print("=" * 50)
    print("Task 3: Convert to Markdown (MarkItDown)")
    print("=" * 50)
    print("\n--- Official Documents ---")
    legal_outputs = convert_legal_docs()
    print("\n--- Travel Articles ---")
    news_outputs = convert_news_articles()
    outputs = legal_outputs + news_outputs
    print(f"\n✓ Done: {len(outputs)} file(s). Output tại {OUTPUT_DIR}")
    return outputs


if __name__ == "__main__":
    convert_all()
