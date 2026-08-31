"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { STAGE_POS, type Vehicle as VehicleData } from "@/data/vehicles";
import HotspotMarker from "@/components/showroom/hotspot-marker";

// Blender'ın cam shader'ları glTF'e çevrilemiyor (far camı opak, stoplar transmission'lı
// export oluyor); isim bazlı düzeltme tablosu gerçek cam/lens davranışını basar.
const GLASS_TWEAKS: Record<string, (m: THREE.MeshPhysicalMaterial) => void> = {
  "Headlight glass": (m) => {
    m.transparent = true;
    m.opacity = 0.16;
    m.roughness = 0.05;
    m.metalness = 0;
    m.color.set("#ffffff");
    m.depthWrite = false;
    m.envMapIntensity = 1.4;
  },
  "Red glass": (m) => {
    if ("transmission" in m) m.transmission = 0;
    m.transparent = true;
    m.opacity = 0.62;
    m.roughness = 0.06;
    m.metalness = 0;
    m.depthWrite = false;
    m.emissive.set("#3a0004");
    m.emissiveIntensity = 0.6;
    m.envMapIntensity = 1.2;
  },
  "Taillight Ridges": (m) => {
    if ("transmission" in m) m.transmission = 0;
    m.roughness = 0.08;
    m.metalness = 0;
    m.depthWrite = false;
    m.emissive.set("#2a0003");
    m.emissiveIntensity = 0.5;
  },
  Glass: (m) => {
    m.roughness = 0.04;
    m.metalness = 0;
    m.depthWrite = false;
    m.envMapIntensity = 1.2;
  },
  "Rear glass": (m) => {
    m.roughness = 0.05;
    m.metalness = 0;
    m.depthWrite = false;
    m.envMapIntensity = 1.1;
  },
  "Headlight Ridges": (m) => {
    m.roughness = 0.1;
    m.metalness = 0.9;
    m.depthWrite = false;
    m.envMapIntensity = 1.3;
  },
};

// [perf adım 6] Materyaller instance başına klonlanır (useGLTF cache'i kirlenmez),
// araç değişiminde yalnızca klonlar dispose edilir; geometry/texture cache'te kalır.
// [perf adım 7] Aynı materyali paylaşan mesh'ler offline `gltf-transform join` ile
// zaten birleşik: 419 → 73 drawcall, ~880K tri. Runtime merge gereksiz.
export default function Vehicle({
  vehicle,
  interactive = true,
}: {
  vehicle: VehicleData;
  interactive?: boolean;
}) {
  const { scene } = useGLTF(vehicle.model);
  const rig = useRef<THREE.Group>(null);

  const logHotspotPoint = (e: { point: THREE.Vector3; stopPropagation: () => void }) => {
    if (process.env.NODE_ENV !== "development" || !rig.current) return;
    const local = rig.current.worldToLocal(e.point.clone());
    console.log(
      `hotspot position: [${local.x.toFixed(2)}, ${local.y.toFixed(2)}, ${local.z.toFixed(2)}]`
    );
  };

  const { root, owned } = useMemo(() => {
    const clone = skeletonClone(scene) as THREE.Group;
    clone.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    if (size.y > Math.max(size.x, size.z)) {
      clone.rotation.x = -Math.PI / 2;
      clone.updateMatrixWorld(true);
      box.setFromObject(clone);
      box.getSize(size);
    }
    if (size.x > size.z) {
      clone.rotation.y += Math.PI / 2;
      clone.updateMatrixWorld(true);
      box.setFromObject(clone);
      box.getSize(size);
    }

    const scale = vehicle.stage.length / Math.max(size.z, 0.001);
    clone.scale.setScalar(scale);
    clone.updateMatrixWorld(true);
    box.setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.set(-center.x, -box.min.y, -center.z);

    const owned: THREE.Material[] = [];
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (mats.some((entry) => entry.name === "Ghost")) {
        mesh.visible = false;
        return;
      }
      const cloned = mats.map((entry) => {
        const src = entry as THREE.MeshStandardMaterial;
        if (!src.isMeshStandardMaterial) return entry;
        const mat = src.clone();
        owned.push(mat);
        mat.envMapIntensity = 0.9;
        if (vehicle.paint && mat.name === vehicle.paint.material) {
          mat.color.set(vehicle.paint.color);
        }
        if (mat.metalness > 0.9 && mat.name === "Carpaint") mat.metalness = 0.9;
        if (mat.emissiveIntensity > 3) mat.emissiveIntensity = 3;
        const glassTweak = GLASS_TWEAKS[mat.name];
        if (glassTweak) glassTweak(mat as THREE.MeshPhysicalMaterial);
        const override = vehicle.materialOverrides?.[mat.name];
        if (override) {
          if (override.color !== undefined) mat.color.set(override.color);
          if (override.metalness !== undefined) mat.metalness = override.metalness;
          if (override.roughness !== undefined) mat.roughness = override.roughness;
          if (override.envMapIntensity !== undefined) mat.envMapIntensity = override.envMapIntensity;
          if (override.opacity !== undefined) {
            mat.transparent = true;
            mat.opacity = override.opacity;
          }
        }
        const phys = mat as THREE.MeshPhysicalMaterial;
        if (phys.isMeshPhysicalMaterial && phys.specularColor) {
          phys.specularColor.setRGB(
            Math.min(phys.specularColor.r, 1),
            Math.min(phys.specularColor.g, 1),
            Math.min(phys.specularColor.b, 1)
          );
        }
        return mat;
      });
      mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
    });
    return { root: clone, owned };
  }, [scene, vehicle]);

  useEffect(() => {
    return () => {
      owned.forEach((mat) => mat.dispose());
    };
  }, [owned]);

  return (
    <group position={STAGE_POS}>
      <group ref={rig} rotation-y={vehicle.stage.rotationY}>
        <primitive object={root} onClick={logHotspotPoint} />
        {interactive &&
          vehicle.hotspots.map((h) => <HotspotMarker key={h.id} hotspot={h} />)}
      </group>
    </group>
  );
}
