// Shared mutable bridge between SpellHUD (React) and the canvas engine.
// Avoids prop-drilling refs and per-frame React renders for cooldown UI.

import { SPELLS } from "./wizardSpells";

const pendingCasts = new Set<string>();

export function requestCast(spellId: string) {
  pendingCasts.add(spellId);
}

export function takePendingCasts(): Set<string> {
  if (pendingCasts.size === 0) return new Set();
  const snapshot = new Set(pendingCasts);
  pendingCasts.clear();
  return snapshot;
}

// Live snapshot the HUD polls (~60ms) to render cooldown overlays.
export const liveWizardState: {
  spellTimers: Record<string, number>;
  wizardSpells: number;
  isWizard: boolean;
} = {
  spellTimers: SPELLS.reduce((acc, s) => { acc[s.id] = 0; return acc; }, {} as Record<string, number>),
  wizardSpells: 0,
  isWizard: false,
};
