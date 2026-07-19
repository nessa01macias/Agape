import React from "react";
import { Composition } from "remotion";
import {
  DURATION_IN_FRAMES,
  FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from "./constants";
import { LaunchTemplate, launchSchema } from "./LaunchTemplate";
import { PRESET_THEMES } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Launch"
      component={LaunchTemplate}
      fps={FPS}
      durationInFrames={DURATION_IN_FRAMES}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
      schema={launchSchema}
      defaultProps={{
        brandName: "acme",
        domain: "acme.com",
        headline: "Your launch deserves better.",
        tagline: "Something big is coming.",
        cta: "Get early access",
        screenshotUrl: undefined,
        theme: PRESET_THEMES.neonDark,
      }}
    />
  );
};
