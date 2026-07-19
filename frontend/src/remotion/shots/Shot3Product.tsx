import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Laptop } from "../Laptop";
import { EASE_PUSH, FadeUp, exitProgress } from "../motion";
import { fontStack, pillRadius, type Theme } from "../theme";

// Shot 3 — the reveal. Laptop rises, lid hinges open onto the landing
// page, then a long slow push-in lets the product breathe. Longest shot.
export const Shot3Product: React.FC<{
  readonly brandName: string;
  readonly domain: string;
  readonly theme: Theme;
  readonly screenshotUrl?: string;
  readonly duration: number;
}> = ({ brandName, domain, theme, screenshotUrl, duration }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const exit = exitProgress(frame, duration);

  // DOM-level push-in — cheaper than animating the camera.
  const push = interpolate(frame, [40, duration], [1, 1.14], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_PUSH,
  });

  return (
    <AbsoluteFill style={{ fontFamily: fontStack(theme) }}>
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <ThreeCanvas linear width={width} height={height}>
          <ambientLight intensity={2.2} color={0xffffff} />
          <pointLight position={[10, 10, 0]} intensity={1.2} />
          <pointLight position={[0, 2, 6]} intensity={1.6} />
          <Laptop
            brandName={brandName}
            domain={domain}
            theme={theme}
            screenshotUrl={screenshotUrl}
          />
        </ThreeCanvas>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 120, bottom: 100 }}>
        <FadeUp delay={30} exit={exit}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 24px",
              borderRadius: pillRadius(theme),
              border: `1px solid ${theme.colors.muted}55`,
              background: `${theme.colors.surface}CC`,
              fontSize: 26,
              color: theme.colors.text,
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
      </div>
    </AbsoluteFill>
  );
};
