// Spell metadata for the Wizard class — keys, cooldowns, colors, icons.
// Used by the engine (cast logic) and SpellHUD (left-side button strip).

export interface SpellDef {
  id: "fireball" | "thunderbolt" | "iceshard" | "waterwave" | "arcaneorb";
  name: string;
  key: string;             // single character key binding ("1".."5")
  unlockLevel: number;     // requires wizardSpells >= unlockLevel
  cooldown: number;        // seconds
  color: string;           // accent color for the button border
  icon: (string | null)[][];
}

// 7x7 pixel icons — drawn at scale 4 in the HUD (28x28).
const _ = null;

// Fireball — orange/red flame
const Fd = "#7F1D1D", Fm = "#F97316", Fl = "#FBBF24";
const FIRE_ICON: (string | null)[][] = [
  [_, _, _, Fl, _, _, _],
  [_, _, Fl, Fm, Fl, _, _],
  [_, _, Fm, Fm, Fm, _, _],
  [_, Fm, Fm, Fd, Fm, Fm, _],
  [_, Fm, Fd, Fd, Fd, Fm, _],
  [_, _, Fd, Fd, Fd, _, _],
  [_, _, _, Fd, _, _, _],
];

// Thunderbolt — yellow zigzag
const Td = "#92400E", Tm = "#FBBF24";
const BOLT_ICON: (string | null)[][] = [
  [_, _, _, _, Tm, Tm, _],
  [_, _, _, Tm, Tm, Td, _],
  [_, _, Tm, Tm, Td, _, _],
  [_, Tm, Tm, Tm, Tm, _, _],
  [_, _, _, Tm, Tm, _, _],
  [_, _, Tm, Tm, _, _, _],
  [_, Tm, Tm, _, _, _, _],
];

// Iceshard — cyan diamond
const Id = "#155E75", Im = "#22D3EE", Il = "#A5F3FC";
const ICE_ICON: (string | null)[][] = [
  [_, _, _, Id, _, _, _],
  [_, _, Id, Im, Id, _, _],
  [_, Id, Im, Il, Im, Id, _],
  [Id, Im, Il, Il, Il, Im, Id],
  [_, Id, Im, Il, Im, Id, _],
  [_, _, Id, Im, Id, _, _],
  [_, _, _, Id, _, _, _],
];

// Waterwave — blue ring
const Wd = "#1E3A8A", Wm = "#3B82F6", Wl = "#93C5FD";
const WAVE_ICON: (string | null)[][] = [
  [_, _, Wd, Wd, Wd, _, _],
  [_, Wd, Wm, Wm, Wm, Wd, _],
  [Wd, Wm, Wl, _, Wl, Wm, Wd],
  [Wd, Wm, _, _, _, Wm, Wd],
  [Wd, Wm, Wl, _, Wl, Wm, Wd],
  [_, Wd, Wm, Wm, Wm, Wd, _],
  [_, _, Wd, Wd, Wd, _, _],
];

// Arcaneorb — purple orb
const Ad = "#581C87", Am = "#A855F7", Al = "#D8B4FE";
const ORB_ICON: (string | null)[][] = [
  [_, _, Ad, Ad, Ad, _, _],
  [_, Ad, Am, Am, Am, Ad, _],
  [Ad, Am, Al, Al, Am, Am, Ad],
  [Ad, Am, Al, Am, Am, Am, Ad],
  [Ad, Am, Am, Am, Am, Am, Ad],
  [_, Ad, Am, Am, Am, Ad, _],
  [_, _, Ad, Ad, Ad, _, _],
];

export const SPELLS: SpellDef[] = [
  { id: "fireball",    name: "Fireball",    key: "1", unlockLevel: 0, cooldown: 1.5, color: "#F97316", icon: FIRE_ICON },
  { id: "thunderbolt", name: "Thunderbolt", key: "2", unlockLevel: 1, cooldown: 2.0, color: "#FBBF24", icon: BOLT_ICON },
  { id: "iceshard",    name: "Iceshard",    key: "3", unlockLevel: 2, cooldown: 3.0, color: "#22D3EE", icon: ICE_ICON },
  { id: "waterwave",   name: "Waterwave",   key: "4", unlockLevel: 3, cooldown: 4.0, color: "#3B82F6", icon: WAVE_ICON },
  { id: "arcaneorb",   name: "Arcane Orb",  key: "5", unlockLevel: 4, cooldown: 5.0, color: "#A855F7", icon: ORB_ICON },
];

export const SPELL_BY_KEY: Record<string, SpellDef> = SPELLS.reduce((acc, s) => {
  acc[s.key] = s;
  return acc;
}, {} as Record<string, SpellDef>);
