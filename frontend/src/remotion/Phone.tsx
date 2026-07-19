import { useThree } from "@react-three/fiber";
import React, { useEffect, useMemo, useState } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CanvasTexture, Texture } from "three";
import { CAMERA_DISTANCE, PHONE_CURVE_SEGMENTS, PHONE_SHININESS } from "./helpers/layout";
import { getPhoneLayout } from "./helpers/layout";
import { roundedRect } from "./helpers/rounded-rectangle";
import { RoundedBox } from "./RoundedBox";

// Portrait phone aspect ratio (9:19.5-ish)
const SCREEN_ASPECT = 0.462;
const BASE_SCALE = 1.1;

const TEXTURE_WIDTH = 462;
const TEXTURE_HEIGHT = Math.round(TEXTURE_WIDTH / SCREEN_ASPECT);

/** "OUT NOW" -> "O U T   N O W" — the screen sets this line wide. */
const spaced = (text: string) =>
  text
    .split(" ")
    .map((word) => word.split("").join(" "))
    .join("   ");

const drawBrandScreen = (
  ctx: OffscreenCanvasRenderingContext2D,
  brandName: string,
  domain: string,
  accent: string,
  footer: string,
) => {
  const w = TEXTURE_WIDTH;
  const h = TEXTURE_HEIGHT;

  ctx.fillStyle = "#181822";
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w / 2, h * 0.38, 0, w / 2, h * 0.38, h * 0.5);
  glow.addColorStop(0, `${accent}88`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Monogram
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.36, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 96px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText(brandName.charAt(0).toUpperCase(), w / 2, h * 0.36 + 6);

  // Brand name + domain
  ctx.font = "bold 54px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText(brandName, w / 2, h * 0.52);
  ctx.fillStyle = "#b8b8c2";
  ctx.font = "26px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText(domain, w / 2, h * 0.575);

  ctx.fillStyle = "#8f8f9a";
  ctx.font = "22px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText(spaced(footer), w / 2, h * 0.85);
};

export const Phone: React.FC<{
  readonly brandName: string;
  readonly domain: string;
  readonly accent: string;
  readonly footer: string;
}> = ({ brandName, domain, accent, footer }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const camera = useThree((state) => state.camera);
  useEffect(() => {
    camera.position.set(0, 0, CAMERA_DISTANCE);
    camera.near = 0.2;
    camera.far = Math.max(5000, CAMERA_DISTANCE * 2);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  const layout = useMemo(
    () => getPhoneLayout(SCREEN_ASPECT, BASE_SCALE),
    [],
  );

  const screenGeometry = useMemo(() => {
    return roundedRect({
      width: layout.screen.width,
      height: layout.screen.height,
      radius: layout.screen.radius,
    });
  }, [layout]);

  const [texture] = useState<Texture>(() => {
    const canvas = new OffscreenCanvas(TEXTURE_WIDTH, TEXTURE_HEIGHT);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2d context");
    }
    drawBrandScreen(ctx, brandName, domain, accent, footer);
    const tex = new CanvasTexture(canvas);
    tex.repeat.x = 1 / layout.screen.width;
    tex.repeat.y = 1 / layout.screen.height;
    return tex;
  });

  // Spring entrance: rise up while spinning once, settle facing the camera
  const entrance = spring({
    frame,
    fps,
    config: {
      damping: 200,
      mass: 3,
    },
  });

  const entranceRotation = interpolate(entrance, [0, 1], [-Math.PI * 1.5, 0]);
  const translateY = interpolate(entrance, [0, 1], [-4, 0]);

  // Gentle idle motion once settled
  const sway = Math.sin((frame / fps) * 1.1) * 0.16;
  const bob = Math.sin((frame / fps) * 1.4) * 0.03;

  return (
    <group
      scale={entrance}
      rotation={[0, entranceRotation + sway, 0]}
      position={[0.85, translateY + bob, 0]}
    >
      <RoundedBox
        radius={layout.phone.radius}
        depth={layout.phone.thickness}
        curveSegments={PHONE_CURVE_SEGMENTS}
        position={layout.phone.position}
        width={layout.phone.width}
        height={layout.phone.height}
      >
        <meshPhongMaterial color="#1a1a22" shininess={PHONE_SHININESS} />
      </RoundedBox>
      <mesh position={layout.screen.position}>
        <shapeGeometry args={[screenGeometry]} />
        <meshBasicMaterial color={0xffffff} toneMapped={false} map={texture} />
      </mesh>
    </group>
  );
};
