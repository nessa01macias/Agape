from agape.models import FilledSlot, FilledTemplate, ScrapedContent, Template


def _truncate(text: str, max_chars: int | None) -> str:
    if max_chars is None or len(text) <= max_chars:
        return text
    return text[: max_chars - 1].rstrip() + "…"


def apply_template(scraped: ScrapedContent, template: Template) -> FilledTemplate:
    hero_image = scraped.hero_image or (scraped.images[0] if scraped.images else None)

    # Screenshots backfill the image slots. A page with few usable <img> tags
    # still has a rendered look worth showing, and it beats an empty slot.
    candidates = list(scraped.images) + [
        shot for shot in scraped.screenshots if shot not in scraped.images
    ]
    if hero_image is None and candidates:
        hero_image = candidates[0]
    remaining_images = [img for img in candidates if img != hero_image]
    text_blocks = list(scraped.text_blocks)

    warnings: list[str] = []
    filled: list[FilledSlot] = []

    image_slots_needed = sum(1 for s in template.slots if s.type == "image")
    if image_slots_needed > len(remaining_images):
        warnings.append(
            f"Template wants {image_slots_needed} background image(s) but only "
            f"{len(remaining_images)} were available — some slots will be empty."
        )

    for slot in template.slots:
        content: str | None

        if slot.type == "hero_image":
            content = hero_image
            if content is None:
                warnings.append(f"No hero image found for slot '{slot.id}'.")

        elif slot.type == "image":
            content = remaining_images.pop(0) if remaining_images else None

        elif slot.type == "headline":
            content = _truncate(scraped.title, slot.max_chars) if scraped.title else None
            if content is None:
                warnings.append(f"No title found for slot '{slot.id}'.")

        elif slot.type == "body":
            if text_blocks:
                content = _truncate(text_blocks.pop(0), slot.max_chars)
            elif scraped.description:
                content = _truncate(scraped.description, slot.max_chars)
            else:
                content = None
                warnings.append(f"No body text found for slot '{slot.id}'.")

        filled.append(FilledSlot(slot_id=slot.id, type=slot.type, content=content))

    return FilledTemplate(
        template_id=template.id,
        template_name=template.name,
        slots=filled,
        warnings=warnings,
    )
