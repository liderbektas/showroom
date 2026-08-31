"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { STAGE_POS, type Vehicle as VehicleData } from "@/data/vehicles";
import HotspotMarker from "@/components/showroom/hotspot-marker";

function logHotspotPoint(e: { point: THREE.Vector3; stopPropagation: () => void }) {
  if (process.env.NODE_ENV !== "development") return;
  const local = e.point.clone().sub(new THREE.Vector3(...STAGE_POS));
  console.log(
    `hotspot position: [${local.x.toFixed(2)}, ${local.y.toFixed(2)}, ${local.z.toFixed(2)}]`
  );
}

export default function Vehicle({ vehicle }: { vehicle: VehicleData }) {
  const { scene } = useGLTF(vehicle.model);

  const root = useMemo(() => {
    const clone = scene.clone(true);
    clone.rotation.set(0, vehicle.stage.rotationY, 0);
    clone.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
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

    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const entry of mats) {
        const mat = entry as THREE.MeshStandardMaterial;
        if (mat.isMeshStandardMaterial) mat.envMapIntensity = 1.15;
      }
    });
    return clone;
  }, [scene, vehicle]);

  return (
    <group position={STAGE_POS}>
      <primitive object={root} onClick={logHotspotPoint} />
      {vehicle.hotspots.map((h) => (
        <HotspotMarker key={h.id} hotspot={h} />
      ))}
    </group>
  );
}
