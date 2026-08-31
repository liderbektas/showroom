"use client";

import { useEffect, useRef } from "react";
import { useProgress } from "@react-three/drei";
import gsap from "gsap";
import { useIntroStore } from "@/lib/store";

export default function Preloader() {
  const phase = useIntroStore((s) => s.phase);
  const setPhase = useIntroStore((s) => s.setPhase);
  const { progress, active } = useProgress();
  const num = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const shown = useRef({ v: 0 });

  useEffect(() => {
    const tween = gsap.to(shown.current, {
      v: progress,
      duration: 0.6,
      ease: "power1.out",
      onUpdate: () => {
        if (num.current) {
          num.current.textContent = String(Math.round(shown.current.v)).padStart(3, "0");
        }
        if (bar.current) bar.current.style.width = `${shown.current.v}%`;
      },
    });
    return () => {
      tween.kill();
    };
  }, [progress]);

  useEffect(() => {
    if (phase === "loading" && progress >= 100 && !active) setPhase("ready");
  }, [phase, progress, active, setPhase]);

  useEffect(() => {
    // Her şey tarayıcı cache'inden gelirse LoadingManager hiç tetiklenmeyebilir;
    // kullanıcıyı kilitli kapıda bırakmamak için boşta kalan yüklemeyi ready sayar.
    const t = setTimeout(() => {
      if (useIntroStore.getState().phase === "loading" && !useProgress.getState().active) {
        useIntroStore.getState().setPhase("ready");
      }
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-10 z-10 flex flex-col items-center gap-3 transition-opacity duration-700 ${
        phase === "loading" ? "opacity-100" : "opacity-0"
      }`}
    >
      <p className="flex items-baseline gap-3 text-[10px] tracking-[0.45em] text-black/55">
        LOADING
        <span ref={num} className="tabular-nums">
          000
        </span>
      </p>
      <span className="block h-px w-40 bg-black/15">
        <span ref={bar} className="block h-full w-0 bg-black/60" />
      </span>
    </div>
  );
}
