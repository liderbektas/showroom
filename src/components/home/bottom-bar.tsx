"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ChevronLeft, ChevronRight, Info, RotateCw, Scan } from "lucide-react";
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
      duration: 1.2,
      ease: "power2.out",
      delay: 0.3,
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

const CELL = "flex h-full items-center justify-center border-l border-white/10";
const ACTION =
  "group flex h-full w-full items-center justify-center gap-2.5 text-[11px] uppercase tracking-[0.25em] transition-colors duration-300";

export default function BottomBar() {
  const vehicleId = useShowroomStore((s) => s.vehicleId);
  const hotspotId = useShowroomStore((s) => s.hotspotId);
  const autoOrbit = useShowroomStore((s) => s.autoOrbit);
  const setVehicle = useShowroomStore((s) => s.setVehicle);
  const setHotspot = useShowroomStore((s) => s.setHotspot);
  const toggleAutoOrbit = useShowroomStore((s) => s.toggleAutoOrbit);

  const vehicle = getVehicle(vehicleId);
  const index = VEHICLES.findIndex((v) => v.id === vehicleId);
  const nameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!nameRef.current) return;
    const tween = gsap.fromTo(
      nameRef.current,
      { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" }
    );
    return () => {
      tween.kill();
    };
  }, [vehicleId]);

  const cycle = (dir: number) => {
    const next = (index + dir + VEHICLES.length) % VEHICLES.length;
    setVehicle(VEHICLES[next].id);
  };

  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 h-[4.5rem] border-t border-white/10 bg-black/35 backdrop-blur-md">
      <div className="flex h-full">
        <button
          onClick={() => cycle(-1)}
          aria-label="Önceki araç"
          className="flex h-full w-[4.5rem] shrink-0 items-center justify-center text-white/50 transition-colors duration-300 hover:bg-white/[0.05] hover:text-white"
        >
          <ChevronLeft size={18} strokeWidth={1.6} />
        </button>
        <button
          onClick={() => cycle(1)}
          aria-label="Sonraki araç"
          className={`${CELL} w-[4.5rem] shrink-0 text-white/50 transition-colors duration-300 hover:bg-white/[0.05] hover:text-white`}
        >
          <ChevronRight size={18} strokeWidth={1.6} />
        </button>

        <div className={`${CELL} min-w-0 flex-1 justify-start px-7`}>
          <div ref={nameRef} key={vehicleId} className="flex min-w-0 items-baseline gap-4">
            <span className="text-[10px] tracking-[0.35em] text-[color:var(--accent)] tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              className="truncate text-xs font-normal uppercase tracking-[0.08em] text-white/85"
              style={DISPLAY}
            >
              {vehicle.name}
            </span>
          </div>
        </div>

        {vehicle.specs.map((spec) => (
          <div key={spec.label} className={`${CELL} hidden w-32 shrink-0 flex-col gap-1 lg:flex`}>
            <p className="text-lg font-semibold text-white/90" style={DISPLAY}>
              <Counter spec={spec} vehicleId={vehicleId} />
            </p>
            <p className="text-[9px] tracking-[0.4em] text-white/30">{spec.label}</p>
          </div>
        ))}

        <div className={`${CELL} hidden w-[4.5rem] shrink-0 md:flex`}>
          <button
            onClick={toggleAutoOrbit}
            aria-label="360 derece döndür"
            title="360° döndür"
            className={`flex h-full w-full items-center justify-center transition-colors duration-300 ${
              autoOrbit
                ? "bg-white/[0.04] text-white"
                : "text-white/50 hover:bg-white/[0.05] hover:text-white"
            }`}
          >
            <RotateCw
              size={17}
              strokeWidth={1.6}
              className={autoOrbit ? "animate-spin-slow" : "transition-transform duration-500 hover:rotate-45"}
            />
          </button>
        </div>
        <div className={`${CELL} hidden w-44 shrink-0 md:flex`}>
          <button
            onClick={() => setHotspot(vehicle.hotspots[0]?.id ?? null)}
            className={`${ACTION} ${
              hotspotId
                ? "bg-white/[0.04] text-[color:var(--accent)]"
                : "text-white/60 hover:bg-white/[0.05] hover:text-white"
            }`}
          >
            <Info size={13} strokeWidth={1.8} />
            Details
          </button>
        </div>
        <div className={`${CELL} hidden w-44 shrink-0 md:flex`}>
          <button
            onClick={() => setHotspot(null)}
            className={`${ACTION} text-white/60 hover:bg-white/[0.05] hover:text-white`}
          >
            <Scan size={13} strokeWidth={1.8} />
            Overview
          </button>
        </div>
      </div>
    </footer>
  );
}
