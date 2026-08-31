"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { getVehicle } from "@/data/vehicles";
import { useShowroomStore } from "@/lib/showroom-store";

export default function HotspotPanel() {
  const vehicleId = useShowroomStore((s) => s.vehicleId);
  const hotspotId = useShowroomStore((s) => s.hotspotId);
  const setHotspot = useShowroomStore((s) => s.setHotspot);

  const vehicle = getVehicle(vehicleId);
  const index = vehicle.hotspots.findIndex((h) => h.id === hotspotId);
  const hotspot = index >= 0 ? vehicle.hotspots[index] : null;

  const go = (dir: number) => {
    const next = (index + dir + vehicle.hotspots.length) % vehicle.hotspots.length;
    setHotspot(vehicle.hotspots[next].id);
  };

  return (
    <aside
      className={`pointer-events-none fixed right-8 top-1/2 z-20 w-[26rem] -translate-y-1/2 transition-all duration-500 ${
        hotspot ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"
      }`}
    >
      {hotspot && (
        <div className="pointer-events-auto border border-white/12 bg-black/60 text-[#e8eaec] shadow-2xl backdrop-blur-md">
          <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
            <div>
              <p className="text-[10px] tracking-[0.4em] text-white/35">
                {String(index + 1).padStart(2, "0")} — {String(vehicle.hotspots.length).padStart(2, "0")}
              </p>
              <h2 className="mt-2 text-2xl font-semibold uppercase tracking-wide">
                {hotspot.title}
              </h2>
            </div>
            <button
              onClick={() => setHotspot(null)}
              aria-label="Kapat"
              className="p-1 text-white/40 transition hover:text-white"
            >
              <X size={16} strokeWidth={1.8} />
            </button>
          </div>

          <p className="px-6 py-5 text-[15px] leading-7 text-white/65">{hotspot.body}</p>

          <div className="flex border-t border-white/10">
            <button
              onClick={() => go(-1)}
              aria-label="Önceki nokta"
              className="flex flex-1 items-center justify-center border-r border-white/10 py-4 text-white/50 transition hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft size={18} strokeWidth={1.8} />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Sonraki nokta"
              className="flex flex-1 items-center justify-center py-4 text-white/50 transition hover:bg-white/5 hover:text-white"
            >
              <ArrowRight size={18} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
