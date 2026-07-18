// Shared mutable bridge between the UltimateHUD (React) and the canvas engine
// for the Wizard's "Divine Pillar" ultimate. Mirrors charge / ready / active /
// shield so the bottom bar can poll it (~16ms) without triggering per-frame
// React renders of the whole tree.

// Single source of truth for the Divine Pillar tuning — imported by both the
// engine (sequence logic) and the HUD (readouts) so they cannot drift.
export const ULT_CHARGE_DAMAGE = 300;     // total spell damage to fill the meter
export const RING_COUNT = 5;              // rune rings built before the beam
export const RING_BUILD_TIME = 0.35;      // seconds to construct each ring
export const BEAM_DURATION = 0.7;         // seconds the radiant beam flashes
export const RADIANCE_DURATION = 5;       // seconds the radiant field persists
export const RADIANCE_TOTAL_DAMAGE = 45;  // total Divine Radiance over the field
export const RADIANCE_TICK = 0.25;        // seconds between radiance damage ticks
export const SHIELD_SHOCKWAVE_DAMAGE = 20;// one-time Divine Radiance on shield break
export const SHIELD_BREAK_DURATION = 0.5; // wings-spread + shockwave animation

// Divine Radiance damage numbers read in this divine gold/white so they are
// visually distinct from normal spell damage.
export const RADIANCE_COLOR = "#FDE68A";

// Manual trigger bridge — the player presses G to fire the ultimate once full.
// Uses the same edge-trigger pattern as requestCast/takePendingCasts.
let _pendingUltimate = false;
export function requestUltimate() { _pendingUltimate = true; }
export function takePendingUltimate(): boolean {
  const v = _pendingUltimate;
  _pendingUltimate = false;
  return v;
}

// Reset the bridge to a clean state — call on game init so a fresh run never
// shows the previous run's charge before the first engine tick.
export function resetWizardUltimateState() {
  liveWizardUltimateState.charge = 0;
  liveWizardUltimateState.ready = false;
  liveWizardUltimateState.active = false;
  liveWizardUltimateState.shieldActive = false;
}

export const liveWizardUltimateState: {
  isWizard: boolean;
  charge: number;        // 0..1 progress toward Divine Pillar
  ready: boolean;        // meter full / ultimate sequence in progress
  active: boolean;       // rings → beam → radiance sequence playing
  shieldActive: boolean; // aura + wings damage immunity available
} = {
  isWizard: false,
  charge: 0,
  ready: false,
  active: false,
  shieldActive: false,
};
