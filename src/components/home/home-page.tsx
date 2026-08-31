"use client";

import { useEffect, useState } from "react";
import Showroom from "@/components/showroom/showroom";
import HotspotPanel from "@/components/home/hotspot-panel";
import BottomBar from "@/components/home/bottom-bar";
import MenuButton from "@/components/home/menu-button";
import SoundToggle from "@/components/home/sound-toggle";
import GrainOverlay from "@/components/home/grain-overlay";
import { VEHICLE_ENABLED } from "@/data/vehicles";


export default function HomePage() {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const reveal = setTimeout(() => setRevealed(true), 350);
    return () => clearTimeout(reveal);
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0a0b0d] text-[#e8eaec]">
      <Showroom />
      <GrainOverlay />
      <MenuButton />
      <SoundToggle />
      {VEHICLE_ENABLED && <BottomBar />}
      {VEHICLE_ENABLED && <HotspotPanel />}

      <div
        className={`pointer-events-none absolute inset-0 z-30 bg-black transition-opacity duration-1000 ${
          revealed ? "opacity-0" : "opacity-100"
        }`}
      />
    </main>
  );
}
