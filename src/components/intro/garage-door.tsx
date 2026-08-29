"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { useIntroStore } from "@/lib/store";
import {
  initAudio,
  playRelay,
  startMotor,
  stopMotor,
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
const LIFT_MAX = DOOR_H + ARC + 0.6;

const WALL_W = 30;
const WALL_H = 12;

function makeWallMaps() {
  const S = 1024;
  const TILE = 4;
  const blockW = S / 6;
  const blockH = S / 12;

  const color = document.createElement("canvas");
  color.width = S;
  color.height = S;
  const c = color.getContext("2d")!;
  c.fillStyle = "#d9d4c8";
  c.fillRect(0, 0, S, S);

  const rows = S / blockH;
  for (let row = 0; row < rows; row++) {
    const y = row * blockH;
    const off = row % 2 ? blockW / 2 : 0;
    for (let bx = -1; bx < S / blockW + 1; bx++) {
      const x = bx * blockW + off;
      const tone = (Math.random() - 0.5) * 14;
      c.fillStyle = `rgb(${217 + tone},${212 + tone},${200 + tone})`;
      c.fillRect(x + 2, y + 2, blockW - 4, blockH - 4);
      c.fillStyle = "rgba(255,255,255,0.06)";
      c.fillRect(x + 2, y + 2, blockW - 4, 2);
      c.fillStyle = "rgba(0,0,0,0.05)";
      c.fillRect(x + 2, y + blockH - 4, blockW - 4, 2);
    }
    c.fillStyle = "rgba(90,84,72,0.35)";
    c.fillRect(0, y, S, 2);
  }
  for (let row = 0; row < rows; row++) {
    const y = row * blockH;
    const off = row % 2 ? blockW / 2 : 0;
    c.fillStyle = "rgba(90,84,72,0.28)";
    for (let bx = -1; bx < S / blockW + 1; bx++) {
      c.fillRect(bx * blockW + off, y, 2, blockH);
    }
  }
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const l = Math.random() > 0.5;
    c.fillStyle = `rgba(${l ? "255,255,255" : "60,55,45"},${0.02 + Math.random() * 0.04})`;
    c.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const w = 20 + Math.random() * 60;
    const h = 60 + Math.random() * 260;
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "rgba(95,88,74,0.05)");
    g.addColorStop(1, "rgba(95,88,74,0)");
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
  }

  const normal = document.createElement("canvas");
  normal.width = S;
  normal.height = S;
  const n = normal.getContext("2d")!;
  n.fillStyle = "rgb(128,128,255)";
  n.fillRect(0, 0, S, S);
  for (let row = 0; row < rows; row++) {
    const y = row * blockH;
    n.fillStyle = "rgb(128,100,250)";
    n.fillRect(0, (y - 1 + S) % S, S, 2);
    n.fillStyle = "rgb(128,156,250)";
    n.fillRect(0, y + 1, S, 2);
  }
  for (let i = 0; i < 1400; i++) {
    const off = Math.round((Math.random() - 0.5) * 14);
    n.fillStyle = `rgba(${128 + off},${128 - off},255,0.10)`;
    n.fillRect(Math.random() * S, Math.random() * S, 2 + Math.random() * 4, 2 + Math.random() * 4);
  }

  const toTex = (cv: HTMLCanvasElement, srgb = false) => {
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / TILE, 1 / TILE);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: toTex(color, true), normalMap: toTex(normal) };
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
  const wallMaps = useMemo(makeWallMaps, []);
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

  const shadeMap = useMemo(() => {
    const S = 1024;
    const cv = document.createElement("canvas");
    cv.width = S;
    cv.height = S;
    const ctx = cv.getContext("2d")!;
    const g = ctx.createLinearGradient(0, S, 0, 0);
    g.addColorStop(0, "rgba(255,255,255,0.5)");
    g.addColorStop(0.18, "rgba(255,255,255,0.14)");
    g.addColorStop(0.5, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(255,255,255,0.2)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);

    for (let i = 0; i < 30; i++) {
      const x = Math.random() * S;
      const len = 30 + Math.random() * 130;
      const w = 4 + Math.random() * 16;
      const sg = ctx.createLinearGradient(0, 0, 0, len);
      sg.addColorStop(0, `rgba(255,255,255,${0.08 + Math.random() * 0.14})`);
      sg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(x, 0, w, len);
    }

    const u = (wx: number) => ((wx + WALL_W / 2) / WALL_W) * S;
    const v = (wy: number) => (1 - wy / WALL_H) * S;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const x = u(side * (DOOR_W / 2 + 0.3) + (Math.random() - 0.5) * 0.6);
        const y0 = v(DOOR_H + 0.05);
        const len = 40 + Math.random() * 80;
        const sg = ctx.createLinearGradient(0, y0, 0, y0 + len);
        sg.addColorStop(0, `rgba(255,255,255,${0.1 + Math.random() * 0.14})`);
        sg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = sg;
        ctx.fillRect(x, y0, 3 + Math.random() * 6, len);
      }
    }
    const y0 = v(DOOR_H + 0.28);
    for (let i = 0; i < 9; i++) {
      const x = u(-DOOR_W / 2 + 0.2 + Math.random() * (DOOR_W - 0.4));
      const len = 14 + Math.random() * 30;
      const sg = ctx.createLinearGradient(0, y0, 0, y0 + len);
      sg.addColorStop(0, `rgba(255,255,255,${0.08 + Math.random() * 0.1})`);
      sg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(x, y0, 2 + Math.random() * 5, len);
    }

    const t = new THREE.CanvasTexture(cv);
    t.repeat.set(1 / WALL_W, 1 / WALL_H);
    t.offset.set(0.5, 0);
    return t;
  }, []);

  return (
    <group>
      <mesh geometry={wallGeo} castShadow receiveShadow>
        <meshStandardMaterial {...wallMaps} roughness={0.92} normalScale={new THREE.Vector2(0.8, 0.8)} />
      </mesh>
      <mesh geometry={wallGeo} position-z={0.008}>
        <meshBasicMaterial color="#000000" transparent alphaMap={shadeMap} opacity={0.32} depthWrite={false} />
      </mesh>

      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * (DOOR_W / 2 - 0.07), DOOR_H / 2, -0.22]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.14, DOOR_H, 0.14]} />
          <meshStandardMaterial color="#33373c" metalness={0.6} roughness={0.55} />
        </mesh>
      ))}

      <mesh position={[0, DOOR_H - 0.14, -0.2]} castShadow receiveShadow>
        <boxGeometry args={[DOOR_W, 0.28, 0.12]} />
        <meshStandardMaterial color="#2e3237" metalness={0.6} roughness={0.5} />
      </mesh>

      <group position={[0, DOOR_H + 0.95, 0.08]}>
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
        <meshStandardMaterial color="#b8b3a7" roughness={0.85} metalness={0.15} />
      </mesh>
      {[0.7, 3.4].map((y) => (
        <mesh key={y} position={[-3.75, y, 0.05]}>
          <boxGeometry args={[0.17, 0.05, 0.1]} />
          <meshStandardMaterial color="#8f8a80" roughness={0.8} metalness={0.3} />
        </mesh>
      ))}

      <mesh position={[-DOOR_W / 2, DOOR_H / 2, -RECESS / 2]} rotation-y={Math.PI / 2} receiveShadow>
        <planeGeometry args={[RECESS, DOOR_H]} />
        <meshStandardMaterial color="#8a857a" roughness={0.95} />
      </mesh>
      <mesh position={[DOOR_W / 2, DOOR_H / 2, -RECESS / 2]} rotation-y={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[RECESS, DOOR_H]} />
        <meshStandardMaterial color="#8a857a" roughness={0.95} />
      </mesh>
      <mesh position={[0, DOOR_H, -RECESS / 2]} rotation-x={Math.PI / 2} receiveShadow>
        <planeGeometry args={[DOOR_W, RECESS]} />
        <meshStandardMaterial color="#6f6a60" roughness={0.95} />
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
    <mesh ref={mesh} position={[-3.8, 4.6, 0.02]}>
      <planeGeometry args={[7, 6]} />
      <meshBasicMaterial color="#3a3226" transparent alphaMap={alpha} opacity={0.12} depthWrite={false} />
    </mesh>
  );
}

