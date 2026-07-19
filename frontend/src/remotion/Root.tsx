import React from "react";
import { Composition } from "remotion";
import {
  DURATION_IN_FRAMES,
  FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from "./constants";
import { Scene, sceneSchema } from "./Scene";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Scene"
      component={Scene}
      fps={FPS}
      durationInFrames={DURATION_IN_FRAMES}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
      schema={sceneSchema}
      defaultProps={{
        brandName: "acme",
        domain: "acme.com",
        accent: "#6C5CE7",
        eyebrow: "INTRODUCING",
        tagline: "Something big is coming.",
        footer: "LAUNCHING SOON",
      }}
    />
  );
};
