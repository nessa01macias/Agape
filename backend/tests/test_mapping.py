from agape.mapping import apply_template
from agape.models import ScrapedContent, Template, TemplateSlot
from agape.templates import get_template

STORY_REEL = Template(
    id="story-reel",
    name="Story Reel",
    slots=[
        TemplateSlot(id="hero", type="hero_image"),
        TemplateSlot(id="headline", type="headline", max_chars=20),
        TemplateSlot(id="body", type="body", max_chars=30),
        TemplateSlot(id="bg-1", type="image"),
        TemplateSlot(id="bg-2", type="image"),
    ],
)


def test_full_content_fills_every_slot():
    scraped = ScrapedContent(
        source_url="https://example.com",
        title="A short title",
        description="Fallback description",
        hero_image="https://example.com/hero.jpg",
        images=[
            "https://example.com/hero.jpg",
            "https://example.com/a.jpg",
            "https://example.com/b.jpg",
        ],
        text_blocks=["First paragraph of body text."],
    )

    result = apply_template(scraped, STORY_REEL)

    by_id = {s.slot_id: s.content for s in result.slots}
    assert by_id["hero"] == "https://example.com/hero.jpg"
    assert by_id["headline"] == "A short title"
    assert by_id["body"] == "First paragraph of body text."
    assert by_id["bg-1"] == "https://example.com/a.jpg"
    assert by_id["bg-2"] == "https://example.com/b.jpg"
    assert result.warnings == []


def test_hero_image_excluded_from_background_pool():
    scraped = ScrapedContent(
        source_url="https://example.com",
        title="T",
        hero_image="https://example.com/hero.jpg",
        images=["https://example.com/hero.jpg", "https://example.com/only-other.jpg"],
    )

    result = apply_template(scraped, STORY_REEL)
    by_id = {s.slot_id: s.content for s in result.slots}

    assert by_id["bg-1"] == "https://example.com/only-other.jpg"
    assert by_id["bg-2"] is None


def test_fewer_images_than_slots_leaves_remainder_empty_with_warning():
    scraped = ScrapedContent(
        source_url="https://example.com",
        title="T",
        hero_image="https://example.com/hero.jpg",
        images=["https://example.com/hero.jpg"],
    )

    result = apply_template(scraped, STORY_REEL)
    by_id = {s.slot_id: s.content for s in result.slots}

    assert by_id["bg-1"] is None
    assert by_id["bg-2"] is None
    assert any("background image" in w for w in result.warnings)


def test_no_images_at_all_does_not_crash():
    scraped = ScrapedContent(source_url="https://example.com", title="T")

    result = apply_template(scraped, STORY_REEL)
    by_id = {s.slot_id: s.content for s in result.slots}

    assert by_id["hero"] is None
    assert by_id["bg-1"] is None
    assert by_id["bg-2"] is None
    assert any("hero image" in w for w in result.warnings)


def test_body_falls_back_to_description_when_no_text_blocks():
    scraped = ScrapedContent(
        source_url="https://example.com",
        title="T",
        description="A" * 50,
        text_blocks=[],
    )

    result = apply_template(scraped, STORY_REEL)
    by_id = {s.slot_id: s.content for s in result.slots}

    assert by_id["body"] == "A" * 29 + "…"


def test_no_text_at_all_warns_but_does_not_crash():
    scraped = ScrapedContent(source_url="https://example.com")

    result = apply_template(scraped, STORY_REEL)
    by_id = {s.slot_id: s.content for s in result.slots}

    assert by_id["headline"] is None
    assert by_id["body"] is None
    assert any("No title" in w for w in result.warnings)
    assert any("No body text" in w for w in result.warnings)


def test_text_under_limit_is_not_truncated():
    scraped = ScrapedContent(source_url="https://example.com", title="Short")

    result = apply_template(scraped, STORY_REEL)
    by_id = {s.slot_id: s.content for s in result.slots}

    assert by_id["headline"] == "Short"


def test_screenshots_backfill_empty_image_slots():
    """A page with no usable <img> tags still fills its slots from screenshots."""
    scraped = ScrapedContent(
        source_url="https://example.com",
        title="Example",
        hero_image=None,
        images=[],
        screenshots=["https://shot/1.png", "https://shot/2.png"],
    )
    filled = apply_template(scraped, get_template("product-highlight"))
    by_type = {s.slot_id: s.content for s in filled.slots}

    assert by_type["hero"] == "https://shot/1.png"
    assert by_type["bg-1"] == "https://shot/2.png"
    # The body slot still warns (no text in this fixture); no image slot should.
    assert not [w for w in filled.warnings if "image" in w]


def test_screenshots_do_not_duplicate_scraped_images():
    scraped = ScrapedContent(
        source_url="https://example.com",
        title="Example",
        hero_image="https://img/hero.png",
        images=["https://img/hero.png", "https://shot/1.png"],
        screenshots=["https://shot/1.png"],
    )
    filled = apply_template(scraped, get_template("product-highlight"))
    contents = [s.content for s in filled.slots if s.type in ("hero_image", "image")]
    assert contents == ["https://img/hero.png", "https://shot/1.png"]
