import * as THREE from "three";

function canvasTex(draw: (ctx: CanvasRenderingContext2D, size: number) => void, size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function carbonMap() {
  return canvasTex((ctx, s) => {
    ctx.fillStyle = "#121416";
    ctx.fillRect(0, 0, s, s);
    const cell = 8;
    for (let y = 0; y < s; y += cell) {
      for (let x = 0; x < s; x += cell) {
        const twill = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0;
        ctx.fillStyle = twill ? "#2a2d31" : "#1a1c1f";
        ctx.fillRect(x, y, cell / 2, cell);
        ctx.fillStyle = twill ? "#16181a" : "#30343a";
        ctx.fillRect(x + cell / 2, y, cell / 2, cell);
      }
    }
  });
}

function noiseRough(base: string) {
  return canvasTex((ctx, s) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    const img = ctx.getImageData(0, 0, s, s);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 180 + Math.random() * 50;
      img.data[i] = n;
      img.data[i + 1] = n;
      img.data[i + 2] = n;
    }
    ctx.putImageData(img, 0, 0);
  }, 128);
}

export type CarMaterials = ReturnType<typeof createMaterials>;

export function createMaterials() {
  const carbon = carbonMap();
  carbon.repeat.set(6, 6);

  const paint = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#d5d8dc"),
    metalness: 0.82,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    sheen: 0.35,
    sheenColor: new THREE.Color("#f4f7fb"),
    sheenRoughness: 0.4,
    envMapIntensity: 1.15,
  });

  const black = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#141618"),
    metalness: 0.45,
    roughness: 0.38,
    clearcoat: 0.55,
    clearcoatRoughness: 0.18,
    envMapIntensity: 0.8,
  });

  const carbonMat = new THREE.MeshPhysicalMaterial({
    map: carbon,
    color: new THREE.Color("#9aa0a6"),
    metalness: 0.55,
    roughness: 0.42,
    clearcoat: 0.45,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.7,
  });

  const glass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#c5d4d2"),
    metalness: 0,
    roughness: 0.04,
    transmission: 0.92,
    thickness: 0.02,
    ior: 1.5,
    transparent: true,
    opacity: 1,
    envMapIntensity: 1.3,
    attenuationColor: new THREE.Color("#d5ebe6"),
    attenuationDistance: 0.6,
  });

  const rubber = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1a1b1d"),
    metalness: 0.05,
    roughness: 0.78,
    envMapIntensity: 0.3,
  });

  const rim = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#3e4248"),
    metalness: 0.9,
    roughness: 0.28,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1,
  });

  const metal = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#c5c8cc"),
    metalness: 1,
    roughness: 0.32,
    envMapIntensity: 1,
  });

  const caliper = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#e55312"),
    metalness: 0.2,
    roughness: 0.42,
    clearcoat: 0.7,
    clearcoatRoughness: 0.22,
  });

  const leather = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#2a221c"),
    metalness: 0,
    roughness: 0.72,
    sheen: 0.25,
    sheenColor: new THREE.Color("#6a5346"),
    roughnessMap: noiseRough("#888"),
    envMapIntensity: 0.25,
  });

  const carpet = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1a1714"),
    roughness: 0.95,
    metalness: 0,
  });

  const stitch = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#8a7060"),
    roughness: 0.6,
  });

  const chrome = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#f2f4f6"),
    metalness: 1,
    roughness: 0.08,
    envMapIntensity: 1.2,
  });

  const exhaust = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#6e543c"),
    metalness: 1,
    roughness: 0.38,
    emissive: new THREE.Color("#3a1408"),
    emissiveIntensity: 0.05,
  });

  const lampWhite = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#f7f5ef"),
    emissive: new THREE.Color("#fff4dd"),
    emissiveIntensity: 1.6,
    roughness: 0.25,
    metalness: 0.05,
  });

  const lampRed = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#3a0c0c"),
    emissive: new THREE.Color("#ff2418"),
    emissiveIntensity: 1.35,
    roughness: 0.3,
  });

  const lampAmber = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#4a2a08"),
    emissive: new THREE.Color("#ff9a1f"),
    emissiveIntensity: 0.9,
    roughness: 0.35,
  });

  const lens = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#e7eeef"),
    transmission: 0.7,
    thickness: 0.01,
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    ior: 1.45,
  });

  const housing = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0c0d0f"),
    roughness: 0.55,
    metalness: 0.4,
  });

  const aluminum = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#b7bcc2"),
    metalness: 0.85,
    roughness: 0.38,
  });

  const hose = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1c1e22"),
    roughness: 0.65,
    metalness: 0.1,
  });

  const coolant = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1e3a4c"),
    roughness: 0.45,
    metalness: 0.2,
  });

  const screen = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0e1014"),
    roughness: 0.35,
    metalness: 0.4,
    emissive: new THREE.Color("#0a0c10"),
    emissiveIntensity: 0.4,
  });

  const floor = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#eceae6"),
    roughness: 0.92,
    metalness: 0.02,
    envMapIntensity: 0.25,
  });

  const cove = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#f6f5f2"),
    roughness: 1,
    metalness: 0,
    side: THREE.BackSide,
  });

  const shadow = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#000000"),
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });

  const all: THREE.Material[] = [
    paint, black, carbonMat, glass, rubber, rim, metal, caliper, leather, carpet,
    stitch, chrome, exhaust, lampWhite, lampRed, lampAmber, lens, housing,
    aluminum, hose, coolant, screen, floor, cove, shadow,
  ];
  const textures = [carbon, leather.roughnessMap].filter(Boolean) as THREE.Texture[];

  return {
    paint, black, carbonMat, glass, rubber, rim, metal, caliper, leather, carpet,
    stitch, chrome, exhaust, lampWhite, lampRed, lampAmber, lens, housing,
    aluminum, hose, coolant, screen, floor, cove, shadow,
    dispose() {
      for (const m of all) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
