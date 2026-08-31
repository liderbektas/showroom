"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Instance, Instances, Lightformer } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import gsap from "gsap";
import { useIntroStore } from "@/lib/store";
import GarageInterior from "@/components/intro/garage-interior";
import Preloader from "@/components/intro/preloader";
import {
  initAudio,
  playRelay,
  startMotor,
  stopMotor,
  setMotorSpeed,
  playChainTick,
  startExteriorAmbience,
  crossfadeToInterior,
  playSpotClack,
} from "@/lib/audio";

const DOOR_W = 4.6;
const DOOR_H = 2.7;
const RECESS = 0.42;
const SLATS = 8;
const SLAT_H = DOOR_H / SLATS;
const TRACK_R = 0.5;
const ARC = TRACK_R * (Math.PI / 2);
const LIFT_MAX = DOOR_H + ARC + 0.2;
const DOOR_TRAVEL = 2.9;

const INSPECT_INTERIOR = false;

const WALL_W = 30;
const WALL_H = 12;

const PANEL_W = 2.5;
const PANEL_H = 1.2;
const PANEL_GAP = 0.016;
const PORTAL_HALF = 2.75;
const PORTAL_TOP = DOOR_H + (PORTAL_HALF - DOOR_W / 2);

function makeConcreteMaps() {
  const S = 512;

  const color = document.createElement("canvas");
  color.width = S;
  color.height = S;
  const c = color.getContext("2d")!;
  c.fillStyle = "#c2c5c9";
  c.fillRect(0, 0, S, S);

  const normal = document.createElement("canvas");
  normal.width = S;
  normal.height = S;
  const n = normal.getContext("2d")!;
  n.fillStyle = "rgb(128,128,255)";
  n.fillRect(0, 0, S, S);

  const rough = document.createElement("canvas");
  rough.width = S;
  rough.height = S;
  const r = rough.getContext("2d")!;
  r.fillStyle = "#b0b0b0";
  r.fillRect(0, 0, S, S);

  for (let i = 0; i < 22; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const rad = 60 + Math.random() * 190;
    const light = Math.random() > 0.45;
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(${light ? "255,255,255" : "52,56,62"},${0.02 + Math.random() * 0.04})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    const rg = r.createRadialGradient(x, y, 0, x, y, rad);
    rg.addColorStop(0, `rgba(${light ? "140,140,140" : "205,205,205"},0.12)`);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    r.fillStyle = rg;
    r.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  for (let i = 0; i < 9; i++) {
    const x = Math.random() * S;
    const len = 90 + Math.random() * 340;
    const w = 5 + Math.random() * 20;
    const g = c.createLinearGradient(0, 0, 0, len);
    g.addColorStop(0, `rgba(76,81,88,${0.02 + Math.random() * 0.035})`);
    g.addColorStop(1, "rgba(76,81,88,0)");
    c.fillStyle = g;
    c.fillRect(x, 0, w, len);
  }

  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const l = Math.random() > 0.5;
    c.fillStyle = `rgba(${l ? "255,255,255" : "42,45,50"},${0.015 + Math.random() * 0.03})`;
    c.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    const off = Math.round((Math.random() - 0.5) * 12);
    n.fillStyle = `rgba(${128 + off},${128 - off},255,0.10)`;
    n.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  for (let i = 0; i < 70; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const rad = 0.6 + Math.random() * 1.6;
    c.fillStyle = `rgba(34,37,42,${0.12 + Math.random() * 0.2})`;
    c.beginPath();
    c.arc(x, y, rad, 0, Math.PI * 2);
    c.fill();
    n.fillStyle = "rgba(128,112,255,0.5)";
    n.beginPath();
    n.arc(x, y, rad, 0, Math.PI * 2);
    n.fill();
  }

  for (const [hx, hy] of [
    [0.16, 0.3],
    [0.84, 0.3],
    [0.16, 0.7],
    [0.84, 0.7],
  ]) {
    const x = hx * S;
    const y = hy * S;
    const g = c.createRadialGradient(x, y, 1, x, y, 9);
    g.addColorStop(0, "rgba(56,60,66,0.5)");
    g.addColorStop(0.55, "rgba(56,60,66,0.2)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(x - 9, y - 9, 18, 18);
    const ng = n.createRadialGradient(x, y, 0, x, y, 8);
    ng.addColorStop(0, "rgba(128,96,255,0.8)");
    ng.addColorStop(1, "rgba(128,128,255,0)");
    n.fillStyle = ng;
    n.fillRect(x - 8, y - 8, 16, 16);

    const streakLen = 50 + Math.random() * 110;
    const streak = c.createLinearGradient(0, y + 8, 0, y + 8 + streakLen);
    streak.addColorStop(0, `rgba(60,65,72,${0.1 + Math.random() * 0.08})`);
    streak.addColorStop(1, "rgba(60,65,72,0)");
    c.fillStyle = streak;
    c.fillRect(x - 5, y + 8, 10 + Math.random() * 4, streakLen);
  }

  const grime = c.createLinearGradient(0, S, 0, S - 110);
  grime.addColorStop(0, "rgba(42,46,52,0.18)");
  grime.addColorStop(1, "rgba(42,46,52,0)");
  c.fillStyle = grime;
  c.fillRect(0, S - 110, S, 110);

  c.strokeStyle = "rgba(50,54,60,0.10)";
  c.lineWidth = 14;
  c.strokeRect(7, 7, S - 14, S - 14);
  c.strokeStyle = "rgba(50,54,60,0.12)";
  c.lineWidth = 4;
  c.strokeRect(2, 2, S - 4, S - 4);
  c.fillStyle = "rgba(255,255,255,0.10)";
  c.fillRect(0, 0, S, 3);
  c.fillStyle = "rgba(26,29,33,0.22)";
  c.fillRect(0, S - 3, S, 3);

  const toTex = (cv: HTMLCanvasElement, srgb = false) => {
    const t = new THREE.CanvasTexture(cv);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: toTex(color, true), normalMap: toTex(normal), roughnessMap: toTex(rough) };
}

const SLAT_GAP = 0.014;
const SLAT_D = 0.06;

function makeSlatGeometry() {
  const h = SLAT_H - SLAT_GAP;
  const hh = h / 2;
  const hd = SLAT_D / 2;
  const r = 0.018;
  const shape = new THREE.Shape();
  shape.moveTo(-hd, -hh + r);
  shape.lineTo(-hd, hh - r);
  shape.quadraticCurveTo(-hd, hh, -hd + r, hh);
  shape.lineTo(hd - r, hh);
  shape.quadraticCurveTo(hd, hh, hd, hh - r);
  shape.lineTo(hd, -hh + r);
  shape.quadraticCurveTo(hd, -hh, hd - r, -hh);
  shape.lineTo(-hd + r, -hh);
  shape.quadraticCurveTo(-hd, -hh, -hd, -hh + r);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: DOOR_W, bevelEnabled: false, curveSegments: 6 });
  geo.translate(0, 0, -DOOR_W / 2);
  geo.rotateY(Math.PI / 2);
  return geo;
}

