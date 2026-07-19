import { Player } from "@remotion/player";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { brandFromUrl } from "../brand";
import {
  DURATION_IN_FRAMES,
  FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from "../remotion/constants";
import { Scene } from "../remotion/Scene";

const page: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "#09090b",
};

const topBar: React.CSSProperties = {
  height: 52,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 20px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
  flexShrink: 0,
};

const stage: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 32,
  minHeight: 0,
};

export const Editor: React.FC = () => {
  const [searchParams] = useSearchParams();
  const url = searchParams.get("url") ?? "yourstartup.com";
  const brand = useMemo(() => brandFromUrl(url), [url]);

  const inputProps = useMemo(
    () => ({
      brandName: brand.name,
      domain: brand.domain,
      accent: brand.accent,
    }),
    [brand],
  );

  return (
    <div style={page}>
      <div style={topBar}>
        <Link
          to="/"
          style={{
            color: "#fafafa",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          Agape
        </Link>
        <div style={{ color: "#8b8b93", fontSize: 13 }}>{brand.domain}</div>
        <button
          style={{
            padding: "8px 16px",
            borderRadius: 10,
            border: "none",
            background: brand.accent,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
          onClick={() => alert("POC — render with: npm run render")}
          type="button"
        >
          Export MP4
        </button>
      </div>
      <div style={stage}>
        <Player
          component={Scene}
          inputProps={inputProps}
          durationInFrames={DURATION_IN_FRAMES}
          fps={FPS}
          compositionWidth={VIDEO_WIDTH}
          compositionHeight={VIDEO_HEIGHT}
          controls
          autoPlay
          loop
          style={{
            width: "100%",
            maxWidth: 1200,
            aspectRatio: "16 / 9",
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        />
      </div>
    </div>
  );
};
