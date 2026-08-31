"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useShowroomStore } from "@/lib/showroom-store";
import { playRelay, playSpotClack } from "@/lib/audio";

const BASE_EXPOSURE = 0.98;
const DIM_EXPOSURE = 0.05;

// Araç değişimini tek seferde swap etmek yerine sahne ışığı üzerinden koreografiler:
// exposure kısılır → karanlıkta model değişir (Suspense mount'u da bu sırada maskelenir)
// → exposure geri açılırken alt bardaki isim/sayaç animasyonları commit ile tetiklenmiş olur.
// Effect switchingTo'nun kendisine değil varlığına bağlı: dim sürerken gelen yeni hedef
// timeline'ı öldürmez, commit her zaman store'daki güncel hedefi okur.
export default function VehicleTransition() {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const switching = useShowroomStore((s) => s.switchingTo !== null);

  useEffect(() => {
    if (!switching) return;

    const state = { e: gl.toneMappingExposure };
    const apply = () => {
      gl.toneMappingExposure = state.e;
      invalidate();
    };

    playRelay();
    const tl = gsap.timeline({
      onComplete: () => useShowroomStore.getState().endVehicleSwitch(),
    });
    tl.to(state, { e: DIM_EXPOSURE, duration: 0.45, ease: "power2.in", onUpdate: apply })
      .call(() => {
        useShowroomStore.getState().commitVehicle();
        playSpotClack();
      })
      .to(state, { e: BASE_EXPOSURE, duration: 0.9, ease: "power2.out", onUpdate: apply }, "+=0.3");

    return () => {
      tl.kill();
      if (gl.toneMappingExposure !== BASE_EXPOSURE) {
        gl.toneMappingExposure = BASE_EXPOSURE;
        invalidate();
      }
    };
  }, [switching, gl, invalidate]);

  return null;
}
