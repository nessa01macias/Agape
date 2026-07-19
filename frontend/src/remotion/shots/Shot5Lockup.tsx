import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FadeUp, SPRING_HEAVY, enter } from "../motion";
import { fontStack, pillRadius, radiusPx, type Theme } from "../theme";

// Shot 5 — the lockup. Monogram, name, domain, CTA settle into a hold;
// no exit — the end card is freeze-frame-worthy.
export const Shot5Lockup: React.FC<{
  readonly brandName: string;
  readonly domain: string;
  readonly cta: string;
  readonly theme: Theme;
}> = ({ brandName, domain, cta, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badge = enter(frame, fps, 0, SPRING_HEAVY);
  const settle = interpolate(enter(frame, fps, 0), [0, 1], [1.02, 1]);
  const breathe = 1 + Math.sin((frame / fps) * 1.2) * 0.04;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        transform: `scale(${settle})`,
        color: theme.colors.text,
        fontFamily: fontStack(theme),
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 45% 40% at 50% 45%, ${theme.colors.accent}22, transparent)`,
          opacity: breathe - 0.04,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 30,
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: radiusPx(theme, 70),
            background: theme.colors.accent,
            color: theme.colors.accentText,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 72,
            fontWeight: theme.font.headingWeight,
            transform: `scale(${badge})`,
          }}
        >
          {brandName.charAt(0).toUpperCase()}
        </div>
        <FadeUp delay={8}>
          <div
            style={{
              fontSize: 96,
              fontWeight: theme.font.headingWeight,
              letterSpacing: `${theme.font.letterSpacing}em`,
              lineHeight: 1,
              textTransform: "capitalize",
            }}
          >
            {brandName}
          </div>
        </FadeUp>
        <FadeUp delay={18}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 24px",
              borderRadius: pillRadius(theme),
              border: `1px solid ${theme.colors.muted}55`,
              fontSize: 26,
              color: theme.colors.muted,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: theme.colors.accent,
              }}
            />
            {domain}
          </div>
        </FadeUp>
        <FadeUp delay={30}>
          <div style={{ fontSize: 32, color: theme.colors.muted }}>{cta}</div>
        </FadeUp>
      </div>
    </AbsoluteFill>
  );
};