function makeGroundMap() {
  const S = 1024;
  const GROUND_D = 12.45;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#9c9a94";
  ctx.fillRect(0, 0, S, S);

  for (let i = 0; i < 70; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const rad = 40 + Math.random() * 170;
    const light = Math.random() > 0.5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(${light ? "255,255,255" : "40,36,28"},${0.02 + Math.random() * 0.04})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  const stepX = (2.5 / WALL_W) * S;
  for (let x = stepX; x < S; x += stepX) {
    ctx.fillStyle = "rgba(30,28,24,0.20)";
    ctx.fillRect(x, 0, 2, S);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(x + 2, 0, 1, S);
  }
  for (const wz of [2, 5, 8, 11]) {
    const y = ((wz + 0.445) / GROUND_D) * S;
    ctx.fillStyle = "rgba(30,28,24,0.20)";
    ctx.fillRect(0, y, S, 2);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(0, y + 2, S, 1);
  }

  const contact = ctx.createLinearGradient(0, 0, 0, 80);
  contact.addColorStop(0, "rgba(20,18,14,0.3)");
  contact.addColorStop(1, "rgba(20,18,14,0)");
  ctx.fillStyle = contact;
  ctx.fillRect(0, 0, S, 80);

  for (const side of [-1, 1]) {
    const cx = S / 2 + side * (0.85 / WALL_W) * S;
    const trackW = (0.36 / WALL_W) * S;
    for (let y = 10; y < S * 0.66; y += 6) {
      const fade = 1 - y / (S * 0.66);
      const wob = Math.sin(y * 0.015 + side) * 2.5;
      ctx.fillStyle = `rgba(34,30,24,${0.085 * fade + Math.random() * 0.02})`;
      ctx.fillRect(cx + wob - trackW / 2, y, trackW, 7);
      ctx.fillStyle = `rgba(34,30,24,${0.04 * fade})`;
      ctx.fillRect(cx + wob - trackW / 2 - 3, y, 3, 7);
      ctx.fillRect(cx + wob + trackW / 2, y, 3, 7);
    }
  }

  for (let i = 0; i < 10; i++) {
    const x = S / 2 + (Math.random() - 0.5) * (3.5 / WALL_W) * S * 2;
    const y = 30 + Math.random() * 220;
    const rad = 12 + Math.random() * 42;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(28,24,18,${0.08 + Math.random() * 0.1})`);
    g.addColorStop(0.7, `rgba(28,24,18,${0.03 + Math.random() * 0.04})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  for (let i = 0; i < 3500; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const l = Math.random() > 0.5;
    ctx.fillStyle = `rgba(${l ? "255,255,255" : "20,18,14"},${0.01 + Math.random() * 0.03})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  const t = new THREE.CanvasTexture(cv);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Ground() {
  const map = useMemo(makeGroundMap, []);
  return (
    <mesh position={[0, 0, 5.78]} rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[WALL_W, 12.45]} />
      <meshStandardMaterial map={map} roughness={0.96} />
    </mesh>
  );
}

function Interior() {
  return (
    <group>
      <mesh position={[0, 0, -4.3]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[7.4, 7.7]} />
        <meshStandardMaterial color="#141517" roughness={0.55} metalness={0.1} envMapIntensity={0.35} />
      </mesh>
      <mesh position={[0, 3.4, -4.3]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[7.4, 7.7]} />
        <meshStandardMaterial color="#0b0c0e" roughness={1} />
      </mesh>
      <mesh position={[0, 1.7, -8.15]}>
        <planeGeometry args={[7.4, 3.4]} />
        <meshStandardMaterial color="#0c0d10" roughness={1} />
      </mesh>
      <mesh position={[-3.7, 1.7, -4.3]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[7.7, 3.4]} />
        <meshStandardMaterial color="#0e0f12" roughness={1} />
      </mesh>
      <mesh position={[3.7, 1.7, -4.3]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[7.7, 3.4]} />
        <meshStandardMaterial color="#0e0f12" roughness={1} />
      </mesh>
      <pointLight position={[0, 2.7, -4.5]} intensity={3} distance={9} color="#ffd9a6" />
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

    let lastTick = 0;
    const tl = gsap.timeline({ onComplete: () => setPhase("inside") });
    tl.call(playRelay, undefined, 0.05)
      .call(playSpotClack, undefined, 0.32)
      .call(startMotor, undefined, 0.55)
      .to(progress.current, {
        p: 1,
        duration: 3.3,
        ease: "power2.inOut",
        onUpdate() {
          const p = this.progress();
          if (p - lastTick > 0.07) {
            lastTick = p;
            playChainTick();
          }
        },
      }, 0.7)
      .call(stopMotor, undefined, 4.0)
      .to(rig.current, { z: -1.6, duration: 2.7, ease: "power2.in" }, 2.3)
      .to(rig.current, { parallax: 0, duration: 1.2, ease: "none" }, 2.3)
      .call(crossfadeToInterior, undefined, 4.0);

    if (fade.current) {
      tl.to(fade.current, { opacity: 1, duration: 0.55, ease: "power1.in" }, 4.4);
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      tl.timeScale(2.5);
    }

    return () => {
      tl.kill();
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
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (DOOR_W / 2 - 0.1), 0.16, -0.16]}>
          <mesh castShadow>
            <boxGeometry args={[0.06, 0.09, 0.06]} />
            <meshStandardMaterial color="#2a2d31" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.012, 0.031]}>
            <circleGeometry args={[0.011, 12]} />
            <meshStandardMaterial color="#3a0c08" emissive="#ff2a1a" emissiveIntensity={2.2} />
          </mesh>
        </group>
      ))}

      <group position={[2.62, 1.24, 0.028]}>
        <mesh castShadow>
          <boxGeometry args={[0.13, 0.19, 0.05]} />
          <meshStandardMaterial color="#2c2f33" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position-z={0.026}>
          <planeGeometry args={[0.12, 0.18]} />
          <meshStandardMaterial map={keypad} roughness={0.55} metalness={0.3} />
        </mesh>
      </group>

      <mesh position={[0, DOOR_H + 2.45, 0.032]} castShadow>
        <cylinderGeometry args={[0.017, 0.017, 2.6, 10]} />
        <meshStandardMaterial color="#9b978c" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, DOOR_H + 1.14, 0.04]} castShadow>
        <boxGeometry args={[0.11, 0.11, 0.07]} />
        <meshStandardMaterial color="#8e8a80" metalness={0.4} roughness={0.6} />
      </mesh>

      <group position={[-2.2, 3.82, 0.022]}>
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

function signNoise(ctx: CanvasRenderingContext2D, w: number, h: number, count: number) {
  for (let i = 0; i < count; i++) {
    const l = Math.random() > 0.5;
    ctx.fillStyle = `rgba(${l ? "255,255,255" : "40,38,32"},${0.01 + Math.random() * 0.03})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
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

const VOLUME_ICON_PATHS = [
  "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
  "M16 9a5 5 0 0 1 0 6",
  "M19.364 18.364a9 9 0 0 0 0-12.728",
];

function makeWallSignMap() {
  const W = 1792;
  const H = 384;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#edeae1");
  bg.addColorStop(1, "#ddd9cd");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  signNoise(ctx, W, H, 900);

  ctx.strokeStyle = "#2b2e33";
  ctx.lineWidth = 8;
  ctx.strokeRect(26, 26, W - 52, H - 52);

  ctx.save();
  ctx.translate(96, H / 2 - 66);
  ctx.scale(5.5, 5.5);
  ctx.strokeStyle = "#2b2e33";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of VOLUME_ICON_PATHS) ctx.stroke(new Path2D(d));
  ctx.restore();

  (ctx as unknown as { letterSpacing: string }).letterSpacing = "12px";
  ctx.fillStyle = "#2b2e33";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "600 66px 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.fillText("FOR THE BEST EXPERIENCE", 280, H * 0.37);
  ctx.fillText("PLEASE TURN ON YOUR SOUND", 280, H * 0.66);

  drawScrew(ctx, 52, 52, 13);
  drawScrew(ctx, W - 52, 52, 13);
  drawScrew(ctx, 52, H - 52, 13);
  drawScrew(ctx, W - 52, H - 52, 13);

  const streak = ctx.createLinearGradient(0, H - 60, 0, H);
  streak.addColorStop(0, "rgba(120,100,70,0.10)");
  streak.addColorStop(1, "rgba(120,100,70,0)");
  ctx.fillStyle = streak;
  ctx.fillRect(40, H - 60, 26, 60);

  const t = new THREE.CanvasTexture(cv);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function WallSign() {
  const map = useMemo(makeWallSignMap, []);
  return (
    <group position={[0, DOOR_H + 0.52, 0.045]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.96, 0.42, 0.03]} />
        <meshStandardMaterial color="#d6d2c6" roughness={0.7} metalness={0.15} />
      </mesh>
      <mesh position-z={0.0155} receiveShadow>
        <planeGeometry args={[1.96, 0.42]} />
        <meshStandardMaterial map={map} roughness={0.55} metalness={0.05} />
      </mesh>
    </group>
  );
}

function makeGroundSignMap() {
  const W = 384;
  const H = 768;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  const PAINT = "#ddd6c2";
  const ls = ctx as unknown as { letterSpacing: string };

  ctx.strokeStyle = PAINT;
  ctx.lineWidth = 34;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(W / 2, 300);
  ctx.lineTo(W / 2, 60);
  ctx.moveTo(W / 2 - 62, 130);
  ctx.lineTo(W / 2, 42);
  ctx.lineTo(W / 2 + 62, 130);
  ctx.stroke();

  ctx.fillStyle = PAINT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.save();
  ctx.translate(W / 2, 430);
  ctx.scale(1, 2);
  ls.letterSpacing = "5px";
  ctx.font = "700 62px 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.fillText("ENTER", 2, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(W / 2, 540);
  ctx.scale(1, 1.9);
  ls.letterSpacing = "8px";
  ctx.font = "700 30px 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.fillText("CLICK TO OPEN", 4, 0);
  ctx.restore();

  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    ctx.fillStyle = `rgba(0,0,0,${0.25 + Math.random() * 0.55})`;
    ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 2);
  }
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = 12 + Math.random() * 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(0,0,0,0.5)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = "source-over";

  const t = new THREE.CanvasTexture(cv);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function GroundSign({ onEnter }: { onEnter: () => void }) {
  const map = useMemo(makeGroundSignMap, []);
  const [hover, setHover] = useState(false);
  const phase = useIntroStore((s) => s.phase);
  const idle = phase === "loading" || phase === "ready";

  useEffect(() => {
    document.body.style.cursor = hover && idle ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hover, idle]);

  return (
    <mesh
      position={[0, 0.006, 2.45]}
      rotation-x={-Math.PI / 2}
      onClick={(e) => {
        e.stopPropagation();
        onEnter();
      }}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <planeGeometry args={[1.55, 2.6]} />
      <meshStandardMaterial
        map={map}
        transparent
        color={hover && idle ? "#ffffff" : "#dcdcdc"}
        roughness={0.9}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function GarageDoor() {
  const phase = useIntroStore((s) => s.phase);
  const setPhase = useIntroStore((s) => s.setPhase);
  const idle = phase === "loading" || phase === "ready";

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
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }} camera={{ fov: 35, position: [0, 1.5, 8.2] }}>
        <CameraRig rig={rig} />
        <Sequence progress={progress} rig={rig} fade={fade} />
        <Facade />
        <FoliageShadow />
        <Ground />
        <Interior />
        <Door progress={progress} />
        <WallSign />
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
      </Canvas>

      <Grain />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_62%,rgba(0,0,0,0.3)_100%)]" />

      <div
        ref={fade}
        className="pointer-events-none absolute inset-0 bg-black opacity-0"
      />

    </div>
  );
}
