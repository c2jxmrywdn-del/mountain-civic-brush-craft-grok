import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createSupercar, type Supercar } from "@/car/createSupercar";
import type { DoorSide } from "@/car/spec";

export type StudioView = "front" | "side" | "rear" | "cabin" | "bay";

export type Telemetry = {
  rpm: number;
  running: boolean;
  muted: boolean;
  available: boolean;
};

export type OpenState = { left: boolean; right: boolean; hood: boolean; engine: boolean };

export type StudioHandle = {
  setView(view: StudioView): void;
  toggleDoor(side: DoorSide): void;
  toggleHood(): void;
  toggleHatch(): void;
  start(): void;
  stop(): void;
  setThrottle(value: number): void;
  setMuted(muted: boolean): void;
  getOpenState(): OpenState;
  dispose(): void;
};

type Hooks = {
  onTelemetry?: (telemetry: Telemetry) => void;
  onParts?: (open: OpenState) => void;
  onReady?: (info: { counts: Record<string, number>; size: { x: number; y: number; z: number } }) => void;
};

const VIEWS: Record<StudioView, { pos: [number, number, number]; target: [number, number, number] }> = {
  front: { pos: [3.2, 1.12, 4.15], target: [0, 0.46, 0.1] },
  side: { pos: [5.05, 1.02, 0.15], target: [0, 0.48, 0] },
  rear: { pos: [-3.15, 1.18, -4.25], target: [0, 0.5, -0.15] },
  cabin: { pos: [-2.15, 0.92, 0.95], target: [-0.05, 0.62, 0.2] },
  bay: { pos: [1.85, 1.65, -3.15], target: [0, 0.55, -1.05] },
};

function contactTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(128, 64, 18, 128, 64, 122);
  g.addColorStop(0, "rgba(0,0,0,0.38)");
  g.addColorStop(0.55, "rgba(0,0,0,0.16)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function studioEnvironment() {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xf7f6f3, side: THREE.BackSide, roughness: 1 }),
  );
  room.scale.set(26, 16, 26);
  room.position.y = 5;
  env.add(room);
  const warm = new THREE.PointLight(0xfff4e8, 280, 48);
  warm.position.set(6, 9, 5);
  const cool = new THREE.PointLight(0xdfe7f4, 160, 48);
  cool.position.set(-7, 5, 3);
  const rim = new THREE.PointLight(0xffffff, 110, 36);
  rim.position.set(0, 7, -8);
  env.add(warm, cool, rim);
  return env;
}

declare global {
  interface Window {
    __helion?: {
      ready: boolean;
      setView: (view: StudioView) => void;
      toggleDoor: (side: DoorSide) => void;
      toggleHood: () => void;
      toggleHatch: () => void;
      start: () => void;
      stop: () => void;
      setThrottle: (value: number) => void;
      state: () => Telemetry & { open: OpenState; counts: Record<string, number>; size: { x: number; y: number; z: number } };
    };
  }
}

