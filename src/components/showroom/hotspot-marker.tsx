"use client";

import { useEffect, useState } from "react";
import { Html } from "@react-three/drei";
import type { Hotspot } from "@/data/vehicles";
import { useShowroomStore } from "@/lib/showroom-store";
import { playUiTick } from "@/lib/audio";

export default function HotspotMarker({ hotspot, index }: { hotspot: Hotspot; index: number }) {
  const active = useShowroomStore((s) => s.hotspotId);
  const setHotspot = useShowroomStore((s) => s.setHotspot);
  const isActive = active === hotspot.id;
  const dimmed = active !== null && !isActive;
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <Html
      position={hotspot.position}
      center
      zIndexRange={[40, 0]}
      style={{ transition: "opacity 0.35s", opacity: !shown ? 0 : dimmed ? 0.2 : 1 }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          playUiTick();
          setHotspot(isActive ? null : hotspot.id);
        }}
        aria-label={hotspot.title}
        className="group relative flex size-8 items-center justify-center"
      >
        <span
          className={`absolute inset-1 border transition-colors duration-300 ${
            isActive
              ? "border-[color:var(--accent)]"
              : "border-white/35 group-hover:border-white/75"
          }`}
        />
        <span
          className={`relative flex size-5 items-center justify-center border text-[10px] leading-none tabular-nums backdrop-blur-sm transition-all duration-300 ${
            isActive
              ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-black"
              : "border-white/60 bg-black/55 text-white group-hover:bg-black/80"
          }`}
        >
          {index + 1}
        </span>
      </button>
    </Html>
  );
}
