export type HotspotCamera = {
  pos: [number, number, number];
  target: [number, number, number];
};

export type Hotspot = {
  id: string;
  title: string;
  body: string;
  position: [number, number, number];
  camera: HotspotCamera;
};

export type Vehicle = {
  id: string;
  name: string;
  tagline: string;
  model: string;
  stage: { length: number; rotationY: number };
  paint?: { material: string; color: string };
  camera: HotspotCamera;
  hotspots: Hotspot[];
};

export const VEHICLE_ENABLED = true;

export const STAGE_POS: [number, number, number] = [0, 0, 7.2];

export const VEHICLES: Vehicle[] = [
  {
    id: "mercedes",
    name: "Mercedes-Benz",
    tagline: "Showroom · İlk model",
    model: "/models/mercedes.opt.glb",
    stage: { length: 4.9, rotationY: Math.PI - 0.55 },
    camera: { pos: [0.5, 1.25, -8.6], target: [0, 0.85, 0.4] },
    hotspots: [
      {
        id: "front",
        title: "Ön Tasarım",
        body: "Izgara ve LED far imzası. Gövdeye akan kaput çizgileri aracın duruşunu belirler.",
        position: [0.55, 0.7, -1.95],
        camera: { pos: [2.2, 1.1, -4.2], target: [0, 0.7, -1.6] },
      },
      {
        id: "wheel",
        title: "Jant & Fren",
        body: "Hafif alaşım jantlar ve büyük çaplı fren diskleri. Yol tutuşun görünen yüzü.",
        position: [0.92, 0.36, -1.3],
        camera: { pos: [2.6, 0.7, -1.7], target: [0.8, 0.4, -1.3] },
      },
      {
        id: "cockpit",
        title: "Kokpit",
        body: "Sürücü odaklı iç mekân. Camdan içeriye göz atın.",
        position: [0.5, 1.02, 0.15],
        camera: { pos: [2.4, 1.5, 0.9], target: [0.2, 0.9, 0.1] },
      },
      {
        id: "rear",
        title: "Arka Bölüm",
        body: "Difüzör ve egzoz düzeni. Aracın karakterini arkadan okuyun.",
        position: [-0.55, 0.75, 1.95],
        camera: { pos: [-2.6, 1.2, 4.1], target: [0, 0.7, 1.6] },
      },
    ],
  },
];

export function getVehicle(id: string) {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
}
