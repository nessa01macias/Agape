import { useThree } from "@react-three/fiber";
import React, { useEffect, useMemo, useState } from "react";
import {
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CanvasTexture, Color, type Texture } from "three";
import {
  LAPTOP_CAMERA_DISTANCE,
  LAPTOP_SCREEN_ASPECT,
  PHONE_CURVE_SEGMENTS,
  getLaptopLayout,
} from "./helpers/layout";
import { roundedRect } from "./helpers/rounded-rectangle";
import { drawBrandScreen, drawImageCoverTop } from "./helpers/screen-texture";
import { SPRING_HEAVY, idleBob, idleSway } from "./motion";
import { deviceBodyColor, deviceRadius, type Theme } from "./theme";
import { RoundedBox } from "./RoundedBox";

const BASE_SCALE = 1.9;
const TEXTURE_WIDTH = 1440;
const TEXTURE_HEIGHT = 900;

// Hinge rotation: PI/2 = lid flat on the deck (closed, screen down),
// -0.35 = opened past vertical to ~110 degrees.
const HINGE_CLOSED = Math.PI / 2;
const HINGE_OPEN = -0.35;
const HINGE_DELAY_FRAMES = 8;

// The canvas renders in linear color space (`ThreeCanvas linear`), which
// would darken sRGB hex colors ~4x. Pre-applying the inverse conversion
// makes the body colors land on screen exactly as authored.
const asLinearSafeColor = (hex: string): Color =>
  new Color(hex).convertLinearToSRGB();

// Root-relative paths point into /public — those must go through
// staticFile so they resolve inside `remotion render` too, where public
// assets are served from a hashed route.
const resolveScreenshotUrl = (url: string): string =>
  /^(https?:|data:|blob:)/.test(url) ? url : staticFile(url.replace(/^\//, ""));

const makeScreenTexture = (
  draw: (ctx: OffscreenCanvasRenderingContext2D) => void,
  screenWidth: number,
  screenHeight: number,
): Texture => {
  const canvas = new OffscreenCanvas(TEXTURE_WIDTH, TEXTURE_HEIGHT);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2d context");
  }
  draw(ctx);
  const tex = new CanvasTexture(canvas);
  // shapeGeometry UVs are in world units (same convention as the phone).
  tex.repeat.x = 1 / screenWidth;
  tex.repeat.y = 1 / screenHeight;
  return tex;
};

export const Laptop: React.FC<{
  readonly brandName: string;
  readonly domain: string;
  readonly theme: Theme;
  readonly screenshotUrl?: string;
}> = ({ brandName, domain, theme, screenshotUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const camera = useThree((state) => state.camera);
  useEffect(() => {
    camera.position.set(0, 0, LAPTOP_CAMERA_DISTANCE);
    camera.near = 0.2;
    camera.far = Math.max(5000, LAPTOP_CAMERA_DISTANCE * 2);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  const layout = useMemo(
    () =>
      getLaptopLayout(
        LAPTOP_SCREEN_ASPECT,
        BASE_SCALE,
        deviceRadius(theme, BASE_SCALE),
      ),
    [theme],
  );

  const screenGeometry = useMemo(
    () =>
      roundedRect({
        width: layout.screen.width,
        height: layout.screen.height,
        radius: layout.screen.radius,
      }),
    [layout],
  );

  const fallbackTexture = useMemo(
    () =>
      makeScreenTexture(
        (ctx) =>
          drawBrandScreen(ctx, {
            width: TEXTURE_WIDTH,
            height: TEXTURE_HEIGHT,
            brandName,
            domain,
            theme,
          }),
        layout.screen.width,
        layout.screen.height,
      ),
    [brandName, domain, theme, layout],
  );

  const [screenshotTexture, setScreenshotTexture] = useState<Texture | null>(
    null,
  );
  useEffect(() => {
    if (!screenshotUrl) {
      setScreenshotTexture(null);
      return;
    }
    const handle = delayRender("laptop screenshot");
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        continueRender(handle);
      }
    };
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setScreenshotTexture(
        makeScreenTexture(
          (ctx) => drawImageCoverTop(ctx, img, TEXTURE_WIDTH, TEXTURE_HEIGHT),
          layout.screen.width,
          layout.screen.height,
        ),
      );
      finish();
    };
    // A broken screenshot must never hang a render — keep the fallback.
    img.onerror = finish;
    img.src = resolveScreenshotUrl(screenshotUrl);
    return finish;
  }, [screenshotUrl, layout]);

  const texture = screenshotTexture ?? fallbackTexture;

  const entrance = spring({ frame, fps, config: SPRING_HEAVY });
  const translateY = interpolate(entrance, [0, 1], [-4, 0]);

  const open = spring({
    frame: frame - HINGE_DELAY_FRAMES,
    fps,
    config: SPRING_HEAVY,
  });
  const hingeRotation = interpolate(open, [0, 1], [HINGE_CLOSED, HINGE_OPEN]);

  const sway = idleSway(frame, fps, 0.07);
  const bob = idleBob(frame, fps, 0.02);

  return (
    <group
      scale={entrance}
      rotation={[0.12, sway, 0]}
      position={[0, translateY + bob - 0.5, 0]}
    >
      <RoundedBox
        radius={layout.deck.radius}
        depth={layout.deck.thickness}
        curveSegments={PHONE_CURVE_SEGMENTS}
        rotation-x={-Math.PI / 2}
        position={[-layout.deck.width / 2, 0, layout.deck.depth / 2]}
        width={layout.deck.width}
        height={layout.deck.depth}
      >
        <meshBasicMaterial
          toneMapped={false}
          color={asLinearSafeColor(deviceBodyColor(theme, 0.16))}
        />
      </RoundedBox>
      <group
        position={[0, layout.deck.thickness, -layout.hinge.z]}
        rotation-x={hingeRotation}
      >
        <RoundedBox
          radius={layout.lid.radius}
          depth={layout.lid.thickness}
          curveSegments={PHONE_CURVE_SEGMENTS}
          position={layout.lid.position}
          width={layout.lid.width}
          height={layout.lid.height}
        >
          <meshBasicMaterial
            toneMapped={false}
            color={asLinearSafeColor(deviceBodyColor(theme, 0.28))}
          />
        </RoundedBox>
        <mesh position={layout.screen.position}>
          <shapeGeometry args={[screenGeometry]} />
          <meshBasicMaterial color={0xffffff} toneMapped={false} map={texture} />
        </mesh>
      </group>
    </group>
  );
};
