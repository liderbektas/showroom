"use client";

import { VEHICLES } from "@/data/vehicles";
import { useShowroomStore } from "@/lib/showroom-store";

export default function VehicleRail() {
  const vehicleId = useShowroomStore((s) => s.vehicleId);
  const setVehicle = useShowroomStore((s) => s.setVehicle);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 pb-6">
      {VEHICLES.length > 1 && (
        <div className="pointer-events-auto flex gap-2 rounded-full border border-white/10 bg-black/45 p-1.5 backdrop-blur-md">
          {VEHICLES.map((v) => (
            <button
              key={v.id}
              onClick={() => setVehicle(v.id)}
              className={`rounded-full px-4 py-1.5 text-xs transition ${
                v.id === vehicleId
                  ? "bg-white text-black"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
