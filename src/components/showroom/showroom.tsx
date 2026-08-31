"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from "@react-three/postprocessing";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { STAGE_POS, VEHICLE_ENABLED } from "@/data/vehicles";
import { useShowroomStore } from "@/lib/showroom-store";
import GarageEnv from "@/components/showroom/garage-env";
import CameraController from "@/components/showroom/camera-controller";


if (typeof window !== "undefined") {
  RectAreaLightUniformsLib.init();
}

export default function Showroom() {
  const setHotspot = useShowroomStore((s) => s.setHotspot);

  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={[1, 1.5]}
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

        <Suspense fallback={null}>
          <GarageEnv />
          {VEHICLE_ENABLED && (
            <ContactShadows
              position={[STAGE_POS[0], 0.012, STAGE_POS[2]]}
              scale={11}
              blur={2.4}
              opacity={0.6}
              far={2.6}
              resolution={512}
              frames={1}
              color="#05060a"
            />
          )}
        </Suspense>

        <hemisphereLight args={["#eef1f5", "#5a5d63", 0.42]} />
        {[-1, 1].map((s) => (
          <rectAreaLight
            key={s}
            position={[s * 5.1, 3.25, 7]}
            rotation={[-Math.PI / 2, 0, s * 0.55]}
            args={["#f2f5fa", 4.2, 0.5, 24]}
          />
        ))}
        <rectAreaLight
          position={[0, 3.3, STAGE_POS[2]]}
          rotation-x={-Math.PI / 2}
          args={["#f2f5fa", 2.2, 3.4, 4.6]}
        />

        <Environment resolution={256}>
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
          <N8AO halfRes quality="medium" aoRadius={1.2} intensity={2.6} distanceFalloff={1} />
          <Bloom mipmapBlur intensity={0.35} luminanceThreshold={1.0} />
          <Vignette offset={0.26} darkness={0.62} />
          <SMAA />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
