"use client";

import { Suspense, useDeferredValue, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { STAGE_POS, VEHICLES } from "@/data/vehicles";
import { useShowroomStore } from "@/lib/showroom-store";
import Vehicle from "@/components/showroom/vehicle";

VEHICLES.forEach((v) => useGLTF.preload(v.model));

const POD_H = 0.12;

function makeBrushedMap() {
  const S = 512;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#1c1e22";
  c.fillRect(0, 0, S, S);
  c.translate(S / 2, S / 2);
  for (let i = 0; i < 420; i++) {
    const r = Math.random() * (S / 2);
    const a0 = Math.random() * Math.PI * 2;
    const a1 = a0 + 0.2 + Math.random() * 0.8;
    const v = 30 + Math.random() * 22;
    c.strokeStyle = `rgba(${v},${v + 1},${v + 3},0.4)`;
    c.lineWidth = 0.9;
    c.beginPath();
    c.arc(0, 0, r, a0, a1);
    c.stroke();
  }
  return new THREE.CanvasTexture(cv);
}

function Podium({ radius }: { radius: number }) {
  const brushed = useMemo(() => makeBrushedMap(), []);

  return (
    <group position={STAGE_POS}>
      <mesh position={[0, POD_H / 2, 0]}>
        <cylinderGeometry args={[radius, radius + 0.02, POD_H, 64]} />
        <meshStandardMaterial color="#17181c" roughness={0.45} metalness={0.6} envMapIntensity={0.5} />
      </mesh>
      <mesh position={[0, POD_H + 0.001, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial
          map={brushed}
          color="#8b8e93"
          roughness={0.3}
          metalness={0.75}
          envMapIntensity={0.7}
        />
      </mesh>
      <mesh position={[0, POD_H - 0.012, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[radius + 0.012, 0.007, 8, 96]} />
        <meshBasicMaterial color={new THREE.Color(1.4, 1.45, 1.55)} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Turntable({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const autoOrbit = useShowroomStore((s) => s.autoOrbit);

  useEffect(() => {
    if (autoOrbit) invalidate();
  }, [autoOrbit, invalidate]);

  useFrame((_, delta) => {
    if (!autoOrbit || !group.current) return;
    group.current.rotation.y += Math.min(delta, 0.05) * 0.9;
    invalidate();
  });

  return (
    <group ref={group} position={STAGE_POS}>
      <group position={[-STAGE_POS[0], -STAGE_POS[1], -STAGE_POS[2]]}>{children}</group>
    </group>
  );
}

export default function VehicleStage() {
  const vehicleId = useDeferredValue(useShowroomStore((s) => s.vehicleId));
  const vehicle = VEHICLES.find((v) => v.id === vehicleId) ?? VEHICLES[0];
  const podR = vehicle.stage.length / 2 + 0.55;

  return (
    <Suspense fallback={null}>
      <Turntable key={vehicle.id}>
        <Podium radius={podR} />
        <group position={[0, POD_H, 0]}>
          <Vehicle vehicle={vehicle} />
          <ContactShadows
            position={[STAGE_POS[0], 0.004, STAGE_POS[2]]}
            scale={podR * 2.1}
            blur={2}
            opacity={0.55}
            far={2.2}
            resolution={512}
            frames={1}
            color="#05060a"
          />
        </group>
      </Turntable>
    </Suspense>
  );
}
