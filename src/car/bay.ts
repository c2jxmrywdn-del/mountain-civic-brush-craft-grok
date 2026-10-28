import * as THREE from "three";
import type { CarMaterials } from "./materials";

function tube(points: THREE.Vector3[], radius: number, mat: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, 20, radius, 6, false);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

export function buildBay(mats: CarMaterials) {
  const group = new THREE.Group();
  group.name = "bay";

  // Front trunk hardware, revealed by the nose lid.
  const tray = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.04, 0.7), mats.housing);
  tray.position.set(0, 0.28, 1.45);
  group.add(tray);
  const battery = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.18), mats.black);
  battery.position.set(-0.28, 0.38, 1.4);
  group.add(battery);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.06, 12), mats.coolant);
  cap.position.set(0.22, 0.4, 1.55);
  group.add(cap);
  const yellow = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 10), mats.lampAmber);
  yellow.position.set(0.22, 0.44, 1.55);
  group.add(yellow);
  for (const side of [1, -1] as const) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.22, 12), mats.aluminum);
    tower.position.set(side * 0.42, 0.38, 1.25);
    group.add(tower);
  }

  // Mid engine, behind the cabin.
  const engine = new THREE.Group();
  engine.position.set(0, 0.4, -1.05);

  const block = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.32, 0.56), mats.aluminum);
  block.castShadow = true;
  engine.add(block);

  for (const side of [1, -1] as const) {
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.5), mats.black);
    cover.position.set(side * 0.18, 0.2, 0);
    cover.rotation.z = side * -0.5;
    engine.add(cover);
    for (let i = 0; i < 4; i++) {
      const runner = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.12, 8), mats.metal);
      runner.position.set(side * 0.1, 0.26, -0.16 + i * 0.1);
      runner.rotation.z = side * -0.4;
      engine.add(runner);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.4), mats.hose);
    rail.position.set(side * 0.22, 0.02, 0);
    engine.add(rail);
  }

  const plenum = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.36), mats.carbonMat);
  plenum.position.set(0, 0.32, -0.02);
  engine.add(plenum);
  const throttle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12), mats.metal);
  throttle.rotation.x = Math.PI / 2;
  throttle.position.set(0, 0.32, 0.2);
  engine.add(throttle);

  // Headers into collectors, then rearward.
  for (const side of [1, -1] as const) {
    for (let i = 0; i < 4; i++) {
      const z = -0.16 + i * 0.1;
      engine.add(
        tube(
          [
            new THREE.Vector3(side * 0.24, 0.05, z),
            new THREE.Vector3(side * 0.38, -0.02, z - 0.05),
            new THREE.Vector3(side * 0.34, -0.08, -0.28),
          ],
          0.014,
          mats.exhaust,
        ),
      );
    }
    engine.add(
      tube(
        [
          new THREE.Vector3(side * 0.34, -0.08, -0.3),
          new THREE.Vector3(side * 0.42, -0.12, -0.55),
          new THREE.Vector3(side * 0.36, -0.16, -0.95),
        ],
        0.028,
        mats.exhaust,
      ),
    );
  }

  const loom = tube(
    [
      new THREE.Vector3(-0.1, 0.2, 0.22),
      new THREE.Vector3(-0.2, 0.28, 0.05),
      new THREE.Vector3(-0.08, 0.3, -0.15),
    ],
    0.01,
    mats.hose,
  );
  engine.add(loom);
  const coolantHose = tube(
    [
      new THREE.Vector3(0.2, 0.12, 0.24),
      new THREE.Vector3(0.32, 0.2, 0.4),
      new THREE.Vector3(0.4, 0.1, 0.7),
    ],
    0.016,
    mats.coolant,
  );
  engine.add(coolantHose);

  group.add(engine);

  // Tips sit in the diffuser. Emissive heat follows rpm.
  const tips: THREE.Mesh[] = [];
  for (const side of [1, -1] as const) {
    for (const ox of [0.22, 0.36]) {
      const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 16), mats.chrome);
      outer.rotation.x = Math.PI / 2;
      outer.position.set(side * ox, 0.22, -2.16);
      group.add(outer);
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.1, 12), mats.exhaust);
      inner.rotation.x = Math.PI / 2;
      inner.position.set(side * ox, 0.22, -2.15);
      group.add(inner);
      tips.push(inner);
    }
  }

  return {
    group,
    dispose() {
      /* materials are shared */
    },
    setRpm(rpm: number, running: boolean) {
      const heat = running ? Math.min(1.4, rpm / 5000) : 0.05;
      mats.exhaust.emissiveIntensity = heat;
      for (const tip of tips) {
        const mat = tip.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = heat;
      }
    },
  };
}
