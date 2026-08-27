/**
 * audio.ts – Dungeon Delve procedural audio engine.
 *
 * Everything is synthesised with the Web Audio API (oscillators + shaped
 * noise buffers).  No audio files are needed.
 *
 * Lifecycle:
 *   initAudio()  – call on the very first user gesture (keydown / click).
 *                  Idempotent; safe to call many times.
 *   startMusic() – begin (or queue) the dungeon loop.
 *   stopMusic()  – fade out and halt scheduling.
 *   setMuted()   – toggle global mute without stopping the scheduler.
 */

let _ctx: AudioContext | null = null;
let _master: GainNode | null = null;
let _sfxBus: GainNode | null = null;
let _musicBus: GainNode | null = null;
let _muted = false;
let _shouldPlayMusic = false;
let _musicTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Init ──────────────────────────────────────────────────────────────────

export function initAudio() {
  if (_ctx) {
    if (_ctx.state === "suspended") _ctx.resume();
    return;
  }
  _ctx = new AudioContext();

  _master = _ctx.createGain();
  _master.gain.value = _muted ? 0 : 1;
  _master.connect(_ctx.destination);

  _sfxBus = _ctx.createGain();
  _sfxBus.gain.value = 0.7;
  _sfxBus.connect(_master);

  _musicBus = _ctx.createGain();
  _musicBus.gain.value = 0;
  _musicBus.connect(_master);

  if (_shouldPlayMusic) {
    _musicBus.gain.linearRampToValueAtTime(0.38, _ctx.currentTime + 1.5);
    _startScheduler(_ctx.currentTime + 0.05);
  }
}

export function setMuted(m: boolean) {
  _muted = m;
  if (_master) _master.gain.value = m ? 0 : 1;
}
export function isMuted() { return _muted; }

// ─── Low-level node builders ───────────────────────────────────────────────

function _osc(
  type: OscillatorType,
  freq: number,
  at: number,
  hold: number,
  rel: number,
  gain: number,
  dest: AudioNode,
  freqEnd?: number,
) {
  if (!_ctx) return;
  const g = _ctx.createGain();
  const o = _ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (freqEnd !== undefined)
    o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), at + hold + rel);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.008);
  g.gain.setValueAtTime(gain, at + hold);
  g.gain.exponentialRampToValueAtTime(0.001, at + hold + rel);
  o.connect(g); g.connect(dest);
  o.start(at); o.stop(at + hold + rel + 0.01);
}

