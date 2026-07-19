from fastapi import APIRouter, HTTPException

from agape.mapping import apply_template
from agape.models import ApplyRequest, FilledTemplate, ScrapedContent, ScrapeRequest, Template
from agape.scraping import ScrapeError, scrape
from agape.templates import get_template, list_templates

router = APIRouter(prefix="/api")


@router.get("/templates")
async def get_templates() -> list[Template]:
    return list_templates()


@router.post("/scrape")
async def scrape_url(req: ScrapeRequest) -> ScrapedContent:
    try:
        return await scrape(req.url, full=req.full, screenshots=req.screenshots)
    except ScrapeError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/scrape/apply")
async def apply_scrape(req: ApplyRequest) -> FilledTemplate:
    template = get_template(req.template_id)
    if template is None:
        raise HTTPException(status_code=404, detail=f"Unknown template '{req.template_id}'")
    return apply_template(req.scraped_content, template)
