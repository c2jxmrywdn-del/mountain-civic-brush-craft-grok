import * as THREE from "three";
import type { CarMaterials } from "./materials";

function clusterTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { canvas, ctx, tex };
}

function screenTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 280;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { canvas, ctx, tex };
}

function paintCluster(
  ctx: CanvasRenderingContext2D,
  rpm: number,
  running: boolean,
) {
  const w = 512;
  ctx.clearRect(0, 0, w, w);
  ctx.fillStyle = "#0c0e12";
  ctx.fillRect(0, 0, w, w);
  const cx = 256;
  const cy = 270;
  const r = 180;
  ctx.strokeStyle = "#2a2e36";
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();
  const max = 9000;
  const t = Math.min(1, Math.max(0, rpm / max));
  const a0 = Math.PI * 0.75;
  const sweep = Math.PI * 1.5 * t;
  ctx.strokeStyle = rpm > 7600 ? "#e55312" : "#f4f1ea";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, r, a0, a0 + sweep);
  ctx.stroke();
  ctx.strokeStyle = "#e55312";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 16, a0 + Math.PI * 1.5 * (8000 / max), a0 + Math.PI * 1.5);
  ctx.stroke();
  ctx.fillStyle = "#f4f1ea";
  ctx.font = "600 92px Outfit, Avenir Next, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const shown = running ? Math.round(rpm / 100) / 10 : 0;
  ctx.fillText(shown.toFixed(1), cx, cy - 8);
  ctx.font = "480 22px Outfit, Avenir Next, sans-serif";
  ctx.fillStyle = "#9a958c";
  ctx.fillText("RPM  ×1000", cx, cy + 58);
  ctx.fillStyle = "#e55312";
  ctx.font = "560 18px Outfit, Avenir Next, sans-serif";
  ctx.fillText(running ? "RUN" : "OFF", cx, cy + 96);
  for (let k = 0; k <= 9; k++) {
    const a = a0 + (Math.PI * 1.5 * k) / 9;
    ctx.fillStyle = k >= 8 ? "#e55312" : "#c8c4bc";
    ctx.font = "480 16px Outfit, Avenir Next, sans-serif";
    ctx.fillText(String(k), cx + Math.cos(a) * (r - 36), cy + Math.sin(a) * (r - 36));
  }
}

function paintScreen(ctx: CanvasRenderingContext2D, rpm: number, throttle: number, running: boolean) {
  const w = 512;
  const h = 280;
  ctx.fillStyle = "#10141a";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#e55312";
  ctx.fillRect(0, 0, w, 4);
  ctx.fillStyle = "#f4f1ea";
  ctx.font = "560 28px Outfit, Avenir Next, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("HELION", 28, 28);
  ctx.fillStyle = "#9a958c";
  ctx.font = "480 16px Outfit, Avenir Next, sans-serif";
  ctx.fillText("MID ENGINE  ·  ATELIER", 28, 64);
  const speed = running ? Math.round((rpm / 8200) * throttle * 312) : 0;
  ctx.fillStyle = "#f7f4ee";
  ctx.font = "340 72px Instrument Serif, Georgia, serif";
  ctx.fillText(String(speed), 28, 110);
  ctx.font = "480 18px Outfit, Avenir Next, sans-serif";
  ctx.fillStyle = "#9a958c";
  ctx.fillText("KM/H", 28 + ctx.measureText(String(speed)).width + 16, 156);
  const gear = !running ? "–" : throttle < 0.08 ? "N" : String(1 + Math.min(6, Math.floor(throttle * 6.2)));
  ctx.fillStyle = "#f4f1ea";
  ctx.font = "560 64px Outfit, Avenir Next, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(gear, w - 36, 118);
  ctx.font = "480 16px Outfit, Avenir Next, sans-serif";
  ctx.fillStyle = "#9a958c";
  ctx.fillText("GEAR", w - 36, 196);
}

function seat(mats: CarMaterials, side: 1 | -1) {
  const g = new THREE.Group();
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.48), mats.leather);
  cushion.position.set(0, 0.08, 0);
  cushion.castShadow = true;
  g.add(cushion);
  for (const s of [-1, 1]) {
    const bolster = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.46), mats.leather);
    bolster.position.set(s * 0.22, 0.14, 0);
    bolster.rotation.z = s * -0.35;
    g.add(bolster);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.5, 0.1), mats.leather);
  back.position.set(0, 0.36, -0.2);
  back.rotation.x = -0.38;
  back.castShadow = true;
  g.add(back);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.32, 0.1), mats.leather);
    wing.position.set(s * 0.22, 0.38, -0.16);
    wing.rotation.x = -0.38;
    g.add(wing);
  }
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.08), mats.leather);
  head.position.set(0, 0.62, -0.28);
  head.rotation.x = -0.3;
  g.add(head);
  const stitch = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.42, 0.012), mats.stitch);
  stitch.position.set(0, 0.36, -0.145);
  stitch.rotation.x = -0.38;
  g.add(stitch);
  // Belt from shoulder across the torso.
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.42, 0.008), mats.black);
  belt.position.set(side * -0.08, 0.4, -0.08);
  belt.rotation.z = side * 0.35;
  belt.rotation.x = -0.5;
  g.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), mats.chrome);
  buckle.position.set(side * 0.1, 0.16, 0.1);
  g.add(buckle);
  const release = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.012), mats.caliper);
  release.position.set(side * 0.1, 0.185, 0.1);
  g.add(release);
  g.position.set(side * 0.36, 0.28, -0.02);
  return g;
}

