import type { FilledTemplate } from "../../api/scrape";

interface Props {
  filled: FilledTemplate;
  onStartOver: () => void;
}

/**
 * TODO(editor integration): once the real timeline/render pipeline exists,
 * this is where the filled template should hand off into it instead of
 * rendering a static slot list.
 */
export function FilledTemplatePreview({ filled, onStartOver }: Props) {
  return (
    <div className="filled-template-preview">
      <h3>{filled.template_name}</h3>

      {filled.warnings.length > 0 && (
        <ul className="filled-template-warnings">
          {filled.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      <div className="filled-template-slots">
        {filled.slots.map((slot) => (
          <div key={slot.slot_id} className={`filled-slot filled-slot--${slot.type}`}>
            <span className="filled-slot-label">{slot.slot_id}</span>
            {slot.content === null ? (
              <span className="filled-slot-empty">empty</span>
            ) : slot.type === "hero_image" || slot.type === "image" ? (
              <img src={slot.content} alt="" />
            ) : (
              <p>{slot.content}</p>
            )}
          </div>
        ))}
      </div>

      <button type="button" className="link-import-secondary" onClick={onStartOver}>
        Start over
      </button>
    </div>
  );
}
