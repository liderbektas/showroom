"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Instance, Instances } from "@react-three/drei";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { useIntroStore } from "@/lib/store";

const ROOM_W = 10.4;
const ROOM_H = 3.5;
const ROOM_D = 24;
const FRONT = -0.42;
const BACK = FRONT - ROOM_D;
const MID_Z = (FRONT + BACK) / 2;

const BLADE_GAP = 0.3;
const BLADE_W = 0.085;
const BLADE_H = 0.62;
const BLADE_COUNT = Math.floor(ROOM_W / BLADE_GAP) + 1;
const PLENUM_X = [-2.7, 1.5, 3.9];

const CHAMFER_TILT = 0.62;
const CHAMFER_W = 0.72;

const CORNER_W = 1.5;
const FLAT_W = ROOM_W - 2 * CORNER_W;
const PANEL_GAP = 0.02;
const PANEL_W = (FLAT_W - 3 * PANEL_GAP) / 4;
const PLINTH_H = 0.14;
const PANEL_H = ROOM_H - PLINTH_H - 0.05;
const SEAM_X = Array.from({ length: 5 }, (_, k) =>
  k === 0 ? -FLAT_W / 2 : k === 4 ? FLAT_W / 2 : -FLAT_W / 2 + k * PANEL_W + (k - 0.5) * PANEL_GAP
);

const VSEAM_Z = [-4, -8.4, -12.8, -17.2, -21.6];
const NICHE_Z = [-6, -10.5, -15];

const GLOW_K: Record<string, number> = {
  screen: 1.0,
  evDot: 2.2,
  bollardL: 0.7,
  bollardR: 0.7,
  niche0: 1.1,
  niche1: 1.1,
  niche2: 1.1,
  ...Object.fromEntries(VSEAM_Z.flatMap((_, i) => [[`vseamL${i}`, 0.45], [`vseamR${i}`, 0.45]])),
  cornerL: 3.2,
  cornerR: 3.2,
  coveL: 1.5,
  coveR: 1.5,
  plenum0: 2.8,
  plenum1: 2.8,
  plenum2: 2.8,
  seam0: 0.4,
  seam1: 0.4,
  seam2: 0.4,
  seam3: 0.4,
  seam4: 0.4,
  plinth: 0.6,
};

if (typeof window !== "undefined") {
  RectAreaLightUniformsLib.init();
}

function flickerLevel(t: number) {
  if (t < 1.28) return 0;
  if (t < 1.35) return 0.85;
  if (t < 1.44) return 0.04;
  if (t < 1.5) return 0.7;
  if (t < 1.68) return 0.08;
  if (t < 1.76) return 1;
  if (t < 1.83) return 0.35;
  return 1;
}

function speckle(c: CanvasRenderingContext2D, S: number, n: number, lo: number, spread: number) {
  for (let i = 0; i < n; i++) {
    const v = lo + Math.random() * spread;
    c.fillStyle = `rgba(${v},${v},${v + 2},0.4)`;
    c.fillRect(Math.random() * S, Math.random() * S, 1.4, 1.4);
  }
}

function makeFloorMap() {
  const S = 512;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#a2a4a6";
  c.fillRect(0, 0, S, S);
  speckle(c, S, 2600, 138, 40);
  c.strokeStyle = "rgba(60,62,66,0.45)";
  c.lineWidth = 1.6;
  for (let i = 0; i <= 2; i++) {
    c.beginPath();
    c.moveTo(0, (S / 2) * i);
    c.lineTo(S, (S / 2) * i);
    c.stroke();
    c.beginPath();
    c.moveTo((S / 2) * i, 0);
    c.lineTo((S / 2) * i, S);
    c.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 8);
  tex.anisotropy = 8;
  return tex;
}

function makeWallMap() {
  const S = 256;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#b9bbbd";
  c.fillRect(0, 0, S, S);
  speckle(c, S, 900, 158, 34);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 1.4);
  tex.anisotropy = 8;
  return tex;
}