function makeOrangePeelNormal() {
  const S = 256;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "rgb(128,128,255)";
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 4200; i++) {
    const ox = Math.round((Math.random() - 0.5) * 7);
    const oy = Math.round((Math.random() - 0.5) * 7);
    ctx.fillStyle = `rgba(${128 + ox},${128 + oy},255,${0.25 + Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.arc(Math.random() * S, Math.random() * S, 0.6 + Math.random() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

function makeFoliageAlpha() {
  const S = 512;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const ctx = cv.getContext("2d")!;
  for (let i = 0; i < 42; i++) {
    const x = S * 0.2 + Math.random() * S * 0.5;
    const y = S * 0.15 + Math.random() * S * 0.45;
    const r = 30 + Math.random() * 80;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${0.12 + Math.random() * 0.2})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return new THREE.CanvasTexture(cv);
}

function Facade() {
  const phase = useIntroStore((s) => s.phase);
  const lit = phase === "opening" || phase === "inside";

  const wallGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-WALL_W / 2, 0);
    shape.lineTo(WALL_W / 2, 0);
    shape.lineTo(WALL_W / 2, WALL_H);
    shape.lineTo(-WALL_W / 2, WALL_H);
    shape.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-DOOR_W / 2, 0);
    hole.lineTo(DOOR_W / 2, 0);
    hole.lineTo(DOOR_W / 2, DOOR_H);
    hole.lineTo(-DOOR_W / 2, DOOR_H);
    hole.closePath();
    shape.holes.push(hole);
    return new THREE.ShapeGeometry(shape);
  }, []);

  const mats = useMemo(
    () =>
      Array.from({ length: 4 }, makeConcreteMaps).flatMap((maps) =>
        [0.955, 1.0, 1.04].map((k) => {
          const m = new THREE.MeshStandardMaterial({
            ...maps,
            roughness: 1,
            color: new THREE.Color(k * 0.99, k, k * 1.012),
          });
          m.normalScale.set(0.7, 0.7);
          return m;
        })
      ),
    []
  );

  const panels = useMemo(() => {
    const list: { x: number; y: number; w: number; h: number }[] = [];
    const push = (x0: number, x1: number, y0: number, y1: number) => {
      list.push({
        x: (x0 + x1) / 2,
        y: (y0 + y1) / 2,
        w: x1 - x0 - PANEL_GAP,
        h: y1 - y0 - PANEL_GAP,
      });
    };
    const cols = Math.round(WALL_W / PANEL_W);
    const rows = Math.round(WALL_H / PANEL_H);
    for (let ri = 0; ri < rows; ri++) {
      for (let ci = 0; ci < cols; ci++) {
        const x0 = -WALL_W / 2 + ci * PANEL_W;
        const x1 = x0 + PANEL_W;
        const y0 = ri * PANEL_H;
        const y1 = y0 + PANEL_H;
        if (y0 >= PORTAL_TOP - 1e-4 || x1 <= -PORTAL_HALF + 1e-4 || x0 >= PORTAL_HALF - 1e-4) {
          push(x0, x1, y0, y1);
          continue;
        }
        if (x0 < -PORTAL_HALF) push(x0, -PORTAL_HALF, y0, y1);
        if (x1 > PORTAL_HALF) push(PORTAL_HALF, x1, y0, y1);
        if (y1 > PORTAL_TOP + 1e-4) {
          push(Math.max(x0, -PORTAL_HALF), Math.min(x1, PORTAL_HALF), PORTAL_TOP, y1);
        }
      }
    }
    return list;
  }, []);

  const portalMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#2c3137",
        metalness: 0.3,
        roughness: 0.45,
        clearcoat: 0.3,
        clearcoatRoughness: 0.3,
        envMapIntensity: 0.9,
      }),
    []
  );

  return (
    <group>
      <mesh geometry={wallGeo} receiveShadow>
        <meshStandardMaterial color="#4b4e53" roughness={1} />
      </mesh>

      {panels.map((p, i) => (
        <mesh
          key={i}
          position={[p.x, p.y, 0.022 + ((i * 137) % 5) * 0.0011]}
          material={mats[(i * 31 + 7) % mats.length]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[p.w, p.h, 0.045]} />
        </mesh>
      ))}

      {[-1, 1].map((s) => (
        <group key={`plinth${s}`}>
          <mesh position={[s * 8.875, 0.31, 0.052]} castShadow receiveShadow>
            <boxGeometry args={[12.25, 0.62, 0.055]} />
            <meshStandardMaterial color="#34383e" roughness={0.55} metalness={0.2} />
          </mesh>
          <mesh position={[s * 8.875, 0.635, 0.055]}>
            <boxGeometry args={[12.25, 0.03, 0.06]} />
            <meshStandardMaterial color="#181a1d" roughness={0.4} metalness={0.4} />
          </mesh>
        </group>
      ))}

      {[-1, 1].map((s) => (
        <group key={`sconce${s}`} position={[s * 3.32, 3.34, 0.09]}>
          <mesh castShadow>
            <boxGeometry args={[0.1, 0.4, 0.09]} />
            <meshStandardMaterial color="#25282c" metalness={0.45} roughness={0.45} />
          </mesh>
          <mesh position={[0, -0.185, 0.02]} rotation-x={Math.PI / 2}>
            <planeGeometry args={[0.075, 0.07]} />
            <meshStandardMaterial color="#c8ccd2" roughness={0.35} />
          </mesh>
        </group>
      ))}

      <mesh position={[6.25, WALL_H / 2, 0.085]} castShadow>
        <boxGeometry args={[0.12, WALL_H, 0.09]} />
        <meshStandardMaterial color="#a2a6ac" roughness={0.8} metalness={0.2} />
      </mesh>
      {[0.85, 4.1].map((y) => (
        <mesh key={y} position={[6.25, y, 0.05]}>
          <boxGeometry args={[0.2, 0.05, 0.1]} />
          <meshStandardMaterial color="#84888e" roughness={0.8} metalness={0.3} />
        </mesh>
      ))}
      <mesh position={[6.25, 0.68, 0.11]} castShadow>
        <boxGeometry args={[0.13, 0.16, 0.13]} />
        <meshStandardMaterial color="#7d8187" roughness={0.75} metalness={0.25} />
      </mesh>

      {[-1, 1].map((s) => (
        <mesh
          key={`jamb${s}`}
          position={[s * (DOOR_W / 2 + (PORTAL_HALF - DOOR_W / 2) / 2), PORTAL_TOP / 2, 0]}
          material={portalMat}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[PORTAL_HALF - DOOR_W / 2, PORTAL_TOP, 0.14]} />
        </mesh>
      ))}
      <mesh position={[0, (DOOR_H + PORTAL_TOP) / 2, 0]} material={portalMat} castShadow receiveShadow>
        <boxGeometry args={[PORTAL_HALF * 2, PORTAL_TOP - DOOR_H, 0.14]} />
      </mesh>

      <group position={[0, DOOR_H + 0.95, 0.12]}>
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.15, 0.14]} />
          <meshStandardMaterial color="#26292d" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.015, 0.072]}>
          <boxGeometry args={[0.35, 0.07, 0.004]} />
          <meshStandardMaterial
            color="#dfe4e8"
            roughness={0.3}
            emissive={lit ? "#ffe9c4" : "#b9c2c9"}
            emissiveIntensity={lit ? 2.4 : 0.15}
          />
        </mesh>
        {lit && <pointLight position={[0, -0.25, 0.5]} intensity={1.4} distance={3.2} color="#ffe6bd" />}
      </group>

      <mesh position={[-3.75, WALL_H / 2, 0.09]} castShadow>
        <cylinderGeometry args={[0.055, 0.055, WALL_H, 12]} />
        <meshStandardMaterial color="#aeb2b8" roughness={0.85} metalness={0.15} />
      </mesh>
      {[0.7, 3.4].map((y) => (
        <mesh key={y} position={[-3.75, y, 0.05]}>
          <boxGeometry args={[0.17, 0.05, 0.1]} />
          <meshStandardMaterial color="#84888e" roughness={0.8} metalness={0.3} />
        </mesh>
      ))}

      <mesh position={[-DOOR_W / 2, DOOR_H / 2, -RECESS / 2]} rotation-y={Math.PI / 2} receiveShadow>
        <planeGeometry args={[RECESS, DOOR_H]} />
        <meshStandardMaterial color="#83868c" roughness={0.95} />
      </mesh>
      <mesh position={[DOOR_W / 2, DOOR_H / 2, -RECESS / 2]} rotation-y={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[RECESS, DOOR_H]} />
        <meshStandardMaterial color="#83868c" roughness={0.95} />
      </mesh>
      <mesh position={[0, DOOR_H, -RECESS / 2]} rotation-x={Math.PI / 2} receiveShadow>
        <planeGeometry args={[DOOR_W, RECESS]} />
        <meshStandardMaterial color="#686b70" roughness={0.95} />
      </mesh>
    </group>
  );
}


function FoliageShadow() {
  const alpha = useMemo(makeFoliageAlpha, []);
  const mesh = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.elapsedTime;
    mesh.current.position.x = -3.8 + Math.sin(t * 0.14) * 0.18;
    mesh.current.rotation.z = Math.sin(t * 0.09) * 0.012;
  });

  return (
    <mesh ref={mesh} position={[-3.8, 4.6, 0.06]}>
      <planeGeometry args={[7, 6]} />
      <meshBasicMaterial color="#3a3226" transparent alphaMap={alpha} opacity={0.12} depthWrite={false} />
    </mesh>
  );
}

function makeAsphaltMaps() {
  const S = 2048;

  const color = document.createElement("canvas");
  color.width = S;
  color.height = S;
  const c = color.getContext("2d")!;
  c.fillStyle = "#3c3d40";
  c.fillRect(0, 0, S, S);

  const normal = document.createElement("canvas");
  normal.width = S;
  normal.height = S;
  const n = normal.getContext("2d")!;
  n.fillStyle = "rgb(128,128,255)";
  n.fillRect(0, 0, S, S);

  const rough = document.createElement("canvas");
  rough.width = S;
  rough.height = S;
  const r = rough.getContext("2d")!;
  r.fillStyle = "#a8a8a8";
  r.fillRect(0, 0, S, S);

  for (let i = 0; i < 70; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const rad = 60 + Math.random() * 220;
    const light = Math.random() > 0.5;
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(${light ? "255,255,255" : "10,10,12"},${0.02 + Math.random() * 0.04})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    const rg = r.createRadialGradient(x, y, 0, x, y, rad);
    rg.addColorStop(0, `rgba(${light ? "150,150,150" : "90,90,90"},0.12)`);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    r.fillStyle = rg;
    r.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  for (let i = 0; i < 2; i++) {
    const x = S * 0.1 + Math.random() * S * 0.7;
    const y = S * 0.35 + Math.random() * S * 0.5;
    const w = 180 + Math.random() * 280;
    const h = 130 + Math.random() * 220;
    c.fillStyle = "rgba(16,16,18,0.15)";
    c.fillRect(x, y, w, h);
    c.strokeStyle = "rgba(8,8,10,0.35)";
    c.lineWidth = 6;
    c.strokeRect(x, y, w, h);
    r.fillStyle = "rgba(88,88,88,0.28)";
    r.fillRect(x, y, w, h);
  }

  for (let i = 0; i < 26000; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const l = Math.random() > 0.45;
    c.fillStyle = `rgba(${l ? "120,121,125" : "20,20,22"},${0.03 + Math.random() * 0.04})`;
    c.fillRect(x, y, 1, 1);
    const off = Math.round((Math.random() - 0.5) * 14);
    n.fillStyle = `rgba(${128 + off},${128 - off},255,0.13)`;
    n.fillRect(x, y, 1, 1);
    r.fillStyle = Math.random() > 0.5 ? "rgba(165,165,165,0.10)" : "rgba(82,82,82,0.10)";
    r.fillRect(x, y, 1, 1);
  }

  for (const side of [-1, 1]) {
    const cx = S / 2 + side * (0.85 / WALL_W) * S;
    const tw = (0.3 / WALL_W) * S;
    for (let y = 8; y < S * 0.5; y += 5) {
      const fade = 1 - y / (S * 0.5);
      const wob = Math.sin(y * 0.012 + side) * 3;
      c.fillStyle = `rgba(10,10,12,${0.1 * fade + Math.random() * 0.02})`;
      c.fillRect(cx + wob - tw / 2, y, tw, 6);
    }
  }

  for (let i = 0; i < 6; i++) {
    const x = S / 2 + (Math.random() - 0.5) * (4 / WALL_W) * S;
    const y = 60 + Math.random() * S * 0.22;
    const rad = 18 + Math.random() * 55;
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(14,12,10,${0.18 + Math.random() * 0.15})`);
    g.addColorStop(0.7, "rgba(14,12,10,0.06)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    const rg = r.createRadialGradient(x, y, 0, x, y, rad);
    rg.addColorStop(0, "rgba(70,70,70,0.5)");
    rg.addColorStop(1, "rgba(0,0,0,0)");
    r.fillStyle = rg;
    r.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  const contact = c.createLinearGradient(0, 0, 0, 90);
  contact.addColorStop(0, "rgba(16,14,12,0.35)");
  contact.addColorStop(1, "rgba(16,14,12,0)");
  c.fillStyle = contact;
  c.fillRect(0, 0, S, 90);

  const toTex = (cv: HTMLCanvasElement, srgb = false) => {
    const t = new THREE.CanvasTexture(cv);
    t.anisotropy = 16;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: toTex(color, true), normalMap: toTex(normal), roughnessMap: toTex(rough) };
}

