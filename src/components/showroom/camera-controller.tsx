"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import gsap from "gsap";
import * as THREE from "three";
import { STAGE_POS, getVehicle } from "@/data/vehicles";
import { useShowroomStore } from "@/lib/showroom-store";

function toWorld([x, y, z]: [number, number, number]): [number, number, number] {
  return [x + STAGE_POS[0], y + STAGE_POS[1], z + STAGE_POS[2]];
}

const BOUNDS = {
  x: [-5.3, 5.3],
  y: [0.45, 3.05],
  z: [-5.6, 20.6],
} as const;

// [perf adım 5] gsap kamera uçuşu demand modunda her tween karesinde invalidate eder;
// timeline bitince kare üretimi durur. Orbit damping'i drei kendi invalidate zinciriyle sürdürür.
export default function CameraController() {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useRef<OrbitControlsImpl>(null);
  const vehicleId = useShowroomStore((s) => s.vehicleId);
  const hotspotId = useShowroomStore((s) => s.hotspotId);

  useEffect(() => {
    const ctrl = controls.current;
    if (!ctrl) return;
    const clampCamera = () => {
      const p = camera.position;
      p.x = THREE.MathUtils.clamp(p.x, BOUNDS.x[0], BOUNDS.x[1]);
      p.y = THREE.MathUtils.clamp(p.y, BOUNDS.y[0], BOUNDS.y[1]);
      p.z = THREE.MathUtils.clamp(p.z, BOUNDS.z[0], BOUNDS.z[1]);
    };
    ctrl.addEventListener("change", clampCamera);
    return () => ctrl.removeEventListener("change", clampCamera);
  }, [camera]);

  useEffect(() => {
    const ctrl = controls.current;
    if (!ctrl) return;

    const vehicle = getVehicle(vehicleId);
    const hotspot = vehicle.hotspots.find((h) => h.id === hotspotId);
    const pose = hotspot ? hotspot.camera : vehicle.camera;
    const pos = toWorld(pose.pos);
    const target = toWorld(pose.target);

    ctrl.enabled = false;
    const tl = gsap.timeline({
      onUpdate: () => {
        ctrl.update();
        invalidate();
      },
      onComplete: () => {
        ctrl.enabled = true;
        invalidate();
      },
    });
    tl.to(camera.position, { x: pos[0], y: pos[1], z: pos[2], duration: 1.4, ease: "power3.inOut" }, 0)
      .to(ctrl.target, { x: target[0], y: target[1], z: target[2], duration: 1.4, ease: "power3.inOut" }, 0);

    return () => {
      tl.kill();
      ctrl.enabled = true;
    };
  }, [camera, invalidate, vehicleId, hotspotId]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={14.5}
      minPolarAngle={0.95}
      maxPolarAngle={1.58}
      target={toWorld(getVehicle(vehicleId).camera.target)}
    />
  );
}
