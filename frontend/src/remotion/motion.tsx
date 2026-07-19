import React from "react";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// The entire template speaks three springs — nothing else.
export const SPRING_SMOOTH = { damping: 200 }; // text / UI
export const SPRING_HEAVY = { damping: 200, mass: 3 }; // 3D objects
export const SPRING_SNAP = { damping: 18, stiffness: 160, mass: 0.6 }; // punch-ins

// Choreography constants. Every enter moves up, every exit moves up —
// hard cuts read as one continuous upward stream.
export const STAGGER = 6; // frames between sibling elements
export const ENTER_RISE = 40; // px
export const EXIT_RISE = -80; // px
export const EXIT_FRAMES = 12; // exit window at the tail of shots 1-4
export const EASE_PUSH = Easing.out(Easing.cubic);

export type SpringConfig = {
  damping?: number;
  stiffness?: number;
  mass?: number;
};

export const enter = (
  frame: number,
  fps: number,
  delay = 0,
  config: SpringConfig = SPRING_SMOOTH,
): number => spring({ frame: frame - delay, fps, config });

// 0 -> 1 over the last `exitFrames` of a shot.
export const exitProgress = (
  frame: number,
  shotDuration: number,
  exitFrames = EXIT_FRAMES,
): number =>
  interpolate(frame, [shotDuration - exitFrames, shotDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });

export const idleSway = (frame: number, fps: number, amp = 0.16): number =>
  Math.sin((frame / fps) * 1.1) * amp;

export const idleBob = (frame: number, fps: number, amp = 0.03): number =>
  Math.sin((frame / fps) * 1.4) * amp;

// Every text element in every shot animates through this one component:
// spring up-enter, eased up-exit driven by the shot's exitProgress.
export const FadeUp: React.FC<{
  readonly delay?: number;
  readonly exit?: number;
  readonly config?: SpringConfig;
  readonly children: React.ReactNode;
}> = ({ delay = 0, exit = 0, config = SPRING_SMOOTH, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = enter(frame, fps, delay, config);
  const translateY =
    interpolate(progress, [0, 1], [ENTER_RISE, 0]) + exit * EXIT_RISE;
  const opacity = progress * (1 - exit);

  return (
    <div style={{ opacity, transform: `translateY(${translateY}px)` }}>
      {children}
    </div>
  );
};
