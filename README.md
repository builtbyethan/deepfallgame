# Deepfall — Dungeon Delve

A fast-paced 2D pixel-art **roguelike arena survival** game. Pick a class, drop into
the dungeon, and survive escalating rounds of enemies and bosses — earning coins to
upgrade and unlock abilities between every round.

Built with **React + TypeScript + Vite**, rendered on an HTML5 **Canvas**, with sound
driven by the **Web Audio API** (no audio files — everything is synthesized in-browser).

---

## Gameplay

You control a single hero in an open arena. Enemies stream in each round; clear them to
advance. Every few rounds a **boss** appears with a dedicated health bar. Defeated enemies
drop **coins**, which you spend in the **Upgrade Shop** between rounds. Take too many hits
and it's game over — but your progress can be saved and resumed.

- **Start HP:** 10 for every class
- **Loop:** survive a round → shop/upgrade → next round → boss fights along the way
- **Goal:** get as deep as you can

### Classes

Each class plays completely differently and has its own upgrade path and ultimate.

| Class | Color | Playstyle |
|-------|-------|-----------|
| **Blitzer** ⚡ | cyan | Lightning-quick auto-attacker — strikes **10×/second** for 0.1 dmg each. Upgrade **attack speed**. Loaded with mobility/tempo abilities. |
| **Brute** 💥 | red | Heavy hitter — **smashes the 3 nearest enemies for 3 dmg every 3 seconds**. Upgrade **damage**. Builds toward a mega slam. |
| **Wizard** 🔮 | purple | Arcane caster — hurls spells with burn/slow effects. **Unlock new spells** between rounds. |

### Abilities & ultimates

- **Blitzer:** Lightning Dash, Overclock (brief slow-motion), Phantom Clones, and the
  **Blitz Storm** ultimate. Ultimate charge builds from damage dealt and carries over
  between rounds.
- **Wizard spells** (unlock in order): **Fireball → Thunderbolt → Iceshard → Waterwave →
  Arcane Orb**, plus the **Divine Pillar** ultimate.
- **Ultimate cost scales:** each ultimate you use raises the charge required for the next
  one, for the rest of the run — so time them well.

---

## Controls

| Input | Action |
|-------|--------|
| **W A S D** / **Arrow keys** | Move |
| **1 – 5** | Cast Wizard spells (once unlocked) |
| **G** | Fire the Wizard's **Divine Pillar** ultimate (when charged) |
| **Shift** | Blitzer **Lightning Dash** |
| **Q** | Blitzer **Overclock** (slow-mo) |
| **E** | Blitzer **Phantom Clones** |
| **R** | Blitzer **Blitz Storm** ultimate (when charged) |
| 🔊 button (bottom-right) | Toggle mute |

Basic attacks are **automatic** — position yourself well and manage your abilities.

---

## Saving

Progress is saved locally in your browser (`localStorage`) across **3 save slots**. Each
slot records your class, round, coins, HP, and upgrades, so you can pick up a run later
from the **Saves** screen.

---

## Running the game

This project runs both **locally (Claude Code / any machine)** and on **Replit** from the
same codebase.

### Local

```bash
npm install
npm run dev      # → http://localhost:5173
```

Other scripts:

```bash
npm run build      # production build → dist/public
npm run serve      # preview the production build
npm run typecheck  # TypeScript check, no emit
```

### Replit

Open the repo as a Repl and hit **Run** — `.replit` / `replit.nix` configure install and
start automatically. Replit-only dev plugins (error overlay, cartographer, dev banner)
load only inside a Repl (detected via the `REPL_ID` env var) and stay dormant locally.

---

## Tech stack

- **React 18** + **TypeScript**
- **Vite 6** (dev server + build)
- **Tailwind CSS v4** + Radix UI / shadcn-style components (menus, HUD, shop)
- **HTML5 Canvas 2D** for all in-game rendering (pixel-art, nearest-neighbor scaling)
- **Web Audio API** for procedurally generated music and SFX

## Project structure

```
src/
  App.tsx            # screen router (menu / game / shop / gameover / saves)
  game/
    engine.ts        # core game loop, movement, combat, rendering
    GameCanvas.tsx   # canvas mount + input handling
    types.ts         # GameState, Player, Enemy, etc.
    classes.ts       # class definitions + upgrade costs
    wizardSpells.ts  # spell definitions & keybindings
    saves.ts         # localStorage save slots
    audio.ts         # Web Audio synthesis
    sprites.ts       # pixel-art sprite data
  components/         # HUDs, main menu, upgrade shop, game over, save screen
  components/ui/      # shared UI primitives
```
