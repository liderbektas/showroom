"use client";

import { Html } from "@react-three/drei";
import { Plus } from "lucide-react";
import type { Hotspot } from "@/data/vehicles";
import { useShowroomStore } from "@/lib/showroom-store";

export default function HotspotMarker({ hotspot }: { hotspot: Hotspot }) {
  const active = useShowroomStore((s) => s.hotspotId);
  const setHotspot = useShowroomStore((s) => s.setHotspot);
  const isActive = active === hotspot.id;
  const dimmed = active !== null && !isActive;

  return (
    <Html
      position={hotspot.position}
      center
      zIndexRange={[40, 0]}
      style={{ transition: "opacity 0.35s", opacity: dimmed ? 0.2 : 1 }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setHotspot(isActive ? null : hotspot.id);
        }}
        aria-label={hotspot.title}
        className="group relative flex size-8 items-center justify-center"
      >
        <span
          className={`absolute inset-1 border transition-colors duration-300 ${
            isActive ? "border-white" : "border-white/40 group-hover:border-white/80"
          }`}
        />
        <span
          className={`relative flex size-5 items-center justify-center border backdrop-blur-sm transition-all duration-300 ${
            isActive
              ? "rotate-45 border-white bg-white text-black"
              : "border-white/70 bg-black/50 text-white group-hover:bg-black/80"
          }`}
        >
          <Plus size={11} strokeWidth={2.2} />
        </span>
      </button>
    </Html>
  );
}
