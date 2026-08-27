import React from "react";
import { liveBruteState, ABILITIES_UNLOCK_ROUND } from "../game/bruteState";

// Bottom-left ability chip showing a key letter + name and its cooldown state.
// readiness 0..1 fills bottom-up (1 = ready). `active` pulses it for the
// Shoulder Charge rush and the Berserker Rage fury window. Styled to match the
// Blitzer's chips but in the brute's red/gold palette.
const AbilityChip: React.FC<{
  label: string;
  name: string;
  readiness: number;
  ready: boolean;
  active: boolean;
  locked?: boolean;
}> = ({ label, name, readiness, ready, active, locked }) => {
  if (locked) {
    return (
      <div className="flex flex-col items-center gap-1" style={{ opacity: 0.4 }}>
        <div
          className="relative w-12 h-12 border-4 overflow-hidden flex items-center justify-center"
          style={{ borderColor: "#450a0a", backgroundColor: "rgba(0,0,0,0.65)" }}
        >
          <span className="relative text-lg font-bold leading-none" style={{ color: "#450a0a", textShadow: "1px 1px 0 #000" }}>
            {label}
          </span>
        </div>
        <span className="text-[9px] font-bold tracking-widest" style={{ color: "#7F1D1D" }}>
          R{ABILITIES_UNLOCK_ROUND}
        </span>
      </div>
    );
  }

  const lit = ready || active;
  const fillColor = active ? "#FBBF24" : "#EF4444";
  const borderColor = active ? "#FBBF24" : lit ? "#EF4444" : "#7F1D1D";
  const textColor = active ? "#FCD34D" : lit ? "#FCA5A5" : "#7F1D1D";

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative w-12 h-12 border-4 overflow-hidden flex items-center justify-center"
        style={{
          borderColor,
          backgroundColor: "rgba(0,0,0,0.65)",
          boxShadow: lit ? `0 0 12px ${fillColor}90` : "none",
          transition: "box-shadow 0.15s, border-color 0.15s",
        }}
      >
        {/* Cooldown refill (bottom-up) */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: `${Math.max(0, Math.min(1, readiness)) * 100}%`,
            backgroundColor: fillColor,
            opacity: active ? 0.9 : 0.55,
            boxShadow: `0 0 8px ${fillColor}`,
            animation: active ? "brutePulse 0.4s ease-in-out infinite" : "none",
            transition: active ? "none" : "height 0.08s linear",
          }}
        />
        {/* Key letter */}
        <span
          className="relative text-lg font-bold leading-none"
          style={{ color: lit ? "#FEF2F2" : "#FECACA", textShadow: "1px 1px 0 #000" }}
        >
          {label}
        </span>
      </div>
      <span className="text-[9px] font-bold tracking-widest" style={{ color: textColor }}>
        {active ? "ON" : name}
      </span>
    </div>
  );
};

// Right-side vertical gauge showing progress toward the brute's mega slam,
// plus a bottom-left ability readout for Shoulder Charge / Ground Quake /
// Berserker Rage. The gauge fills bottom-up (red) as hits land; when the giant
// fist is falling it flips to a pulsing gold "SMASH" state.
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
    <>
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
      </div>

      {/* Bottom-left ability readout — clear of the right gauge and the
          bottom-center test-mode panel (matches the Blitzer chip layout). */}
      <div className="absolute bottom-6 left-6 z-40 flex items-end gap-3 pointer-events-none select-none">
        <AbilityChip
          label="⇧"
          name="CHARGE"
          readiness={liveBruteState.chargeActive ? 1 : 1 - liveBruteState.chargeCdPct}
          ready={liveBruteState.chargeReady}
          active={liveBruteState.chargeActive}
          locked={!liveBruteState.abilitiesUnlocked}
        />
        <AbilityChip
          label="Q"
          name="QUAKE"
          readiness={1 - liveBruteState.quakeCdPct}
          ready={liveBruteState.quakeReady}
          active={false}
          locked={!liveBruteState.abilitiesUnlocked}
        />
        <AbilityChip
          label="E"
          name="RAGE"
          readiness={liveBruteState.rageActive ? 1 : 1 - liveBruteState.rageCdPct}
          ready={liveBruteState.rageReady}
          active={liveBruteState.rageActive}
          locked={!liveBruteState.abilitiesUnlocked}
        />
      </div>

      <style>{`
        @keyframes brutePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>
    </>
  );
};