function makePanelMap() {
  const S = 256;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#0e0f12";
  c.fillRect(0, 0, S, S);
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const r = 40 + Math.random() * 80;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(30,32,38,0.10)");
    g.addColorStop(1, "rgba(30,32,38,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, S, S);
  }
  const grad = c.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, "rgba(36,38,44,0.28)");
  grad.addColorStop(0.55, "rgba(14,15,18,0)");
  grad.addColorStop(1, "rgba(3,4,5,0.38)");
  c.fillStyle = grad;
  c.fillRect(0, 0, S, S);
  speckle(c, S, 320, 16, 14);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 8;
  return tex;
}

function makeHazeMap() {
  const S = 128;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const c = cv.getContext("2d")!;
  const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(255,255,255,0.5)");
  g.addColorStop(0.5, "rgba(255,255,255,0.16)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(cv);
}

function makeStripeMap() {
  const S = 64;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#97999b";
  c.fillRect(0, 0, S, S);
  c.fillStyle = "#55575b";
  c.beginPath();
  c.moveTo(0, S);
  c.lineTo(S, 0);
  c.lineTo(S, S * 0.45);
  c.lineTo(S * 0.45, S);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(0, S * 0.55);
  c.lineTo(S * 0.55, 0);
  c.lineTo(0, 0);
  c.closePath();
  c.fill();
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 26);
  tex.anisotropy = 8;
  return tex;
}

function makeScreenMap() {
  const S = 256;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = Math.round(S * 0.56);
  const c = cv.getContext("2d")!;
  c.fillStyle = "#0d1013";
  c.fillRect(0, 0, S, cv.height);
  c.fillStyle = "rgba(207,224,238,0.9)";
  c.fillRect(16, 16, 92, 10);
  c.fillStyle = "rgba(207,224,238,0.35)";
  for (let i = 0; i < 4; i++) {
    c.fillRect(16, 44 + i * 22, 150 + (i % 2) * 40, 7);
  }
  c.fillStyle = "rgba(120,200,160,0.8)";
  c.fillRect(196, 16, 44, 10);
  c.strokeStyle = "rgba(207,224,238,0.25)";
  c.strokeRect(8, 8, S - 16, cv.height - 16);
  return new THREE.CanvasTexture(cv);
}

function Ceiling() {
  return (
    <group>
      <mesh position={[0, ROOM_H + BLADE_H - 0.06, MID_Z]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[ROOM_W + 1, ROOM_D + 1]} />
        <meshStandardMaterial color="#08090b" roughness={1} />
      </mesh>
      <Instances limit={BLADE_COUNT}>
        <boxGeometry args={[BLADE_W, BLADE_H, ROOM_D]} />
        <meshStandardMaterial color="#17181b" roughness={0.48} metalness={0.32} envMapIntensity={0.55} />
        {Array.from({ length: BLADE_COUNT }, (_, i) => (
          <Instance key={i} position={[-ROOM_W / 2 + i * BLADE_GAP, ROOM_H + BLADE_H / 2 - 0.1, MID_Z]} />
        ))}
      </Instances>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (ROOM_W / 2 - 0.02), ROOM_H + BLADE_H / 2 - 0.1, MID_Z]}>
          <boxGeometry args={[0.14, BLADE_H, ROOM_D]} />
          <meshStandardMaterial color="#131418" roughness={0.55} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function BackWall({ panelMap }: { panelMap: THREE.Texture }) {
  return (
    <group>
      <mesh position={[0, ROOM_H / 2, BACK - 0.12]}>
        <planeGeometry args={[ROOM_W + 0.4, ROOM_H]} />
        <meshStandardMaterial color="#060708" roughness={1} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const x = -FLAT_W / 2 + PANEL_W / 2 + i * (PANEL_W + PANEL_GAP);
        return (
          <mesh key={i} position={[x, PLINTH_H + PANEL_H / 2, BACK]}>
            <boxGeometry args={[PANEL_W, PANEL_H, 0.08]} />
            <meshStandardMaterial
              map={panelMap}
              roughness={0.58}
              metalness={0.3}
              envMapIntensity={0.5}
            />
          </mesh>
        );
      })}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * (FLAT_W / 2 + CORNER_W / 2 - 0.07), PLINTH_H + PANEL_H / 2, BACK + CORNER_W / 2 - 0.14]}
          rotation-y={-s * Math.PI * 0.25}
        >
          <boxGeometry args={[CORNER_W * 1.18, PANEL_H, 0.08]} />
          <meshStandardMaterial
            map={panelMap}
            roughness={0.58}
            metalness={0.3}
            envMapIntensity={0.5}
          />
        </mesh>
      ))}
      <mesh position={[0, PLINTH_H / 2, BACK + 0.05]}>
        <boxGeometry args={[FLAT_W + 0.34, PLINTH_H, 0.1]} />
        <meshStandardMaterial color="#16181c" roughness={0.38} metalness={0.55} />
      </mesh>
    </group>
  );
}

