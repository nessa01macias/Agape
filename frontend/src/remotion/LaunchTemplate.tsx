import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { z } from "zod";
import { Background } from "./Background";
import { SHOTS } from "./constants";
import { themeSchema } from "./theme";
import { Shot1Hook } from "./shots/Shot1Hook";
import { Shot2Intro } from "./shots/Shot2Intro";
import { Shot3Product } from "./shots/Shot3Product";
import { Shot4Payoff } from "./shots/Shot4Payoff";
import { Shot5Lockup } from "./shots/Shot5Lockup";

export const launchSchema = z.object({
  brandName: z.string(),
  domain: z.string(),
  headline: z.string(),
  tagline: z.string(),
  cta: z.string(),
  screenshotUrl: z.string().optional(),
  theme: themeSchema,
});

export type LaunchProps = z.infer<typeof launchSchema>;

const duration = (i: number) => SHOTS[i].to - SHOTS[i].from;

// The 12s launch template: hook -> intrigue -> product reveal -> payoff
// -> brand lockup. Five hard cuts, one shared upward motion language.
export const LaunchTemplate: React.FC<LaunchProps> = (props) => {
  const { brandName, domain, headline, tagline, cta, screenshotUrl, theme } =
    props;

  const shots: React.ReactNode[] = [
    <Shot1Hook
      key="hook"
      headline={headline}
      theme={theme}
      duration={duration(0)}
    />,
    <Shot2Intro
      key="intro"
      brandName={brandName}
      theme={theme}
      duration={duration(1)}
    />,
    <Shot3Product
      key="product"
      brandName={brandName}
      domain={domain}
      theme={theme}
      screenshotUrl={screenshotUrl}
      duration={duration(2)}
    />,
    <Shot4Payoff
      key="payoff"
      tagline={tagline}
      theme={theme}
      duration={duration(3)}
    />,
    <Shot5Lockup
      key="lockup"
      brandName={brandName}
      domain={domain}
      cta={cta}
      theme={theme}
    />,
  ];

  return (
    <AbsoluteFill style={{ background: theme.colors.bg }}>
      <Background theme={theme} />
      {SHOTS.map((shot, i) => (
        <Sequence
          key={shot.id}
          name={shot.name}
          from={shot.from}
          durationInFrames={shot.to - shot.from}
        >
          {shots[i]}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
