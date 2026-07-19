import { useEffect, useState } from "react";
import {
  ApiError,
  applyTemplate,
  listTemplates,
  scrapeUrl,
  type FilledTemplate,
  type ScrapedContent,
  type Template,
} from "../../api/scrape";
import { FilledTemplatePreview } from "./FilledTemplatePreview";
import "./scrape.css";
import { ScrapePreviewCard } from "./ScrapePreviewCard";
import { TemplatePicker } from "./TemplatePicker";

type Step = "input" | "loading" | "preview" | "done";

export function LinkImportScreen() {
  const [step, setStep] = useState<Step>("input");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [scraped, setScraped] = useState<ScrapedContent | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [filled, setFilled] = useState<FilledTemplate | null>(null);

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch(() => {
        // Template list isn't critical for the import step itself; the picker
        // will just render empty and the user can retry by reloading.
      });
  }, []);

  async function handleImport(event: React.FormEvent) {
    event.preventDefault();
    if (!url.trim()) return;

    setStep("loading");
    setError(null);
    setNotice(null);

    try {
      const content = await scrapeUrl(url.trim(), true);
      setScraped(content);
      if (content.images.length <= 1) {
        setNotice("Only a preview image was found — some template slots may stay empty.");
      }
      setStep("preview");
    } catch {
      try {
        const content = await scrapeUrl(url.trim(), false);
        setScraped(content);
        setNotice("Full-page scrape wasn't available — only a preview image and title were found.");
        setStep("preview");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Something went wrong reaching that URL.");
        setStep("input");
      }
    }
  }

  async function handleSelectTemplate(templateId: string) {
    if (!scraped) return;
    setApplyingId(templateId);
    setError(null);
    try {
      const result = await applyTemplate(scraped, templateId);
      setFilled(result);
      setStep("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't build that template.");
    } finally {
      setApplyingId(null);
    }
  }

  function handleStartOver() {
    setStep("input");
    setUrl("");
    setScraped(null);
    setFilled(null);
    setError(null);
    setNotice(null);
  }

  if (step === "done" && filled) {
    return <FilledTemplatePreview filled={filled} onStartOver={handleStartOver} />;
  }

  return (
    <div className="link-import-screen">
      <h1>Paste a link, get a video</h1>
      <p className="link-import-subtitle">
        We'll pull the images and text from the page so you can drop them into a template.
      </p>

      <form className="link-import-form" onSubmit={handleImport}>
        <input
          type="url"
          inputMode="url"
          placeholder="https://example.com/product"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          disabled={step === "loading"}
          required
        />
        <button type="submit" disabled={step === "loading"}>
          {step === "loading" ? "Importing…" : "Import"}
        </button>
      </form>

      {error && <p className="link-import-error">{error}</p>}

      {step === "preview" && scraped && (
        <>
          <ScrapePreviewCard content={scraped} notice={notice ?? undefined} />
          <h2 className="link-import-templates-heading">Pick a template</h2>
          <TemplatePicker
            templates={templates}
            onSelect={handleSelectTemplate}
            applyingId={applyingId}
          />
        </>
      )}
    </div>
  );
}
