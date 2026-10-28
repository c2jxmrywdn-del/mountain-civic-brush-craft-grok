import * as THREE from "three";
import { EngineAudio } from "./audio";
import { buildBay } from "./bay";
import {
  buildBody,
  finishPanels,
  hingeAlongZ,
  hingeFromDoor,
  panelMaterial,
  type BodyBuild,
} from "./body";
import { buildCabin, buildDoorCard } from "./cabin";
import { buildDetails, buildMirror } from "./details";
import { createMaterials } from "./materials";
import type { CarPart, DoorSide, HatchName } from "./spec";
import { buildWheels } from "./wheels";

/**
 * Helion GT — self-contained mid-engine supercar.
 *
 * The host owns the renderer, camera, and lights. This object does not add
 * lights. Drive it once per frame with `update(dt)` (seconds).
 *
 * ```ts
 * const car = createSupercar();
 * scene.add(car.object);
 * car.audio.start();          // call after a user gesture
 * car.setThrottle(0.4);
 * car.doors.set("left", true);
 * car.hatches.set("engine", true);
 * car.update(dt);
 * car.dispose();
 * ```
 *
 * Raycasting: test `pickTargets` (recursive). `partFromObject` walks parents
 * and returns `"door-left" | "door-right" | "hood" | "hatch"`.
 */
export type Supercar = {
  object: THREE.Group;
  pickTargets: THREE.Object3D[];
  audio: EngineAudio;
  update(dt: number): void;
  setThrottle(value: number): void;
  doors: {
    toggle(side: DoorSide): void;
    set(side: DoorSide, open: boolean): void;
    isOpen(side: DoorSide): boolean;
  };
  hatches: {
    toggle(which: HatchName): void;
    set(which: HatchName, open: boolean): void;
    isOpen(which: HatchName): boolean;
  };
  partFromObject(obj: THREE.Object3D | null): CarPart | null;
  getOpenState(): { left: boolean; right: boolean; hood: boolean; engine: boolean };
  debug: { counts: BodyBuild["counts"] };
  dispose(): void;
};

type Hinge = {
  pivot: THREE.Group;
  axis: THREE.Vector3;
  angle: number;
  target: number;
  current: number;
  part: CarPart;
};

const REDUCE =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function stepHinge(h: Hinge, dt: number) {
  const k = REDUCE ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 4.4);
  h.current += (h.target - h.current) * k;
  if (Math.abs(h.current - h.target) < 0.0008) h.current = h.target;
  const t = h.current * h.current * (3 - 2 * h.current);
  h.pivot.quaternion.setFromAxisAngle(h.axis, h.angle * t);
}

function mountKept(pivot: THREE.Group, obj: THREE.Object3D) {
  pivot.updateMatrixWorld(true);
  pivot.attach(obj);
}

function underside(geo: THREE.BufferGeometry, source: THREE.Material) {
  const mat = (source as THREE.MeshStandardMaterial).clone();
  mat.side = THREE.BackSide;
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = 1;
  mat.polygonOffsetUnits = 1;
  if ("color" in mat && mat.color) mat.color = new THREE.Color("#1a1c1f");
  return new THREE.Mesh(geo, mat);
}

function rodMesh(mat: THREE.Material) {
  const geo = new THREE.CylinderGeometry(0.007, 0.007, 1, 6);
  geo.rotateX(Math.PI / 2);
  return new THREE.Mesh(geo, mat);
}

const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _z = new THREE.Vector3(0, 0, 1);

function placeRod(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) {
  _dir.subVectors(b, a);
  const len = _dir.length();
  if (len < 1e-4) return;
  _mid.addVectors(a, b).multiplyScalar(0.5);
  mesh.position.copy(_mid);
  mesh.quaternion.setFromUnitVectors(_z, _dir.multiplyScalar(1 / len));
  mesh.scale.set(1, 1, len);
}

