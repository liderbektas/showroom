"use client";

import { useIntroStore } from "@/lib/store";
import GarageDoor from "@/components/intro/garage-door";
import HomePage from "@/components/home/home-page";

export default function IntroGate() {
  const phase = useIntroStore((s) => s.phase);
  return phase === "inside" ? <HomePage /> : <GarageDoor />;
}
