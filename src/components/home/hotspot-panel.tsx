"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { getVehicle } from "@/data/vehicles";
import { useShowroomStore } from "@/lib/showroom-store";

const DISPLAY = { fontFamily: "var(--font-display), sans-serif" };

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
      className={`pointer-events-none fixed bottom-24 right-8 z-20 w-[24rem] transition-all duration-500 ${
        hotspot ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"
      }`}
    >
      {hotspot && (
        <div className="pointer-events-auto border border-white/10 bg-black/35 text-[#e8eaec] backdrop-blur-md">
          <div className="flex h-14 items-center gap-4 border-b border-white/10 px-6">
            <span className="text-[10px] tracking-[0.35em] text-white/40 tabular-nums">
              {String(index + 1).padStart(2, "0")} / {String(vehicle.hotspots.length).padStart(2, "0")}
            </span>
            <h2
              className="min-w-0 flex-1 truncate text-[13px] font-normal uppercase tracking-[0.08em] text-white/90"
              style={DISPLAY}
            >
              {hotspot.title}
            </h2>
            <button
              onClick={() => setHotspot(null)}
              aria-label="Kapat"
              className="-mr-1 flex size-8 items-center justify-center text-white/40 transition-colors duration-300 hover:text-white"
            >
              <X size={14} strokeWidth={1.6} />
            </button>
          </div>

          <p className="px-6 py-5 text-[14px] leading-7 text-white/55">{hotspot.body}</p>

          <div className="flex h-12 border-t border-white/10">
            <button
              onClick={() => go(-1)}
              aria-label="Önceki nokta"
              className="flex flex-1 items-center justify-center border-r border-white/10 text-white/45 transition-colors duration-300 hover:bg-white/[0.05] hover:text-white"
            >
              <ArrowLeft size={15} strokeWidth={1.6} />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Sonraki nokta"
              className="flex flex-1 items-center justify-center text-white/45 transition-colors duration-300 hover:bg-white/[0.05] hover:text-white"
            >
              <ArrowRight size={15} strokeWidth={1.6} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
