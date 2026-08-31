"use client";

import { LayoutGrid } from "lucide-react";

export default function MenuButton() {
  return (
    <button
      aria-label="Menu"
      className="group fixed right-8 top-7 z-20 flex size-10 items-center justify-center text-white/70 transition-colors duration-300 hover:text-white"
    >
      <LayoutGrid
        size={18}
        strokeWidth={1.5}
        className="transition-transform duration-500 group-hover:rotate-90"
      />
    </button>
  );
}
