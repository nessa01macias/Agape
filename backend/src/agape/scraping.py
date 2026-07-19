import asyncio
import os
import re
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from agape.models import ScrapedContent

SCREENSHOT_TTL_NOTE = (
    "Firecrawl screenshot URLs are signed and expire. Download and re-host them "
    "before persisting a template that references them."
)

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


async def fetch_firecrawl(
    client: httpx.AsyncClient,
    url: str,
    *,
    screenshot: bool = False,
    full_page: bool = True,
) -> dict:
    api_key = os.environ.get("FIRECRAWL_API_KEY")
    if not api_key:
        raise ScrapeError(500, "FIRECRAWL_API_KEY is not configured")

    formats: list[object] = ["markdown", "html"]
    if screenshot:
        formats.append({"type": "screenshot", "fullPage": full_page})

    try:
        resp = await client.post(
            "https://api.firecrawl.dev/v2/scrape",
            json={"url": url, "formats": formats},
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


async def map_site(client: httpx.AsyncClient, url: str, limit: int) -> list[str]:
    """Same-host, shallow-path pages worth shooting alongside the landing page.

    Firecrawl's map returns whatever it has crawled, which for a large site is
    mostly deep docs/jobs URLs. We want pages that look like a marketing site's
    top level, so filter to the same host and at most one path segment.
    """
    api_key = os.environ.get("FIRECRAWL_API_KEY")
    if not api_key:
        return []

    try:
        resp = await client.post(
            "https://api.firecrawl.dev/v2/map",
            json={"url": url, "limit": 60},
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=FIRECRAWL_TIMEOUT,
        )
    except httpx.RequestError:
        return []  # Extra shots are a bonus; never fail the scrape over them.

    if resp.status_code != 200:
        return []

    host = urlparse(url).netloc.removeprefix("www.")
    picked: list[str] = []
    for link in (resp.json().get("links") or []):
        href = link.get("url") if isinstance(link, dict) else link
        if not isinstance(href, str):
            continue
        parts = urlparse(href)
        if parts.netloc.removeprefix("www.") != host:
            continue
        # Shallow paths only. Two segments rather than one, because many sites
        # locale-prefix their top level (stripe.com/nz/pricing).
        depth = [seg for seg in parts.path.split("/") if seg]
        if len(depth) > 2:
            continue
        if href.rstrip("/") == url.rstrip("/") or href in picked:
            continue
        picked.append(href)
        if len(picked) >= limit:
            break
    return picked


async def _shoot(client: httpx.AsyncClient, url: str) -> str | None:
    """One viewport screenshot, or None — a failed extra shot is not fatal."""
    try:
        page = await fetch_firecrawl(client, url, screenshot=True, full_page=False)
    except ScrapeError:
        return None
    return page.get("screenshot")


async def scrape(url: str, full: bool, screenshots: int = 0) -> ScrapedContent:
    async with httpx.AsyncClient() as client:
        # Microlink is the fast path, but its free tier is rate-limited and
        # times out on big sites. When a Firecrawl pass is coming anyway it
        # returns the same fields (title/description/ogImage/favicon), so a
        # metadata failure shouldn't sink the whole scrape.
        deep = full or bool(screenshots)
        try:
            meta = await fetch_microlink(client, url)
        except ScrapeError:
            if not deep:
                raise
            meta = {}

        hero_image = (meta.get("image") or {}).get("url")
        content = ScrapedContent(
            source_url=url,
            title=meta.get("title") or "",
            description=meta.get("description") or "",
            hero_image=hero_image,
            images=[hero_image] if hero_image else [],
            favicon=(meta.get("logo") or {}).get("url"),
            accent=(meta.get("palette") or [None])[0],
        )

        if full or screenshots:
            page = await fetch_firecrawl(client, url, screenshot=bool(screenshots))
            html_images = _extract_images_from_html(page.get("html", ""), url)
            merged = list(content.images)
            for img in html_images:
                if img not in merged:
                    merged.append(img)
            content.images = merged
            content.text_blocks = _extract_text_blocks_from_markdown(
                page.get("markdown", "")
            )

            # Firecrawl's metadata is richer than Microlink's on some sites;
            # fill only what the metadata pass left empty.
            fc_meta = page.get("metadata") or {}
            content.title = content.title or fc_meta.get("title") or ""
            content.description = content.description or fc_meta.get("description") or ""
            if not content.hero_image and fc_meta.get("ogImage"):
                content.hero_image = fc_meta["ogImage"]

            landing = page.get("screenshot")
            if landing:
                content.screenshots.append(landing)

        # Remaining shots come from other top-level pages, in parallel.
        wanted = screenshots - len(content.screenshots)
        if wanted > 0:
            extra_urls = await map_site(client, url, wanted)
            if extra_urls:
                shots = await asyncio.gather(*(_shoot(client, u) for u in extra_urls))
                content.screenshots.extend(s for s in shots if s)

        return content
