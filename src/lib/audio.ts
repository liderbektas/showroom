let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let roomSend: GainNode | null = null;

let motorNodes: { gain: GainNode; stops: (() => void)[] } | null = null;
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
  osc.type = "square";
  osc.frequency.value = freq;
  const og = ctx.createGain();
  og.gain.setValueAtTime(gain * 0.5, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.008);
  osc.connect(og);
  og.connect(master);
  if (toRoom && roomSend) og.connect(roomSend);
  osc.start(t);
  osc.stop(t + 0.02);
}

export function playRelay() {
  click({ freq: 2600, gain: 0.16 });
  click({ freq: 1400, gain: 0.24, noiseDur: 0.02, highpass: 600, when: 0.06 });
}

export function startMotor() {
  if (!ctx || !master || motorNodes) return;
  const t = ctx.currentTime;
  const stops: (() => void)[] = [];

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.2, t + 0.4);
  gain.connect(master);

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 160;
  hp.connect(gain);

  const osc1 = ctx.createOscillator();
  osc1.type = "sawtooth";
  osc1.frequency.value = 118;
  const osc2 = ctx.createOscillator();
  osc2.type = "sawtooth";
  osc2.frequency.value = 119.7;
  const humLp = ctx.createBiquadFilter();
  humLp.type = "lowpass";
  humLp.frequency.value = 750;
  const humGain = ctx.createGain();
  humGain.gain.value = 0.09;
  osc1.connect(humLp);
  osc2.connect(humLp);
  humLp.connect(humGain).connect(hp);

  const slide = ctx.createBufferSource();
  slide.buffer = noiseBuffer(2);
  slide.loop = true;
  const slideBp = ctx.createBiquadFilter();
  slideBp.type = "bandpass";
  slideBp.frequency.value = 1500;
  slideBp.Q.value = 0.7;
  const slideGain = ctx.createGain();
  slideGain.gain.value = 0.5;
  slide.connect(slideBp).connect(slideGain).connect(hp);

  const body = ctx.createBufferSource();
  body.buffer = noiseBuffer(2);
  body.loop = true;
  const bodyBp = ctx.createBiquadFilter();
  bodyBp.type = "bandpass";
  bodyBp.frequency.value = 480;
  bodyBp.Q.value = 0.9;
  const bodyGain = ctx.createGain();
  bodyGain.gain.value = 0.28;
  body.connect(bodyBp).connect(bodyGain).connect(hp);

  const rattle = ctx.createOscillator();
  rattle.frequency.value = 26;
  const rattleGain = ctx.createGain();
  rattleGain.gain.value = 0.16;
  rattle.connect(rattleGain).connect(slideGain.gain);

  const surge = ctx.createOscillator();
  surge.frequency.value = 2.8;
  const surgeGain = ctx.createGain();
  surgeGain.gain.value = 0.1;
  surge.connect(surgeGain).connect(slideGain.gain);

  for (const node of [osc1, osc2, slide, body, rattle, surge]) {
    node.start(t);
    stops.push(() => node.stop());
  }
  motorNodes = { gain, stops };
}

export function stopMotor() {
  if (!ctx || !motorNodes) return;
  const t = ctx.currentTime;
  motorNodes.gain.gain.cancelScheduledValues(t);
  motorNodes.gain.gain.setValueAtTime(motorNodes.gain.gain.value, t);
  motorNodes.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  const { stops } = motorNodes;
  motorNodes = null;
  setTimeout(() => stops.forEach((s) => s()), 500);
  playThunk();
}

export function playThunk() {
  if (!ctx || !master) return;
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(95, t);
  osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.35, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(g);
  g.connect(master);
  if (roomSend) g.connect(roomSend);
  osc.start(t);
  osc.stop(t + 0.32);

  click({ freq: 300, gain: 0.18, noiseDur: 0.05, highpass: 120, toRoom: true });
}

export function playChainTick() {
  click({
    freq: 1800 + Math.random() * 900,
    gain: 0.05 + Math.random() * 0.03,
    noiseDur: 0.012,
    highpass: 1400,
  });
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
