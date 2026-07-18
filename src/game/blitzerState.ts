// Shared mutable bridge between the BlitzerHUD (React) and the canvas engine.
// Mirrors the blitzer's barrage charge AND its three key-pressed abilities
// (Lightning Dash, Overclock, Phantom Clones) so the HUD can poll it without
// triggering per-frame React renders of the whole tree.

// Single source of truth for the barrage combo tuning — imported by both the
// engine (combo logic) and the HUD (seconds readout) so they cannot drift.
export const COMBO_DURATION = 5;    // seconds the six-fist barrage lasts
export const CHARGE_DURATION = 5;  // seconds of combat needed to fill the charge bar

// --- Ability tuning (single source of truth, imported by engine + HUD) ---
// Lightning Dash [SHIFT] — instant blink with i-frames + path damage.
export const DASH_COOLDOWN = 2.5;   // seconds between dashes
export const DASH_DISTANCE = 190;   // pixels travelled per blink
export const DASH_DAMAGE = 3;       // one-time damage to enemies along the path
export const DASH_HIT_RADIUS = 42;  // how close an enemy must be to the dash line
export const DASH_IFRAMES = 0.4;    // invulnerability granted by the dash
export const DASH_TRAIL_FADE = 0.45;// seconds each afterimage lingers

// Overclock [Q] — bullet-time window where enemies crawl, player stays fast.
export const OVERCLOCK_COOLDOWN = 12; // seconds between activations
export const OVERCLOCK_DURATION = 4;  // seconds the slow-mo window lasts
export const OVERCLOCK_ENEMY_SCALE = 0.25; // enemy time-step multiplier (25%)

// Phantom Clones [E] — afterimages that rapid-strike then deliver a big finish.
export const CLONES_COOLDOWN = 10;     // seconds between summons
export const CLONES_DURATION = 4;      // seconds the clones persist
export const CLONE_COUNT = 3;          // afterimages spawned
export const CLONE_STRIKE_INTERVAL = 0.22; // seconds between rapid strikes
export const CLONE_STRIKE_DAMAGE = 0.1;    // damage per rapid strike (basic punch)
export const CLONE_STRIKE_RADIUS = 140;    // reach of each clone's rapid strikes
// Final strike scales with the blitzer's upgrade level so it grows with the run.
export const CLONE_FINAL_BASE = 5;         // base final-strike damage at level 0
export const CLONE_FINAL_PER_LEVEL = 3;    // added per blitzer upgrade level

// Blitz Storm [R] ultimate — a charge-meter ultimate (like the wizard's [G]).
// On trigger the blitzer streaks out from his position in 8 directions in
// sequence (up, down, left, right, then the 4 diagonals) extremely fast,
// damaging every enemy hugging each streak line.
export const BLITZER_ULT_CHARGE_DAMAGE = 120; // total blitzer damage dealt to fill the meter
export const ULT_DASH_TIME = 0.1;            // seconds per directional streak (8 total ≈ 0.8s)
export const ULT_DASH_HIT_RADIUS = 48;       // how close an enemy must be to a streak line
export const ULT_TRAIL_FADE = 0.5;           // seconds each ultimate afterimage lingers
// Per-streak damage scales with the blitzer's upgrade level, like the clones.
export const ULT_DASH_DAMAGE_BASE = 8;       // base damage per streak at level 0
export const ULT_DASH_DAMAGE_PER_LEVEL = 4;  // added per blitzer upgrade level

// After the storm finishes, the afterimages left at each dash endpoint shatter,
// dealing one-time AoE damage to enemies near each ghost (also upgrade-scaled).
export const ULT_GHOST_SHATTER_RADIUS = 95;          // AoE reach of each shatter
export const ULT_GHOST_SHATTER_DAMAGE_BASE = 10;     // base shatter damage at level 0
export const ULT_GHOST_SHATTER_DAMAGE_PER_LEVEL = 5; // added per blitzer upgrade level
export const ULT_GHOST_SHATTER_DURATION = 0.5;       // seconds the shatter burst fades over

// Each ultimate use raises the charge required by EVERY ultimate (blitzer + wizard)
// by this fraction of its base, so repeated ults cost progressively more damage.
export const ULT_PENALTY_STEP = 0.2; // +20% required charge per afterimage shatter (8 per storm)

// Damage-number palette — normal blitzer cyan, special gold/white for the
// clones' upgrade-scaled final strike so it reads as a power spike.
export const BLITZER_DMG_COLOR = "#67E8F9";
export const CLONE_FINAL_COLOR = "#FDE68A";

// --- Edge-triggered key request bridge (same pattern as the wizard ultimate) ---
let _pendingDash = false;
let _pendingOverclock = false;
let _pendingClones = false;
let _pendingUlt = false;
export function requestDash() { _pendingDash = true; }
export function requestOverclock() { _pendingOverclock = true; }
export function requestClones() { _pendingClones = true; }
export function requestBlitzerUltimate() { _pendingUlt = true; }
export function takePendingDash(): boolean { const v = _pendingDash; _pendingDash = false; return v; }
export function takePendingOverclock(): boolean { const v = _pendingOverclock; _pendingOverclock = false; return v; }
export function takePendingClones(): boolean { const v = _pendingClones; _pendingClones = false; return v; }
export function takePendingBlitzerUltimate(): boolean { const v = _pendingUlt; _pendingUlt = false; return v; }

// Reset the bridge to a clean state — call on game init so a fresh run never
// shows the previous run's charge before the first engine tick.
export function resetBlitzerState() {
  liveBlitzerState.charge = 0;
  liveBlitzerState.barrageActive = false;
  liveBlitzerState.barragePct = 0;
  liveBlitzerState.dashCdPct = 0;
  liveBlitzerState.dashReady = true;
  liveBlitzerState.overclockCdPct = 0;
  liveBlitzerState.overclockReady = true;
  liveBlitzerState.overclockActive = false;
  liveBlitzerState.clonesCdPct = 0;
  liveBlitzerState.clonesReady = true;
  liveBlitzerState.clonesActive = false;
  liveBlitzerState.ultCharge = 0;
  liveBlitzerState.ultReady = false;
  liveBlitzerState.ultActive = false;
  // Drop any queued keypress so it can't fire on the first frame of a new run.
  _pendingDash = false;
  _pendingOverclock = false;
  _pendingClones = false;
  _pendingUlt = false;
}

export const liveBlitzerState: {
  isBlitzer: boolean;
  charge: number;        // 0..1 progress toward the six-fist barrage
  barrageActive: boolean;
  barragePct: number;    // 0..1 remaining time while the barrage is firing
  // Ability cooldown/active mirrors (cdPct: 1 = just used, 0 = ready).
  dashCdPct: number;
  dashReady: boolean;
  overclockCdPct: number;
  overclockReady: boolean;
  overclockActive: boolean;
  clonesCdPct: number;
  clonesReady: boolean;
  clonesActive: boolean;
  // Blitz Storm ultimate meter.
  ultCharge: number;     // 0..1 progress toward the multidirectional dash storm
  ultReady: boolean;     // meter full and not already storming
  ultActive: boolean;    // the 8-direction dash sequence is playing
} = {
  isBlitzer: false,
  charge: 0,
  barrageActive: false,
  barragePct: 0,
  dashCdPct: 0,
  dashReady: true,
  overclockCdPct: 0,
  overclockReady: true,
  overclockActive: false,
  clonesCdPct: 0,
  clonesReady: true,
  clonesActive: false,
  ultCharge: 0,
  ultReady: false,
  ultActive: false,
};
