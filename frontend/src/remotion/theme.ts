import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { z } from "zod";

export const fontFamilySchema = z.enum([
  "Inter",
  "Space Grotesk",
  "Poppins",
  "Playfair Display",
]);

export type FontFamily = z.infer<typeof fontFamilySchema>;

export const themeSchema = z.object({
  colors: z.object({
    bg: z.string(),
    surface: z.string(),
    text: z.string(),
    muted: z.string(),
    accent: z.string(),
    accentText: z.string(),
  }),
  font: z.object({
    family: fontFamilySchema,
    headingWeight: z.number().min(300).max(900),
    // In em. Negative = tight display type.
    letterSpacing: z.number(),
  }),
  // 0 = sharp corners, 1 = fully round.
  radius: z.number().min(0).max(1),
  background: z.enum(["flat", "tinted", "duotone", "glow"]),
});

export type Theme = z.infer<typeof themeSchema>;

const inter = loadInter("normal", {
  subsets: ["latin"],
  weights: ["400", "600", "700", "800"],
});
const spaceGrotesk = loadSpaceGrotesk("normal", {
  subsets: ["latin"],
  weights: ["400", "500", "600", "700"],
});
const poppins = loadPoppins("normal", {
  subsets: ["latin"],
  weights: ["400", "600", "700", "800"],
});
const playfair = loadPlayfair("normal", {
  subsets: ["latin"],
  weights: ["400", "600", "700", "800"],
});

export const FONT_STACKS: Record<FontFamily, string> = {
  Inter: `'${inter.fontFamily}', sans-serif`,
  "Space Grotesk": `'${spaceGrotesk.fontFamily}', sans-serif`,
  Poppins: `'${poppins.fontFamily}', sans-serif`,
  "Playfair Display": `'${playfair.fontFamily}', serif`,
};

export const fontStack = (theme: Theme): string =>
  FONT_STACKS[theme.font.family];

export const radiusPx = (theme: Theme, base: number): number =>
  theme.radius * base;

// Pills snap to fully-round once the theme is round enough.
export const pillRadius = (theme: Theme): number =>
  theme.radius >= 0.85 ? 999 : theme.radius * 28;

// Screen corner radius for 3D devices, in world units per baseScale.
export const deviceRadius = (theme: Theme, baseScale: number): number =>
  baseScale * (0.02 + theme.radius * 0.07);

const hexLerp = (a: string, b: string, t: number): string => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const mix = (shift: number) => {
    const ca = (pa >> shift) & 0xff;
    const cb = (pb >> shift) & 0xff;
    return Math.round(ca + (cb - ca) * t);
  };
  return `#${((mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).padStart(6, "0")}`;
};

// Device bodies need contrast against the background; a near-black or
// near-white surface token would read as a silhouette, so pull it
// toward the text colour. Different amounts keep deck and lid distinct.
export const deviceBodyColor = (theme: Theme, amount = 0.25): string =>
  hexLerp(theme.colors.surface, theme.colors.text, amount);

export const PRESET_THEMES: Record<string, Theme> = {
  neonDark: {
    colors: {
      bg: "#07070B",
      surface: "#14141C",
      text: "#F4F4FA",
      muted: "#8B8B9A",
      accent: "#B6FF3B",
      accentText: "#07070B",
    },
    font: { family: "Space Grotesk", headingWeight: 700, letterSpacing: -0.01 },
    radius: 0.6,
    background: "glow",
  },
  minimalLight: {
    colors: {
      bg: "#FAFAF7",
      surface: "#FFFFFF",
      text: "#141414",
      muted: "#6B6B6B",
      accent: "#2563EB",
      accentText: "#FFFFFF",
    },
    font: { family: "Inter", headingWeight: 700, letterSpacing: -0.02 },
    radius: 0.15,
    background: "tinted",
  },
  warmSerif: {
    colors: {
      bg: "#F5EDE2",
      surface: "#FFF9F0",
      text: "#2C2118",
      muted: "#8A7A68",
      accent: "#C1502E",
      accentText: "#FFF6EC",
    },
    font: { family: "Playfair Display", headingWeight: 600, letterSpacing: 0 },
    radius: 0.95,
    background: "duotone",
  },
};

export const DEFAULT_THEME: Theme = PRESET_THEMES.neonDark;
