import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const FadeUp: React.FC<{ readonly children: React.ReactNode }> = ({
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 200 } });
  const translateY = interpolate(progress, [0, 1], [40, 0]);

  return (
    <div style={{ opacity: progress, transform: `translateY(${translateY}px)` }}>
      {children}
    </div>
  );
};

export const Titles: React.FC<{
  readonly brandName: string;
  readonly domain: string;
  readonly accent: string;
}> = ({ brandName, domain, accent }) => {
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        paddingLeft: 140,
        width: "55%",
        gap: 28,
        color: "#fafafa",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
      }}
    >
      <Sequence from={15} layout="none">
        <FadeUp>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: 10,
              color: accent,
            }}
          >
            INTRODUCING
          </div>
        </FadeUp>
      </Sequence>
      <Sequence from={26} layout="none">
        <FadeUp>
          <div
            style={{
              fontSize: 130,
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 1,
              textTransform: "capitalize",
            }}
          >
            {brandName}
          </div>
        </FadeUp>
      </Sequence>
      <Sequence from={42} layout="none">
        <FadeUp>
          <div style={{ fontSize: 36, color: "#a0a0a8" }}>
            Something big is coming.
          </div>
        </FadeUp>
      </Sequence>
      <Sequence from={58} layout="none">
        <FadeUp>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 24px",
              borderRadius: 999,
              border: "1px solid rgba(255, 255, 255, 0.18)",
              fontSize: 26,
              color: "#d0d0d6",
              alignSelf: "flex-start",
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: accent,
              }}
            />
            {domain}
          </div>
        </FadeUp>
      </Sequence>
    </AbsoluteFill>
  );
};
