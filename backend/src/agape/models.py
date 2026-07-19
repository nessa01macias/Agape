from typing import Literal

from pydantic import BaseModel, Field

SlotType = Literal["hero_image", "image", "headline", "body"]


class TemplateSlot(BaseModel):
    id: str
    type: SlotType
    max_chars: int | None = None
    """Only meaningful for text slots (headline/body)."""


class Template(BaseModel):
    id: str
    name: str
    slots: list[TemplateSlot]


class ScrapedContent(BaseModel):
    source_url: str
    title: str = ""
    description: str = ""
    hero_image: str | None = None
    images: list[str] = Field(default_factory=list)
    text_blocks: list[str] = Field(default_factory=list)


class ScrapeRequest(BaseModel):
    url: str
    full: bool = False


class ApplyRequest(BaseModel):
    scraped_content: ScrapedContent
    template_id: str


class FilledSlot(BaseModel):
    slot_id: str
    type: SlotType
    content: str | None
    """None means the slot couldn't be filled (e.g. not enough images)."""


class FilledTemplate(BaseModel):
    template_id: str
    template_name: str
    slots: list[FilledSlot]
    warnings: list[str] = Field(default_factory=list)
