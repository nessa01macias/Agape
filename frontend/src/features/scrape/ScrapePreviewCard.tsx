import type { ScrapedContent } from "../../api/scrape";

interface Props {
  content: ScrapedContent;
  notice?: string;
}

export function ScrapePreviewCard({ content, notice }: Props) {
  return (
    <div className="scrape-preview-card">
      {content.hero_image ? (
        <img className="scrape-preview-hero" src={content.hero_image} alt="" />
      ) : (
        <div className="scrape-preview-hero scrape-preview-hero--empty">No image found</div>
      )}
      <div className="scrape-preview-body">
        <h3>{content.title || "Untitled page"}</h3>
        {content.description && <p>{content.description}</p>}
        <p className="scrape-preview-meta">
          {content.images.length} image{content.images.length === 1 ? "" : "s"} found
        </p>
        {notice && <p className="scrape-preview-notice">{notice}</p>}
      </div>
    </div>
  );
}
