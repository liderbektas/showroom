import { create } from "zustand";
import { VEHICLES } from "@/data/vehicles";

type ShowroomState = {
  vehicleId: string;
  hotspotId: string | null;
  setVehicle: (id: string) => void;
  setHotspot: (id: string | null) => void;
};

export const useShowroomStore = create<ShowroomState>((set) => ({
  vehicleId: VEHICLES[0].id,
  hotspotId: null,
  setVehicle: (vehicleId) => set({ vehicleId, hotspotId: null }),
  setHotspot: (hotspotId) => set({ hotspotId }),
}));
