import { create } from "zustand";
import { VEHICLES } from "@/data/vehicles";

type ShowroomState = {
  vehicleId: string;
  hotspotId: string | null;
  autoOrbit: boolean;
  setVehicle: (id: string) => void;
  setHotspot: (id: string | null) => void;
  toggleAutoOrbit: () => void;
};

export const useShowroomStore = create<ShowroomState>((set) => ({
  vehicleId: VEHICLES[0].id,
  hotspotId: null,
  autoOrbit: false,
  setVehicle: (vehicleId) => set({ vehicleId, hotspotId: null }),
  setHotspot: (hotspotId) => set((s) => ({ hotspotId, autoOrbit: hotspotId ? false : s.autoOrbit })),
  toggleAutoOrbit: () => set((s) => ({ autoOrbit: !s.autoOrbit })),
}));
