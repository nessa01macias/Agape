import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  EASE_PUSH,
  FadeUp,
  SPRING_SMOOTH,
  STAGGER,
  enter,
  exitProgress,
} from "../motion";
import { fontStack, type Theme } from "../theme";

// Shot 4 — the payoff. The tagline lands as the emotional peak; the
// container settles from 1.06 so it inherits Shot 3's zoom momentum.
export const Shot4Payoff: React.FC<{
  readonly tagline: string;
  readonly theme: Theme;
  readonly duration: number;
}> = ({ tagline, theme, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = exitProgress(frame, duration);

  const words = tagline.split(" ");
  const settle = enter(frame, fps, 0, SPRING_SMOOTH);
  const scale = interpolate(settle, [0, 1], [1.06, 1]);

  const underlineDelay = words.length * STAGGER + 6;
  const underlineProgress = interpolate(
    enter(frame, fps, underlineDelay),
    [0, 1],
    [0, 1],
    { easing: EASE_PUSH },
  );

  const bloom = enter(frame, fps, STAGGER) * 0.5;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        transform: `scale(${scale})`,
        color: theme.colors.text,
        fontFamily: fontStack(theme),
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 55% 45% at 50% 50%, ${theme.colors.accent}33, transparent)`,
          opacity: bloom * (1 - exit),
        }}
      />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          columnGap: 30,
          rowGap: 8,
          maxWidth: 1450,
          fontSize: 108,
          fontWeight: theme.font.headingWeight,
          letterSpacing: `${theme.font.letterSpacing}em`,
          lineHeight: 1.12,
          textAlign: "center",
        }}
      >
        {words.map((word, i) => {
          const isLast = i === words.length - 1;
          return (
            <FadeUp key={`${word}-${i}`} delay={i * STAGGER} exit={exit}>
              <span style={{ position: "relative", display: "inline-block" }}>
                {word}
                {isLast ? (
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: -14,
                      height: 8,
                      background: theme.colors.accent,
                      transform: `scaleX(${underlineProgress})`,
                      transformOrigin: "left",
                    }}
                  />
                ) : null}
              </span>
            </FadeUp>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
