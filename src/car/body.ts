import * as THREE from "three";
import type { CarMaterials } from "./materials";
import { SPEC } from "./spec";

type Pt = { x: number; y: number };

const KEYS = {
  spine: [
    [-2.25, 0.4],
    [-2.08, 0.5],
    [-1.9, 0.7],
    [-1.72, 0.86],
    [-1.45, 0.8],
    [-1.12, 0.84],
    [-0.82, 0.96],
    [-0.48, 1.12],
    [-0.12, 1.16],
    [0.22, 1.155],
    [0.48, 1.04],
    [0.72, 0.86],
    [0.98, 0.66],
    [1.28, 0.54],
    [1.62, 0.46],
    [1.95, 0.38],
    [2.1, 0.34],
    [2.25, 0.32],
  ],
  half: [
    [-2.25, 0.16],
    [-2.08, 0.55],
    [-1.88, 0.84],
    [-1.5, 0.99],
    [-1.34, 1.01],
    [-0.85, 0.96],
    [-0.25, 0.9],
    [0.35, 0.93],
    [0.9, 0.98],
    [1.28, 1.0],
    [1.6, 0.94],
    [1.9, 0.82],
    [2.08, 0.7],
    [2.18, 0.64],
    [2.25, 0.6],
  ],
  shoulder: [
    [-2.25, 0.32],
    [-1.9, 0.55],
    [-1.34, 0.68],
    [-0.6, 0.6],
    [0.3, 0.62],
    [1.28, 0.66],
    [1.7, 0.56],
    [2.05, 0.4],
    [2.25, 0.26],
  ],
  under: [
    [-2.25, 0.22],
    [-1.85, 0.18],
    [-1.4, 0.14],
    [0, 0.125],
    [1.2, 0.13],
    [1.75, 0.16],
    [2.25, 0.2],
  ],
} as const;

