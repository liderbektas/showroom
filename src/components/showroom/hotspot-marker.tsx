"use client";

import { Html } from "@react-three/drei";
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
      occlude
      zIndexRange={[40, 0]}
      style={{ transition: "opacity 0.35s", opacity: dimmed ? 0.25 : 1 }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setHotspot(isActive ? null : hotspot.id);
        }}
        aria-label={hotspot.title}
        className="group relative flex size-7 items-center justify-center"
      >
        {!isActive && (
          <span className="absolute inset-0 animate-ping rounded-full bg-white/25" />
        )}
        <span
          className={`relative flex size-5 items-center justify-center rounded-full border text-[11px] leading-none backdrop-blur-sm transition-all duration-300 ${
            isActive
              ? "border-white bg-white text-black"
              : "border-white/70 bg-black/45 text-white group-hover:scale-125 group-hover:bg-black/70"
          }`}
        >
          +
        </span>
      </button>
    </Html>
  );
}
