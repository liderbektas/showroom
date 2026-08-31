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

export type VehicleSpec = { label: string; value: number; decimals?: number; suffix?: string };

export type MaterialOverride = {
  color?: string;
  metalness?: number;
  roughness?: number;
  envMapIntensity?: number;
  opacity?: number;
};

export type Vehicle = {
  id: string;
  name: string;
  displayName: string;
  specs: VehicleSpec[];
  tagline: string;
  model: string;
  stage: { length: number; rotationY: number };
  paint?: { material: string; color: string };
  materialOverrides?: Record<string, MaterialOverride>;
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
    camera: { pos: [3.4, 1.3, -7.2], target: [0, 0.8, 0.2] },
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
    displayName: "Mercedes Brabus",
    specs: [
      { label: "HP", value: 292 },
      { label: "0-100", value: 7.9, decimals: 1, suffix: "s" },
      { label: "VMAX", value: 180, suffix: " km/h" },
    ],
  },
  {
    id: "rolls-royce",
    name: "Rolls-Royce Phantom Mansory",
    displayName: "PHANTOM",
    specs: [
      { label: "HP", value: 610 },
      { label: "0-100", value: 5.1, decimals: 1, suffix: "s" },
      { label: "VMAX", value: 250, suffix: " km/h" },
    ],
    tagline: "Showroom",
    model: "/models/rolls-royce.opt.glb",
    stage: { length: 5.7, rotationY: -0.55 },
    camera: { pos: [3.4, 1.3, -7.2], target: [0, 0.9, 0.2] },
    hotspots: [
      {
        id: "front",
        title: "Ön Tasarım",
        body: "Pantheon ızgara ve Mansory karbon detayları. Phantom'un heybetli duruşunun merkezi.",
        position: [0.6, 0.85, -2.3],
        camera: { pos: [2.4, 1.2, -4.8], target: [0, 0.85, -1.9] },
      },
      {
        id: "wheel",
        title: "Jant & Fren",
        body: "Mansory dövme jantlar ve büyük çaplı fren diskleri.",
        position: [1.0, 0.42, -1.55],
        camera: { pos: [2.8, 0.75, -2.0], target: [0.9, 0.45, -1.55] },
      },
      {
        id: "cockpit",
        title: "Kokpit",
        body: "El işçiliği deri ve yıldızlı tavan. Camdan içeriye göz atın.",
        position: [0.55, 1.25, 0.2],
        camera: { pos: [2.6, 1.7, 1.0], target: [0.2, 1.05, 0.1] },
      },
      {
        id: "rear",
        title: "Arka Bölüm",
        body: "Mansory difüzör ve çift egzoz düzeni.",
        position: [-0.6, 0.9, 2.3],
        camera: { pos: [-2.8, 1.3, 4.6], target: [0, 0.85, 1.9] },
      },
    ],
  },
  {
    id: "ranger",
    name: "Ford Ranger",
    displayName: "RANGER",
    specs: [
      { label: "HP", value: 292 },
      { label: "0-100", value: 7.9, decimals: 1, suffix: "s" },
      { label: "VMAX", value: 180, suffix: " km/h" },
    ],
    tagline: "Showroom",
    model: "/models/ranger.opt.glb",
    stage: { length: 5.36, rotationY: Math.PI - 0.55 },
    materialOverrides: {
      tyre: { metalness: 0, roughness: 0.92, envMapIntensity: 0.35 },
    },
    camera: { pos: [3.4, 1.4, -7.2], target: [0, 1.0, 0.2] },
    hotspots: [
      {
        id: "front",
        title: "Ön Tasarım",
        body: "Yüksek tampon ve LED far grubu. Arazi duruşunun imzası.",
        position: [0.65, 1.0, -2.2],
        camera: { pos: [2.4, 1.3, -4.6], target: [0, 0.95, -1.8] },
      },
      {
        id: "wheel",
        title: "Jant & Lastik",
        body: "Arazi tipi lastikler ve yüksek sürüş açıklığı.",
        position: [1.0, 0.5, -1.5],
        camera: { pos: [2.8, 0.8, -1.9], target: [0.9, 0.5, -1.5] },
      },
      {
        id: "cockpit",
        title: "Kokpit",
        body: "Yüksek oturma pozisyonu ve dayanıklı iç mekân.",
        position: [0.6, 1.45, 0.1],
        camera: { pos: [2.6, 1.9, 0.9], target: [0.2, 1.2, 0] },
      },
      {
        id: "bed",
        title: "Kasa",
        body: "Yük kasası ve bağlantı noktaları. Pikabın iş tarafı.",
        position: [-0.6, 1.15, 1.9],
        camera: { pos: [-2.7, 1.6, 4.2], target: [0, 1.0, 1.7] },
      },
    ],
  },
  {
    id: "civic-type-r",
    name: "Honda Civic Type R",
    displayName: "TYPE R",
    specs: [
      { label: "HP", value: 329 },
      { label: "0-100", value: 5.4, decimals: 1, suffix: "s" },
      { label: "VMAX", value: 275, suffix: " km/h" },
    ],
    tagline: "Showroom",
    model: "/models/civic-type-r.opt.glb",
    stage: { length: 4.59, rotationY: Math.PI - 0.55 },
    camera: { pos: [3.4, 1.3, -7.2], target: [0, 0.8, 0.2] },
    hotspots: [
      {
        id: "front",
        title: "Ön Tasarım",
        body: "Agresif ön tampon ve bal peteği ızgara. Type R kimliğinin ilk bakışı.",
        position: [0.55, 0.7, -1.85],
        camera: { pos: [2.2, 1.1, -4.1], target: [0, 0.7, -1.5] },
      },
      {
        id: "wheel",
        title: "Jant & Fren",
        body: "19 inç dövme jantlar ve Brembo fren sistemi.",
        position: [0.9, 0.35, -1.3],
        camera: { pos: [2.6, 0.7, -1.7], target: [0.8, 0.4, -1.3] },
      },
      {
        id: "cockpit",
        title: "Kokpit",
        body: "Kırmızı sportif koltuklar ve sürücü odaklı yerleşim.",
        position: [0.5, 1.0, 0.1],
        camera: { pos: [2.4, 1.5, 0.9], target: [0.2, 0.9, 0] },
      },
      {
        id: "rear",
        title: "Arka Kanat",
        body: "Belirgin arka kanat ve üçlü egzoz. Pistten gelen imza.",
        position: [-0.55, 0.95, 1.9],
        camera: { pos: [-2.6, 1.3, 4.1], target: [0, 0.8, 1.6] },
      },
    ],
  },
  {
    id: "clio",
    name: "Renault Clio II",
    displayName: "CLIO",
    specs: [
      { label: "HP", value: 98 },
      { label: "0-100", value: 10.9, decimals: 1, suffix: "s" },
      { label: "VMAX", value: 185, suffix: " km/h" },
    ],
    tagline: "Showroom",
    model: "/models/clio.opt.glb",
    stage: { length: 3.81, rotationY: Math.PI - 0.55 },
    camera: { pos: [3.2, 1.25, -6.6], target: [0, 0.75, 0.2] },
    hotspots: [
      {
        id: "front",
        title: "Ön Tasarım",
        body: "Faz 2 ön yüz ve karakteristik far formu.",
        position: [0.5, 0.65, -1.55],
        camera: { pos: [2.1, 1.0, -3.8], target: [0, 0.65, -1.3] },
      },
      {
        id: "wheel",
        title: "Jant",
        body: "Dönemin klasik jant tasarımı.",
        position: [0.82, 0.32, -1.1],
        camera: { pos: [2.4, 0.65, -1.5], target: [0.75, 0.35, -1.1] },
      },
      {
        id: "cockpit",
        title: "Kokpit",
        body: "Sade ve işlevsel iç mekân.",
        position: [0.45, 0.95, 0.1],
        camera: { pos: [2.2, 1.4, 0.8], target: [0.2, 0.85, 0] },
      },
      {
        id: "rear",
        title: "Arka Bölüm",
        body: "Kompakt hatchback formunun arka çizgileri.",
        position: [-0.5, 0.8, 1.6],
        camera: { pos: [-2.4, 1.2, 3.6], target: [0, 0.75, 1.35] },
      },
    ],
  },
];

export function getVehicle(id: string) {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
}
