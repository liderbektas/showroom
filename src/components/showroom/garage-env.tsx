"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL = "/models/modern-garage.opt.glb";

useGLTF.preload(MODEL);

// [perf adım 2] Garaj tamamen unlit: MeshStandard → MeshBasic. Model AO'yu ORM paketli
// dokuda taşıyor (R=AO, G=rough, B=metal) — dogrudan map yapılırsa sahne camgöbeği olur;
// R kanalı tek seferlik canvas'la gri tonlamaya çekilir. Drawcall aynı (3), tri aynı (~600).
const grayCache = new Map<string, THREE.CanvasTexture>();

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
    d[i + 1] = d[i];
    d[i + 2] = d[i];
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
          const light = new THREE.MeshBasicMaterial({ color: "#f6f9fd" });
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
    </group>
  );
}
