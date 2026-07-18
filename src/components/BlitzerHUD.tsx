import React from "react";
import { liveBlitzerState, COMBO_DURATION } from "../game/blitzerState";

// Bottom-left ability chip showing a key letter + name and its cooldown state.
// readiness 0..1 fills bottom-up (1 = ready). `active` pulses it for the
// Overclock / Phantom Clones power windows.
const AbilityChip: React.FC<{
  label: string;
  name: string;
  readiness: number;
  ready: boolean;
  active: boolean;
}> = ({ label, name, readiness, ready, active }) => {
  const lit = ready || active;
  const fillColor = active ? "#FBBF24" : "#22D3EE";
  const borderColor = active ? "#FBBF24" : lit ? "#22D3EE" : "#0E7490";
  const textColor = active ? "#FCD34D" : lit ? "#67E8F9" : "#0E7490";

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
            animation: active ? "blitzerPulse 0.4s ease-in-out infinite" : "none",
            transition: active ? "none" : "height 0.08s linear",
          }}
        />
        {/* Key letter */}
        <span
          className="relative text-lg font-bold leading-none"
          style={{ color: lit ? "#F0F9FF" : "#E0F2FE", textShadow: "1px 1px 0 #000" }}
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

// Bottom-centre horizontal meter for the Blitz Storm ultimate. Fills cyan while
// charging; when full it pulses gold and prompts "[R] READY"; while the storm
// plays it reads "BLITZ STORM!". Sits above the bottom-centre test-mode panel.
const BlitzStormBar: React.FC = () => {
  const charge = Math.max(0, Math.min(1, liveBlitzerState.ultCharge));
  const ready = liveBlitzerState.ultReady;
  const active = liveBlitzerState.ultActive;
  const hot = ready || active;
  const fillColor = hot ? "#FBBF24" : "#22D3EE";
  const glow = hot ? "#FBBF24" : "#67E8F9";
  const borderColor = hot ? "#FBBF24" : "#0E7490";

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 pointer-events-none select-none"
      style={{ bottom: 168 }}
    >
      <span
        className="text-[10px] font-bold tracking-widest"
        style={{ color: hot ? "#FCD34D" : "#67E8F9" }}
      >
        {active ? "BLITZ STORM!" : ready ? "[R] BLITZ STORM" : "BLITZ STORM"}
      </span>
      <div
        className="relative w-64 h-4 border-4 overflow-hidden"
        style={{
          borderColor,
          backgroundColor: "rgba(0,0,0,0.65)",
          boxShadow: hot ? `0 0 14px ${glow}90` : "none",
          transition: "box-shadow 0.15s, border-color 0.15s",
        }}
      >
        <div
          className="absolute top-0 bottom-0 left-0"
          style={{
            width: `${(active ? 1 : charge) * 100}%`,
            backgroundColor: fillColor,
            boxShadow: `0 0 10px ${glow}`,
            animation: hot ? "blitzerPulse 0.4s ease-in-out infinite" : "none",
            transition: active ? "none" : "width 0.08s linear",
          }}
        />
      </div>
      <span className="text-[10px] font-bold" style={{ color: hot ? "#FCD34D" : "#67E8F9" }}>
        {active ? "ON" : ready ? "READY" : `${Math.round(charge * 100)}%`}
      </span>
    </div>
  );
};

// Right-side vertical gauge showing progress toward the six-fist barrage, plus
// a bottom-left ability readout for Lightning Dash / Overclock / Phantom Clones.
// While charging the gauge fills bottom-up (cyan). When the barrage is firing it
// flips to a hot pulsing gold that drains as the 5 s window runs out.
export const BlitzerHUD: React.FC = () => {
  // ~60 fps poll so the bars animate smoothly.
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const id = window.setInterval(force, 16);
    return () => window.clearInterval(id);
  }, []);

  if (!liveBlitzerState.isBlitzer) return null;

  const active = liveBlitzerState.barrageActive;
  const fill = active ? liveBlitzerState.barragePct : liveBlitzerState.charge;
  const pct = Math.max(0, Math.min(1, fill));

  const fillColor = active ? "#FBBF24" : "#22D3EE";
  const glowColor = active ? "#FBBF24" : "#67E8F9";
  const borderColor = active ? "#FBBF24" : "#0E7490";

  return (
    <>
      <div className="absolute top-1/2 -translate-y-1/2 right-4 z-40 flex flex-col items-center gap-2 pointer-events-none select-none">
        {/* Label */}
        <span
          className="text-[10px] font-bold tracking-widest"
          style={{ color: active ? "#FCD34D" : "#67E8F9" }}
        >
          {active ? "BARRAGE" : "FISTS"}
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
              // Pulse the barrage fill; charge fill stays steady for a crisp read.
              animation: active ? "blitzerPulse 0.4s ease-in-out infinite" : "none",
              transition: active ? "none" : "height 0.08s linear",
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

        {/* Ready / countdown caption */}
        <span
          className="text-[10px] font-bold"
          style={{ color: active ? "#FCD34D" : "#67E8F9" }}
        >
          {active ? `${(liveBlitzerState.barragePct * COMBO_DURATION).toFixed(1)}s` : `${Math.round(pct * 100)}%`}
        </span>
      </div>

      {/* Bottom-left ability readout — clear of the right gauge and the
          bottom-center test-mode panel. */}
      <div className="absolute bottom-6 left-6 z-40 flex items-end gap-3 pointer-events-none select-none">
        <AbilityChip
          label="⇧"
          name="DASH"
          readiness={1 - liveBlitzerState.dashCdPct}
          ready={liveBlitzerState.dashReady}
          active={false}
        />
        <AbilityChip
          label="Q"
          name="O.CLOCK"
          readiness={liveBlitzerState.overclockActive ? 1 : 1 - liveBlitzerState.overclockCdPct}
          ready={liveBlitzerState.overclockReady}
          active={liveBlitzerState.overclockActive}
        />
        <AbilityChip
          label="E"
          name="PHANTOM"
          readiness={liveBlitzerState.clonesActive ? 1 : 1 - liveBlitzerState.clonesCdPct}
          ready={liveBlitzerState.clonesReady}
          active={liveBlitzerState.clonesActive}
        />
      </div>

      {/* Blitz Storm ultimate meter — bottom-centre, above the test-mode panel. */}
      <BlitzStormBar />

      <style>{`
        @keyframes blitzerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>
    </>
  );
};
