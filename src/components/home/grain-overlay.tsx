"use client";

const NOISE =
  "data:image/svg+xml;base64," +
  btoa(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='160' height='160' filter='url(#n)' opacity='0.55'/></svg>`
  );

export default function GrainOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[6] opacity-[0.05] mix-blend-overlay"
      style={{ backgroundImage: `url("${NOISE}")`, backgroundRepeat: "repeat" }}
      aria-hidden
    />
  );
}
