const BASE = "/api";

export type SlotType = "hero_image" | "image" | "headline" | "body";

export interface TemplateSlot {
  id: string;
  type: SlotType;
  max_chars: number | null;
}

export interface Template {
  id: string;
  name: string;
  slots: TemplateSlot[];
}

export interface ScrapedContent {
  source_url: string;
  title: string;
  description: string;
  hero_image: string | null;
  images: string[];
  text_blocks: string[];
}

export interface FilledSlot {
  slot_id: string;
  type: SlotType;
  content: string | null;
}

export interface FilledTemplate {
  template_id: string;
  template_name: string;
  slots: FilledSlot[];
  warnings: string[];
}

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => null);
    throw new ApiError(body?.detail || `Request failed (${resp.status})`);
  }
  return resp.json();
}

export function listTemplates(): Promise<Template[]> {
  return request<Template[]>("/templates");
}

export function scrapeUrl(url: string, full: boolean): Promise<ScrapedContent> {
  return request<ScrapedContent>("/scrape", {
    method: "POST",
    body: JSON.stringify({ url, full }),
  });
}

export function applyTemplate(
  scrapedContent: ScrapedContent,
  templateId: string,
): Promise<FilledTemplate> {
  return request<FilledTemplate>("/scrape/apply", {
    method: "POST",
    body: JSON.stringify({ scraped_content: scrapedContent, template_id: templateId }),
  });
}