function Props({ stripeMap }: { stripeMap: THREE.Texture }) {
  return (
    <group>
      {[-1, 1].map((sd) => (
        <group key={sd}>
          <mesh position={[sd * (ROOM_W / 2 - 0.015), 0.25, MID_Z]}>
            <boxGeometry args={[0.03, 0.5, ROOM_D - 0.2]} />
            <meshStandardMaterial color="#26282c" roughness={0.85} />
          </mesh>
          <mesh position={[sd * (ROOM_W / 2 - 0.055), 0.95, MID_Z]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.028, 0.028, ROOM_D - 0.4, 10]} />
            <meshStandardMaterial color="#9ba0a6" roughness={0.35} metalness={0.7} />
          </mesh>
          <mesh position={[sd * (ROOM_W / 2 - 0.55), 0.01, MID_Z]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.5, ROOM_D - 1]} />
            <meshStandardMaterial map={stripeMap} roughness={0.95} />
          </mesh>
        </group>
      ))}

      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[0, 0.012, -3 - i * 1.7]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.1, 0.7]} />
          <meshStandardMaterial color="#7e8084" roughness={1} />
        </mesh>
      ))}

      {NICHE_Z.map((z) => (
        <group key={z} position={[-ROOM_W / 2, 1.35, z]}>
          <mesh position={[0.05, 0, 0]}>
            <boxGeometry args={[0.1, 1.08, 1.08]} />
            <meshStandardMaterial color="#1b1d21" roughness={0.7} metalness={0.3} />
          </mesh>
          <mesh position={[0.104, 0, 0]} rotation-y={Math.PI / 2}>
            <planeGeometry args={[0.96, 0.96]} />
            <meshStandardMaterial color="#0b0c0e" roughness={0.9} />
          </mesh>
          <mesh position={[0.2, 0, 0]} rotation-y={Math.PI / 2}>
            <torusGeometry args={[0.3, 0.095, 10, 28]} />
            <meshStandardMaterial color="#141518" roughness={0.95} />
          </mesh>
          <mesh position={[0.21, 0, 0]} rotation-y={Math.PI / 2}>
            <circleGeometry args={[0.22, 24]} />
            <meshStandardMaterial color="#b7bcc2" roughness={0.25} metalness={0.85} />
          </mesh>
        </group>
      ))}

      <mesh position={[ROOM_W / 2 - 0.03, 1.75, -7.2]}>
        <boxGeometry args={[0.06, 1.0, 1.75]} />
        <meshStandardMaterial color="#17191d" roughness={0.6} metalness={0.3} />
      </mesh>

      <group position={[ROOM_W / 2 - 0.06, 0, -3.4]}>
        <mesh position={[0, 1.15, 0]}>
          <boxGeometry args={[0.12, 0.52, 0.3]} />
          <meshStandardMaterial color="#d8dadc" roughness={0.5} />
        </mesh>
        <mesh position={[-0.062, 1.24, 0]} rotation-y={-Math.PI / 2}>
          <planeGeometry args={[0.2, 0.13]} />
          <meshStandardMaterial color="#0e1013" roughness={0.4} />
        </mesh>
      </group>

      <group position={[-ROOM_W / 2 + 0.09, 0, -1.7]}>
        <mesh position={[0, 1.0, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.42, 14]} />
          <meshStandardMaterial color="#7e2320" roughness={0.45} metalness={0.25} />
        </mesh>
        <mesh position={[0, 1.24, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.07, 8]} />
          <meshStandardMaterial color="#26282c" roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh position={[-0.05, 1.0, 0]}>
          <boxGeometry args={[0.03, 0.5, 0.16]} />
          <meshStandardMaterial color="#1b1d21" roughness={0.8} />
        </mesh>
      </group>

      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * 2.9, 0.375, -2.4]}>
          <cylinderGeometry args={[0.07, 0.08, 0.75, 16]} />
          <meshStandardMaterial color="#2a2c31" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}

      <group position={[-4.55, 0, -22]}>
        {[0.12, 0.35, 0.58, 0.81].map((y, i) => (
          <mesh key={y} position={[i * 0.015, y, i * 0.02]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.3, 0.115, 8, 20]} />
            <meshStandardMaterial color="#101214" roughness={0.95} />
          </mesh>
        ))}
      </group>

      <group position={[ROOM_W / 2 - 0.52, 0, -21.2]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.55, 1.0, 0.95]} />
          <meshStandardMaterial color="#1c1e22" roughness={0.8} metalness={0.25} />
        </mesh>
        <mesh position={[0, 1.015, 0]}>
          <boxGeometry args={[0.58, 0.03, 0.98]} />
          <meshStandardMaterial color="#33363b" roughness={0.4} metalness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

