import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { z } from "zod";
import { Phone } from "./Phone";
import { Titles } from "./Titles";

export const sceneSchema = z.object({
  brandName: z.string(),
  domain: z.string(),
  accent: z.string(),
  /* The three lines the planner writes. Defaulted so the composition
     still renders standalone in Studio and from a bare `remotion render`. */
  eyebrow: z.string().default("INTRODUCING"),
  tagline: z.string().default("Something big is coming."),
  footer: z.string().default("LAUNCHING SOON"),
});

export type SceneProps = z.infer<typeof sceneSchema>;

export const Scene: React.FC<SceneProps> = ({
  brandName,
  domain,
  accent,
  eyebrow,
  tagline,
  footer,
}) => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 70% 60% at 70% 45%, ${accent}26, transparent), radial-gradient(ellipse 50% 50% at 20% 80%, ${accent}14, transparent), #0b0b10`,
      }}
    >
      <ThreeCanvas linear width={width} height={height}>
        <ambientLight intensity={1.5} color={0xffffff} />
        <pointLight position={[10, 10, 0]} intensity={1.2} />
        <Phone brandName={brandName} domain={domain} accent={accent} footer={footer} />
      </ThreeCanvas>
      <Titles
        brandName={brandName}
        domain={domain}
        accent={accent}
        eyebrow={eyebrow}
        tagline={tagline}
      />
    </AbsoluteFill>
  );
};
