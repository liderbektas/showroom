let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let roomSend: GainNode | null = null;

let exteriorGain: GainNode | null = null;
let interiorGain: GainNode | null = null;
let muted = false;

const MASTER_LEVEL = 0.55;

function noiseBuffer(seconds: number): AudioBuffer {
  const c = ctx!;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function makeImpulse(seconds: number, decay: number): AudioBuffer {
  const c = ctx!;
  const len = Math.ceil(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

export function initAudio() {
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume();
    return;
  }
  ctx = new AudioContext();

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 4;
  comp.connect(ctx.destination);

  master = ctx.createGain();
  master.gain.value = muted ? 0.0001 : MASTER_LEVEL;
  master.connect(comp);

  const convolver = ctx.createConvolver();
  convolver.buffer = makeImpulse(1.4, 3.5);
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  convolver.connect(wet).connect(master);

  roomSend = ctx.createGain();
  roomSend.gain.value = 1;
  roomSend.connect(convolver);
}

export function setMuted(m: boolean) {
  muted = m;
  if (!ctx || !master) return;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t);
  master.gain.exponentialRampToValueAtTime(m ? 0.0001 : MASTER_LEVEL, t + 0.25);
}

export function isMuted() {
  return muted;
}

type ClickOpts = {
  freq?: number;
  noiseDur?: number;
  gain?: number;
  highpass?: number;
  toRoom?: boolean;
  when?: number;
};

function click({
  freq = 2200,
  noiseDur = 0.015,
  gain = 0.2,
  highpass = 900,
  toRoom = false,
  when = 0,
}: ClickOpts) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + when;

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(noiseDur + 0.01);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = highpass;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + noiseDur);
  noise.connect(hp).connect(g);
  g.connect(master);
  if (toRoom && roomSend) g.connect(roomSend);
  noise.start(t);
  noise.stop(t + noiseDur + 0.02);

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = freq;
  const og = ctx.createGain();
  og.gain.setValueAtTime(gain * 0.22, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.01);
  osc.connect(og);
  og.connect(master);
  if (toRoom && roomSend) og.connect(roomSend);
  osc.start(t);
  osc.stop(t + 0.02);
}

export function playRelay() {
  click({ freq: 1900, gain: 0.12, noiseDur: 0.012, highpass: 1200 });
  click({ freq: 700, gain: 0.16, noiseDur: 0.03, highpass: 400, when: 0.055, toRoom: true });
}

type Motor = {
  out: GainNode;
  hum: OscillatorNode[];
  humBase: number[];
  clatter: GainNode;
  drive: GainNode;
  stops: (() => void)[];
};

let motorNodes: Motor | null = null;

