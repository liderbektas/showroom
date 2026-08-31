"use client";

import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { initAudio, isMuted, playUiTick, setMuted } from "@/lib/audio";

export default function SoundToggle() {
  const [muted, setMutedState] = useState(isMuted);

  const toggle = () => {
    initAudio();
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) playUiTick();
  };

  return (
    <button
      onClick={toggle}
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      className="fixed right-20 top-7 z-20 flex size-10 items-center justify-center text-white/70 transition-colors duration-300 hover:text-white"
    >
      {muted ? <VolumeX size={17} strokeWidth={1.5} /> : <Volume2 size={17} strokeWidth={1.5} />}
    </button>
  );
}
