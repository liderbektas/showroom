"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { STAGE_POS } from "@/data/vehicles";

const MODEL = "/models/modern-garage.opt.glb";

useGLTF.preload(MODEL);

// [perf adım 2] Garaj tamamen unlit: MeshStandard → MeshBasic. Model AO'yu ORM paketli
// dokuda taşıyor (R=AO, G=rough, B=metal) — dogrudan map yapılırsa sahne camgöbeği olur;
// R kanalı tek seferlik canvas'la gri tonlamaya çekilir. Drawcall aynı (3), tri aynı (~600).
const grayCache = new Map<string, THREE.CanvasTexture>();

function makePoolMap() {
  const S = 256;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const c = cv.getContext("2d")!;
  const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.5, "rgba(0,0,0,0.10)");
  g.addColorStop(1, "rgba(0,0,0,0.42)");
  c.fillStyle = g;
  c.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(cv);
}

function occlusionToGray(src: THREE.Texture) {
  const cached = grayCache.get(src.uuid);
  if (cached) return cached;
  const img = src.image as ImageBitmap;
  const cv = document.createElement("canvas");
  cv.width = img.width;
  cv.height = img.height;
  const c = cv.getContext("2d")!;
  c.drawImage(img, 0, 0);
  const px = c.getImageData(0, 0, cv.width, cv.height);
  const d = px.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i] / 255;
    const curved = v * v * (3 - 2 * v);
    const graded = Math.pow(curved, 1.25) * 255;
    d[i] = graded * 0.94;
    d[i + 1] = graded * 0.96;
    d[i + 2] = graded * 1.02;
  }
  c.putImageData(px, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = src.wrapS;
  tex.wrapT = src.wrapT;
  tex.anisotropy = 8;
  grayCache.set(src.uuid, tex);
  return tex;
}
export default function GarageEnv() {
  const { scene } = useGLTF(MODEL);
  const poolTex = useMemo(() => makePoolMap(), []);

  const root = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const replaced = mats.map((entry) => {
        const src = entry as THREE.MeshStandardMaterial;
        if (!src.isMeshStandardMaterial) return entry;
        if (src.name === "Basic_White_Light") {
          const light = new THREE.MeshBasicMaterial();
          light.color.setRGB(1.55, 1.62, 1.75);
          light.toneMapped = false;
          return light;
        }
        const packed = (src.aoMap ?? src.map) as THREE.Texture | null;
        const baked = packed ? occlusionToGray(packed) : null;
        return new THREE.MeshBasicMaterial({ map: baked, color: src.color });
      });
      mesh.material = Array.isArray(mesh.material) ? replaced : replaced[0];
    });
    return clone;
  }, [scene]);

  return (
    <group>
      <primitive object={root} />
      <mesh position={[0, 2.1, -7.28]}>
        <planeGeometry args={[16, 5]} />
        <meshBasicMaterial color="#0a0b0d" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[STAGE_POS[0], 0.008, STAGE_POS[2] + 1]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[30, 34]} />
        <meshBasicMaterial map={poolTex} color="#000000" transparent depthWrite={false} />
      </mesh>
    </group>
  );
}