export function buildDoorCard(mats: CarMaterials, side: 1 | -1) {
  const g = new THREE.Group();
  g.name = side > 0 ? "door-card-right" : "door-card-left";
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.48, 0.78), mats.leather);
  card.position.set(side * 0.78, 0.58, 0.28);
  g.add(card);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.36), mats.black);
  arm.position.set(side * 0.74, 0.5, 0.22);
  g.add(arm);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.14), mats.chrome);
  handle.position.set(side * 0.74, 0.62, 0.42);
  g.add(handle);
  const speaker = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16), mats.housing);
  speaker.rotation.z = Math.PI / 2;
  speaker.position.set(side * 0.76, 0.42, 0.05);
  g.add(speaker);
  const pull = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.16), mats.metal);
  pull.position.set(side * 0.745, 0.48, 0.36);
  g.add(pull);
  return g;
}

export function buildCabin(mats: CarMaterials) {
  const group = new THREE.Group();
  group.name = "cabin";

  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.04, 1.15), mats.carpet);
  floor.position.set(0, 0.22, 0.15);
  floor.receiveShadow = true;
  group.add(floor);

  const tunnel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.7), mats.black);
  tunnel.position.set(0, 0.3, 0.12);
  group.add(tunnel);

  const liner = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.04, 0.7), mats.black);
  liner.position.set(0, 1.08, -0.02);
  group.add(liner);

  const bulk = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 0.04), mats.housing);
  bulk.position.set(0, 0.6, -0.48);
  group.add(bulk);

  group.add(seat(mats, -1), seat(mats, 1));

  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.22, 0.28), mats.black);
  dash.position.set(0, 0.58, 0.78);
  dash.castShadow = true;
  group.add(dash);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.22), mats.leather);
  pad.position.set(0, 0.7, 0.74);
  pad.rotation.x = -0.35;
  group.add(pad);

  const binnacle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.12), mats.black);
  binnacle.position.set(-0.36, 0.66, 0.66);
  group.add(binnacle);

  const cluster = clusterTexture();
  paintCluster(cluster.ctx, 0, false);
  cluster.tex.needsUpdate = true;
  const clusterMat = new THREE.MeshBasicMaterial({ map: cluster.tex });
  const clusterMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), clusterMat);
  clusterMesh.position.set(-0.36, 0.66, 0.6);
  clusterMesh.rotation.x = -0.25;
  group.add(clusterMesh);

  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.014, 10, 28), mats.leather);
  wheel.add(rim);
  for (const a of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.13, 0.012), mats.metal);
    spoke.position.set(Math.sin(a) * 0.06, Math.cos(a) * 0.06, 0);
    spoke.rotation.z = -a;
    wheel.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16), mats.black);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.03, 0.012), mats.caliper);
  mark.position.set(0, 0.01, 0.02);
  wheel.add(mark);
  for (const s of [-1, 1]) {
    const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.035), mats.chrome);
    paddle.position.set(s * 0.1, 0.02, -0.02);
    wheel.add(paddle);
  }
  wheel.position.set(-0.36, 0.64, 0.5);
  wheel.rotation.x = 0.42;
  group.add(wheel);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.22, 10), mats.black);
  column.rotation.x = Math.PI / 2 - 0.5;
  column.position.set(-0.36, 0.6, 0.6);
  group.add(column);

  const screen = screenTexture();
  paintScreen(screen.ctx, 0, 0, false);
  screen.tex.needsUpdate = true;
  const screenMat = new THREE.MeshBasicMaterial({ map: screen.tex });
  const display = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.15), screenMat);
  display.position.set(0.08, 0.64, 0.64);
  display.rotation.x = -0.35;
  group.add(display);

  for (const [x, label] of [
    [-0.08, 0],
    [0.0, 1],
    [0.08, 2],
  ] as const) {
    const key = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.03), label === 1 ? mats.caliper : mats.metal);
    key.position.set(x, 0.56, 0.62);
    group.add(key);
    void label;
  }

  // Pedals, driver footwell.
  const pedals: [number, number, number][] = [
    [0.06, 0.012, 0.05],
    [0.07, 0.016, 0.09],
    [0.045, 0.014, 0.07],
  ];
  pedals.forEach((size, i) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), mats.metal);
    p.position.set(-0.42 + i * 0.08, 0.26, 0.92);
    p.rotation.x = -0.4;
    group.add(p);
  });

  const matsToDispose = [clusterMat, screenMat];

  return {
    group,
    dispose() {
      cluster.tex.dispose();
      screen.tex.dispose();
      for (const m of matsToDispose) m.dispose();
    },
    setReadout(rpm: number, throttle: number, running: boolean) {
      paintCluster(cluster.ctx, rpm, running);
      cluster.tex.needsUpdate = true;
      paintScreen(screen.ctx, rpm, throttle, running);
      screen.tex.needsUpdate = true;
    },
  };
}