export function createStudio(canvas: HTMLCanvasElement, hooks: Hooks = {}): StudioHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  if (!renderer.getContext()) throw new Error("WebGL is unavailable in this browser.");
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0xf4f3f0, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4f3f0);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = studioEnvironment();
  const envMap = pmrem.fromScene(envScene, 0.04);
  scene.environment = envMap.texture;
  scene.environmentIntensity = 0.82;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.08, 80);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.55;
  controls.maxDistance = 12;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minPolarAngle = 0.18;
  controls.target.set(...VIEWS.front.target);
  camera.position.set(...VIEWS.front.pos);
  controls.update();

  scene.add(new THREE.HemisphereLight(0xfffaf6, 0xd8d3cb, 0.65));
  const key = new THREE.DirectionalLight(0xfff3e4, 2.45);
  key.position.set(4.8, 7.8, 4.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 22;
  const extent = 4.2;
  key.shadow.camera.left = -extent;
  key.shadow.camera.right = extent;
  key.shadow.camera.top = extent;
  key.shadow.camera.bottom = -extent;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 5;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe5edf8, 0.8);
  fill.position.set(-5.5, 3.2, 2.4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.95);
  rim.position.set(-2.2, 4.8, -6.2);
  scene.add(rim);
  const kick = new THREE.DirectionalLight(0xfff8f0, 0.4);
  kick.position.set(0.5, 2.2, 6.5);
  scene.add(kick);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(20, 64),
    new THREE.MeshStandardMaterial({ color: 0xeceae6, roughness: 0.94, metalness: 0.02, envMapIntensity: 0.2 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const contactMap = contactTexture();
  let contact: THREE.Mesh | null = null;
  if (contactMap) {
    contact = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 2.15),
      new THREE.MeshBasicMaterial({ map: contactMap, transparent: true, depthWrite: false }),
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = 0.006;
    scene.add(contact);
  }

  const car: Supercar = createSupercar();
  scene.add(car.object);

  const box = new THREE.Box3().setFromObject(car.object);
  const size = new THREE.Vector3();
  box.getSize(size);

  const timer = new THREE.Timer();
  timer.connect(document);

  const viewFrom = new THREE.Vector3();
  const viewTo = new THREE.Vector3().copy(camera.position);
  const targetFrom = new THREE.Vector3();
  const targetTo = new THREE.Vector3().copy(controls.target);
  let viewT = 1;
  let telemetryAt = 0;

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let pointerX = 0;
  let pointerY = 0;
  let tracking = false;

  function resize() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();
  const observer = new ResizeObserver(() => resize());
  observer.observe(canvas);

  function emitParts() {
    hooks.onParts?.(car.getOpenState());
  }

  function onPointerDown(event: PointerEvent) {
    tracking = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
  }
  function onPointerUp(event: PointerEvent) {
    if (!tracking) return;
    tracking = false;
    if (Math.hypot(event.clientX - pointerX, event.clientY - pointerY) > 6) return;
    const rect = canvas.getBoundingClientRect();
    ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(car.pickTargets, true);
    const part = car.partFromObject(hits[0]?.object ?? null);
    if (part === "door-left") car.doors.toggle("left");
    else if (part === "door-right") car.doors.toggle("right");
    else if (part === "hood") car.hatches.toggle("hood");
    else if (part === "hatch") car.hatches.toggle("engine");
    else return;
    emitParts();
  }
  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  controls.addEventListener("start", () => {
    viewT = 1;
  });

  const handle: StudioHandle = {
    setView(view) {
      viewFrom.copy(camera.position);
      targetFrom.copy(controls.target);
      viewTo.set(...VIEWS[view].pos);
      targetTo.set(...VIEWS[view].target);
      viewT = 0;
    },
    toggleDoor(side) {
      car.doors.toggle(side);
      emitParts();
    },
    toggleHood() {
      car.hatches.toggle("hood");
      emitParts();
    },
    toggleHatch() {
      car.hatches.toggle("engine");
      emitParts();
    },
    start() {
      car.audio.start();
    },
    stop() {
      car.audio.stop();
      car.setThrottle(0);
    },
    setThrottle(value) {
      car.setThrottle(value);
    },
    setMuted(muted) {
      car.audio.setMuted(muted);
    },
    getOpenState: () => car.getOpenState(),
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      timer.disconnect();
      controls.dispose();
      car.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      contact?.geometry.dispose();
      (contact?.material as THREE.Material | undefined)?.dispose();
      contactMap?.dispose();
      envMap.texture.dispose?.();
      pmrem.dispose();
      envScene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
      renderer.dispose();
      if (window.__helion) window.__helion.ready = false;
    },
  };

  window.__helion = {
    ready: true,
    setView: (view) => handle.setView(view),
    toggleDoor: (side) => handle.toggleDoor(side),
    toggleHood: () => handle.toggleHood(),
    toggleHatch: () => handle.toggleHatch(),
    start: () => handle.start(),
    stop: () => handle.stop(),
    setThrottle: (value) => handle.setThrottle(value),
    state: () => ({
      rpm: car.audio.rpm,
      running: car.audio.running,
      muted: car.audio.muted,
      available: car.audio.available,
      open: car.getOpenState(),
      counts: car.debug.counts,
      size: { x: +size.x.toFixed(3), y: +size.y.toFixed(3), z: +size.z.toFixed(3) },
    }),
  };

  renderer.setAnimationLoop(() => {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.1);
    if (viewT < 1) {
      viewT = Math.min(1, viewT + dt * 1.5);
      const eased = viewT * viewT * (3 - 2 * viewT);
      camera.position.lerpVectors(viewFrom, viewTo, eased);
      controls.target.lerpVectors(targetFrom, targetTo, eased);
    }
    controls.update();
    car.update(dt);
    renderer.render(scene, camera);
    telemetryAt += dt;
    if (telemetryAt > 0.2) {
      telemetryAt = 0;
      hooks.onTelemetry?.({
        rpm: car.audio.rpm,
        running: car.audio.running,
        muted: car.audio.muted,
        available: car.audio.available,
      });
    }
  });

  hooks.onReady?.({
    counts: car.debug.counts,
    size: { x: size.x, y: size.y, z: size.z },
  });
  emitParts();
  return handle;
}
