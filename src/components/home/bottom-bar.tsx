"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ChevronLeft, ChevronRight, Info, Scan } from "lucide-react";
import { VEHICLES, getVehicle, type VehicleSpec } from "@/data/vehicles";
import { useShowroomStore } from "@/lib/showroom-store";

const DISPLAY = { fontFamily: "var(--font-display), sans-serif" };

function Counter({ spec, vehicleId }: { spec: VehicleSpec; vehicleId: string }) {
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const state = { v: 0 };
    const tween = gsap.to(state, {
      v: spec.value,
      duration: 1.3,
      ease: "power2.out",
      delay: 0.35,
      onUpdate: () => {
        node.textContent = state.v.toFixed(spec.decimals ?? 0);
      },
    });
    return () => {
      tween.kill();
    };
  }, [spec, vehicleId]);

  return (
    <span className="tabular-nums">
      <span ref={el}>0</span>
      {spec.suffix}
    </span>
  );
}

const SQUARE_BTN =
  "flex size-12 items-center justify-center border border-white/20 bg-black/40 text-white/70 backdrop-blur-md transition hover:border-white/60 hover:text-white";

export default function BottomBar() {
  const vehicleId = useShowroomStore((s) => s.vehicleId);
  const hotspotId = useShowroomStore((s) => s.hotspotId);
  const setVehicle = useShowroomStore((s) => s.setVehicle);
  const setHotspot = useShowroomStore((s) => s.setHotspot);

  const vehicle = getVehicle(vehicleId);
  const index = VEHICLES.findIndex((v) => v.id === vehicleId);
  const idRow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!idRow.current) return;
    const tween = gsap.fromTo(
      idRow.current,
      { y: 12, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.2 }
    );
    return () => {
      tween.kill();
    };
  }, [vehicleId]);

  const cycle = (dir: number) => {
    const next = (index + dir + VEHICLES.length) % VEHICLES.length;
    setVehicle(VEHICLES[next].id);
  };

  const dimmed = hotspotId ? "pointer-events-none opacity-0" : "opacity-100";

  return (
    <div className="fixed inset-x-8 bottom-8 z-20">
      <div className="flex items-end justify-between pb-5">
        <div ref={idRow} key={vehicleId} className={`transition-opacity duration-500 ${dimmed}`}>
          <p className="text-[10px] tracking-[0.45em] text-white/35 tabular-nums">
            {String(index + 1).padStart(2, "0")} / {String(VEHICLES.length).padStart(2, "0")}
          </p>
          <p
            className="mt-2 text-sm font-medium uppercase tracking-[0.12em] text-white/85"
            style={DISPLAY}
          >
            {vehicle.name}
          </p>
        </div>

        <div className={`flex items-end transition-opacity duration-500 ${dimmed}`}>
          {vehicle.specs.map((spec, i) => (
            <div
              key={spec.label}
              className={`px-8 text-right ${i > 0 ? "border-l border-white/10" : ""} ${
                i === vehicle.specs.length - 1 ? "pr-0" : ""
              }`}
            >
              <p className="text-2xl font-bold text-white/90" style={DISPLAY}>
                <Counter spec={spec} vehicleId={vehicleId} />
              </p>
              <p className="mt-1 text-[9px] tracking-[0.4em] text-white/35">{spec.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px w-full bg-white/10" />

      <div className="flex items-center justify-between pt-5">
        <div className={`flex gap-2 transition-opacity duration-500 ${dimmed}`}>
          <button onClick={() => cycle(-1)} aria-label="Önceki araç" className={SQUARE_BTN}>
            <ChevronLeft size={20} strokeWidth={1.6} />
          </button>
          <button onClick={() => cycle(1)} aria-label="Sonraki araç" className={SQUARE_BTN}>
            <ChevronRight size={20} strokeWidth={1.6} />
          </button>
        </div>

        <div className="flex">
            <button
              onClick={() => setHotspot(vehicle.hotspots[0]?.id ?? null)}
              className={`flex h-12 items-center gap-2 border px-6 text-[11px] uppercase tracking-[0.25em] backdrop-blur-md transition ${
                hotspotId
                  ? "border-white bg-white text-black"
                  : "border-white/20 bg-black/40 text-white/75 hover:border-white/60 hover:text-white"
              }`}
            >
              <Info size={13} strokeWidth={1.8} />
              Details
            </button>
            <button
              onClick={() => setHotspot(null)}
              className="-ml-px flex h-12 items-center gap-2 border border-white/20 bg-black/40 px-6 text-[11px] uppercase tracking-[0.25em] text-white/75 backdrop-blur-md transition hover:border-white/60 hover:text-white"
            >
              <Scan size={13} strokeWidth={1.8} />
              Overview
            </button>
        </div>
      </div>
    </div>
  );
}