function makeApronMap() {
  const S = 256;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#999da2";
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 420; i++) {
    const y = Math.random() * S;
    const l = Math.random() > 0.5;
    ctx.fillStyle = `rgba(${l ? "255,255,255" : "50,54,60"},${0.02 + Math.random() * 0.04})`;
    ctx.fillRect(0, y, S, 1);
  }
  for (let i = 0; i < 900; i++) {
    const l = Math.random() > 0.5;
    ctx.fillStyle = `rgba(${l ? "255,255,255" : "44,48,54"},${0.02 + Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  ctx.fillStyle = "rgba(34,37,42,0.55)";
  ctx.fillRect(0, 0, 3, S);
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(3, 0, 1, S);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(12, 1);
  t.anisotropy = 16;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const PAVE_HALF = 8.75;
const SLAB_W = 1.25;
const SLAB_D = 0.75;
const PAVER_GAP = 0.02;
const LANE_Z0 = 1.46;
const LANE_ROWS = 11;

function makeGrateMap() {
  const W = 1024;
  const H = 64;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#111316";
  ctx.fillRect(0, 0, W, H);
  for (let x = 6; x < W - 4; x += 14) {
    ctx.fillStyle = "#3f444a";
    ctx.fillRect(x, 5, 7, H - 10);
    ctx.fillStyle = "#5a6067";
    ctx.fillRect(x, 5, 7, 3);
    ctx.fillStyle = "#0a0b0d";
    ctx.fillRect(x + 7, 5, 7, H - 10);
  }
  ctx.strokeStyle = "#494e55";
  ctx.lineWidth = 6;
  ctx.strokeRect(2, 2, W - 4, H - 4);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(WALL_W / 5, 1);
  t.anisotropy = 16;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makePaverMaps() {
  const S = 256;

  const color = document.createElement("canvas");
  color.width = S;
  color.height = S;
  const c = color.getContext("2d")!;
  c.fillStyle = "#3d3f43";
  c.fillRect(0, 0, S, S);

  const normal = document.createElement("canvas");
  normal.width = S;
  normal.height = S;
  const n = normal.getContext("2d")!;
  n.fillStyle = "rgb(128,128,255)";
  n.fillRect(0, 0, S, S);

  for (let i = 0; i < 10; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const rad = 40 + Math.random() * 90;
    const light = Math.random() > 0.5;
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(${light ? "210,214,220" : "12,13,16"},${0.03 + Math.random() * 0.05})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const l = Math.random() > 0.5;
    c.fillStyle = `rgba(${l ? "150,153,159" : "14,15,18"},${0.03 + Math.random() * 0.05})`;
    c.fillRect(x, y, 1, 1);
    const off = Math.round((Math.random() - 0.5) * 10);
    n.fillStyle = `rgba(${128 + off},${128 - off},255,0.10)`;
    n.fillRect(x, y, 1, 1);
  }

  c.strokeStyle = "rgba(8,9,11,0.4)";
  c.lineWidth = 6;
  c.strokeRect(3, 3, S - 6, S - 6);
  c.strokeStyle = "rgba(255,255,255,0.05)";
  c.lineWidth = 2;
  c.strokeRect(7, 7, S - 14, S - 14);
  n.strokeStyle = "rgba(128,112,255,0.35)";
  n.lineWidth = 4;
  n.strokeRect(2, 2, S - 4, S - 4);

  const toTex = (cv: HTMLCanvasElement, srgb = false) => {
    const t = new THREE.CanvasTexture(cv);
    t.anisotropy = 16;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: toTex(color, true), normalMap: toTex(normal) };
}

function Ground() {
  const maps = useMemo(makeAsphaltMaps, []);
  const apron = useMemo(makeApronMap, []);
  const grate = useMemo(makeGrateMap, []);

  const paverMaps = useMemo(makePaverMaps, []);

  const slabs = useMemo(() => {
    type Slab = { x: number; y: number; z: number; ry: number; tint: string };
    const full: Slab[] = [];
    const half: Slab[] = [];
    let idx = 0;
    for (let ri = 0; ri < LANE_ROWS; ri++) {
      const z = LANE_Z0 + SLAB_D / 2 + ri * SLAB_D;
      const bounds: number[] = [-PAVE_HALF];
      let b = -PAVE_HALF + (ri % 2 ? SLAB_W / 2 : SLAB_W);
      while (b < PAVE_HALF - 1e-3) {
        bounds.push(b);
        b += SLAB_W;
      }
      bounds.push(PAVE_HALF);
      for (let i = 0; i < bounds.length - 1; i++) {
        const w = bounds[i + 1] - bounds[i];
        const k = 0.93 + ((idx * 37) % 9) * 0.016;
        const slab: Slab = {
          x: (bounds[i] + bounds[i + 1]) / 2,
          y: -0.002 - ((idx * 53) % 4) * 0.0009,
          z,
          ry: (((idx * 89) % 7) - 3) * 0.0022,
          tint: new THREE.Color(k * 0.995, k, k * 1.008).getStyle(),
        };
        (w > SLAB_W * 0.75 ? full : half).push(slab);
        idx++;
      }
    }
    return { full, half };
  }, []);

  return (
    <group>
      <mesh position={[0, 0, 5.78]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[WALL_W, 12.45]} />
        <meshStandardMaterial
          {...maps}
          roughness={1}
          normalScale={new THREE.Vector2(0.6, 0.6)}
          envMapIntensity={0.55}
        />
      </mesh>
      <mesh position={[0, 0.004, 0.33]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[WALL_W, 1.55]} />
        <meshStandardMaterial map={apron} roughness={0.95} />
      </mesh>

      {[
        { list: slabs.full, w: SLAB_W },
        { list: slabs.half, w: SLAB_W / 2 },
      ].map(({ list, w }) => (
        <Instances key={w} limit={list.length} receiveShadow>
          <boxGeometry args={[w - PAVER_GAP, 0.03, SLAB_D - PAVER_GAP]} />
          <meshStandardMaterial
            {...paverMaps}
            roughness={0.94}
            normalScale={new THREE.Vector2(0.5, 0.5)}
          />
          {list.map((s, i) => (
            <Instance key={i} position={[s.x, s.y, s.z]} rotation={[0, s.ry, 0]} color={s.tint} />
          ))}
        </Instances>
      ))}

      <mesh position={[0, 0.007, 1.26]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[WALL_W, 0.26]} />
        <meshStandardMaterial map={grate} metalness={0.7} roughness={0.4} envMapIntensity={0.8} />
      </mesh>
      {[1.13, 1.39].map((z) => (
        <mesh key={z} position={[0, 0.006, z]}>
          <boxGeometry args={[WALL_W, 0.014, 0.03]} />
          <meshStandardMaterial color="#54595f" metalness={0.8} roughness={0.35} />
        </mesh>
      ))}

      {[-1, 1].map((s) => (
        <group key={`bollard${s}`} position={[s * 3.18, 0, 2.35]}>
          <mesh position={[0, 0.29, 0]} castShadow>
            <cylinderGeometry args={[0.062, 0.072, 0.58, 20]} />
            <meshStandardMaterial color="#2b2e33" metalness={0.5} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.064, 0.064, 0.028, 20]} />
            <meshStandardMaterial color="#9aa0a7" metalness={0.85} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}


function Door({ progress }: { progress: React.RefObject<{ p: number }> }) {
  const geo = useMemo(makeSlatGeometry, []);
  const peel = useMemo(makeOrangePeelNormal, []);
  const slats = useRef<(THREE.Group | null)[]>([]);

  useFrame(() => {
    const lift = progress.current.p * LIFT_MAX;
    for (let i = 0; i < SLATS; i++) {
      const g = slats.current[i];
      if (!g) continue;
      const s = (i + 0.5) * SLAT_H + lift;
      if (s <= DOOR_H) {
        g.position.set(0, s, 0);
        g.rotation.x = 0;
      } else {
        const e = s - DOOR_H;
        if (e < ARC) {
          const th = e / TRACK_R;
          g.position.set(0, DOOR_H + TRACK_R * Math.sin(th), -TRACK_R + TRACK_R * Math.cos(th));
          g.rotation.x = -th;
        } else {
          g.position.set(0, DOOR_H + TRACK_R, -TRACK_R - (e - ARC));
          g.rotation.x = -Math.PI / 2;
        }
      }
    }
  });

  return (
    <group position-z={-RECESS}>
      {Array.from({ length: SLATS }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            slats.current[i] = el;
          }}
          position={[0, (i + 0.5) * SLAT_H, 0]}
        >
          <mesh geometry={geo} castShadow receiveShadow>
            <meshPhysicalMaterial
              color="#3c4249"
              metalness={0.2}
              roughness={0.38}
              clearcoat={0.55}
              clearcoatRoughness={0.22}
              envMapIntensity={1.25}
              normalMap={peel}
              normalScale={new THREE.Vector2(0.35, 0.35)}
            />
          </mesh>
          {i === 0 && (
            <mesh position={[0, -SLAT_H / 2 + 0.002, 0]}>
              <boxGeometry args={[DOOR_W, 0.045, 0.05]} />
              <meshStandardMaterial color="#101113" roughness={0.9} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function CameraRig({ rig }: { rig: React.RefObject<{ z: number; parallax: number }> }) {
  const camera = useThree((s) => s.camera);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((_, delta) => {
    const { z, parallax } = rig.current;
    const tx = mouse.current.x * 0.3 * parallax;
    const ty = 1.5 - mouse.current.y * 0.15 * parallax;
    const k = 1 - Math.pow(0.001, delta);
    camera.position.x += (tx - camera.position.x) * k;
    camera.position.y += (ty - camera.position.y) * k;
    camera.position.z = z;
    camera.lookAt(0, 1.35, camera.position.z - 10);
  });

  return null;
}

function setShadowAuto(gl: THREE.WebGLRenderer, auto: boolean) {
  gl.shadowMap.autoUpdate = auto;
}

function kickShadows(gl: THREE.WebGLRenderer) {
  gl.shadowMap.needsUpdate = true;
}

function ShadowControl({ progress }: { progress: React.RefObject<{ p: number }> }) {
  const gl = useThree((state) => state.gl);
  const lastP = useRef(-1);
  const warmup = useRef(0);
  const frame = useRef(0);
  const pendingFinal = useRef(false);

  useEffect(() => {
    setShadowAuto(gl, false);
    return () => setShadowAuto(gl, true);
  }, [gl]);

  useFrame(() => {
    frame.current++;
    const p = progress.current.p;
    const moved = Math.abs(p - lastP.current) > 1e-4;
    if (warmup.current < 12) {
      warmup.current++;
      lastP.current = p;
      kickShadows(gl);
      return;
    }
    if (moved) {
      if (frame.current % 2 === 0) {
        lastP.current = p;
        kickShadows(gl);
      } else {
        pendingFinal.current = true;
      }
    } else if (pendingFinal.current) {
      pendingFinal.current = false;
      lastP.current = p;
      kickShadows(gl);
    }
  });

  return null;
}

function Sequence({
  progress,
  rig,
  fade,
}: {
  progress: React.RefObject<{ p: number }>;
  rig: React.RefObject<{ z: number; parallax: number }>;
  fade: React.RefObject<HTMLDivElement | null>;
}) {
  const phase = useIntroStore((s) => s.phase);
  const setPhase = useIntroStore((s) => s.setPhase);

  useEffect(() => {
    if (phase !== "opening") return;

    let lastP = 0;
    let lastT = 0;
    let sinceTick = 0;
    const tl = gsap.timeline({ onComplete: () => setPhase("inside") });
    tl.call(playRelay, undefined, 0.05)
      .call(playSpotClack, undefined, 0.32)
      .call(startMotor, undefined, 0.55)
      .to(progress.current, {
        p: 1,
        duration: DOOR_TRAVEL,
        ease: "power1.inOut",
        onUpdate() {
          const p = progress.current.p;
          const t = this.time();
          const dt = t - lastT;
          if (dt <= 0) return;
          const dp = p - lastP;
          const speed = (dp / dt) * (DOOR_TRAVEL / 2);
          lastP = p;
          lastT = t;
          setMotorSpeed(speed);
          sinceTick += dp;
          if (sinceTick > 0.055) {
            sinceTick = 0;
            playChainTick(speed);
          }
        },
        onComplete: stopMotor,
      }, 0.7)
      .to(rig.current, { z: -1.6, duration: 4.2, ease: "power2.inOut" }, 2.3)
      .call(crossfadeToInterior, undefined, 4.0);

    if (!INSPECT_INTERIOR) {
      tl.to(rig.current, { parallax: 0, duration: 1.2, ease: "none" }, 2.3);
      if (fade.current) {
        tl.to(fade.current, { opacity: 1, duration: 1.0, ease: "power1.inOut" }, 5.6);
      }
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      tl.timeScale(2.5);
    }

    return () => {
      tl.kill();
      stopMotor(false);
    };
  }, [phase, setPhase, progress, rig, fade]);

  return null;
}

function Grain() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const size = 160;
    const cv = document.createElement("canvas");
    cv.width = size;
    cv.height = size;
    const ctx = cv.getContext("2d")!;
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);

    const el = ref.current!;
    el.style.backgroundImage = `url(${cv.toDataURL()})`;

    let raf = 0;
    let frame = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (frame++ % 3) return;
      el.style.backgroundPosition = `${Math.floor(Math.random() * size)}px ${Math.floor(Math.random() * size)}px`;
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
      style={{ backgroundRepeat: "repeat" }}
    />
  );
}

function makeKeypadMap() {
  const W = 128;
  const H = 192;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#33363b";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#181a1d";
  ctx.fillRect(18, 16, W - 36, 30);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const x = 30 + c * 34;
      const y = 70 + r * 30;
      const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 10);
      g.addColorStop(0, "#8d9298");
      g.addColorStop(1, "#4c5156");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeVentMap() {
  const W = 256;
  const H = 176;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#7e7a70";
  ctx.fillRect(0, 0, W, H);
  for (let y = 14; y < H - 8; y += 18) {
    ctx.fillStyle = "#15161a";
    ctx.fillRect(10, y, W - 20, 9);
    ctx.fillStyle = "#a8a49a";
    ctx.fillRect(10, y + 9, W - 20, 3);
  }
  ctx.strokeStyle = "#5d594f";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, W - 8, H - 8);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeDustMap() {
  const S = 64;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.4, "rgba(255,255,255,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(cv);
}

function Details() {
  const keypad = useMemo(makeKeypadMap, []);
  const vent = useMemo(makeVentMap, []);

  return (
    <group>
      <group position={[2.62, 1.24, 0.1]}>
        <mesh castShadow>
          <boxGeometry args={[0.13, 0.19, 0.05]} />
          <meshStandardMaterial color="#2c2f33" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position-z={0.026}>
          <planeGeometry args={[0.12, 0.18]} />
          <meshStandardMaterial map={keypad} roughness={0.55} metalness={0.3} />
        </mesh>
      </group>

      <mesh position={[0, DOOR_H + 2.45, 0.065]} castShadow>
        <cylinderGeometry args={[0.017, 0.017, 2.6, 10]} />
        <meshStandardMaterial color="#9b978c" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, DOOR_H + 1.14, 0.075]} castShadow>
        <boxGeometry args={[0.11, 0.11, 0.07]} />
        <meshStandardMaterial color="#8e8a80" metalness={0.4} roughness={0.6} />
      </mesh>

      <group position={[-2.2, 3.82, 0.075]}>
        <mesh castShadow>
          <boxGeometry args={[0.54, 0.38, 0.045]} />
          <meshStandardMaterial color="#87837a" metalness={0.35} roughness={0.7} />
        </mesh>
        <mesh position-z={0.024}>
          <planeGeometry args={[0.5, 0.34]} />
          <meshStandardMaterial map={vent} metalness={0.4} roughness={0.6} />
        </mesh>
      </group>

    </group>
  );
}

const DUST_COUNT = 160;

function Dust({ progress }: { progress: React.RefObject<{ p: number }> }) {
  const map = useMemo(makeDustMap, []);
  const mat = useRef<THREE.PointsMaterial>(null);
  const pts = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 4.2;
      arr[i * 3 + 1] = Math.random() * 2.4;
      arr[i * 3 + 2] = -1.6 + Math.random() * 2.4;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!mat.current || !pts.current) return;
    const t = clock.elapsedTime;
    mat.current.opacity = Math.min(Math.max(progress.current.p - 0.12, 0) * 1.6, 0.4);
    pts.current.visible = mat.current.opacity > 0.002;
    pts.current.position.x = Math.sin(t * 0.06) * 0.12;
    pts.current.position.y = 0.15 + Math.sin(t * 0.045) * 0.08;
    pts.current.rotation.y = t * 0.016;
  });

  return (
    <points ref={pts} position={[0, 0.15, -0.3]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={mat}
        map={map}
        color="#ffeeda"
        size={0.028}
        transparent
        opacity={0}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function drawScrew(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, "#c9cdd1");
  g.addColorStop(0.6, "#8d9298");
  g.addColorStop(1, "#4a4f55");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(30,32,36,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.55, y);
  ctx.lineTo(x + r * 0.55, y);
  ctx.stroke();
}

function makeGroundSignMap() {
  const W = 768;
  const H = 416;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#2e3136");
  bg.addColorStop(0.5, "#26282d");
  bg.addColorStop(1, "#2b2e33");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 1100; i++) {
    const y = Math.random() * H;
    const l = Math.random() > 0.5;
    ctx.fillStyle = `rgba(${l ? "255,255,255" : "0,0,0"},${0.012 + Math.random() * 0.03})`;
    ctx.fillRect(Math.random() * W * 0.9, y, 20 + Math.random() * 90, 1);
  }

  ctx.strokeStyle = "rgba(215,221,228,0.5)";
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, W - 28, H - 28);

  const INK = "#eef1f5";
  const ls = ctx as unknown as { letterSpacing: string };
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = INK;
  ctx.save();
  ctx.translate(W / 2, 168);
  ctx.scale(1, 1.9);
  ls.letterSpacing = "16px";
  ctx.font = "700 36px 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.fillText("ENTER", 8, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(W / 2, 258);
  ctx.scale(1, 1.9);
  ls.letterSpacing = "12px";
  ctx.font = "600 36px 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.fillStyle = "rgba(238,241,245,0.75)";
  ctx.fillText("CLICK TO OPEN", 6, 0);
  ctx.restore();

  const t = new THREE.CanvasTexture(cv);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function GroundSign({ onEnter }: { onEnter: () => void }) {
  const map = useMemo(makeGroundSignMap, []);
  const [hover, setHover] = useState(false);
  const phase = useIntroStore((s) => s.phase);
  const idle = phase === "ready";

  useEffect(() => {
    document.body.style.cursor = hover && idle ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hover, idle]);

  return (
    <group
      position={[0, 0, 2.08]}
      onClick={(e) => {
        e.stopPropagation();
        onEnter();
      }}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.56, 0.02, 0.88]} />
        <meshStandardMaterial color="#43474d" metalness={0.65} roughness={0.32} envMapIntensity={1.1} />
      </mesh>
      <mesh position={[0, 0.0305, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.5, 0.82]} />
        <meshStandardMaterial
          map={map}
          metalness={0.5}
          roughness={0.42}
          envMapIntensity={1.1}
          emissive="#b9c0c8"
          emissiveIntensity={hover && idle ? 0.22 : 0}
        />
      </mesh>
    </group>
  );
}

export default function GarageDoor() {
  const phase = useIntroStore((s) => s.phase);
  const setPhase = useIntroStore((s) => s.setPhase);
  const idle = phase === "ready";

  const progress = useRef({ p: 0 });
  const rig = useRef({ z: 8.2, parallax: 1 });
  const fade = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Tarayıcı autoplay kısıtı: ses ancak bir kullanıcı hareketinden sonra başlatılabilir.
    const wake = () => {
      initAudio();
      startExteriorAmbience();
    };
    window.addEventListener("pointerdown", wake, { once: true });
    window.addEventListener("keydown", wake, { once: true });
    return () => {
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
  }, []);

  const enter = () => {
    if (!idle) return;
    initAudio();
    startExteriorAmbience();
    setPhase("opening");
  };

  return (
    <div className="fixed inset-0 bg-[#cfd3d6]">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{
          antialias: false,
          stencil: false,
          powerPreference: "high-performance",
          toneMappingExposure: 1.08,
        }}
        camera={{ fov: 39, position: [0, 1.5, 8.2] }}
      >
        <fog attach="fog" args={["#0a0c10", 16, 46]} />
        <ShadowControl progress={progress} />
        <CameraRig rig={rig} />
        <Sequence progress={progress} rig={rig} fade={fade} />
        <Facade />
        <FoliageShadow />
        <Ground />
        <Suspense fallback={null}>
          <GarageInterior progress={progress} />
        </Suspense>
        <Door progress={progress} />
        <GroundSign onEnter={enter} />
        <Details />
        <Dust progress={progress} />
        <directionalLight
          position={[6, 9, 7]}
          intensity={2.3}
          color="#fff3e2"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.03}
        >
          <orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -2, 1, 40]} />
        </directionalLight>
        <hemisphereLight args={["#e3e9ef", "#8b877d", 0.25]} />
        <Environment resolution={256}>
          <Lightformer intensity={1.0} color="#eaf0f6" position={[0, 8, 6]} rotation-x={-Math.PI / 3} scale={[22, 10, 1]} />
          <Lightformer intensity={0.8} color="#dde3e8" position={[0, 1.8, 9]} scale={[20, 7, 1]} />
          <Lightformer intensity={0.25} color="#b8bdc2" position={[-8, 3, 5]} rotation-y={Math.PI / 5} scale={[4, 6, 1]} />
        </Environment>
        <EffectComposer multisampling={0}>
          <N8AO halfRes quality="medium" aoRadius={1.7} intensity={3.6} distanceFalloff={1} />
          <Bloom mipmapBlur intensity={0.4} luminanceThreshold={1.0} />
          <Vignette offset={0.28} darkness={0.55} />
          <SMAA />
        </EffectComposer>
      </Canvas>

      <Grain />

      <Preloader />


      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_62%,rgba(0,0,0,0.3)_100%)]" />

      <div
        ref={fade}
        className="pointer-events-none absolute inset-0 bg-black opacity-0"
      />

    </div>
  );
}
