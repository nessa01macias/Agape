import os
import re

import httpx
from bs4 import BeautifulSoup

from agape.models import ScrapedContent

MICROLINK_TIMEOUT = 10.0
FIRECRAWL_TIMEOUT = 30.0

_MIN_TEXT_BLOCK_LEN = 40
_MAX_TEXT_BLOCKS = 12
_MAX_IMAGES = 30


class ScrapeError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)


def _microlink_config() -> tuple[str, dict[str, str]]:
    api_key = os.environ.get("MICROLINK_API_KEY")
    if api_key:
        return "https://pro.microlink.io", {"x-api-key": api_key}
    return "https://api.microlink.io", {}


async def fetch_microlink(client: httpx.AsyncClient, url: str) -> dict:
    base, headers = _microlink_config()
    try:
        resp = await client.get(
            base,
            params={"url": url, "palette": "true"},
            headers=headers,
            timeout=MICROLINK_TIMEOUT,
        )
    except httpx.TimeoutException as exc:
        raise ScrapeError(504, "Timed out reaching that URL") from exc
    except httpx.RequestError as exc:
        raise ScrapeError(502, "Could not reach that URL") from exc

    if resp.status_code != 200:
        raise ScrapeError(502, f"Metadata lookup failed ({resp.status_code})")

    body = resp.json()
    if body.get("status") != "success":
        raise ScrapeError(502, "Metadata lookup failed")
    return body.get("data", {})


async def fetch_firecrawl(client: httpx.AsyncClient, url: str) -> dict:
    api_key = os.environ.get("FIRECRAWL_API_KEY")
    if not api_key:
        raise ScrapeError(500, "FIRECRAWL_API_KEY is not configured")

    try:
        resp = await client.post(
            "https://api.firecrawl.dev/v1/scrape",
            json={"url": url, "formats": ["markdown", "html"]},
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=FIRECRAWL_TIMEOUT,
        )
    except httpx.TimeoutException as exc:
        raise ScrapeError(504, "Timed out scraping that page") from exc
    except httpx.RequestError as exc:
        raise ScrapeError(502, "Could not reach that URL") from exc

    if resp.status_code != 200:
        raise ScrapeError(502, f"Full-page scrape failed ({resp.status_code})")

    body = resp.json()
    if not body.get("success"):
        raise ScrapeError(502, body.get("error") or "Full-page scrape failed")
    return body.get("data", {})


def _extract_images_from_html(html: str, base_url: str) -> list[str]:
    if not html:
        return []
    soup = BeautifulSoup(html, "html.parser")
    seen: set[str] = set()
    images: list[str] = []
    for img in soup.find_all("img"):
        src = img.get("src")
        if not src or not src.startswith(("http://", "https://")):
            continue
        if src in seen:
            continue
        seen.add(src)
        images.append(src)
        if len(images) >= _MAX_IMAGES:
            break
    return images


def _extract_text_blocks_from_markdown(markdown: str) -> list[str]:
    if not markdown:
        return []
    blocks = []
    for raw in re.split(r"\n{2,}", markdown):
        text = raw.strip().lstrip("#").strip()
        text = re.sub(r"[!\[\]()]|https?://\S+", "", text).strip()
        if len(text) >= _MIN_TEXT_BLOCK_LEN:
            blocks.append(text)
        if len(blocks) >= _MAX_TEXT_BLOCKS:
            break
    return blocks


async def scrape(url: str, full: bool) -> ScrapedContent:
    async with httpx.AsyncClient() as client:
        meta = await fetch_microlink(client, url)

        hero_image = (meta.get("image") or {}).get("url")
        content = ScrapedContent(
            source_url=url,
            title=meta.get("title") or "",
            description=meta.get("description") or "",
            hero_image=hero_image,
            images=[hero_image] if hero_image else [],
        )

        if full:
            page = await fetch_firecrawl(client, url)
            html_images = _extract_images_from_html(page.get("html", ""), url)
            merged = list(content.images)
            for img in html_images:
                if img not in merged:
                    merged.append(img)
            content.images = merged
            content.text_blocks = _extract_text_blocks_from_markdown(
                page.get("markdown", "")
            )

        return content
