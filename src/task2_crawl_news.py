"""Task 2 - Crawl travel guides and trusted travel articles.

The crawler deliberately stores raw-ish JSON (metadata plus Markdown) in the
landing zone.  It uses normal HTTP requests because all selected sources are
public, server-rendered pages; a browser is unnecessary for these URLs.

Run from the repository root::

    python -m src.task2_crawl_news
"""

from __future__ import annotations

import asyncio
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup
from markdownify import markdownify as html_to_markdown


PROJECT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_DIR / "data" / "landing" / "news"

# Six official tourism articles plus one first-person Traveloka guide give the
# retriever coverage over itineraries, transport, food, etiquette and costs.
ARTICLE_SOURCES: tuple[dict[str, Any], ...] = (
    {
        "filename": "ha-giang-loop-4-ngay.json",
        "url": "https://vietnam.travel/things-to-do/ha-giang-loop-four-day-road-trip",
        "source_name": "Vietnam Tourism",
        "source_type": "official_tourism_guide",
        "location": "Hà Giang",
        "categories": ["lịch trình", "xe máy", "an toàn", "tiết kiệm"],
    },
    {
        "filename": "ha-giang-kinh-nghiem-dia-phuong.json",
        "url": "https://vietnam.travel/things-to-do/ha-giang-adventures",
        "source_name": "Vietnam Tourism",
        "source_type": "official_tourism_guide",
        "location": "Hà Giang",
        "categories": ["trải nghiệm", "văn hóa", "ẩm thực", "homestay"],
    },
    {
        "filename": "da-nang-cam-nang-diem-den.json",
        "url": "https://vietnam.travel/places-to-go/central-vietnam/da-nang",
        "source_name": "Vietnam Tourism",
        "source_type": "official_tourism_guide",
        "location": "Đà Nẵng",
        "categories": ["cẩm nang", "thời tiết", "di chuyển", "tham quan"],
    },
    {
        "filename": "da-nang-foodie-guide.json",
        "url": "https://vietnam.travel/things-to-do/foodie-guide-da-nang",
        "source_name": "Vietnam Tourism",
        "source_type": "official_tourism_guide",
        "location": "Đà Nẵng",
        "categories": ["ẩm thực", "đặc sản", "địa chỉ quán"],
    },
    {
        "filename": "da-lat-cam-nang-diem-den.json",
        "url": "https://vietnam.travel/places-to-go/central-vietnam/dalat",
        "source_name": "Vietnam Tourism",
        "source_type": "official_tourism_guide",
        "location": "Đà Lạt",
        "categories": ["cẩm nang", "thời tiết", "di chuyển", "tham quan"],
    },
    {
        "filename": "am-thuc-duong-pho-viet-nam.json",
        "url": "https://vietnam.travel/things-to-do/beginners-guide-vietnamese-street-food",
        "source_name": "Vietnam Tourism",
        "source_type": "official_tourism_guide",
        "location": "Việt Nam",
        "categories": ["ẩm thực", "văn hóa ứng xử", "an toàn thực phẩm"],
    },
    {
        "filename": "quy-nhon-lich-trinh-mot-ngay.json",
        "url": "https://www.traveloka.com/vi-vn/explore/destination/quy-nhon-co-gi-choi-trong-mot-ngay/59081",
        "source_name": "Traveloka GoLocal",
        "source_type": "travel_blogger_review",
        "location": "Quy Nhơn",
        "categories": ["lịch trình", "ẩm thực", "địa chỉ quán", "chi phí"],
    },
    {
        "filename": "ha-noi-cam-nang-diem-den.json",
        "url": "https://vietnam.travel/places-to-go/northern-vietnam/ha-noi",
        "source_name": "Vietnam Tourism",
        "source_type": "official_tourism_guide",
        "location": "Hà Nội",
        "categories": ["cẩm nang", "văn hóa", "ẩm thực", "tham quan"],
    },
    {
        "filename": "ninh-binh-cam-nang-diem-den.json",
        "url": "https://vietnam.travel/places-to-go/northern-vietnam/ninh-binh",
        "source_name": "Vietnam Tourism",
        "source_type": "official_tourism_guide",
        "location": "Ninh Bình",
        "categories": ["cẩm nang", "thiên nhiên", "di sản", "lịch trình"],
    },
    {
        "filename": "sapa-cam-nang-diem-den.json",
        "url": "https://vietnam.travel/places-to-go/northern-vietnam/sapa",
        "source_name": "Vietnam Tourism",
        "source_type": "official_tourism_guide",
        "location": "Sa Pa",
        "categories": ["cẩm nang", "trekking", "văn hóa", "thời tiết"],
    },
    {
        "filename": "hoi-an-cam-nang-diem-den.json",
        "url": "https://vietnam.travel/places-to-go/central-vietnam/hoi-an",
        "source_name": "Vietnam Tourism",
        "source_type": "official_tourism_guide",
        "location": "Hội An",
        "categories": ["cẩm nang", "di sản", "ẩm thực", "văn hóa"],
    },
    {
        "filename": "hue-cam-nang-diem-den.json",
        "url": "https://vietnam.travel/places-to-go/central-vietnam/hue",
        "source_name": "Vietnam Tourism",
        "source_type": "official_tourism_guide",
        "location": "Huế",
        "categories": ["cẩm nang", "di sản", "ẩm thực", "lịch sử"],
    },
    {
        "filename": "nha-trang-cam-nang-diem-den.json",
        "url": "https://vietnam.travel/places-to-go/central-vietnam/nha-trang",
        "source_name": "Vietnam Tourism",
        "source_type": "official_tourism_guide",
        "location": "Nha Trang",
        "categories": ["cẩm nang", "biển đảo", "ẩm thực", "nghỉ dưỡng"],
    },
    {
        "filename": "phong-nha-cam-nang-diem-den.json",
        "url": "https://vietnam.travel/places-to-go/central-vietnam/phong-nha",
        "source_name": "Vietnam Tourism",
        "source_type": "official_tourism_guide",
        "location": "Phong Nha",
        "categories": ["cẩm nang", "hang động", "thiên nhiên", "phiêu lưu"],
    },
    {
        "filename": "ho-chi-minh-city-cam-nang-diem-den.json",
        "url": "https://vietnam.travel/places-to-go/southern-vietnam/ho-chi-minh-city",
        "source_name": "Vietnam Tourism",
        "source_type": "official_tourism_guide",
        "location": "TP. Hồ Chí Minh",
        "categories": ["cẩm nang", "đô thị", "ẩm thực", "tham quan"],
    },
    {
        "filename": "can-tho-cam-nang-diem-den.json",
        "url": "https://vietnam.travel/places-to-go/southern-vietnam/can-tho",
        "source_name": "Vietnam Tourism",
        "source_type": "official_tourism_guide",
        "location": "Cần Thơ",
        "categories": ["cẩm nang", "sông nước", "chợ nổi", "ẩm thực"],
    },
    {
        "filename": "phu-quoc-cam-nang-diem-den.json",
        "url": "https://vietnam.travel/places-to-go/southern-vietnam/phu-quoc",
        "source_name": "Vietnam Tourism",
        "source_type": "official_tourism_guide",
        "location": "Phú Quốc",
        "categories": ["cẩm nang", "biển đảo", "nghỉ dưỡng", "tham quan"],
    },
)

