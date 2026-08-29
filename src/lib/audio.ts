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
  gain.gain.exponentialRampToValueAtTime(0.16, t + 0.5);
  gain.connect(master);

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 260;
  lp.connect(gain);

  const osc1 = ctx.createOscillator();
  osc1.type = "sawtooth";
  osc1.frequency.setValueAtTime(48, t);
  osc1.frequency.linearRampToValueAtTime(55, t + 3);
  const osc2 = ctx.createOscillator();
  osc2.type = "sawtooth";
  osc2.frequency.setValueAtTime(97, t);
  osc2.frequency.linearRampToValueAtTime(111, t + 3);
  const oscGain = ctx.createGain();
  oscGain.gain.value = 0.5;
  osc1.connect(oscGain);
  osc2.connect(oscGain);
  oscGain.connect(lp);

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 7;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 40;
  lfo.connect(lfoGain).connect(lp.frequency);

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(2);
  noise.loop = true;
  const nFilter = ctx.createBiquadFilter();
  nFilter.type = "bandpass";
  nFilter.frequency.value = 400;
  nFilter.Q.value = 0.8;
  const nGain = ctx.createGain();
  nGain.gain.value = 0.25;
  noise.connect(nFilter).connect(nGain).connect(lp);

  for (const node of [osc1, osc2, lfo, noise]) {
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

export function startExteriorAmbience() {
  if (!ctx || !master || exteriorGain) return;
  const t = ctx.currentTime;

  exteriorGain = ctx.createGain();
  exteriorGain.gain.setValueAtTime(0.0001, t);
  exteriorGain.gain.exponentialRampToValueAtTime(0.045, t + 1.5);
  exteriorGain.connect(master);

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(4);
  noise.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 140;
  noise.connect(lp).connect(exteriorGain);

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.15;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.015;
  lfo.connect(lfoGain).connect(exteriorGain.gain);

  noise.start(t);
  lfo.start(t);
}

export function crossfadeToInterior() {
  if (!ctx || !master) return;
  const t = ctx.currentTime;

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