function cr1(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function sampleKeys(keys: readonly (readonly [number, number])[], z: number) {
  const n = keys.length;
  if (z <= keys[0][0]) return keys[0][1];
  if (z >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (i < n - 2 && keys[i + 1][0] <= z) i++;
  const p0 = keys[Math.max(0, i - 1)];
  const p1 = keys[i];
  const p2 = keys[i + 1];
  const p3 = keys[Math.min(n - 1, i + 2)];
  const span = p2[0] - p1[0] || 1;
  return cr1(p0[1], p1[1], p2[1], p3[1], (z - p1[0]) / span);
}

function smoother(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function greenhouse(z: number) {
  const rise = smoother((z + 0.88) / 0.28);
  const fall = 1 - smoother((z - 0.8) / 0.24);
  return rise * fall;
}

function archLipY(z: number) {
  let y = 0;
  const arches = [
    { z: SPEC.frontAxleZ, r: 0.4 },
    { z: SPEC.rearAxleZ, r: 0.44 },
  ];
  for (const a of arches) {
    const dz = Math.abs(z - a.z);
    if (dz >= a.r) continue;
    const lip = 0.28 + Math.sqrt(a.r * a.r - dz * dz) * 0.9;
    if (lip > y) y = lip;
  }
  return y;
}

function sectionControls(z: number): Pt[] {
  const hw = sampleKeys(KEYS.half, z);
  const spine = sampleKeys(KEYS.spine, z);
  const under = sampleKeys(KEYS.under, z);
  const shoulder = Math.max(sampleKeys(KEYS.shoulder, z), archLipY(z) * 0.92);
  const gh = greenhouse(z);
  const lip = archLipY(z);
  const rockerW = Math.min(hw * 0.7, 0.66);
  const belt = THREE.MathUtils.lerp(shoulder * 0.96, 0.8, gh);
  const beltX = THREE.MathUtils.lerp(hw * 0.9, hw * 0.84, gh);
  const glassX = THREE.MathUtils.lerp(hw * 0.55, 0.56, gh);
  const roofX = THREE.MathUtils.lerp(hw * 0.22, 0.28, gh);

  const outerY = Math.max(under + 0.06, lip);
  const pts: Pt[] = [
    { x: 0, y: under },
    { x: rockerW * 0.55, y: under + 0.004 },
    { x: rockerW, y: Math.max(under + 0.05, Math.min(outerY, 0.34)) },
    { x: THREE.MathUtils.lerp(rockerW + 0.05, hw * 0.88, smoother(lip / 0.7)), y: Math.max(0.3, outerY * 0.95) },
    { x: hw * 0.97, y: Math.max(shoulder * 0.78, outerY) },
    { x: hw, y: Math.max(shoulder, outerY) },
    { x: beltX, y: THREE.MathUtils.lerp(Math.max(shoulder, spine - 0.02), belt, gh) },
    { x: THREE.MathUtils.lerp(hw * 0.48, glassX, gh), y: THREE.MathUtils.lerp(spine - 0.02, belt + 0.04, gh) },
    { x: THREE.MathUtils.lerp(hw * 0.26, roofX + 0.06, gh), y: THREE.MathUtils.lerp(spine - 0.008, spine * 0.62 + belt * 0.38, gh) },
    { x: THREE.MathUtils.lerp(hw * 0.08, roofX * 0.45, gh), y: spine - 0.003 },
    { x: 0, y: spine },
  ];
  for (const p of pts) {
    p.x = Math.max(0, p.x);
    p.y = Math.max(under, p.y);
    if (p.x > 0.74) p.y = Math.max(p.y, lip);
  }
  // Keep the crown from folding under the fender on the nose.
  pts[pts.length - 1].y = Math.max(pts[pts.length - 1].y, under + 0.04);
  return pts;
}

function catmull2(points: Pt[], steps: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const n = i === points.length - 2 ? steps + 1 : steps;
    for (let s = 0; s < n; s++) {
      const t = s / steps;
      out.push({
        x: Math.max(0, cr1(p0.x, p1.x, p2.x, p3.x, t)),
        y: cr1(p0.y, p1.y, p2.y, p3.y, t),
      });
    }
  }
  return out;
}

function halfSection(z: number): Pt[] {
  return catmull2(sectionControls(z), 2);
}

type Region =
  | "tub"
  | "hood"
  | "hatch"
  | "doorL"
  | "doorR"
  | "roof"
  | "pillar"
  | "windshield"
  | "rearGlass"
  | "sideGlassL"
  | "sideGlassR";

function classify(p: THREE.Vector3, n: THREE.Vector3): Region {
  const z = p.z;
  const y = p.y;
  const ax = Math.abs(p.x);
  const side = p.x >= 0 ? 1 : -1;
  const up = n.y;
  const lateral = Math.abs(n.x);

  if (n.y < -0.35 && y < 0.28) return "tub";

  const doorFront = 0.9 - Math.max(0, y - 0.34) * 0.28;
  const doorRear = -0.22 - Math.max(0, y - 0.34) * 0.04;
  const inDoorZ = z < doorFront && z > doorRear;
  const inDoorY = y > 0.32 && y < 1.03;

  if (inDoorZ && y > 0.78 && y < 1.05 && ax > 0.34 && ax < 0.78 && lateral > 0.35) {
    return side > 0 ? "sideGlassR" : "sideGlassL";
  }
  if (z > 0.2 && z < 1.02 && y > 0.74 && ax < 0.62 && (up > 0.15 || n.z > 0.35) && lateral < 0.72) {
    return "windshield";
  }
  if (z < -0.22 && z > -0.98 && y > 0.86 && ax < 0.55 && up > 0.05 && lateral < 0.65) {
    return "rearGlass";
  }
  if (z < 0.28 && z > -0.42 && y > 1.04 && ax < 0.4 && up > 0.45) return "roof";
  if (
    z > 0.15 &&
    z < 1.02 &&
    y > 0.7 &&
    ax > 0.36 &&
    ax < 0.78 &&
    lateral > 0.45 &&
    up < 0.55
  ) {
    return "pillar";
  }
  if (inDoorZ && inDoorY && ax > 0.52 && (lateral > 0.25 || up < 0.72)) {
    return side > 0 ? "doorR" : "doorL";
  }
  const hw = sampleKeys(KEYS.half, z);
  if (z > 0.92 && z < 2.05 && y > 0.4 && up > 0.42 && ax < hw * 0.78) return "hood";
  if (z < -0.5 && z > -1.98 && y > 0.58 && up > 0.4 && ax < hw * 0.8 && y < 1.08) return "hatch";
  return "tub";
}

function ensureOutward(geo: THREE.BufferGeometry) {
  const pos = geo.getAttribute("position");
  const norm = geo.getAttribute("normal");
  if (!pos || !norm) return;
  const interior = new THREE.Vector3(0, 0.48, 0);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  let dot = 0;
  const step = Math.max(1, Math.floor(pos.count / 60));
  for (let i = 0; i < pos.count; i += step) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(norm, i);
    dot += n.dot(p.clone().sub(interior));
  }
  if (dot >= 0) return;
  const idx = geo.getIndex();
  if (!idx) return;
  const arr = idx.array as Uint16Array | Uint32Array;
  for (let i = 0; i < arr.length; i += 3) {
    const tmp = arr[i + 1];
    arr[i + 1] = arr[i + 2];
    arr[i + 2] = tmp;
  }
  idx.needsUpdate = true;
  geo.computeVertexNormals();
}

function gapInset(geo: THREE.BufferGeometry, meters: number) {
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  geo.computeBoundingBox();
  const c = geo.boundingBox!.getCenter(new THREE.Vector3());
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const dir = v.clone().sub(c);
    const len = dir.length();
    if (len < 1e-4) continue;
    const pull = Math.min(meters, len * 0.18);
    dir.multiplyScalar((len - pull) / len);
    v.copy(c).add(dir);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  ensureOutward(geo);
}

function offsetNormal(geo: THREE.BufferGeometry, dist: number) {
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const norm = geo.getAttribute("normal");
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) + norm.getX(i) * dist,
      pos.getY(i) + norm.getY(i) * dist,
      pos.getZ(i) + norm.getZ(i) * dist,
    );
  }
  pos.needsUpdate = true;
}

