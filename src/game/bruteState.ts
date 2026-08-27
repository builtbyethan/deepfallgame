// Shared mutable bridge between the BruteHUD (React) and the canvas engine.
// Mirrors the brute's mega-slam charge so the side bar can poll it without
// triggering per-frame React renders of the whole tree.

// Single source of truth for the mega-slam tuning — imported by both the
// engine (charge logic) and the HUD so they cannot drift.
export const HITS_TO_CHARGE = 10;       // landed brute hits needed to fill the bar
export const MEGA_DAMAGE_MULT = 1.5;    // multiplier on current brute damage, dealt to all enemies
export const MEGA_DROP_DURATION = 0.9;  // seconds the giant fist takes to fall
export const MEGA_IMPACT_DURATION = 0.5; // seconds the impact shockwave lingers

// --- Active ability tuning (single source of truth, imported by engine + HUD) ---
// Shoulder Charge [SHIFT] — short rush in the movement direction that damages
// and knocks back every enemy plowed through.
export const CHARGE_COOLDOWN = 18;     // seconds between charges (long — the clash QTE is the payoff)
export const CHARGE_DURATION = 0.22;   // seconds the rush lasts
export const CHARGE_SPEED = 900;       // px/sec while rushing (≈200px total)
export const CHARGE_DAMAGE = 4;        // one-time damage to enemies plowed through
export const CHARGE_HIT_RADIUS = 40;   // how close an enemy must be to the brute mid-rush
export const CHARGE_KNOCKBACK = 90;    // pixels enemies are shoved along the rush direction

// Clash QTE — when the charge connects, the world freezes and a shrinking
// timing window appears. Press SPACE inside the window for a boosted resolve.
export const CLASH_WINDOW = 0.9;          // seconds the QTE window lasts (timeout = miss)
export const CLASH_DAMAGE_MULT = 4;       // PERFECT: CHARGE_DAMAGE × this to every clashed enemy
export const CLASH_KNOCKBACK = 340;       // PERFECT: pixels clashed enemies are sent flying
export const CLASH_GOOD_DAMAGE_MULT = 2;  // GOOD (early press): CHARGE_DAMAGE × this
export const CLASH_GOOD_KNOCKBACK = 200;  // GOOD (early press): pixels clashed enemies are sent flying
export const CLASH_PERFECT_ZONE = 0.18;   // timing-ring progress (0..1) at or below which = PERFECT
export const CLASH_MISS_CD_FRACTION = 0.5;// miss: cooldown restarts at this fraction of full
export const CLASH_RESULT_LINGER = 0.45;  // seconds the result flash lingers on screen

// Ground Quake [Q] — a stomp that damages and briefly roots everything nearby.
export const QUAKE_COOLDOWN = 9;       // seconds between stomps
export const QUAKE_RADIUS = 180;       // AoE reach around the brute
export const QUAKE_DAMAGE = 5;         // damage to every enemy in the radius
export const QUAKE_PARALYZE = 1.5;     // seconds enemies stay rooted
export const QUAKE_RING_DURATION = 0.5;// seconds the shockwave ring visual lingers

// Berserker Rage [E] — fury window: faster auto-smash swings + bonus damage.
export const RAGE_COOLDOWN = 16;         // seconds between rages
export const RAGE_DURATION = 6;          // seconds the fury lasts
export const RAGE_ATTACK_INTERVAL_MULT = 0.45; // auto-smash interval multiplier (≈2.2x faster)
export const RAGE_DAMAGE_MULT = 1.5;     // auto-smash damage multiplier while raging

// Damage-number palette for the brute's active abilities.
export const BRUTE_ABILITY_COLOR = "#FCA5A5";

// --- Edge-triggered key request bridge (same pattern as the blitzer kit) ---
let _pendingCharge = false;
let _pendingQuake = false;
let _pendingRage = false;
let _pendingClashHit = false;
export function requestCharge() { _pendingCharge = true; }
export function requestQuake() { _pendingQuake = true; }
export function requestRage() { _pendingRage = true; }
// QTE keypress (SPACE) — only queued by GameCanvas while a clash is active, and
// only consumed by the engine inside the clash window, so stray presses are inert.
export function requestClashHit() { _pendingClashHit = true; }
export function takePendingCharge(): boolean { const v = _pendingCharge; _pendingCharge = false; return v; }
export function takePendingQuake(): boolean { const v = _pendingQuake; _pendingQuake = false; return v; }
export function takePendingRage(): boolean { const v = _pendingRage; _pendingRage = false; return v; }
export function takePendingClashHit(): boolean { const v = _pendingClashHit; _pendingClashHit = false; return v; }

// Reset the bridge to a clean state — call on game init so a fresh run never
// shows the previous run's charge before the first engine tick.
export function resetBruteState() {
  liveBruteState.charge = 0;
  liveBruteState.slamActive = false;
  liveBruteState.abilitiesUnlocked = false;
  liveBruteState.chargeCdPct = 0;
  liveBruteState.chargeReady = true;
  liveBruteState.chargeActive = false;
  liveBruteState.quakeCdPct = 0;
  liveBruteState.quakeReady = true;
  liveBruteState.rageCdPct = 0;
  liveBruteState.rageReady = true;
  liveBruteState.rageActive = false;
  liveBruteState.clashActive = false;
  liveBruteState.clashProgress = 0;
  liveBruteState.clashResult = null;
  // Drop any queued keypress so it can't fire on the first frame of a new run.
  _pendingCharge = false;
  _pendingQuake = false;
  _pendingRage = false;
  _pendingClashHit = false;
}

export const ABILITIES_UNLOCK_ROUND = 10; // abilities are locked before this round

export const liveBruteState: {
  isBrute: boolean;
  charge: number;      // 0..1 progress toward the mega slam
  slamActive: boolean; // true while the giant fist is falling / impacting
  abilitiesUnlocked: boolean; // true once round >= ABILITIES_UNLOCK_ROUND
  // Ability cooldown/active mirrors (cdPct: 1 = just used, 0 = ready).
  chargeCdPct: number;
  chargeReady: boolean;
  chargeActive: boolean;
  quakeCdPct: number;
  quakeReady: boolean;
  rageCdPct: number;
  rageReady: boolean;
  rageActive: boolean;
  // Clash QTE mirrors for overlays: active flag, 0..1 time remaining, last result.
  clashActive: boolean;
  clashProgress: number;
  clashResult: "perfect" | "good" | "miss" | null;
} = {
  isBrute: false,
  charge: 0,
  slamActive: false,
  abilitiesUnlocked: false,
  chargeCdPct: 0,
  chargeReady: true,
  chargeActive: false,
  quakeCdPct: 0,
  quakeReady: true,
  rageCdPct: 0,
  rageReady: true,
  rageActive: false,
  clashActive: false,
  clashProgress: 0,
  clashResult: null,
};