# Compatibility with the starter API and with students importing this name.
ARTICLE_URLS = [source["url"] for source in ARTICLE_SOURCES]


def setup_directory() -> None:
    """Create ``data/landing/news`` if needed."""

    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _select_article_container(soup: BeautifulSoup) -> Any:
    """Select the narrowest likely article container for known and new sites."""

    selectors = (
        "article",
        "main article",
        "main",
        "[role='main']",
        ".field--name-body",
        ".article-content",
        ".content-detail",
    )
    for selector in selectors:
        element = soup.select_one(selector)
        if element and len(element.get_text(" ", strip=True)) >= 500:
            return element
    return soup.body or soup


def _normalise_markdown(content: str) -> str:
    content = content.replace("\xa0", " ")
    content = re.sub(r"[ \t]+\n", "\n", content)
    content = re.sub(r"\n{3,}", "\n\n", content)
    return content.strip()


def _crawl_sync(source: dict[str, Any], timeout: int = 45) -> dict[str, Any]:
    response = requests.get(
        source["url"],
        timeout=timeout,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 Chrome/124 Safari/537.36"
            ),
            "Accept-Language": "vi,en;q=0.8",
        },
    )
    response.raise_for_status()
    response.encoding = response.apparent_encoding or response.encoding
    soup = BeautifulSoup(response.text, "html.parser")

    for tag in soup.select(
        "script, style, noscript, svg, nav, footer, form, aside, iframe"
    ):
        tag.decompose()

    title = next(
        (
            tag.get_text(" ", strip=True)
            for tag in soup.find_all("h1")
            if tag.get_text(" ", strip=True)
        ),
        "",
    )
    if not title:
        open_graph_title = soup.select_one("meta[property='og:title']")
        title = open_graph_title.get("content", "").strip() if open_graph_title else ""
    if not title:
        title_tag = soup.find("title")
        title = (
            title_tag.get_text(" ", strip=True) if title_tag else source["filename"]
        )
    container = _select_article_container(soup)
    content_markdown = _normalise_markdown(
        html_to_markdown(str(container), heading_style="ATX", strip=["img"])
    )
    if len(content_markdown) < 500:
        raise ValueError(
            f"Nội dung crawl từ {source['url']} quá ngắn "
            f"({len(content_markdown)} ký tự)"
        )

    return {
        "url": source["url"],
        "title": title,
        "date_crawled": datetime.now(timezone.utc).isoformat(),
        "source_name": source["source_name"],
        "source_type": source["source_type"],
        "location": source["location"],
        "categories": source["categories"],
        "language": "vi" if "traveloka.com" in source["url"] else "en",
        "crawl_method": "requests+beautifulsoup+markdownify",
        "content_markdown": content_markdown,
    }


