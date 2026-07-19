"""Minimal hardcoded template registry.

Placeholder until a real template/render pipeline exists. Slot shape
(hero_image / image / headline / body) is the contract the scraper maps
onto — extend this list as real templates are designed, keeping the slot
`type` values in sync with models.SlotType.
"""

from agape.models import Template, TemplateSlot

TEMPLATES: dict[str, Template] = {
    t.id: t
    for t in [
        Template(
            id="story-reel",
            name="Story Reel",
            slots=[
                TemplateSlot(id="hero", type="hero_image"),
                TemplateSlot(id="headline", type="headline", max_chars=60),
                TemplateSlot(id="body", type="body", max_chars=200),
                TemplateSlot(id="bg-1", type="image"),
                TemplateSlot(id="bg-2", type="image"),
                TemplateSlot(id="bg-3", type="image"),
            ],
        ),
        Template(
            id="product-highlight",
            name="Product Highlight",
            slots=[
                TemplateSlot(id="hero", type="hero_image"),
                TemplateSlot(id="headline", type="headline", max_chars=40),
                TemplateSlot(id="body", type="body", max_chars=120),
                TemplateSlot(id="bg-1", type="image"),
            ],
        ),
        Template(
            id="quick-teaser",
            name="Quick Teaser",
            slots=[
                TemplateSlot(id="hero", type="hero_image"),
                TemplateSlot(id="headline", type="headline", max_chars=80),
            ],
        ),
    ]
}


def list_templates() -> list[Template]:
    return list(TEMPLATES.values())


def get_template(template_id: str) -> Template | None:
    return TEMPLATES.get(template_id)
