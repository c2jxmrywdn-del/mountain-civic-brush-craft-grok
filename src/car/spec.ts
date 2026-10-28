/** Meters. +Y up, +X right, +Z forward. Origin at ground center. */
export const SPEC = {
  halfLength: 2.25,
  frontAxleZ: 1.28,
  rearAxleZ: -1.34,
  frontHalfTrack: 0.855,
  rearHalfTrack: 0.84,
  frontTireR: 0.33,
  rearTireR: 0.346,
  frontTireW: 0.258,
  rearTireW: 0.312,
} as const;

export type CarPart = "door-left" | "door-right" | "hood" | "hatch";
export type DoorSide = "left" | "right";
export type HatchName = "hood" | "engine";
