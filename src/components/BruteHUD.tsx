import React from "react";
import { liveBruteState } from "../game/bruteState";

// Right-side vertical gauge showing progress toward the brute's mega slam.
// Fills bottom-up (red) as hits land. When the giant fist is falling it flips
// to a pulsing gold "SMASH" state.
export const BruteHUD: React.FC = () => {
  // ~60 fps poll so the bar animates smoothly.
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const id = window.setInterval(force, 16);
    return () => window.clearInterval(id);
  }, []);

  if (!liveBruteState.isBrute) return null;

  const active = liveBruteState.slamActive;
  const pct = active ? 1 : Math.max(0, Math.min(1, liveBruteState.charge));

  const fillColor = active ? "#FBBF24" : "#EF4444";
  const glowColor = active ? "#FBBF24" : "#FCA5A5";
  const borderColor = active ? "#FBBF24" : "#7F1D1D";

  return (
    <div className="absolute top-1/2 -translate-y-1/2 right-4 z-40 flex flex-col items-center gap-2 pointer-events-none select-none">
      {/* Label */}
      <span
        className="text-[10px] font-bold tracking-widest"
        style={{ color: active ? "#FCD34D" : "#FCA5A5" }}
      >
        {active ? "SMASH" : "SLAM"}
      </span>

      {/* Gauge track */}
      <div
        className="relative w-7 h-56 border-4 overflow-hidden"
        style={{
          borderColor,
          backgroundColor: "rgba(0,0,0,0.65)",
          boxShadow: pct >= 1 || active ? `0 0 14px ${glowColor}90` : "none",
          transition: "box-shadow 0.15s",
        }}
      >
        {/* Fill (bottom-up) */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: `${pct * 100}%`,
            backgroundColor: fillColor,
            boxShadow: `0 0 10px ${glowColor}`,
            // Pulse while the slam is firing; charge fill stays steady.
            animation: active ? "brutePulse 0.4s ease-in-out infinite" : "none",
            transition: active ? "none" : "height 0.12s linear",
          }}
        />

        {/* Tick marks: quarters of the charge bar for a readable scale */}
        {[0.25, 0.5, 0.75].map(t => (
          <div
            key={t}
            className="absolute left-0 right-0"
            style={{
              bottom: `${t * 100}%`,
              height: 2,
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          />
        ))}
      </div>

      {/* Ready / percentage caption */}
      <span
        className="text-[10px] font-bold"
        style={{ color: active ? "#FCD34D" : "#FCA5A5" }}
      >
        {active ? "READY" : `${Math.round(pct * 100)}%`}
      </span>

      <style>{`
        @keyframes brutePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>
    </div>
  );
};
