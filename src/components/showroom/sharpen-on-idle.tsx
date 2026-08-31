"use client";

import { useCallback, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useShowroomStore } from "@/lib/showroom-store";

const BASE_DPR = 1.75;
const IDLE_MS = 600;
const GRACE_FRAMES = 2;

// [perf adım 9] DPR geçişi render hedeflerini yeniden ayırdığı için yalnızca sahne
// dururken native'e yükseltilir. Geri dönüş kare render edilmeden yapılmalı: wheel
// zoom pulslar halinde geldiğinden düşüş frame içinde beklerse her pulsta önce ağır
// bir native kare + realloc yaşanır ve zoom takılır. Bu yüzden demote girdi olayına
// (wheel/pointerdown) ve kamera uçuşu tetikleyen store değişimlerine bağlı; useFrame
// içindeki grace sayacı yalnızca olaysız animasyonlar için son çare.
export default function SharpenOnIdle() {
  const gl = useThree((s) => s.gl);
  const setDpr = useThree((s) => s.setDpr);
  const invalidate = useThree((s) => s.invalidate);
  const sharp = useRef(false);
  const grace = useRef(0);
  const timer = useRef(0);

  const demote = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = 0;
    if (!sharp.current) return;
    sharp.current = false;
    setDpr(Math.min(window.devicePixelRatio, BASE_DPR));
  }, [setDpr]);

  useEffect(() => {
    const el = gl.domElement;
    el.addEventListener("pointerdown", demote);
    el.addEventListener("wheel", demote, { passive: true });
    el.addEventListener("touchstart", demote, { passive: true });
    const unsub = useShowroomStore.subscribe(demote);
    return () => {
      el.removeEventListener("pointerdown", demote);
      el.removeEventListener("wheel", demote);
      el.removeEventListener("touchstart", demote);
      unsub();
      window.clearTimeout(timer.current);
    };
  }, [gl, demote]);

  useFrame(() => {
    const native = Math.min(window.devicePixelRatio, 2);
    if (native <= BASE_DPR) return;

    if (sharp.current) {
      if (grace.current > 0) {
        grace.current -= 1;
        return;
      }
      demote();
      return;
    }

    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      sharp.current = true;
      grace.current = GRACE_FRAMES;
      setDpr(native);
      invalidate();
    }, IDLE_MS);
  });

  return null;
}
