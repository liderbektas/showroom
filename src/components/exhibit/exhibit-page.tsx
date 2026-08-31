"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { STAGE_POS, VEHICLES } from "@/data/vehicles";
import { useShowroomStore } from "@/lib/showroom-store";
import { playUiTick } from "@/lib/audio";
import Vehicle from "@/components/showroom/vehicle";
import GrainOverlay from "@/components/home/grain-overlay";

gsap.registerPlugin(ScrollTrigger);

const DISPLAY = { fontFamily: "var(--font-display), sans-serif" };

function Stage({ id }: { id: string }) {
  const vehicle = VEHICLES.find((v) => v.id === id)!;
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, stencil: false, powerPreference: "high-performance" }}
      camera={{ fov: 36, position: [4.6, 1.7, 5.2] }}
    >
      <Suspense fallback={null}>
        <group position={[-STAGE_POS[0], -STAGE_POS[1], -STAGE_POS[2]]}>
          <Vehicle vehicle={vehicle} interactive={false} />
        </group>
        <ContactShadows
          position={[0, 0.002, 0]}
          scale={vehicle.stage.length * 2}
          blur={2.4}
          opacity={0.5}
          far={2.2}
          resolution={512}
          frames={1}
          color="#05060a"
        />
      </Suspense>
      <Environment resolution={512}>
        <Lightformer
          intensity={1.1}
          color="#e9edf3"
          position={[0, 7, 0]}
          rotation-x={Math.PI / 2}
          scale={[24, 28, 1]}
        />
        <Lightformer
          intensity={3.0}
          color="#f4f7fb"
          position={[0, 4, 0]}
          rotation-x={Math.PI / 2}
          scale={[3.4, 5, 1]}
        />
        {[-1, 1].map((s) => (
          <Lightformer
            key={s}
            intensity={0.7}
            color="#d4d9e0"
            position={[s * 8, 2.2, 0]}
            rotation-y={(-s * Math.PI) / 2}
            scale={[24, 5, 1]}
          />
        ))}
      </Environment>
      <OrbitControls
        makeDefault
        target={[0, 0.72, 0]}
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.6}
        minPolarAngle={0.9}
        maxPolarAngle={1.55}
      />
    </Canvas>
  );
}

export default function ExhibitPage({ id }: { id: string }) {
  const index = VEHICLES.findIndex((v) => v.id === id);
  const vehicle = VEHICLES[index];
  const next = VEHICLES[(index + 1) % VEHICLES.length];
  const setVehicle = useShowroomStore((s) => s.setVehicle);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVehicle(id);
  }, [id, setVehicle]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-hero]", {
        y: 70,
        opacity: 0,
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.09,
        delay: 0.15,
      });
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 60,
          opacity: 0,
          duration: 1.0,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 82%" },
        });
      });
    }, root);
    return () => ctx.revert();
  }, [id]);

  return (
    <div ref={root} className="min-h-screen bg-[#0a0b0d] text-[#e8eaec]">
      <GrainOverlay />

      <header className="fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-between border-b border-white/10 bg-[#0a0b0d]/60 px-6 backdrop-blur-md md:px-10">
        <Link
          href="/"
          onClick={() => playUiTick()}
          className="flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-white/55 transition-colors duration-300 hover:text-white"
        >
          <ArrowLeft size={13} strokeWidth={1.8} />
          Showroom
        </Link>
        <p className="text-[10px] tracking-[0.35em] text-white/40 tabular-nums">
          EXHIBIT {String(index + 1).padStart(2, "0")} / {String(VEHICLES.length).padStart(2, "0")}
        </p>
      </header>

      <section className="relative flex min-h-screen flex-col justify-end overflow-hidden px-6 pb-16 pt-28 md:px-10">
        <p
          data-hero
          className="mb-6 text-[10px] uppercase tracking-[0.45em] text-[color:var(--accent)]/80"
        >
          Exhibit {String(index + 1).padStart(2, "0")} · {vehicle.year} · {vehicle.origin}
        </p>
        <h1
          data-hero
          className="break-words text-[clamp(4rem,17vw,15rem)] font-extrabold uppercase leading-[0.86] tracking-tight text-white"
          style={DISPLAY}
        >
          {vehicle.displayName}
        </h1>
        <div data-hero className="mt-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50" style={DISPLAY}>
            {vehicle.name}
          </p>
          <p className="max-w-xl text-[15px] leading-8 text-white/60">{vehicle.story}</p>
        </div>
      </section>

      <section data-reveal className="relative h-[78vh] border-y border-white/10">
        <Stage id={id} />
        <p className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.4em] text-white/30">
          Drag to rotate
        </p>
      </section>

      <section data-reveal className="grid grid-cols-1 border-b border-white/10 md:grid-cols-3">
        {vehicle.specs.map((spec) => (
          <div
            key={spec.label}
            className="flex flex-col gap-3 border-b border-white/10 px-6 py-12 last:border-b-0 md:border-b-0 md:border-r md:px-10 md:last:border-r-0"
          >
            <p className="text-6xl font-bold tabular-nums text-white/90" style={DISPLAY}>
              {spec.value.toFixed(spec.decimals ?? 0)}
              <span className="ml-2 text-lg font-medium text-white/40">{spec.suffix}</span>
            </p>
            <p className="text-[10px] tracking-[0.45em] text-white/35">{spec.label}</p>
          </div>
        ))}
      </section>

      <section className="relative overflow-hidden">
        {vehicle.hotspots.map((h, i) => (
          <article
            key={h.id}
            data-reveal
            className="relative grid min-h-[52vh] grid-cols-1 items-center gap-8 border-b border-white/10 px-6 py-20 md:grid-cols-2 md:px-10"
          >
            <span
              aria-hidden
              className={`pointer-events-none absolute top-1/2 -translate-y-1/2 select-none text-[26vw] font-black leading-none text-white/[0.035] ${
                i % 2 ? "left-0" : "right-0"
              }`}
              style={DISPLAY}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className={i % 2 ? "md:order-2" : ""}>
              <p className="mb-4 text-[10px] tracking-[0.45em] text-[color:var(--accent)]/70 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h2
                className="text-[clamp(2rem,5vw,4rem)] font-bold uppercase leading-none text-white/90"
                style={DISPLAY}
              >
                {h.title}
              </h2>
            </div>
            <p
              className={`max-w-md text-[15px] leading-8 text-white/55 ${
                i % 2 ? "md:order-1 md:justify-self-end" : "md:justify-self-start"
              }`}
            >
              {h.body}
            </p>
          </article>
        ))}
      </section>

      <footer className="px-6 py-24 md:px-10">
        <p className="mb-6 text-[10px] uppercase tracking-[0.45em] text-white/35">Next exhibit</p>
        <Link
          href={`/exhibit/${next.id}`}
          onClick={() => playUiTick()}
          className="group flex items-baseline gap-6"
        >
          <span
            className="break-words text-[clamp(2.6rem,9vw,8rem)] font-extrabold uppercase leading-none text-white/25 transition-colors duration-500 group-hover:text-white"
            style={DISPLAY}
          >
            {next.displayName}
          </span>
          <ArrowUpRight
            size={30}
            strokeWidth={1.5}
            className="shrink-0 text-white/25 transition-all duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-white"
          />
        </Link>
      </footer>
    </div>
  );
}