export type BodyPanel = {
  name: Region;
  geometry: THREE.BufferGeometry;
};

export type BodyBuild = {
  panels: Partial<Record<Region, THREE.BufferGeometry>>;
  grid: THREE.Vector3[][];
  counts: Record<string, number>;
};

export function closestOnGrid(grid: THREE.Vector3[][], target: THREE.Vector3) {
  let best = Infinity;
  let bi = 1;
  let bj = 1;
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      const d = grid[i][j].distanceToSquared(target);
      if (d < best) {
        best = d;
        bi = i;
        bj = j;
      }
    }
  }
  const nS = grid.length;
  const nP = grid[0].length;
  const i1 = Math.min(nS - 1, bi + 1);
  const i0 = Math.max(0, bi - 1);
  const j1 = (bj + 1) % nP;
  const j0 = (bj - 1 + nP) % nP;
  const du = grid[i1][bj].clone().sub(grid[i0][bj]);
  const dv = grid[bi][j1].clone().sub(grid[bi][j0]);
  const normal = dv.cross(du).normalize();
  const interior = new THREE.Vector3(0, 0.48, grid[bi][bj].z);
  if (normal.dot(grid[bi][bj].clone().sub(interior)) < 0) normal.negate();
  return { point: grid[bi][bj].clone(), normal };
}