export function createSupercar(): Supercar {
  const mats = createMaterials();
  const disposables: { dispose(): void }[] = [];
  const object = new THREE.Group();
  object.name = "helion-gt";

  const built = buildBody();
  finishPanels(built.panels);

  const fixed = new THREE.Group();
  fixed.name = "body-fixed";
  const moving = new Map<string, THREE.Mesh>();

  for (const [name, geo] of Object.entries(built.panels) as [keyof typeof built.panels, THREE.BufferGeometry][]) {
    if (!geo) continue;
    const mat = panelMaterial(name, mats);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.castShadow = !String(name).toLowerCase().includes("glass") && name !== "windshield" && name !== "rearGlass";
    mesh.receiveShadow = true;
    if (name === "sideGlassL" || name === "sideGlassR" || name === "doorL" || name === "doorR" || name === "hood" || name === "hatch") {
      moving.set(name, mesh);
    } else {
      fixed.add(mesh);
    }
    disposables.push(geo);
  }
  object.add(fixed);

  const hinges: Hinge[] = [];
  const pickTargets: THREE.Object3D[] = [];

  function addHinge(mesh: THREE.Mesh | undefined, pivotPos: THREE.Vector3, axis: THREE.Vector3, angle: number, part: CarPart) {
    if (!mesh) return null;
    const pivot = new THREE.Group();
    pivot.name = part;
    pivot.position.copy(pivotPos);
    pivot.userData.carPart = part;
    object.add(pivot);
    pivot.updateMatrixWorld(true);
    mountKept(pivot, mesh);
    const back = underside(mesh.geometry, mesh.material as THREE.Material);
    mountKept(pivot, back);
    disposables.push(back.material as THREE.Material);
    pickTargets.push(pivot);
    const hinge: Hinge = { pivot, axis: axis.clone().normalize(), angle, target: 0, current: 0, part };
    hinges.push(hinge);
    return pivot;
  }

  const doorL = moving.get("doorL");
  const doorR = moving.get("doorR");
  const hood = moving.get("hood");
  const hatch = moving.get("hatch");

  const pivotL = doorL
    ? addHinge(doorL, hingeFromDoor(doorL.geometry).add(new THREE.Vector3(-0.02, 0.02, 0.02)), new THREE.Vector3(0, 0, 1), -1.02, "door-left")
    : null;
  const pivotR = doorR
    ? addHinge(doorR, hingeFromDoor(doorR.geometry).add(new THREE.Vector3(0.02, 0.02, 0.02)), new THREE.Vector3(0, 0, 1), 1.02, "door-right")
    : null;
  const pivotHood = hood
    ? addHinge(hood, hingeAlongZ(hood.geometry, "min"), new THREE.Vector3(1, 0, 0), -0.95, "hood")
    : null;
  const pivotHatch = hatch
    ? addHinge(hatch, hingeAlongZ(hatch.geometry, "max"), new THREE.Vector3(1, 0, 0), 0.72, "hatch")
    : null;

  if (pivotL && moving.get("sideGlassL")) mountKept(pivotL, moving.get("sideGlassL")!);
  if (pivotR && moving.get("sideGlassR")) mountKept(pivotR, moving.get("sideGlassR")!);
  if (pivotL) mountKept(pivotL, buildDoorCard(mats, -1));
  if (pivotR) mountKept(pivotR, buildDoorCard(mats, 1));
  if (pivotL) mountKept(pivotL, buildMirror(mats, -1, built.grid));
  if (pivotR) mountKept(pivotR, buildMirror(mats, 1, built.grid));

  object.add(buildWheels(mats));
  object.add(buildDetails(mats, built.grid));
  const cabin = buildCabin(mats);
  object.add(cabin.group);
  const bay = buildBay(mats);
  object.add(bay.group);

  const audio = new EngineAudio();
  const worldA = new THREE.Vector3();
  const worldB = new THREE.Vector3();

  const struts: { mesh: THREE.Mesh; marker: THREE.Object3D; anchor: THREE.Vector3 }[] = [];
  function addStrut(pivot: THREE.Group | null, lid: THREE.Vector3, anchor: THREE.Vector3) {
    if (!pivot) return;
    const marker = new THREE.Object3D();
    marker.position.copy(lid).sub(pivot.position);
    pivot.add(marker);
    const mesh = rodMesh(mats.metal);
    object.add(mesh);
    struts.push({ mesh, marker, anchor });
    disposables.push(mesh.geometry);
  }
  addStrut(pivotHood, new THREE.Vector3(0.34, 0.52, 1.55), new THREE.Vector3(0.38, 0.32, 1.28));
  addStrut(pivotHood, new THREE.Vector3(-0.34, 0.52, 1.55), new THREE.Vector3(-0.38, 0.32, 1.28));
  addStrut(pivotHatch, new THREE.Vector3(0.3, 0.78, -1.45), new THREE.Vector3(0.34, 0.48, -0.7));
  addStrut(pivotHatch, new THREE.Vector3(-0.3, 0.78, -1.45), new THREE.Vector3(-0.34, 0.48, -0.7));

  let elapsed = 0;
  let readoutRpm = -1;
  let readoutAt = 0;

  function hingeBy(part: CarPart) {
    return hinges.find((h) => h.part === part) ?? null;
  }

  function setPart(part: CarPart, open: boolean) {
    const h = hinges.find((item) => item.part === part);
    if (h) h.target = open ? 1 : 0;
  }

  const api: Supercar = {
    object,
    pickTargets,
    audio,
    debug: { counts: built.counts },
    update(dt: number) {
      const d = Math.min(Math.max(dt, 0), 0.1);
      elapsed += d;
      for (const h of hinges) stepHinge(h, d);
      audio.update(d);
      bay.setRpm(audio.rpm, audio.running);
      if (elapsed - readoutAt > 0.08 || Math.abs(audio.rpm - readoutRpm) > 60) {
        cabin.setReadout(audio.rpm, audio.throttle, audio.running);
        readoutRpm = audio.rpm;
        readoutAt = elapsed;
      }
      const amp = audio.running ? 0.00035 + audio.throttle * 0.0011 : 0;
      object.position.y = amp ? Math.sin(elapsed * (18 + audio.rpm * 0.02)) * amp : 0;
      for (const strut of struts) {
        strut.marker.getWorldPosition(worldA);
        worldB.copy(strut.anchor);
        worldB.y += object.position.y;
        placeRod(strut.mesh, worldB, worldA);
        strut.mesh.position.sub(object.position);
      }
    },
    setThrottle(value: number) {
      if (!audio.running) return;
      audio.setThrottle(value);
    },
    doors: {
      toggle(side: DoorSide) {
        const h = hingeBy(side === "left" ? "door-left" : "door-right");
        if (h) h.target = h.target > 0.5 ? 0 : 1;
      },
      set(side: DoorSide, open: boolean) {
        setPart(side === "left" ? "door-left" : "door-right", open);
      },
      isOpen(side: DoorSide) {
        return (hingeBy(side === "left" ? "door-left" : "door-right")?.target ?? 0) > 0.5;
      },
    },
    hatches: {
      toggle(which: HatchName) {
        const h = hingeBy(which === "hood" ? "hood" : "hatch");
        if (h) h.target = h.target > 0.5 ? 0 : 1;
      },
      set(which: HatchName, open: boolean) {
        setPart(which === "hood" ? "hood" : "hatch", open);
      },
      isOpen(which: HatchName) {
        return (hingeBy(which === "hood" ? "hood" : "hatch")?.target ?? 0) > 0.5;
      },
    },
    partFromObject(obj: THREE.Object3D | null) {
      let cursor: THREE.Object3D | null = obj;
      while (cursor) {
        const part = cursor.userData.carPart as CarPart | undefined;
        if (part) return part;
        cursor = cursor.parent;
      }
      return null;
    },
    getOpenState() {
      return {
        left: api.doors.isOpen("left"),
        right: api.doors.isOpen("right"),
        hood: api.hatches.isOpen("hood"),
        engine: api.hatches.isOpen("engine"),
      };
    },
    dispose() {
      audio.dispose();
      cabin.dispose();
      bay.dispose();
      for (const item of disposables) item.dispose();
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
        }
      });
      mats.dispose();
    },
  };

  return api;
}
