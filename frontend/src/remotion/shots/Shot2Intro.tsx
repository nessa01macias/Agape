import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  EASE_PUSH,
  FadeUp,
  STAGGER,
  enter,
  exitProgress,
} from "../motion";
import { fontStack, type Theme } from "../theme";

// Shot 2 — intrigue. Pure typographic introduction of the brand; a slow
// push starts near the end so the cut into Shot 3 inherits zoom energy.
export const Shot2Intro: React.FC<{
  readonly brandName: string;
  readonly theme: Theme;
  readonly duration: number;
}> = ({ brandName, theme, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = exitProgress(frame, duration);

  const push = interpolate(frame, [duration - 20, duration], [1, 1.05], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_PUSH,
  });

  // Accent ring motif drawing in behind the type.
  const ringProgress = enter(frame, fps, STAGGER);
  const ringScale = interpolate(ringProgress, [0, 1], [0.6, 1]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        transform: `scale(${push})`,
        color: theme.colors.text,
        fontFamily: fontStack(theme),
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 640,
          height: 640,
          borderRadius: "50%",
          border: `2px solid ${theme.colors.accent}`,
          opacity: ringProgress * 0.25 * (1 - exit),
          transform: `scale(${ringScale})`,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
        }}
      >
        <FadeUp exit={exit}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: 10,
              color: theme.colors.accent,
            }}
          >
            INTRODUCING
          </div>
        </FadeUp>
        <FadeUp delay={2 * STAGGER} exit={exit}>
          <div
            style={{
              fontSize: 150,
              fontWeight: theme.font.headingWeight,
              letterSpacing: `${theme.font.letterSpacing}em`,
              lineHeight: 1,
              textTransform: "capitalize",
            }}
          >
            {brandName}
          </div>
        </FadeUp>
      </div>
    </AbsoluteFill>
  );
};
