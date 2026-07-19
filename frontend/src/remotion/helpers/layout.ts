import type { Vector3 } from "@react-three/fiber";

// The distance from which the camera is pointing to the phone.
export const CAMERA_DISTANCE = 2.5;

// The laptop is wider, so the camera sits further back.
export const LAPTOP_CAMERA_DISTANCE = 3.2;

// 16:10 laptop screen.
export const LAPTOP_SCREEN_ASPECT = 1.6;

// A small number to avoid z-index flickering
export const Z_FLICKER_PREVENTION = 0.001;

// Shininess of the phone
export const PHONE_SHININESS = 30;

// In how many segments the phone rounded corners
// are divided. Increase number for smoother phone
export const PHONE_CURVE_SEGMENTS = 8;

// Calculate phone size. Whichever side is smaller gets
// normalized to the base scale.
const getPhoneHeight = (aspectRatio: number, baseScale: number): number => {
  if (aspectRatio > 1) {
    return baseScale;
  }
  return baseScale / aspectRatio;
};

const getPhoneWidth = (aspectRatio: number, baseScale: number): number => {
  if (aspectRatio < 1) {
    return baseScale;
  }
  return baseScale * aspectRatio;
};

type Layout = {
  position: Vector3;
  height: number;
  width: number;
  radius: number;
};

export type PhoneLayout = {
  phone: Layout & {
    thickness: number;
    bevel: number;
  };
  screen: Layout;
};

export type LaptopLayout = {
  lid: Layout & {
    thickness: number;
    bevel: number;
  };
  screen: Layout;
  deck: {
    width: number;
    depth: number;
    thickness: number;
    radius: number;
  };
  hinge: {
    z: number;
  };
};

// Mirrors getPhoneLayout's conventions: lid is a rounded slab, screen is
// inset by the bevel and floated above it, deck lies flat with the hinge
// at its rear edge.
export const getLaptopLayout = (
  aspectRatio: number,
  baseScale: number,
  screenRadius: number,
): LaptopLayout => {
  const lidThickness = baseScale * 0.035;
  const lidBevel = baseScale * 0.05;

  const lidHeight = getPhoneHeight(aspectRatio, baseScale);
  const lidWidth = getPhoneWidth(aspectRatio, baseScale);
  const lidPosition: Vector3 = [-lidWidth / 2, 0, -lidThickness];
  const screenWidth = lidWidth - lidBevel * 2;
  const screenHeight = lidHeight - lidBevel * 2;
  const screenPosition: Vector3 = [
    -screenWidth / 2,
    lidBevel,
    Z_FLICKER_PREVENTION,
  ];

  // Same outer-radius formula as the phone.
  const lidRadius = screenRadius + (lidWidth - screenWidth) / 2;

  const deckDepth = lidHeight * 0.85;
  const deckThickness = baseScale * 0.055;

  return {
    lid: {
      position: lidPosition,
      height: lidHeight,
      width: lidWidth,
      radius: lidRadius,
      thickness: lidThickness,
      bevel: lidBevel,
    },
    screen: {
      position: screenPosition,
      height: screenHeight,
      width: screenWidth,
      radius: screenRadius,
    },
    deck: {
      width: lidWidth,
      depth: deckDepth,
      thickness: deckThickness,
      radius: lidRadius,
    },
    hinge: {
      z: deckDepth / 2,
    },
  };
};

export const getPhoneLayout = (
  // I recommend building the phone layout based
  // on the aspect ratio of the phone
  aspectRatio: number,
  // This value can be increased or decreased to tweak the
  // base value of the phone.
  baseScale: number,
): PhoneLayout => {
  // The depth of the phone body
  const phoneThickness = baseScale * 0.15;

  // How big the border of the phone is.
  const phoneBevel = baseScale * 0.04;

  // The inner radius of the phone, aka the screen radius
  const screenRadius = baseScale * 0.07;

  const phoneHeight = getPhoneHeight(aspectRatio, baseScale);
  const phoneWidth = getPhoneWidth(aspectRatio, baseScale);
  const phonePosition: Vector3 = [-phoneWidth / 2, -phoneHeight / 2, 0];
  const screenWidth = phoneWidth - phoneBevel * 2;
  const screenHeight = phoneHeight - phoneBevel * 2;
  const screenPosition: Vector3 = [
    -screenWidth / 2,
    -screenHeight / 2,
    phoneThickness + Z_FLICKER_PREVENTION,
  ];

  // Define the outer radius of the phone.
  // It looks better if the outer radius is a bit bigger than the screen radios,
  // formula taken from https://twitter.com/joshwcomeau/status/134978208002102886
  const phoneRadius =
    screenRadius + (getPhoneWidth(aspectRatio, baseScale) - screenWidth) / 2;

  return {
    phone: {
      position: phonePosition,
      height: phoneHeight,
      width: phoneWidth,
      radius: phoneRadius,
      thickness: phoneThickness,
      bevel: phoneBevel,
    },
    screen: {
      position: screenPosition,
      height: screenHeight,
      width: screenWidth,
      radius: screenRadius,
    },
  };
};
