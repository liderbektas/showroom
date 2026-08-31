"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL = "/models/modern-garage.opt.glb";

useGLTF.preload(MODEL);

export default function GarageEnv() {
  const { scene } = useGLTF(MODEL);

  const root = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const entry of mats) {
        const mat = entry as THREE.MeshStandardMaterial;
        if (!mat.isMeshStandardMaterial) continue;
        mat.envMapIntensity = 0.3;
        if (mat.name === "Basic_White_Light") {
          mat.emissive.set("#f4f7fb");
          mat.emissiveIntensity = 2.6;
          mat.toneMapped = false;
        }
      }
    });
    return clone;
  }, [scene]);

  return (
    <group>
      <primitive object={root} />
      <mesh position={[0, 2.1, -7.28]} rotation-y={0}>
        <planeGeometry args={[16, 5]} />
        <meshStandardMaterial color="#0a0b0d" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
