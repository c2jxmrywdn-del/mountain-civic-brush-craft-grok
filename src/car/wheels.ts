import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { CarMaterials } from "./materials";
import { SPEC } from "./spec";

function treadGeometry(radius: number, width: number) {
  const geo = new THREE.CylinderGeometry(radius, radius, width, 72, 10, true);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = y / (width * 0.5);
    const ang = Math.atan2(z, x);
    const sidewall = Math.min(1, Math.abs(ny) / 0.72);
    const tuck = sidewall * sidewall * 0.05 * radius;
    const groove =
      Math.abs(ny) < 0.78
        ? Math.abs(Math.sin(ang * 22)) * 0.0035 + Math.abs(Math.sin(ny * Math.PI * 5)) * 0.0025
        : 0;
    const r = Math.hypot(x, z);
    const scale = r > 1e-6 ? (radius - tuck - groove) / r : 1;
    pos.setX(i, x * scale);
    pos.setZ(i, z * scale);
  }
  geo.rotateZ(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function spokeGeometries(side: 1 | -1, radius: number) {
  const parts: THREE.BufferGeometry[] = [];
  const spokes = 10;
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const radial = new THREE.Vector3(0, Math.cos(a), Math.sin(a));
    const align = new THREE.Quaternion().setFromUnitVectors(up, radial);
    const roll = new THREE.Quaternion().setFromAxisAngle(radial, side * 0.55);
    align.multiply(roll);
    const blade = new THREE.BoxGeometry(0.016, radius * 0.5, 0.038);
    blade.applyQuaternion(align);
    const mid = radial.clone().multiplyScalar(radius * 0.46);
    mid.x = side * 0.012;
    blade.translate(mid.x, mid.y, mid.z);
    parts.push(blade);

    const blade2 = new THREE.BoxGeometry(0.01, radius * 0.42, 0.02);
    const align2 = new THREE.Quaternion().setFromUnitVectors(up, radial);
    const roll2 = new THREE.Quaternion().setFromAxisAngle(radial, side * -0.35);
    align2.multiply(roll2);
    blade2.applyQuaternion(align2);
    const mid2 = radial.clone().multiplyScalar(radius * 0.4);
    mid2.x = side * 0.02;
    blade2.translate(mid2.x, mid2.y, mid2.z);
    parts.push(blade2);
  }

  const lugs = 5;
  for (let i = 0; i < lugs; i++) {
    const a = (i / lugs) * Math.PI * 2 + 0.2;
    const lug = new THREE.CylinderGeometry(0.012, 0.012, 0.018, 6);
    lug.rotateZ(Math.PI / 2);
    lug.translate(side * 0.03, Math.cos(a) * 0.045, Math.sin(a) * 0.045);
    parts.push(lug);
  }
  return mergeGeometries(parts, false)!;
}

function makeWheel(side: 1 | -1, rear: boolean, mats: CarMaterials) {
  const radius = rear ? SPEC.rearTireR : SPEC.frontTireR;
  const width = rear ? SPEC.rearTireW : SPEC.frontTireW;
  const group = new THREE.Group();
  group.name = rear ? "wheel-rear" : "wheel-front";

  const tire = new THREE.Mesh(treadGeometry(radius, width), mats.rubber);
  tire.castShadow = true;
  tire.receiveShadow = true;
  group.add(tire);

  const wallR = radius * 0.72;
  const lipGeo = new THREE.TorusGeometry(wallR, 0.016, 10, 36);
  lipGeo.rotateY(Math.PI / 2);
  const lip = new THREE.Mesh(lipGeo, mats.rim);
  lip.position.x = side * (width * 0.28);
  lip.castShadow = true;
  group.add(lip);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(wallR * 0.96, radius * 0.62, width * 0.42, 32, 1, true), mats.rim);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.x = side * (width * 0.12);
  group.add(barrel);

  const face = new THREE.Mesh(spokeGeometries(side, radius), mats.rim);
  face.castShadow = true;
  group.add(face);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.04, 20), mats.rim);
  hub.rotation.z = Math.PI / 2;
  hub.position.x = side * 0.028;
  group.add(hub);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.012, 16), mats.black);
  cap.rotation.z = Math.PI / 2;
  cap.position.x = side * 0.046;
  group.add(cap);

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, 0.014, 28), mats.metal);
  disc.rotation.z = Math.PI / 2;
  disc.position.x = -side * 0.01;
  group.add(disc);

  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.02, 16), mats.metal);
  hat.rotation.z = Math.PI / 2;
  hat.position.x = -side * 0.02;
  group.add(hat);

  const cal = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.1), mats.caliper);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 0.11), mats.caliper);
  bridge.position.y = 0.06;
  cal.add(body, bridge);
  for (const py of [-0.04, 0.04]) {
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.014, 6), mats.chrome);
    bolt.rotation.z = Math.PI / 2;
    bolt.position.set(side * 0.04, py, 0.03);
    cal.add(bolt);
  }
  cal.position.set(side * 0.055, radius * 0.2, radius * 0.2);
  cal.castShadow = true;
  group.add(cal);

  const track = rear ? SPEC.rearHalfTrack : SPEC.frontHalfTrack;
  const axle = rear ? SPEC.rearAxleZ : SPEC.frontAxleZ;
  group.position.set(side * track, radius - 0.01, axle);

  const liner = new THREE.Mesh(
    new THREE.CylinderGeometry(radius + 0.07, radius + 0.07, width + 0.08, 24, 1, true, Math.PI, Math.PI),
    mats.housing,
  );
  liner.rotation.z = Math.PI / 2;
  liner.position.copy(group.position);
  liner.position.y += 0.04;

  return { group, liner };
}

export function buildWheels(mats: CarMaterials) {
  const root = new THREE.Group();
  root.name = "wheels";
  const specs: [1 | -1, boolean][] = [
    [1, false],
    [-1, false],
    [1, true],
    [-1, true],
  ];
  for (const [side, rear] of specs) {
    const { group, liner } = makeWheel(side, rear, mats);
    root.add(group, liner);
  }
  return root;
}
