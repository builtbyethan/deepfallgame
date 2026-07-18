import React from "react";
import { SPELLS, SpellDef } from "../game/wizardSpells";
import { liveWizardState, requestCast } from "../game/wizardInput";

const ICON_SIZE = 36; // canvas px
const ICON_SCALE = 4; // 7 px * 4 = 28 px, centred in 36

// Draw a 7x7 sprite icon at centre of a canvas ctx.
// darkFraction (0–1): how much of the icon (from top) to draw dark.
// Coloured pixels fill from bottom up as the spell charges.
function drawIcon(
  ctx: CanvasRenderingContext2D,
  grid: (string | null)[][],
  darkFraction: number,
  locked: boolean
) {
  const rows = grid.length;
  const cols = grid[0].length;
  const w = cols * ICON_SCALE;
  const h = rows * ICON_SCALE;
  const ox = (ICON_SIZE - w) / 2;
  const oy = (ICON_SIZE - h) / 2;

  ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
  ctx.imageSmoothingEnabled = false;

  // Pixel row threshold: rows above this draw dark (on cooldown).
  const darkRows = Math.ceil(rows * darkFraction);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const color = grid[row][col];
      if (!color) continue;

      const px = ox + col * ICON_SCALE;
      const py = oy + row * ICON_SCALE;

      if (locked) {
        // Locked: uniform dark
        ctx.fillStyle = "#2a2a2a";
      } else if (row < darkRows) {
        // Still on cooldown for this row — draw muted dark version
        ctx.fillStyle = "#1e1e1e";
      } else {
        // Charged — full colour
        ctx.fillStyle = color;
      }

      ctx.fillRect(px, py, ICON_SCALE, ICON_SCALE);
    }
  }
}

interface IconCanvasProps {
  spell: SpellDef;
  cdPct: number;  // 0 = ready, 1 = just cast / full cooldown
  locked: boolean;
}

const IconCanvas: React.FC<IconCanvasProps> = ({ spell, cdPct, locked }) => {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    drawIcon(ctx, spell.icon, locked ? 1 : cdPct, locked);
  }, [spell, cdPct, locked]);

  return (
    <canvas
      ref={ref}
      width={ICON_SIZE}
      height={ICON_SIZE}
      style={{ imageRendering: "pixelated", display: "block" }}
    />
  );
};

export const SpellHUD: React.FC = () => {
  // ~60 fps poll so cooldown fills animate smoothly.
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const id = window.setInterval(force, 16);
    return () => window.clearInterval(id);
  }, []);

  if (!liveWizardState.isWizard) return null;

  return (
    <div className="absolute top-1/2 -translate-y-1/2 left-4 z-40 flex flex-col gap-3 pointer-events-auto">
      {SPELLS.map(spell => {
        const unlocked = liveWizardState.wizardSpells >= spell.unlockLevel;
        const cd = Math.max(0, liveWizardState.spellTimers[spell.id] ?? 0);
        const cdPct = cd / spell.cooldown;
        const ready = unlocked && cd <= 0;

        return (
          <button
            key={spell.id}
            onClick={() => unlocked && requestCast(spell.id)}
            disabled={!unlocked}
            title={unlocked
              ? `${spell.name} — press ${spell.key}`
              : `${spell.name} — locked`}
            className="relative w-16 h-16 border-4 flex items-center justify-center select-none"
            style={{
              borderColor: unlocked ? spell.color : "#374151",
              backgroundColor: "rgba(0,0,0,0.65)",
              opacity: unlocked ? 1 : 0.45,
              cursor: unlocked ? "pointer" : "not-allowed",
              boxShadow: ready
                ? `0 0 0 2px ${spell.color}, 0 0 14px ${spell.color}90`
                : "none",
              transition: "box-shadow 0.15s",
            }}
          >
            <IconCanvas spell={spell} cdPct={cdPct} locked={!unlocked} />

            {/* Key binding badge */}
            <span
              className="absolute -top-2 -left-2 w-5 h-5 flex items-center justify-center text-xs font-bold border-2 bg-background"
              style={{
                borderColor: unlocked ? spell.color : "#374151",
                color: unlocked ? spell.color : "#6B7280",
              }}
            >
              {spell.key}
            </span>

            {/* Cooldown seconds label */}
            {unlocked && cd > 0 && (
              <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-white/90 pointer-events-none leading-none">
                {cd.toFixed(1)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