async def crawl_article(url: str | dict[str, Any]) -> dict[str, Any]:
    """Crawl one article without blocking the asyncio event loop.

    ``url`` may be a configured source mapping or one of ``ARTICLE_URLS`` for
    backward compatibility with the starter function signature.
    """

    if isinstance(url, str):
        source = next(
            (item for item in ARTICLE_SOURCES if item["url"] == url),
            {
                "filename": "article.json",
                "url": url,
                "source_name": "Unknown",
                "source_type": "travel_article",
                "location": "Unknown",
                "categories": [],
            },
        )
    else:
        source = url
    return await asyncio.to_thread(_crawl_sync, source)


async def crawl_all() -> list[Path]:
    """Crawl all configured articles and require at least five successes."""

    setup_directory()
    semaphore = asyncio.Semaphore(3)

    async def crawl_and_save(source: dict[str, Any]) -> Path:
        async with semaphore:
            print(f"Crawling: {source['url']}")
            article = await crawl_article(source)
            output_path = DATA_DIR / source["filename"]
            output_path.write_text(
                json.dumps(article, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            print(f"  ✓ Saved: {output_path.name}")
            return output_path

    results = await asyncio.gather(
        *(crawl_and_save(source) for source in ARTICLE_SOURCES),
        return_exceptions=True,
    )
    outputs: list[Path] = []
    errors: list[BaseException] = []
    for source, result in zip(ARTICLE_SOURCES, results):
        if isinstance(result, BaseException):
            errors.append(result)
            print(f"  ✗ {source['filename']}: {result}")
        else:
            outputs.append(result)

    if len(outputs) < 5:
        details = "; ".join(str(error) for error in errors)
        raise RuntimeError(
            f"Chỉ crawl thành công {len(outputs)}/{len(ARTICLE_SOURCES)} bài. {details}"
        )
    print(f"✓ Crawl thành công {len(outputs)}/{len(ARTICLE_SOURCES)} bài")
    return outputs


if __name__ == "__main__":
    asyncio.run(crawl_all())
