import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  EASE_PUSH,
  FadeUp,
  SPRING_SNAP,
  STAGGER,
  enter,
  exitProgress,
} from "../motion";
import { fontStack, type Theme } from "../theme";

// Shot 1 — the hook. Huge centered headline, word-by-word punch-in,
// accent bar wipes in beneath. Fastest shot of the piece.
export const Shot1Hook: React.FC<{
  readonly headline: string;
  readonly theme: Theme;
  readonly duration: number;
}> = ({ headline, theme, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = exitProgress(frame, duration);

  const words = headline.split(" ");
  const barDelay = words.length * STAGGER + 4;
  const barProgress = enter(frame, fps, barDelay);
  const barScale = interpolate(barProgress, [0, 1], [0, 1], {
    easing: EASE_PUSH,
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        gap: 48,
        color: theme.colors.text,
        fontFamily: fontStack(theme),
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          columnGap: 36,
          rowGap: 8,
          maxWidth: 1500,
          fontSize: 128,
          fontWeight: theme.font.headingWeight,
          letterSpacing: `${theme.font.letterSpacing}em`,
          lineHeight: 1.08,
          textAlign: "center",
        }}
      >
        {words.map((word, i) => (
          <FadeUp
            key={`${word}-${i}`}
            delay={i * STAGGER}
            exit={exit}
            config={SPRING_SNAP}
          >
            <span
              style={{
                color:
                  i === words.length - 1 ? theme.colors.accent : undefined,
              }}
            >
              {word}
            </span>
          </FadeUp>
        ))}
      </div>
      <div
        style={{
          width: 180,
          height: 8,
          background: theme.colors.accent,
          transform: `scaleX(${barScale})`,
          opacity: 1 - exit,
        }}
      />
    </AbsoluteFill>
  );
};
