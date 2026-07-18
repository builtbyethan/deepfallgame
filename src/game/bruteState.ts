// Shared mutable bridge between the BruteHUD (React) and the canvas engine.
// Mirrors the brute's mega-slam charge so the side bar can poll it without
// triggering per-frame React renders of the whole tree.

// Single source of truth for the mega-slam tuning — imported by both the
// engine (charge logic) and the HUD so they cannot drift.
export const HITS_TO_CHARGE = 10;       // landed brute hits needed to fill the bar
export const MEGA_DAMAGE_MULT = 1.5;    // multiplier on current brute damage, dealt to all enemies
export const MEGA_DROP_DURATION = 0.9;  // seconds the giant fist takes to fall
export const MEGA_IMPACT_DURATION = 0.5; // seconds the impact shockwave lingers

// Reset the bridge to a clean state — call on game init so a fresh run never
// shows the previous run's charge before the first engine tick.
export function resetBruteState() {
  liveBruteState.charge = 0;
  liveBruteState.slamActive = false;
}

export const liveBruteState: {
  isBrute: boolean;
  charge: number;      // 0..1 progress toward the mega slam
  slamActive: boolean; // true while the giant fist is falling / impacting
} = {
  isBrute: false,
  charge: 0,
  slamActive: false,
};
