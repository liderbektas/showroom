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
  year: number;
  origin: string;
  story: string;
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
    id: "rolls-royce",
    name: "Rolls-Royce Phantom Mansory",
    displayName: "PHANTOM",
    year: 2022,
    origin: "United Kingdom",
    story:
      "Excess, treated as a craft discipline. Mansory's carbon work sits on top of the most conservative silhouette in the industry — a study in what happens when restraint and maximalism share one body.",
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
        title: "Front Design",
        body: "Pantheon grille and Mansory carbon details. The centerpiece of the Phantom's commanding stance.",
        position: [0.6, 0.85, -2.3],
        camera: { pos: [2.4, 1.2, -4.8], target: [0, 0.85, -1.9] },
      },
      {
        id: "wheel",
        title: "Wheels & Brakes",
        body: "Mansory forged wheels and large-diameter brake discs.",
        position: [1.0, 0.42, -1.55],
        camera: { pos: [2.8, 0.75, -2.0], target: [0.9, 0.45, -1.55] },
      },
      {
        id: "cockpit",
        title: "Cockpit",
        body: "Handcrafted leather and the starlight headliner. Peek in through the glass.",
        position: [0.55, 1.25, 0.2],
        camera: { pos: [2.6, 1.7, 1.0], target: [0.2, 1.05, 0.1] },
      },
      {
        id: "rear",
        title: "Rear Design",
        body: "Mansory diffuser and twin exhaust layout.",
        position: [-0.6, 0.9, 2.3],
        camera: { pos: [-2.8, 1.3, 4.6], target: [0, 0.85, 1.9] },
      },
    ],
  },
  {
    id: "mercedes",
    name: "Mercedes-Benz",
    year: 2016,
    origin: "Germany",
    story:
      "The tuner's thesis: take an engineered object at its limit, then move the limit. Eight hundred and fifty horsepower hiding behind near-stock body lines — aggression expressed almost entirely through stance.",
    tagline: "Showroom",
    model: "/models/mercedes.opt.glb",
    stage: { length: 4.9, rotationY: Math.PI - 0.55 },
    camera: { pos: [3.4, 1.3, -7.2], target: [0, 0.8, 0.2] },
    hotspots: [
      {
        id: "front",
        title: "Front Design",
        body: "Grille and LED light signature. Hood lines flowing into the body define the stance.",
        position: [0.55, 0.7, -1.95],
        camera: { pos: [2.2, 1.1, -4.2], target: [0, 0.7, -1.6] },
      },
      {
        id: "wheel",
        title: "Wheels & Brakes",
        body: "Lightweight alloy wheels and large-diameter brake discs. The visible face of roadholding.",
        position: [0.92, 0.36, -1.3],
        camera: { pos: [2.6, 0.7, -1.7], target: [0.8, 0.4, -1.3] },
      },
      {
        id: "cockpit",
        title: "Cockpit",
        body: "Driver-focused interior. Peek in through the glass.",
        position: [0.5, 1.02, 0.15],
        camera: { pos: [2.4, 1.5, 0.9], target: [0.2, 0.9, 0.1] },
      },
      {
        id: "rear",
        title: "Rear Design",
        body: "Diffuser and exhaust layout. Read the car's character from behind.",
        position: [-0.55, 0.75, 1.95],
        camera: { pos: [-2.6, 1.2, 4.1], target: [0, 0.7, 1.6] },
      },
    ],
    displayName: "BRABUS",
    specs: [
      { label: "HP", value: 850 },
      { label: "0-100", value: 3.9, decimals: 1, suffix: "s" },
      { label: "VMAX", value: 350, suffix: " km/h" },
    ],
  },
  {
    id: "ranger",
    name: "Ford Ranger",
    displayName: "RANGER",
    year: 2023,
    origin: "United States",
    story:
      "The working vehicle as a design object. Every line on a truck is an argument about utility — approach angles, bed walls, tie-down points — and the Ranger makes that argument with unusual clarity.",
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
        title: "Front Design",
        body: "High-set bumper and LED headlamp cluster. The signature of an off-road stance.",
        position: [0.65, 1.0, -2.2],
        camera: { pos: [2.4, 1.3, -4.6], target: [0, 0.95, -1.8] },
      },
      {
        id: "wheel",
        title: "Wheels & Tires",
        body: "All-terrain tires and generous ground clearance.",
        position: [1.0, 0.5, -1.5],
        camera: { pos: [2.8, 0.8, -1.9], target: [0.9, 0.5, -1.5] },
      },
      {
        id: "cockpit",
        title: "Cockpit",
        body: "Commanding seating position and a durable interior.",
        position: [0.6, 1.45, 0.1],
        camera: { pos: [2.6, 1.9, 0.9], target: [0.2, 1.2, 0] },
      },
      {
        id: "bed",
        title: "Cargo Bed",
        body: "Load bed and tie-down points. The working end of the truck.",
        position: [-0.6, 1.15, 1.9],
        camera: { pos: [-2.7, 1.6, 4.2], target: [0, 1.0, 1.7] },
      },
    ],
  },
  {
    id: "civic-type-r",
    name: "Honda Civic Type R",
    displayName: "TYPE R",
    year: 2018,
    origin: "Japan",
    story:
      "Function pushed to the edge of caricature — and every wing, vent and ridge earning its place in the wind tunnel. The Type R is what honesty looks like when it's angry.",
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
        title: "Front Design",
        body: "Aggressive front bumper and honeycomb grille. Your first glimpse of the Type R identity.",
        position: [0.55, 0.7, -1.85],
        camera: { pos: [2.2, 1.1, -4.1], target: [0, 0.7, -1.5] },
      },
      {
        id: "wheel",
        title: "Wheels & Brakes",
        body: "19-inch forged wheels and Brembo brakes.",
        position: [0.9, 0.35, -1.3],
        camera: { pos: [2.6, 0.7, -1.7], target: [0.8, 0.4, -1.3] },
      },
      {
        id: "cockpit",
        title: "Cockpit",
        body: "Red bucket seats and a driver-focused layout.",
        position: [0.5, 1.0, 0.1],
        camera: { pos: [2.4, 1.5, 0.9], target: [0.2, 0.9, 0] },
      },
      {
        id: "rear",
        title: "Rear Wing",
        body: "Prominent rear wing and triple exhaust. A signature straight from the track.",
        position: [-0.55, 0.95, 1.9],
        camera: { pos: [-2.6, 1.3, 4.1], target: [0, 0.8, 1.6] },
      },
    ],
  },
  {
    id: "clio",
    name: "Renault Clio II",
    displayName: "CLIO",
    year: 2001,
    origin: "France",
    story:
      "Ordinary genius. Millions were made, almost none were noticed — yet the Clio's soft geometry defined how a generation of Europe moved. The exhibit's quietest object, and its most democratic.",
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
        title: "Front Design",
        body: "Phase 2 front end and its characteristic headlamp shape.",
        position: [0.5, 0.65, -1.55],
        camera: { pos: [2.1, 1.0, -3.8], target: [0, 0.65, -1.3] },
      },
      {
        id: "wheel",
        title: "Wheels",
        body: "Classic wheel design of its era.",
        position: [0.82, 0.32, -1.1],
        camera: { pos: [2.4, 0.65, -1.5], target: [0.75, 0.35, -1.1] },
      },
      {
        id: "cockpit",
        title: "Cockpit",
        body: "Simple, functional interior.",
        position: [0.45, 0.95, 0.1],
        camera: { pos: [2.2, 1.4, 0.8], target: [0.2, 0.85, 0] },
      },
      {
        id: "rear",
        title: "Rear Design",
        body: "The rear lines of a compact hatchback form.",
        position: [-0.5, 0.8, 1.6],
        camera: { pos: [-2.4, 1.2, 3.6], target: [0, 0.75, 1.35] },
      },
    ],
  },
  {
    id: "f1",
    name: "Formula 1",
    displayName: "F1",
    year: 2022,
    origin: "International",
    story:
      "Design with a single client: the stopwatch. Nothing here is styled — every surface is the residue of a regulation and a wind tunnel session. The purest object in the collection, because no one drew it for you.",
    specs: [
      { label: "HP", value: 1000 },
      { label: "0-100", value: 2.6, decimals: 1, suffix: "s" },
      { label: "VMAX", value: 340, suffix: " km/h" },
    ],
    tagline: "Showroom",
    model: "/models/f1.opt.glb",
    stage: { length: 5.63, rotationY: Math.PI - 0.55 },
    camera: { pos: [3.4, 1.1, -7.2], target: [0, 0.5, 0.2] },
    hotspots: [
      {
        id: "front",
        title: "Front Wing",
        body: "Multi-element front wing. Where downforce is generated first.",
        position: [0.5, 0.35, -2.6],
        camera: { pos: [2.0, 0.8, -4.8], target: [0, 0.3, -2.2] },
      },
      {
        id: "wheel",
        title: "Tires & Suspension",
        body: "Slick tires and push-rod suspension geometry.",
        position: [0.85, 0.35, -1.5],
        camera: { pos: [2.5, 0.6, -1.9], target: [0.75, 0.35, -1.5] },
      },
      {
        id: "cockpit",
        title: "Cockpit & Halo",
        body: "Halo protection system and the driver's cell.",
        position: [0.3, 0.75, 0],
        camera: { pos: [2.0, 1.3, 0.7], target: [0, 0.65, -0.1] },
      },
      {
        id: "rear",
        title: "Rear Wing & DRS",
        body: "Rear wing and diffuser. The aero zone that opens and closes with DRS.",
        position: [-0.45, 0.85, 2.4],
        camera: { pos: [-2.3, 1.1, 4.4], target: [0, 0.7, 2.0] },
      },
    ],
  },
  {
    id: "bmw-i4",
    name: "BMW i4 M50",
    displayName: "i4",
    year: 2022,
    origin: "Germany",
    story:
      "A translation exercise: the combustion-era silhouette carried, almost word for word, into the electric age. What stays, what goes, and what the grille means when nothing behind it breathes.",
    specs: [
      { label: "HP", value: 544 },
      { label: "0-100", value: 3.9, decimals: 1, suffix: "s" },
      { label: "VMAX", value: 225, suffix: " km/h" },
    ],
    tagline: "Showroom",
    model: "/models/bmw-i4.opt.glb",
    stage: { length: 4.78, rotationY: Math.PI - 0.55 },
    camera: { pos: [3.4, 1.3, -7.2], target: [0, 0.8, 0.2] },
    hotspots: [
      {
        id: "front",
        title: "Front Design",
        body: "Vertical kidney grille and sharp LED headlights. The face of the electric generation.",
        position: [0.55, 0.7, -1.9],
        camera: { pos: [2.2, 1.1, -4.2], target: [0, 0.7, -1.55] },
      },
      {
        id: "wheel",
        title: "Wheels & Brakes",
        body: "Aerodynamic M wheels and M Sport brakes.",
        position: [0.9, 0.35, -1.35],
        camera: { pos: [2.6, 0.7, -1.75], target: [0.8, 0.4, -1.35] },
      },
      {
        id: "cockpit",
        title: "Cockpit",
        body: "Curved Display and a driver-focused electric cabin.",
        position: [0.5, 1.0, 0.1],
        camera: { pos: [2.4, 1.5, 0.9], target: [0.2, 0.9, 0] },
      },
      {
        id: "rear",
        title: "Rear Design",
        body: "Coupe roofline and diffuser. The rear signature of silent power.",
        position: [-0.55, 0.8, 1.9],
        camera: { pos: [-2.6, 1.2, 4.1], target: [0, 0.75, 1.55] },
      },
    ],
  },
];

export function getVehicle(id: string) {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
}
