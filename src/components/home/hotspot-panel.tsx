"use client";

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
      className={`pointer-events-none fixed right-6 top-1/2 z-20 w-[19rem] -translate-y-1/2 transition-all duration-500 ${
        hotspot ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"
      }`}
    >
      {hotspot && (
        <div className="pointer-events-auto rounded-2xl border border-white/10 bg-black/55 p-5 text-[#e8eaec] shadow-2xl backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                {String(index + 1).padStart(2, "0")} / {String(vehicle.hotspots.length).padStart(2, "0")}
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">{hotspot.title}</h2>
            </div>
            <button
              onClick={() => setHotspot(null)}
              aria-label="Kapat"
              className="rounded-full p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/70">{hotspot.body}</p>
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <button
              onClick={() => go(-1)}
              className="rounded-lg px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              ← Önceki
            </button>
            <button
              onClick={() => go(1)}
              className="rounded-lg px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              Sonraki →
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
