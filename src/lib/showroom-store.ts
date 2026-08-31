import { create } from "zustand";
import { VEHICLES } from "@/data/vehicles";

type ShowroomState = {
  vehicleId: string;
  switchingTo: string | null;
  hotspotId: string | null;
  autoOrbit: boolean;
  setVehicle: (id: string) => void;
  beginVehicle: (id: string) => void;
  commitVehicle: () => void;
  endVehicleSwitch: () => void;
  setHotspot: (id: string | null) => void;
  toggleAutoOrbit: () => void;
};

export const useShowroomStore = create<ShowroomState>((set) => ({
  vehicleId: VEHICLES[0].id,
  switchingTo: null,
  hotspotId: null,
  autoOrbit: false,
  setVehicle: (vehicleId) => set({ vehicleId, hotspotId: null }),
  beginVehicle: (id) =>
    set((s) => (id === s.vehicleId && s.switchingTo === null ? s : { switchingTo: id })),
  commitVehicle: () =>
    set((s) => (s.switchingTo ? { vehicleId: s.switchingTo, hotspotId: null } : s)),
  endVehicleSwitch: () => set({ switchingTo: null }),
  setHotspot: (hotspotId) => set((s) => ({ hotspotId, autoOrbit: hotspotId ? false : s.autoOrbit })),
  toggleAutoOrbit: () => set((s) => ({ autoOrbit: !s.autoOrbit })),
}));
