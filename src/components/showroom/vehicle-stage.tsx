"use client";

import { Suspense, useDeferredValue } from "react";
import { ContactShadows, useGLTF } from "@react-three/drei";
import { STAGE_POS, VEHICLES } from "@/data/vehicles";
import { useShowroomStore } from "@/lib/showroom-store";
import Vehicle from "@/components/showroom/vehicle";

VEHICLES.forEach((v) => useGLTF.preload(v.model));

export default function VehicleStage() {
  const vehicleId = useDeferredValue(useShowroomStore((s) => s.vehicleId));
  const vehicle = VEHICLES.find((v) => v.id === vehicleId) ?? VEHICLES[0];

  return (
    <Suspense fallback={null}>
      <group key={vehicle.id}>
        <Vehicle vehicle={vehicle} />
        <ContactShadows
          position={[STAGE_POS[0], 0.012, STAGE_POS[2]]}
          scale={12}
          blur={2}
          opacity={0.5}
          far={2.6}
          resolution={512}
          frames={1}
          color="#05060a"
        />
      </group>
    </Suspense>
  );
}
