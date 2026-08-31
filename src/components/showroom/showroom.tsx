"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, StatsGl } from "@react-three/drei";
import { Bloom, EffectComposer, SMAA, Vignette } from "@react-three/postprocessing";
import { STAGE_POS, VEHICLE_ENABLED, getVehicle } from "@/data/vehicles";
import { useShowroomStore } from "@/lib/showroom-store";
import GarageEnv from "@/components/showroom/garage-env";
import Vehicle from "@/components/showroom/vehicle";
import CameraController from "@/components/showroom/camera-controller";

// [perf adım 1] r3f-perf turbopack ile çöktüğü için (nested drei9 bağımlılığı) dev HUD:
// StatsGl (fps/ms/gpu) + DevPerf console logu (drawcall/tri, 2sn'de bir).
// Başlangıç (ışıklı/PBR/N8AO/dpr2): ~80 drawcall, ~881K tri.
// [perf adım 2] 4 real-time ışık (hemisphere + 3 rectArea) söküldü; garaj unlit basic,
// araba yalnız Environment IBL ile. Drawcall 80→76, ışık başına fragment maliyeti 0.
// [perf adım 3+4] Sahne unlit olunca GPU bütçesi açıldı: dpr tavanı native 2.0,
// AdaptiveDpr tabanı 1.5 (daha aşağı asla inmez — pixelleşme sınırı). fps<45'te 1.5'e
// düşer, fps>55'te 2.0'a döner; demand modundaki kare boşlukları (>250ms) pencereyi sıfırlar.
// [perf adım 5] frameloop="demand": boşta 0 render/sn; orbit/gsap/yükleme invalidate eder.
// [perf adım 8] N8AO kaldırıldı (tam ekran depth+AO+denoise passları gitti);
// Bloom mipmap zinciri + Vignette + SMAA kaldı.

function DevPerf() {
  const gl = useThree((s) => s.gl);
  const last = useRef(0);

  useFrame(() => {
    const now = performance.now();
    if (now - last.current < 2000) return;
    last.current = now;
    const { calls, triangles } = gl.info.render;
    console.log(`[perf] drawcalls=${calls} tris=${triangles}`);
  });

  return null;
}

function AdaptiveDpr() {
  const setDpr = useThree((s) => s.setDpr);
  const last = useRef(0);
  const acc = useRef(0);
  const count = useRef(0);
  const level = useRef(2);

  useFrame(() => {
    const now = performance.now();
    const dt = now - last.current;
    last.current = now;
    if (dt > 250) {
      acc.current = 0;
      count.current = 0;
      return;
    }
    acc.current += dt;
    count.current++;
    if (count.current < 40) return;
    const fps = 1000 / (acc.current / count.current);
    acc.current = 0;
    count.current = 0;
    if (fps < 45 && level.current > 1.55) {
      level.current = 1.5;
      setDpr(Math.min(1.5, window.devicePixelRatio));
    } else if (fps > 55 && level.current < 1.95) {
      level.current = 2;
      setDpr(Math.min(2, window.devicePixelRatio));
    }
  });

  return null;
}

export default function Showroom() {
  const vehicleId = useShowroomStore((s) => s.vehicleId);
  const setHotspot = useShowroomStore((s) => s.setHotspot);
  const vehicle = getVehicle(vehicleId);

  return (
    <div className="absolute inset-0">
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        gl={{
          antialias: false,
          stencil: false,
          powerPreference: "high-performance",
          toneMappingExposure: 1.05,
        }}
        camera={{ fov: 42, position: [0, 1.35, -5.2], near: 0.1, far: 80 }}
        onPointerMissed={() => setHotspot(null)}
      >
        <color attach="background" args={["#0a0b0d"]} />
        {process.env.NODE_ENV === "development" && (
          <>
            <StatsGl />
            <DevPerf />
          </>
        )}
        <AdaptiveDpr />

        <Suspense fallback={null}>
          <GarageEnv />
          {VEHICLE_ENABLED && <Vehicle vehicle={vehicle} />}
          {VEHICLE_ENABLED && (
            <ContactShadows
              key={vehicleId}
              position={[STAGE_POS[0], 0.012, STAGE_POS[2]]}
              scale={11}
              blur={2}
              opacity={0.5}
              far={2.6}
              resolution={512}
              frames={1}
              color="#05060a"
            />
          )}
        </Suspense>

        <Environment resolution={256}>
          <Lightformer
            intensity={1.1}
            color="#e9edf3"
            position={[0, 7, 7]}
            rotation-x={Math.PI / 2}
            scale={[26, 30, 1]}
          />
          {[-1, 1].map((s) => (
            <Lightformer
              key={`side${s}`}
              intensity={0.55}
              color="#d4d9e0"
              position={[s * 9, 2, 7]}
              rotation-y={(-s * Math.PI) / 2}
              scale={[26, 5, 1]}
            />
          ))}
          <Lightformer
            intensity={3.2}
            color="#f4f7fb"
            position={[0, 4, 7]}
            rotation-x={Math.PI / 2}
            scale={[3.6, 5, 1]}
          />
          {[-1, 1].map((s) => (
            <Lightformer
              key={s}
              intensity={1.6}
              color="#eef2f8"
              position={[s * 5, 3.4, 7]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={[0.7, 22, 1]}
            />
          ))}
          <Lightformer intensity={0.5} color="#c9ced6" position={[0, 1.4, -6]} scale={[12, 3, 1]} />
          <Lightformer
            intensity={0.35}
            color="#b8bdc6"
            position={[0, 1.2, 20]}
            rotation-y={Math.PI}
            scale={[12, 3, 1]}
          />
        </Environment>

        <CameraController />

        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur levels={5} intensity={0.35} luminanceThreshold={1.0} />
          <Vignette offset={0.26} darkness={0.62} />
          <SMAA />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
