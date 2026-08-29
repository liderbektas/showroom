import { create } from "zustand";

export type Phase = "loading" | "ready" | "opening" | "inside";

type IntroState = {
  phase: Phase;
  setPhase: (phase: Phase) => void;
};

export const useIntroStore = create<IntroState>((set) => ({
  phase: "loading",
  setPhase: (phase) => set({ phase }),
}));
