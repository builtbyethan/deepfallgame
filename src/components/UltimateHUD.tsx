import React from "react";
import { liveWizardUltimateState } from "../game/wizardUltimateState";

// Bottom-center horizontal "Divine Pillar" bar for the Wizard. Fills as the
// wizard deals spell damage and pulses gold while the ultimate is ready /
// firing. Sits well above the test-mode panel so the two never overlap.
export const UltimateHUD: React.FC = () => {
  // ~60 fps poll so the bar animates smoothly.
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const id = window.setInterval(force, 16);
    return () => window.clearInterval(id);
  }, []);

  if (!liveWizardUltimateState.isWizard) return null;

  const ready = liveWizardUltimateState.ready;
  const shield = liveWizardUltimateState.shieldActive;
  const pct = Math.max(0, Math.min(1, liveWizardUltimateState.charge));

  const glowing = ready || pct >= 1 || shield;
  const fillColor = glowing ? "#FDE047" : "#FBBF24";
  const glowColor = "#FEF3C7";
  const borderColor = glowing ? "#FDE047" : "#92400E";

  const full = pct >= 1 && !ready && !shield;
  let caption: string;
  if (shield) caption = "DIVINE SHIELD";
  else if (ready) caption = "UNLEASHING";
  else if (full) caption = "[G] READY";
  else caption = `${Math.round(pct * 100)}%`;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 pointer-events-none select-none"
      style={{ bottom: 168 }}
    >
      {/* Label */}
      <span
        className="text-[11px] font-bold tracking-widest"
        style={{ color: glowing ? "#FDE047" : "#FCD34D" }}
      >
        DIVINE PILLAR
      </span>

      {/* Bar track */}
      <div
        className="relative h-5 w-72 border-4 overflow-hidden"
        style={{
          borderColor,
          backgroundColor: "rgba(0,0,0,0.65)",
          boxShadow: glowing ? `0 0 14px ${glowColor}` : "none",
          transition: "box-shadow 0.15s",
        }}
      >
        {/* Fill (left → right) */}
        <div
          className="absolute top-0 bottom-0 left-0"
          style={{
            width: `${(shield ? 1 : pct) * 100}%`,
            backgroundColor: fillColor,
            boxShadow: `0 0 10px ${glowColor}`,
            animation: glowing ? "divinePulse 0.5s ease-in-out infinite" : "none",
            transition: glowing ? "none" : "width 0.1s linear",
          }}
        />

        {/* Tick marks: quarters for a readable scale */}
        {[0.25, 0.5, 0.75].map(t => (
          <div
            key={t}
            className="absolute top-0 bottom-0"
            style={{ left: `${t * 100}%`, width: 2, backgroundColor: "rgba(0,0,0,0.5)" }}
          />
        ))}
      </div>

      {/* Caption */}
      <span
        className="text-[10px] font-bold"
        style={{ color: glowing ? "#FDE047" : "#FCD34D" }}
      >
        {caption}
      </span>

      <style>{`
        @keyframes divinePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>
    </div>
  );
};
