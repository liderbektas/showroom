"use client";

import { VEHICLES } from "@/data/vehicles";
import { useShowroomStore } from "@/lib/showroom-store";

const ROW_H = 44;

export default function VehicleRail() {
  const vehicleId = useShowroomStore((s) => s.vehicleId);
  const hotspotId = useShowroomStore((s) => s.hotspotId);
  const setVehicle = useShowroomStore((s) => s.setVehicle);
  const index = VEHICLES.findIndex((v) => v.id === vehicleId);

  return (
    <nav
      aria-label="Araç seçimi"
      className={`fixed left-8 top-1/2 z-20 hidden -translate-y-1/2 md:block transition-opacity duration-500 ${
        hotspotId ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative">
        <span className="absolute bottom-2 left-0 top-2 w-px bg-white/12" />
        <span
          className="absolute left-0 w-px bg-white transition-all duration-500 ease-out"
          style={{ top: index * ROW_H + ROW_H / 2 - 11, height: 22 }}
        />
        {VEHICLES.map((v, i) => {
          const active = v.id === vehicleId;
          return (
            <button
              key={v.id}
              onClick={() => setVehicle(v.id)}
              aria-label={v.name}
              style={{ height: ROW_H }}
              className="group flex w-full items-center pl-5 pr-2"
            >
              <span
                className={`text-[11px] tracking-[0.3em] tabular-nums transition-all duration-300 ${
                  active
                    ? "text-white"
                    : "text-white/25 group-hover:text-white/60"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
