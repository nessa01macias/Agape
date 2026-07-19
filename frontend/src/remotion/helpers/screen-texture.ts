import type { Theme } from "../theme";

type Ctx2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

// Procedural brand screen — fallback for devices when no screenshot exists.
// Works portrait (phone) and landscape (laptop lid).
export const drawBrandScreen = (
  ctx: Ctx2D,
  {
    width: w,
    height: h,
    brandName,
    domain,
    theme,
  }: {
    width: number;
    height: number;
    brandName: string;
    domain: string;
    theme: Theme;
  },
) => {
  const { colors } = theme;
  const unit = Math.min(w, h);

  ctx.fillStyle = colors.surface;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(
    w / 2,
    h * 0.38,
    0,
    w / 2,
    h * 0.38,
    h * 0.5,
  );
  glow.addColorStop(0, `${colors.accent}66`);
  glow.addColorStop(1, "#00000000");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Monogram
  const monogramR = unit * 0.14;
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.34, monogramR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.accentText;
  ctx.font = `bold ${unit * 0.15}px 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillText(brandName.charAt(0).toUpperCase(), w / 2, h * 0.34 + unit * 0.01);

  // Brand name + domain
  ctx.fillStyle = colors.text;
  ctx.font = `bold ${unit * 0.09}px 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillText(brandName, w / 2, h * 0.56);
  ctx.fillStyle = colors.muted;
  ctx.font = `${unit * 0.045}px 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillText(domain, w / 2, h * 0.63);

  ctx.fillStyle = colors.muted;
  ctx.font = `${unit * 0.035}px 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillText("L A U N C H I N G   S O O N", w / 2, h * 0.85);
};

// Cover-crop anchored to the top: horizontal center, vertical top —
// a landing page's hero survives, the footer crops away.
export const drawImageCoverTop = (
  ctx: Ctx2D,
  img: CanvasImageSource & { width: number; height: number },
  w: number,
  h: number,
) => {
  const scale = Math.max(w / img.width, h / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  ctx.drawImage(img, (w - drawW) / 2, 0, drawW, drawH);
};
