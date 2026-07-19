import type { Template } from "../../api/scrape";

interface Props {
  templates: Template[];
  onSelect: (templateId: string) => void;
  applyingId: string | null;
}

const SLOT_LABEL: Record<string, string> = {
  hero_image: "hero image",
  image: "background image",
  headline: "headline",
  body: "body text",
};

export function TemplatePicker({ templates, onSelect, applyingId }: Props) {
  return (
    <div className="template-picker">
      {templates.map((template) => {
        const counts = template.slots.reduce<Record<string, number>>((acc, slot) => {
          acc[slot.type] = (acc[slot.type] ?? 0) + 1;
          return acc;
        }, {});
        const summary = Object.entries(counts)
          .map(([type, count]) => `${count} ${SLOT_LABEL[type] ?? type}${count > 1 ? "s" : ""}`)
          .join(" · ");

        return (
          <button
            key={template.id}
            type="button"
            className="template-card"
            disabled={applyingId !== null}
            onClick={() => onSelect(template.id)}
          >
            <h4>{template.name}</h4>
            <p>{summary}</p>
            {applyingId === template.id && <span className="template-card-loading">Building…</span>}
          </button>
        );
      })}
    </div>
  );
}
