import * as THREE from "three";
import type { CarMaterials } from "./materials";
import { closestOnGrid } from "./body";
import { SPEC } from "./spec";

function alignToNormal(obj: THREE.Object3D, normal: THREE.Vector3) {
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
}

function lampPod(mats: CarMaterials, point: THREE.Vector3, normal: THREE.Vector3, tail = false) {
  const g = new THREE.Group();
  const housing = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mats.housing);
  housing.scale.set(tail ? 0.28 : 0.28, tail ? 0.055 : 0.09, tail ? 0.07 : 0.11);
  g.add(housing);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), tail ? mats.lampRed : mats.lens);
  lens.scale.set(tail ? 0.22 : 0.2, tail ? 0.032 : 0.055, 0.035);
  lens.position.z = 0.045;
  g.add(lens);
  const drl = new THREE.Mesh(new THREE.BoxGeometry(tail ? 0.2 : 0.24, 0.014, 0.012), tail ? mats.lampRed : mats.lampWhite);
  drl.position.set(0, tail ? 0.015 : 0.032, 0.06);
  g.add(drl);
  if (!tail) {
    const proj = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.03, 16), mats.chrome);
    proj.rotation.x = Math.PI / 2;
    proj.position.set(-0.03, -0.01, 0.04);
    g.add(proj);
    const amber = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.01), mats.lampAmber);
    amber.position.set(0.07, -0.02, 0.05);
    g.add(amber);
  }
  g.position.copy(point).addScaledVector(normal, tail ? 0.02 : 0.012);
  alignToNormal(g, normal);
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = false;
      o.receiveShadow = true;
    }
  });
  return g;
}

export function buildMirror(mats: CarMaterials, side: 1 | -1, grid: THREE.Vector3[][]) {
  const hit = closestOnGrid(grid, new THREE.Vector3(side * 0.92, 0.78, 0.48));
  const g = new THREE.Group();
  g.name = side > 0 ? "mirror-right" : "mirror-left";
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.1, 8), mats.black);
  stalk.rotation.z = side * 0.9;
  stalk.position.set(side * 0.04, 0.02, 0);
  g.add(stalk);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mats.black);
  shell.scale.set(0.11, 0.055, 0.07);
  shell.position.set(side * 0.1, 0.045, 0.01);
  g.add(shell);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.008), mats.chrome);
  glass.position.set(side * 0.1, 0.045, 0.045);
  g.add(glass);
  g.position.copy(hit.point).addScaledVector(hit.normal, 0.02);
  return g;
}

export function buildDetails(mats: CarMaterials, grid: THREE.Vector3[][]) {
  const root = new THREE.Group();
  root.name = "details";

  const lamps: [THREE.Vector3, boolean][] = [
    [new THREE.Vector3(0.78, 0.48, 1.7), false],
    [new THREE.Vector3(-0.78, 0.48, 1.7), false],
    [new THREE.Vector3(0.78, 0.55, -2.02), true],
    [new THREE.Vector3(-0.78, 0.55, -2.02), true],
    [new THREE.Vector3(0.28, 0.62, -2.06), true],
    [new THREE.Vector3(-0.28, 0.62, -2.06), true],
  ];
  for (const [target, tail] of lamps) {
    const hit = closestOnGrid(grid, target);
    root.add(lampPod(mats, hit.point, hit.normal, tail));
  }

  const brake = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.012), mats.lampRed);
  const brakeHit = closestOnGrid(grid, new THREE.Vector3(0, 1.05, -0.35));
  brake.position.copy(brakeHit.point).addScaledVector(brakeHit.normal, 0.01);
  root.add(brake);

  // Intakes — deep ducts behind the doors, radiator visible inside.
  for (const side of [1, -1] as const) {
    const hit = closestOnGrid(grid, new THREE.Vector3(side * 0.96, 0.5, -0.48));
    const duct = new THREE.Group();
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.42), mats.housing);
    const surround = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.32, 0.48), mats.carbonMat);
    surround.position.x = side * 0.02;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.02), mats.aluminum);
    fin.position.x = -side * 0.12;
    for (let i = 0; i < 5; i++) {
      const vane = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.008, 0.2), mats.housing);
      vane.position.set(-side * 0.08, -0.08 + i * 0.04, 0);
      duct.add(vane);
    }
    duct.add(mouth, surround, fin);
    duct.position.copy(hit.point);
    duct.position.x += side * 0.02;
    root.add(duct);

    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 1.55), mats.black);
    skirt.position.set(side * 0.9, 0.2, 0.15);
    skirt.castShadow = true;
    root.add(skirt);
  }

  // Front splitter and lower intake.
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.025, 0.42), mats.carbonMat);
  splitter.position.set(0, 0.09, 2.02);
  splitter.castShadow = true;
  root.add(splitter);
  for (const side of [1, -1] as const) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.08, 0.22), mats.carbonMat);
    plate.position.set(side * 0.84, 0.12, 2.08);
    root.add(plate);
  }
  const intake = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.06), mats.housing);
  intake.position.set(0, 0.24, 2.2);
  root.add(intake);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.1), mats.carbonMat);
  mesh.position.set(0, 0.24, 2.23);
  root.add(mesh);
  for (const side of [1, -1] as const) {
    const corner = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.06), mats.housing);
    corner.position.set(side * 0.62, 0.26, 2.1);
    root.add(corner);
  }
  const radiator = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 0.05), mats.aluminum);
  radiator.position.set(0, 0.38, 1.72);
  root.add(radiator);

  // Diffuser and strakes.
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.02, 0.7), mats.carbonMat);
  diffuser.position.set(0, 0.16, -1.95);
  diffuser.rotation.x = -0.22;
  root.add(diffuser);
  for (let i = -2; i <= 2; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.1, 0.55), mats.black);
    fin.position.set(i * 0.18, 0.2, -1.98);
    root.add(fin);
  }

  // Wipers parked at the cowl.
  for (const side of [1, -1] as const) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.42), mats.black);
    arm.position.set(side * 0.22, 0.73, 0.98);
    arm.rotation.y = side * 0.35;
    arm.rotation.x = -0.55;
    root.add(arm);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.02, 0.38), mats.rubber);
    blade.position.copy(arm.position);
    blade.position.y += 0.01;
    blade.rotation.copy(arm.rotation);
    root.add(blade);
  }

  // Shoulder character line.
  for (const side of [1, -1] as const) {
    const pts: THREE.Vector3[] = [];
    for (let z = -1.7; z <= 1.85; z += 0.15) {
      const hit = closestOnGrid(grid, new THREE.Vector3(side * 0.95, 0.62, z));
      pts.push(hit.point.clone().addScaledVector(hit.normal, 0.004));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.004, 5, false), mats.black);
    root.add(tube);
  }

  // Mark the nose with a small geometric badge, not a manufacturer emblem.
  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.008, 20), mats.chrome);
  badge.rotation.x = Math.PI / 2;
  const nose = closestOnGrid(grid, new THREE.Vector3(0, 0.4, 2.12));
  badge.position.copy(nose.point).addScaledVector(nose.normal, 0.006);
  alignToNormal(badge, nose.normal);
  root.add(badge);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.004, 0.04), mats.black);
  bar.position.copy(badge.position).addScaledVector(nose.normal, 0.006);
  bar.quaternion.copy(badge.quaternion);
  root.add(bar);

  void SPEC;
  return root;
}
