from fastapi.testclient import TestClient

from agape.main import app
from agape.models import ScrapedContent
from agape.scraping import ScrapeError

client = TestClient(app)


def test_list_templates_returns_known_templates():
    resp = client.get("/api/templates")
    assert resp.status_code == 200
    ids = {t["id"] for t in resp.json()}
    assert "story-reel" in ids


def test_scrape_success(monkeypatch):
    async def fake_scrape(url: str, full: bool) -> ScrapedContent:
        return ScrapedContent(
            source_url=url,
            title="Example",
            description="An example page",
            hero_image="https://example.com/hero.jpg",
            images=["https://example.com/hero.jpg"],
        )

    monkeypatch.setattr("agape.api.scrape", fake_scrape)

    resp = client.post("/api/scrape", json={"url": "https://example.com"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "Example"
    assert body["hero_image"] == "https://example.com/hero.jpg"


def test_scrape_unreachable_url_returns_502(monkeypatch):
    async def fake_scrape(url: str, full: bool) -> ScrapedContent:
        raise ScrapeError(502, "Could not reach that URL")

    monkeypatch.setattr("agape.api.scrape", fake_scrape)

    resp = client.post("/api/scrape", json={"url": "https://nope.invalid"})

    assert resp.status_code == 502
    assert resp.json()["detail"] == "Could not reach that URL"


def test_scrape_timeout_returns_504(monkeypatch):
    async def fake_scrape(url: str, full: bool) -> ScrapedContent:
        raise ScrapeError(504, "Timed out reaching that URL")

    monkeypatch.setattr("agape.api.scrape", fake_scrape)

    resp = client.post("/api/scrape", json={"url": "https://slow.example"})

    assert resp.status_code == 504


def test_apply_unknown_template_returns_404():
    resp = client.post(
        "/api/scrape/apply",
        json={
            "scraped_content": {
                "source_url": "https://example.com",
                "title": "T",
            },
            "template_id": "does-not-exist",
        },
    )
    assert resp.status_code == 404


def test_apply_known_template_returns_filled_slots():
    resp = client.post(
        "/api/scrape/apply",
        json={
            "scraped_content": {
                "source_url": "https://example.com",
                "title": "A Title",
                "hero_image": "https://example.com/hero.jpg",
                "images": ["https://example.com/hero.jpg"],
            },
            "template_id": "quick-teaser",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["template_id"] == "quick-teaser"
    by_id = {s["slot_id"]: s["content"] for s in body["slots"]}
    assert by_id["hero"] == "https://example.com/hero.jpg"
    assert by_id["headline"] == "A Title"
