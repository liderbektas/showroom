"use client";

export default function MenuButton() {
  return (
    <button
      aria-label="Menü"
      className="group fixed right-8 top-7 z-20 flex h-10 w-12 flex-col items-end justify-center gap-2"
    >
      <span className="h-[2px] w-9 bg-white/80 transition-all duration-300 group-hover:w-6" />
      <span className="h-[2px] w-6 bg-white/80 transition-all duration-300 group-hover:w-9" />
    </button>
  );
}