function _noise(at: number, dur: number, gain: number, hipass: number, dest: AudioNode) {
  if (!_ctx) return;
  const len = Math.ceil(_ctx.sampleRate * dur);
  const buf = _ctx.createBuffer(1, len, _ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = _ctx.createBufferSource();
  src.buffer = buf;
  const filt = _ctx.createBiquadFilter();
  filt.type = "highpass"; filt.frequency.value = hipass;
  const g = _ctx.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  src.connect(filt); filt.connect(g); g.connect(dest);
  src.start(at);
}

// ─── Music sequencer ──────────────────────────────────────────────────────
// Pentatonic-minor A, 120 BPM, 16th-note grid.
// All freqs rounded to nearest Hz for readability.

const STEP = 0.125;  // seconds per 16th note at 120 BPM
const LOOP = 32;     // steps per loop = 4 s

type MNote = [number, number, number, number]; // [step, freq, hold_steps, gain]

const BASS: MNote[] = [
  [0,  110, 1, .75], [2,  110, 1, .55], [4,  165, 1, .75], [6,  165, 1, .55],
  [8,  110, 1, .75], [10, 131, 1, .55], [12, 147, 1, .65], [14, 165, 2, .75],
  [16, 110, 1, .75], [18, 110, 1, .55], [20, 165, 1, .75], [22, 165, 1, .55],
  [24, 110, 1, .75], [26, 196, 1, .65], [28, 165, 1, .55], [30, 147, 1, .55],
];

const MELODY: MNote[] = [
  [0,  440, 2, .50], [4,  392, 1, .45], [6,  330, 2, .45], [9,  440, 1, .50],
  [10, 523, 3, .55], [14, 440, 1, .45], [15, 392, 1, .45],
  [16, 294, 2, .45], [19, 330, 1, .45], [20, 392, 2, .50], [23, 440, 1, .45],
  [24, 330, 3, .50], [28, 262, 1, .40], [29, 294, 1, .40], [30, 330, 2, .45],
];

const KICKS  = [0, 8, 16, 24];
const HIHATS = [4, 12, 20, 28];

function _startScheduler(loopStart: number) {
  if (!_ctx || !_musicBus) return;
  const loopDur = LOOP * STEP;

  const lpf = _ctx.createBiquadFilter();
  lpf.type = "lowpass"; lpf.frequency.value = 480;
  lpf.connect(_musicBus);

  BASS.forEach(([s, f, h, g]) =>
    _osc("sawtooth", f, loopStart + s * STEP, h * STEP - 0.02, 0.07, g * 0.5, lpf));

  MELODY.forEach(([s, f, h, g]) =>
    _osc("square", f, loopStart + s * STEP, h * STEP - 0.02, 0.09, g * 0.55, _musicBus!));

  KICKS.forEach(s => {
    const at = loopStart + s * STEP;
    _osc("sine", 120, at, 0.03, 0.15, 0.65, _musicBus!, 40);
    _noise(at, 0.06, 0.22, 80, _musicBus!);
  });

  HIHATS.forEach(s =>
    _noise(loopStart + s * STEP, 0.035, 0.13, 8000, _musicBus!));

  const msUntilNext = (loopStart + loopDur - _ctx.currentTime - 0.15) * 1000;
  _musicTimer = setTimeout(() => {
    if (_shouldPlayMusic && _ctx && _musicBus) _startScheduler(loopStart + loopDur);
  }, Math.max(0, msUntilNext));
}

export function startMusic() {
  _shouldPlayMusic = true;
  if (!_ctx || !_musicBus) return;
  stopMusic(false);
  if (_ctx.state === "suspended") _ctx.resume();
  _musicBus.gain.cancelScheduledValues(_ctx.currentTime);
  _musicBus.gain.setValueAtTime(0, _ctx.currentTime);
  _musicBus.gain.linearRampToValueAtTime(0.38, _ctx.currentTime + 1.5);
  _startScheduler(_ctx.currentTime + 0.05);
}

export function stopMusic(clearFlag = true) {
  if (clearFlag) _shouldPlayMusic = false;
  if (_musicTimer !== null) { clearTimeout(_musicTimer); _musicTimer = null; }
  if (_ctx && _musicBus) {
    _musicBus.gain.cancelScheduledValues(_ctx.currentTime);
    _musicBus.gain.setValueAtTime(_musicBus.gain.value, _ctx.currentTime);
    _musicBus.gain.linearRampToValueAtTime(0, _ctx.currentTime + 0.5);
  }
}

// ─── SFX convenience wrappers ──────────────────────────────────────────────

function now() { return _ctx ? _ctx.currentTime : 0; }

function sfxOsc(
  type: OscillatorType, freq: number, hold: number, rel: number,
  gain: number, freqEnd?: number,
) {
  if (!_ctx || !_sfxBus) return;
  _osc(type, freq, now(), hold, rel, gain, _sfxBus, freqEnd);
}

function sfxNoise(dur: number, gain: number, hp = 200) {
  if (!_ctx || !_sfxBus) return;
  _noise(now(), dur, gain, hp, _sfxBus);
}

// ─── SFX ──────────────────────────────────────────────────────────────────

/** Blitzer rapid-punch lands.  Very short — safe at 10 Hz. */
export function sfxHit() {
  if (!_ctx) return;
  sfxOsc("sine", 200, 0.012, 0.04, 0.32, 70);
  sfxNoise(0.022, 0.07, 1400);
}

/** Blitzer Lightning Dash — electric whoosh. */
export function sfxDash() {
  if (!_ctx) return;
  sfxOsc("sawtooth", 580, 0.05, 0.13, 0.22, 160);
  sfxNoise(0.18, 0.28, 1500);
}

/** Blitz Storm fires — electric multi-directional burst. */
export function sfxBlitzFire() {
  if (!_ctx) return;
  sfxOsc("square",   220, 0.05, 0.70, 0.55, 55);
  sfxOsc("sawtooth", 440, 0.04, 0.45, 0.35, 110);
  sfxOsc("square",   880, 0.03, 0.25, 0.20, 220);
  sfxNoise(0.25, 0.50, 3000);
  sfxNoise(0.60, 0.18, 300);
}

/** Ghost afterimage shatters — glass shatter + AoE thump. */
export function sfxBlitzShatter() {
  if (!_ctx) return;
  sfxNoise(0.30, 0.65, 2500);
  sfxNoise(0.18, 0.32, 6000);
  sfxOsc("sine",   90, 0.04, 0.28, 0.72, 35);
  sfxOsc("square", 660, 0.02, 0.10, 0.22, 300);
}

/** Normal enemy dies. */
export function sfxDeath() {
  if (!_ctx) return;
  sfxNoise(0.10, 0.36, 900);
  sfxOsc("sine", 270, 0.015, 0.09, 0.38, 70);
}

/** Boss dies — massive layered explosion. */
export function sfxBossDeath() {
  if (!_ctx) return;
  sfxOsc("sine",     55,  0.10, 1.10, 0.90, 18);
  sfxOsc("sawtooth", 110, 0.10, 0.70, 0.60, 28);
  sfxOsc("square",   220, 0.05, 0.35, 0.30, 55);
  sfxNoise(1.20, 0.85, 150);
  sfxNoise(0.60, 0.42, 3500);
}

/** Coin collected — bright ding ding. */
export function sfxCoin() {
  if (!_ctx || !_sfxBus) return;
  const t = now();
  _osc("sine", 1047, t,      0.03, 0.14, 0.35, _sfxBus);
  _osc("sine", 1319, t+0.07, 0.03, 0.16, 0.28, _sfxBus);
}

/** Player takes damage — low thud + static burst. */
export function sfxHurt() {
  if (!_ctx) return;
  sfxNoise(0.18, 0.48, 300);
  sfxOsc("sine", 180, 0.04, 0.14, 0.50, 60);
}

/** All enemies cleared — ascending fanfare. */
export function sfxRoundClear() {
  if (!_ctx || !_sfxBus) return;
  const t = now();
  const notes: [number, number][] = [[523, 0], [659, 0.13], [784, 0.26], [1047, 0.39]];
  notes.forEach(([f, d]) =>
    _osc("square", f, t + d, 0.08, d === 0.39 ? 0.28 : 0.10, 0.40, _sfxBus!));
}

/** Overclock activated — time-warp swoop. */
export function sfxOverclock() {
  if (!_ctx) return;
  sfxOsc("sawtooth", 780, 0.04, 0.55, 0.45, 180);
  sfxOsc("sine",     110, 0.08, 0.75, 0.55, 50);
  sfxNoise(0.25, 0.18, 2000);
}

/** Phantom Clones summoned — spectral shimmer. */
export function sfxClones() {
  if (!_ctx || !_sfxBus) return;
  const t = now();
  const notes: [number, number, number][] = [[1200, 0, 800], [1600, 0.05, 1000], [1400, 0.10, 900]];
  notes.forEach(([f, d, fe]) =>
    _osc("sine", f, t + d, 0.04, 0.22, 0.24, _sfxBus!, fe));
}

/** Wizard fires a spell (fireball / frost / lightning). */
export function sfxWizardCast() {
  if (!_ctx) return;
  sfxOsc("sawtooth", 360, 0.03, 0.18, 0.28, 720);
  sfxNoise(0.14, 0.18, 1800);
}

/** Divine Pillar ultimate — massive ascending beam. */
export function sfxWizardUlt() {
  if (!_ctx || !_sfxBus) return;
  const t = now();
  _osc("sine",     80,  t,      0.20, 1.40, 0.80, _sfxBus!, 200);
  _osc("sawtooth", 220, t+0.10, 0.15, 0.90, 0.45, _sfxBus!, 880);
  _osc("square",   440, t+0.20, 0.10, 0.65, 0.30, _sfxBus!, 1760);
  _noise(t, 1.20, 0.44, 700, _sfxBus!);
}

/** Upgrade purchased in the shop. */
export function sfxUpgrade() {
  if (!_ctx || !_sfxBus) return;
  const t = now();
  [[523, 0], [659, 0.10], [784, 0.20]].forEach(([f, d]) =>
    _osc("square", f as number, t + d, 0.07, 0.18, 0.38, _sfxBus!));
}

/** Boss enters the arena — ominous low drone. */
export function sfxBossSpawn() {
  if (!_ctx) return;
  sfxOsc("sawtooth", 55,  0.40, 1.10, 0.60);
  sfxOsc("square",   110, 0.30, 0.70, 0.35);
  sfxNoise(0.55, 0.42, 80);
}

/** Brute heavy slam impact — deep thud. */
export function sfxSlam() {
  if (!_ctx) return;
  sfxOsc("sine", 75, 0.05, 0.30, 0.90, 28);
  sfxNoise(0.22, 0.55, 120);
}

/** Brute Shoulder Charge — heavy rushing whoosh with a low body behind it. */
export function sfxBruteCharge() {
  if (!_ctx) return;
  sfxOsc("sawtooth", 140, 0.06, 0.22, 0.40, 60);
  sfxOsc("sine", 90, 0.05, 0.18, 0.45, 45);
  sfxNoise(0.22, 0.35, 500);
}

/** Ground Quake stomp — subterranean boom + gravel rumble. */
export function sfxQuake() {
  if (!_ctx) return;
  sfxOsc("sine", 60, 0.08, 0.50, 0.95, 22);
  sfxOsc("square", 110, 0.03, 0.20, 0.25, 40);
  sfxNoise(0.45, 0.50, 90);
  sfxNoise(0.20, 0.25, 900);
}

/** Clash lock — metallic grind + tense low drone as the charge connects. */
export function sfxClashLock() {
  if (!_ctx || !_sfxBus) return;
  const t = now();
  _osc("sawtooth", 200, t, 0.05, 0.30, 0.40, _sfxBus, 70);
  _osc("sine", 55, t, 0.30, 0.60, 0.45, _sfxBus);
  _noise(t, 0.30, 0.30, 1800, _sfxBus);
}

/** Clash QTE landed — massive impact + triumphant rising sting. */
export function sfxClashSuccess() {
  if (!_ctx || !_sfxBus) return;
  const t = now();
  _osc("sine", 70, t, 0.06, 0.35, 0.95, _sfxBus, 30);
  _noise(t, 0.30, 0.60, 150, _sfxBus);
  _noise(t, 0.15, 0.35, 3000, _sfxBus);
  [[523, 0.05], [784, 0.13], [1047, 0.21]].forEach(([f, d]) =>
    _osc("square", f, t + d, 0.05, 0.18, 0.30, _sfxBus!));
}

/** Clash QTE missed — dull shove + sagging downward tone. */
export function sfxClashMiss() {
  if (!_ctx || !_sfxBus) return;
  const t = now();
  _osc("sine", 160, t, 0.04, 0.28, 0.40, _sfxBus, 70);
  _osc("square", 220, t + 0.08, 0.05, 0.22, 0.18, _sfxBus, 110);
  _noise(t, 0.16, 0.25, 400, _sfxBus);
}

/** Berserker Rage ignites — rising guttural roar. */
export function sfxRage() {
  if (!_ctx || !_sfxBus) return;
  const t = now();
  _osc("sawtooth", 90, t, 0.15, 0.55, 0.50, _sfxBus, 260);
  _osc("square", 180, t + 0.08, 0.10, 0.40, 0.30, _sfxBus, 420);
  _noise(t, 0.55, 0.30, 250, _sfxBus);
}
