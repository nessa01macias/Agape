import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import type { Theme } from "./theme";

// One continuous grayscale clip runs under the entire video — no cuts.
const BackgroundVideo: React.FC<{
  readonly opacity: number;
  readonly mixBlendMode?: React.CSSProperties["mixBlendMode"];
}> = ({ opacity, mixBlendMode }) => (
  <AbsoluteFill style={{ opacity, mixBlendMode }}>
    <OffthreadVideo
      src={staticFile("agape-background-1.mov")}
      muted
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  </AbsoluteFill>
);

// Grayscale footage + theme tint. The same clip generalizes across all
// design styles because the tint layers read only theme tokens.
export const Background: React.FC<{
  readonly theme: Theme;
}> = ({ theme }) => {
  const { colors, background } = theme;

  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      {background === "tinted" || background === "glow" ? (
        <>
          <BackgroundVideo opacity={0.14} />
          <AbsoluteFill
            style={{
              background: colors.accent,
              mixBlendMode: "color",
              opacity: 0.22,
            }}
          />
        </>
      ) : null}
      {background === "duotone" ? (
        <>
          <BackgroundVideo opacity={1} mixBlendMode="luminosity" />
          <AbsoluteFill
            style={{ background: colors.accent, mixBlendMode: "color" }}
          />
        </>
      ) : null}
      {background === "glow" ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 70% 60% at 70% 45%, ${colors.accent}26, transparent), radial-gradient(ellipse 50% 50% at 20% 80%, ${colors.accent}14, transparent)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