export function startMotor() {
  if (!ctx || !master || motorNodes) return;
  const t = ctx.currentTime;
  const stops: (() => void)[] = [];

  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.setTargetAtTime(0.35, t, 0.15);
  out.connect(master);
  if (roomSend) {
    const room = ctx.createGain();
    room.gain.value = 0.3;
    out.connect(room).connect(roomSend);
  }

  const rumbleSrc = ctx.createBufferSource();
  rumbleSrc.buffer = noiseBuffer(4);
  rumbleSrc.loop = true;
  const lp1 = ctx.createBiquadFilter();
  lp1.type = "lowpass";
  lp1.frequency.value = 170;
  const lp2 = ctx.createBiquadFilter();
  lp2.type = "lowpass";
  lp2.frequency.value = 260;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.5;
  rumbleSrc.connect(lp1).connect(lp2).connect(rumbleGain).connect(out);

  const driveSrc = ctx.createBufferSource();
  driveSrc.buffer = noiseBuffer(4);
  driveSrc.loop = true;
  const driveBp = ctx.createBiquadFilter();
  driveBp.type = "bandpass";
  driveBp.frequency.value = 330;
  driveBp.Q.value = 1.4;
  const drive = ctx.createGain();
  drive.gain.value = 0.16;
  driveSrc.connect(driveBp).connect(drive).connect(out);

  const clatterSrc = ctx.createBufferSource();
  clatterSrc.buffer = noiseBuffer(4);
  clatterSrc.loop = true;
  const clatterBp = ctx.createBiquadFilter();
  clatterBp.type = "bandpass";
  clatterBp.frequency.value = 1400;
  clatterBp.Q.value = 0.8;
  const clatter = ctx.createGain();
  clatter.gain.value = 0.05;
  clatterSrc.connect(clatterBp).connect(clatter).connect(out);

  const sprocket = ctx.createOscillator();
  sprocket.type = "sine";
  sprocket.frequency.value = 6.5;
  const sprocketDepth = ctx.createGain();
  sprocketDepth.gain.value = 0.02;
  sprocket.connect(sprocketDepth).connect(clatter.gain);

  const sway = ctx.createOscillator();
  sway.type = "sine";
  sway.frequency.value = 1.7;
  const swayDepth = ctx.createGain();
  swayDepth.gain.value = 0.03;
  sway.connect(swayDepth).connect(drive.gain);

  const humLp = ctx.createBiquadFilter();
  humLp.type = "lowpass";
  humLp.frequency.value = 700;
  humLp.connect(out);

  const humBase = [60, 120, 180];
  const humLevel = [0.02, 0.035, 0.012];
  const hum: OscillatorNode[] = [];
  humBase.forEach((f, i) => {
    const osc = ctx!.createOscillator();
    osc.type = i === 2 ? "triangle" : "sine";
    osc.frequency.setValueAtTime(f * 0.55, t);
    osc.frequency.setTargetAtTime(f, t, 0.14);
    const g = ctx!.createGain();
    g.gain.value = humLevel[i];
    osc.connect(g).connect(humLp);
    hum.push(osc);
  });

  for (const node of [rumbleSrc, driveSrc, clatterSrc, sprocket, sway, ...hum]) {
    node.start(t);
    stops.push(() => node.stop());
  }

  motorNodes = { out, hum, humBase, clatter, drive, stops };
}

export function setMotorSpeed(speed: number) {
  if (!ctx || !motorNodes) return;
  const s = Math.min(Math.max(speed, 0), 1);
  const t = ctx.currentTime;
  motorNodes.out.gain.setTargetAtTime(0.12 + 0.5 * s, t, 0.09);
  motorNodes.clatter.gain.setTargetAtTime(0.015 + 0.05 * s, t, 0.09);
  motorNodes.drive.gain.setTargetAtTime(0.06 + 0.12 * s, t, 0.09);
  motorNodes.hum.forEach((osc, i) => {
    osc.frequency.setTargetAtTime(motorNodes!.humBase[i] * (0.985 + 0.015 * s), t, 0.12);
  });
}

export function stopMotor(impact = true) {
  if (!ctx || !motorNodes) return;
  const t = ctx.currentTime;
  const m = motorNodes;
  motorNodes = null;

  m.hum.forEach((osc, i) => osc.frequency.setTargetAtTime(m.humBase[i] * 0.82, t, 0.1));
  m.out.gain.cancelScheduledValues(t);
  m.out.gain.setValueAtTime(Math.max(m.out.gain.value, 0.0001), t);
  m.out.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  setTimeout(() => m.stops.forEach((s) => s()), 500);

  if (impact) playLimitStop();
}

function playLimitStop() {
  if (!ctx || !master) return;
  const t = ctx.currentTime;

  const thud = ctx.createBufferSource();
  thud.buffer = noiseBuffer(0.35);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.exponentialRampToValueAtTime(180, t + 0.18);
  const tg = ctx.createGain();
  tg.gain.setValueAtTime(0.22, t);
  tg.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
  thud.connect(lp).connect(tg);
  tg.connect(master);
  if (roomSend) tg.connect(roomSend);
  thud.start(t);
  thud.stop(t + 0.3);

  const body = ctx.createOscillator();
  body.type = "sine";
  body.frequency.setValueAtTime(74, t);
  body.frequency.exponentialRampToValueAtTime(46, t + 0.12);
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(0.16, t);
  bg.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  body.connect(bg);
  bg.connect(master);
  if (roomSend) bg.connect(roomSend);
  body.start(t);
  body.stop(t + 0.24);

  playChainTick(0.5, 0.06);
  setTimeout(() => playChainTick(0.35, 0.16), 120);
}