export function buildBody(): BodyBuild {
  const stations = 130;
  const half = halfSection(0);
  const around = half.length * 2 - 2;
  const grid: THREE.Vector3[][] = [];

  for (let i = 0; i < stations; i++) {
    const t = i / (stations - 1);
    const z = -SPEC.halfLength + t * SPEC.halfLength * 2;
    const h = halfSection(z);
    const loop: THREE.Vector3[] = [];
    for (let k = 0; k < h.length; k++) loop.push(new THREE.Vector3(h[k].x, h[k].y, z));
    for (let k = h.length - 2; k >= 1; k--) loop.push(new THREE.Vector3(-h[k].x, h[k].y, z));
    if (loop.length !== around) {
      while (loop.length < around) loop.push(loop[loop.length - 1].clone());
      loop.length = around;
    }
    grid.push(loop);
  }

  const buckets = new Map<Region, number[]>();
  const counts: Record<string, number> = {};
  const tmp = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

  for (let i = 0; i < stations - 1; i++) {
    for (let j = 0; j < around; j++) {
      const j2 = (j + 1) % around;
      const a = grid[i][j];
      const b = grid[i][j2];
      const c = grid[i + 1][j2];
      const d = grid[i + 1][j];
      const ab = tmp[1].copy(b).sub(a);
      const ad = tmp[2].copy(d).sub(a);
      if (ab.cross(ad).lengthSq() < 1e-8) continue;
      const centroid = tmp[0].copy(a).add(b).add(c).add(d).multiplyScalar(0.25);
      const n = tmp[3].copy(b).sub(a).cross(tmp[2].copy(d).sub(a)).normalize();
      const interior = new THREE.Vector3(0, 0.48, centroid.z);
      if (n.dot(centroid.clone().sub(interior)) < 0) n.negate();
      const region = classify(centroid, n);
      counts[region] = (counts[region] ?? 0) + 1;
      let list = buckets.get(region);
      if (!list) {
        list = [];
        buckets.set(region, list);
      }
      // consistent winding filled later; store corner indices via positions directly
      list.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z);
    }
  }

  const panels: Partial<Record<Region, THREE.BufferGeometry>> = {};
  for (const [region, flat] of buckets) {
    const positions: number[] = [];
    const indices: number[] = [];
    const key = new Map<string, number>();
    const add = (x: number, y: number, z: number) => {
      const k = `${x.toFixed(4)}|${y.toFixed(4)}|${z.toFixed(4)}`;
      const found = key.get(k);
      if (found !== undefined) return found;
      const id = positions.length / 3;
      positions.push(x, y, z);
      key.set(k, id);
      return id;
    };
    for (let q = 0; q < flat.length; q += 12) {
      const ids = [
        add(flat[q], flat[q + 1], flat[q + 2]),
        add(flat[q + 3], flat[q + 4], flat[q + 5]),
        add(flat[q + 6], flat[q + 7], flat[q + 8]),
        add(flat[q + 9], flat[q + 10], flat[q + 11]),
      ];
      const pa = new THREE.Vector3(flat[q], flat[q + 1], flat[q + 2]);
      const pb = new THREE.Vector3(flat[q + 3], flat[q + 4], flat[q + 5]);
      const pd = new THREE.Vector3(flat[q + 9], flat[q + 10], flat[q + 11]);
      const normal = pb.clone().sub(pa).cross(pd.clone().sub(pa));
      const interior = new THREE.Vector3(0, 0.48, pa.z);
      const outward = normal.dot(pa.clone().sub(interior)) >= 0;
      if (outward) {
        indices.push(ids[0], ids[1], ids[3], ids[1], ids[2], ids[3]);
      } else {
        indices.push(ids[0], ids[3], ids[1], ids[1], ids[3], ids[2]);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    ensureOutward(geo);
    panels[region] = geo;
  }

  // Keep halfSection referenced so the around estimate stays honest if resample changes.
  void half;

  return { panels, grid, counts };
}

const INSET: Region[] = ["hood", "hatch", "doorL", "doorR", "sideGlassL", "sideGlassR"];
const GLASS: Region[] = ["windshield", "rearGlass", "sideGlassL", "sideGlassR"];

export function finishPanels(panels: BodyBuild["panels"]) {
  for (const name of INSET) {
    const geo = panels[name];
    if (geo) gapInset(geo, name.startsWith("side") ? 0.008 : 0.016);
  }
  for (const name of GLASS) {
    const geo = panels[name];
    if (geo) offsetNormal(geo, 0.008);
  }
}

export function panelMaterial(name: Region, mats: CarMaterials): THREE.Material {
  switch (name) {
    case "roof":
    case "pillar":
      return mats.black;
    case "windshield":
    case "rearGlass":
    case "sideGlassL":
    case "sideGlassR":
      return mats.glass;
    default:
      return mats.paint;
  }
}

export function hingeFromDoor(geo: THREE.BufferGeometry) {
  const pos = geo.getAttribute("position");
  let maxZ = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    maxZ = Math.max(maxZ, pos.getZ(i));
    maxY = Math.max(maxY, pos.getY(i));
  }
  let bestScore = Infinity;
  const best = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (v.z < maxZ - 0.12 || v.y < maxY - 0.2) continue;
    const score = Math.abs(v.x) * 2.2 - v.y * 0.4 - v.z;
    if (score < bestScore) {
      bestScore = score;
      best.copy(v);
    }
  }
  return best;
}

export function hingeAlongZ(geo: THREE.BufferGeometry, end: "min" | "max") {
  const pos = geo.getAttribute("position");
  let limit = end === "min" ? Infinity : -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    limit = end === "min" ? Math.min(limit, z) : Math.max(limit, z);
  }
  const acc = new THREE.Vector3();
  let n = 0;
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(pos.getZ(i) - limit) > 0.03) continue;
    acc.x += pos.getX(i);
    acc.y += pos.getY(i);
    acc.z += pos.getZ(i);
    n++;
  }
  if (n === 0) return new THREE.Vector3(0, 0.8, limit);
  return acc.multiplyScalar(1 / n);
}
