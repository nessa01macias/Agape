export const FPS = 30;
export const DURATION_IN_FRAMES = 360;
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;

// Single source of truth for both the template's sequencing and the
// editor timeline. Cuts land mid-motion at 54 / 120 / 234 / 294.
export const SHOTS = [
  { id: "hook", name: "Hook", from: 0, to: 54 },
  { id: "intro", name: "Intro", from: 54, to: 120 },
  { id: "product", name: "Product", from: 120, to: 234 },
  { id: "payoff", name: "Payoff", from: 234, to: 294 },
  { id: "lockup", name: "Lockup", from: 294, to: 360 },
] as const;

export type ShotId = (typeof SHOTS)[number]["id"];