export default function GarageInterior({
  progress,
}: {
  progress: React.RefObject<{ p: number }>;
}) {
  const phase = useIntroStore((s) => s.phase);

  const floorMap = useMemo(() => makeFloorMap(), []);
  const panelMap = useMemo(() => makePanelMap(), []);
  const wallMap = useMemo(() => makeWallMap(), []);
  const haze = useMemo(() => makeHazeMap(), []);
  const stripeMap = useMemo(() => makeStripeMap(), []);
  const screenMap = useMemo(() => makeScreenMap(), []);

  const rects = useRef<(THREE.RectAreaLight | null)[]>([]);
  const glowMats = useRef<Record<string, THREE.MeshStandardMaterial | null>>({});
  const spot = useRef<THREE.SpotLight>(null);
  const blockerMat = useRef<THREE.MeshBasicMaterial>(null);
  const meshRoot = useRef<THREE.Group>(null);
  const hazeMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const started = useRef<number | null>(null);

  useFrame((state) => {
    const p = THREE.MathUtils.clamp(progress.current.p, 0, 1);

    if (meshRoot.current) {
      meshRoot.current.visible = phase === "opening" || phase === "inside";
    }

    if (blockerMat.current) {
      blockerMat.current.opacity = Math.pow(1 - p, 1.5);
      blockerMat.current.visible = p < 0.999;
    }
    if (spot.current) spot.current.intensity = 30 * Math.pow(p, 1.3);
    hazeMats.current.forEach((m, i) => {
      if (m) m.opacity = (0.05 - i * 0.008) * p;
    });

    let level = 0;
    if (phase === "opening" || phase === "inside") {
      if (started.current === null) started.current = state.clock.elapsedTime;
      const t = state.clock.elapsedTime - started.current;
      const ripple = t > 1.9 ? 0.975 + Math.sin(state.clock.elapsedTime * 31) * 0.025 : 1;
      level = flickerLevel(t) * ripple;
    }
    rects.current.forEach((light, i) => {
      if (light) light.intensity = (i < 2 ? 7 : 8.5) * level;
    });
    for (const [key, mat] of Object.entries(glowMats.current)) {
      if (mat) mat.emissiveIntensity = 0.04 + level * GLOW_K[key];
    }
  });

  return (
    <group>
      <group ref={meshRoot} visible={false}>
      <mesh position={[0, 0.005, MID_Z]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial map={floorMap} color="#c9cbcd" roughness={0.82} envMapIntensity={0.35} />
      </mesh>

      {PLENUM_X.map((x, i) => (
        <mesh key={x} position={[x, ROOM_H + 0.3, MID_Z]}>
          <boxGeometry args={[0.05, 0.035, ROOM_D - 0.8]} />
          <meshStandardMaterial
            ref={(el: THREE.MeshStandardMaterial | null) => {
              glowMats.current[`plenum${i}`] = el;
            }}
            color="#3a3c40"
            emissive="#f2f6fa"
            emissiveIntensity={0.04}
            roughness={0.4}
            toneMapped={false}
          />
        </mesh>
      ))}

      <Ceiling />
      <BackWall panelMap={panelMap} />
      <Props stripeMap={stripeMap} />

      {[-1, 1].flatMap((sd) =>
        VSEAM_Z.map((z, i) => (
          <mesh key={`${sd}${z}`} position={[sd * (ROOM_W / 2 - 0.012), 1.05, z]}>
            <boxGeometry args={[0.016, 1.0, 0.02]} />
            <meshStandardMaterial
              ref={(el: THREE.MeshStandardMaterial | null) => {
                glowMats.current[sd < 0 ? `vseamL${i}` : `vseamR${i}`] = el;
              }}
              color="#787c82"
              emissive="#ccd4dc"
              emissiveIntensity={0.04}
              roughness={0.3}
              metalness={0.5}
              toneMapped={false}
            />
          </mesh>
        ))
      )}

      {NICHE_Z.map((z, i) => (
        <mesh key={z} position={[-ROOM_W / 2 + 0.11, 1.35, z]} rotation-y={Math.PI / 2}>
          <ringGeometry args={[0.36, 0.45, 28]} />
          <meshStandardMaterial
            ref={(el: THREE.MeshStandardMaterial | null) => {
              glowMats.current[`niche${i}`] = el;
            }}
            color="#3a3c40"
            emissive="#dce6f0"
            emissiveIntensity={0.04}
            roughness={0.5}
            toneMapped={false}
          />
        </mesh>
      ))}

      <mesh position={[ROOM_W / 2 - 0.064, 1.75, -7.2]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[1.62, 0.88]} />
        <meshStandardMaterial
          map={screenMap}
          ref={(el: THREE.MeshStandardMaterial | null) => {
            glowMats.current["screen"] = el;
          }}
          color="#20242a"
          emissive="#ffffff"
          emissiveMap={screenMap}
          emissiveIntensity={0.04}
          roughness={0.35}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[ROOM_W / 2 - 0.128, 1.31, -3.4]} rotation-y={-Math.PI / 2}>
        <circleGeometry args={[0.014, 12]} />
        <meshStandardMaterial
          ref={(el: THREE.MeshStandardMaterial | null) => {
            glowMats.current["evDot"] = el;
          }}
          color="#2a2c30"
          emissive="#8fe0b8"
          emissiveIntensity={0.04}
          roughness={0.5}
          toneMapped={false}
        />
      </mesh>

      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * 2.9, 0.58, -2.4]}>
          <cylinderGeometry args={[0.074, 0.074, 0.05, 16]} />
          <meshStandardMaterial
            ref={(el: THREE.MeshStandardMaterial | null) => {
              glowMats.current[sd < 0 ? "bollardL" : "bollardR"] = el;
            }}
            color="#3a3c40"
            emissive="#dae4ee"
            emissiveIntensity={0.04}
            roughness={0.4}
            toneMapped={false}
          />
        </mesh>
      ))}

      {SEAM_X.map((x, i) => (
        <mesh key={i} position={[x, PLINTH_H + PANEL_H / 2, BACK + 0.055]}>
          <boxGeometry args={[0.014, PANEL_H, 0.02]} />
          <meshStandardMaterial
            ref={(el: THREE.MeshStandardMaterial | null) => {
              glowMats.current[`seam${i}`] = el;
            }}
            color="#787c82"
            emissive="#ccd4dc"
            emissiveIntensity={0.04}
            roughness={0.28}
            metalness={0.75}
            toneMapped={false}
          />
        </mesh>
      ))}
      <mesh position={[0, PLINTH_H + 0.008, BACK + 0.062]}>
        <boxGeometry args={[FLAT_W + 0.34, 0.014, 0.08]} />
        <meshStandardMaterial
          ref={(el: THREE.MeshStandardMaterial | null) => {
            glowMats.current["plinth"] = el;
          }}
          color="#6e7278"
          emissive="#d2dae2"
          emissiveIntensity={0.04}
          roughness={0.3}
          metalness={0.6}
          toneMapped={false}
        />
      </mesh>

      {[-1, 1].map((s) => {
        const key = s < 0 ? "L" : "R";
        return (
          <group key={s}>
            <mesh position={[s * (ROOM_W / 2), (ROOM_H - 0.5) / 2, MID_Z]} rotation-y={(-s * Math.PI) / 2}>
              <planeGeometry args={[ROOM_D, ROOM_H - 0.5]} />
              <meshStandardMaterial map={wallMap} color="#d7d9db" roughness={0.92} />
            </mesh>

            <group position={[s * (ROOM_W / 2 - 0.02), ROOM_H - 0.36, MID_Z]} rotation-z={-s * CHAMFER_TILT}>
              <mesh rotation-y={(-s * Math.PI) / 2}>
                <planeGeometry args={[ROOM_D, CHAMFER_W]} />
                <meshStandardMaterial map={wallMap} color="#c4c6c8" roughness={0.92} />
              </mesh>
            </group>

            <mesh position={[s * (ROOM_W / 2 - 0.34), ROOM_H - 0.09, MID_Z]}>
              <boxGeometry args={[0.06, 0.05, ROOM_D - 0.6]} />
              <meshStandardMaterial
                ref={(el: THREE.MeshStandardMaterial | null) => {
                  glowMats.current[`corner${key}`] = el;
                }}
                color="#3a3c40"
                emissive="#f0f4f8"
                emissiveIntensity={0.04}
                roughness={0.4}
                toneMapped={false}
              />
            </mesh>

            <mesh position={[s * (ROOM_W / 2 - 0.045), 1.62, MID_Z]}>
              <boxGeometry args={[0.09, 0.1, ROOM_D - 0.6]} />
              <meshStandardMaterial
                ref={(el: THREE.MeshStandardMaterial | null) => {
                  glowMats.current[`cove${key}`] = el;
                }}
                color="#3a3c40"
                emissive="#eef2f6"
                emissiveIntensity={0.04}
                roughness={0.4}
                toneMapped={false}
              />
            </mesh>
            <mesh position={[s * (ROOM_W / 2 - 0.09), 1.76, MID_Z]}>
              <boxGeometry args={[0.18, 0.06, ROOM_D - 0.5]} />
              <meshStandardMaterial color="#26282c" roughness={0.7} metalness={0.3} />
            </mesh>
          </group>
        );
      })}

      </group>

      {[-1, 1].map((s, i) => (
        <rectAreaLight
          key={s}
          ref={(el: THREE.RectAreaLight | null) => {
            rects.current[i] = el;
          }}
          position={[s * (ROOM_W / 2 - 0.45), ROOM_H - 0.18, MID_Z]}
          rotation={[-Math.PI / 2, 0, s * 0.5]}
          args={["#eef2f7", 0, 0.5, ROOM_D - 1]}
        />
      ))}
      {[-9, -17].map((z, i) => (
        <rectAreaLight
          key={z}
          ref={(el: THREE.RectAreaLight | null) => {
            rects.current[2 + i] = el;
          }}
          position={[0, ROOM_H - 0.15, z]}
          rotation-x={-Math.PI / 2}
          args={["#eef2f7", 0, 3, 3]}
        />
      ))}

      <spotLight
        ref={spot}
        position={[0.6, 3.6, 3.4]}
        angle={0.72}
        penumbra={0.65}
        decay={1.1}
        distance={26}
        color="#dfe8f2"
        intensity={0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.015}
        shadow-radius={5}
      />

      <mesh position={[0, 1.5, -0.58]} renderOrder={5}>
        <planeGeometry args={[5.4, 3.3]} />
        <meshBasicMaterial
          ref={blockerMat}
          color="#050609"
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {[-2, -5.5, -9.5].map((z, i) => (
        <mesh key={z} position={[0, 1.45, z]}>
          <planeGeometry args={[6 + i * 1.3, 3.1]} />
          <meshBasicMaterial
            ref={(el: THREE.MeshBasicMaterial | null) => {
              hazeMats.current[i] = el;
            }}
            map={haze}
            color="#aebfd2"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