export function playChainTick(speed = 1, when = 0) {
  if (!ctx || !master) return;
  const s = Math.min(Math.max(speed, 0), 1);
  const t = ctx.currentTime + when;
  const dur = 0.03;

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(dur + 0.02);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2400 + Math.random() * 1600;
  bp.Q.value = 5;
  const g = ctx.createGain();
  g.gain.setValueAtTime((0.02 + Math.random() * 0.014) * (0.3 + 0.7 * s), t);
  g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  noise.connect(bp).connect(g);
  g.connect(master);
  if (roomSend) g.connect(roomSend);
  noise.start(t);
  noise.stop(t + dur + 0.02);
}

export function playSpotClack() {
  click({ freq: 2100, gain: 0.2, noiseDur: 0.018, highpass: 1000, toRoom: true });
  click({ freq: 900, gain: 0.08, noiseDur: 0.03, highpass: 400, toRoom: true, when: 0.02 });
}

let birdTimer: ReturnType<typeof setTimeout> | null = null;

function playBirdChirp() {
  if (!ctx || !master) return;
  const t = ctx.currentTime;
  const base = 2300 + Math.random() * 1900;
  const chirps = 2 + Math.floor(Math.random() * 3);
  const pan = ctx.createStereoPanner();
  pan.pan.value = Math.random() * 1.6 - 0.8;
  pan.connect(master);
  for (let i = 0; i < chirps; i++) {
    const start = t + i * (0.1 + Math.random() * 0.08);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.2), start);
    osc.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), start + 0.04);
    osc.frequency.exponentialRampToValueAtTime(base * 0.85, start + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.02 + Math.random() * 0.02, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.1);
    osc.connect(g).connect(pan);
    osc.start(start);
    osc.stop(start + 0.12);
  }
}

function scheduleBirds() {
  birdTimer = setTimeout(() => {
    playBirdChirp();
    scheduleBirds();
  }, 2000 + Math.random() * 5000);
}

export function startExteriorAmbience() {
  if (!ctx || !master || exteriorGain) return;
  const t = ctx.currentTime;

  exteriorGain = ctx.createGain();
  exteriorGain.gain.setValueAtTime(0.0001, t);
  exteriorGain.gain.exponentialRampToValueAtTime(0.035, t + 1.5);
  exteriorGain.connect(master);

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(4);
  noise.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 320;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 90;
  noise.connect(hp).connect(lp).connect(exteriorGain);

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.15;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.015;
  lfo.connect(lfoGain).connect(exteriorGain.gain);

  noise.start(t);
  lfo.start(t);
  scheduleBirds();
}

export function crossfadeToInterior() {
  if (!ctx || !master) return;
  const t = ctx.currentTime;

  if (birdTimer) {
    clearTimeout(birdTimer);
    birdTimer = null;
  }
  if (exteriorGain) {
    exteriorGain.gain.cancelScheduledValues(t);
    exteriorGain.gain.setValueAtTime(Math.max(exteriorGain.gain.value, 0.0001), t);
    exteriorGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  }
  if (interiorGain) return;

  interiorGain = ctx.createGain();
  interiorGain.gain.setValueAtTime(0.0001, t);
  interiorGain.gain.exponentialRampToValueAtTime(0.03, t + 2.2);
  interiorGain.connect(master);
  if (roomSend) interiorGain.connect(roomSend);

  const hum = ctx.createOscillator();
  hum.type = "sine";
  hum.frequency.value = 100;
  const hum2 = ctx.createOscillator();
  hum2.type = "sine";
  hum2.frequency.value = 200;
  const humGain = ctx.createGain();
  humGain.gain.value = 0.35;
  hum.connect(humGain);
  hum2.connect(humGain);
  humGain.connect(interiorGain);

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(4);
  noise.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 450;
  const nGain = ctx.createGain();
  nGain.gain.value = 0.5;
  noise.connect(lp).connect(nGain).connect(interiorGain);

  hum.start(t);
  hum2.start(t);
  noise.start(t);
}
