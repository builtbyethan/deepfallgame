import React from "react";
import { GameState } from "../game/types";
import { testControls } from "../game/testControls";

const MAX_UPGRADE = 20;

export const TestPanel: React.FC<{
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}> = ({ gameState, setGameState }) => {
  // Re-render when slider moves; engine reads from the shared testControls module.
  const [count, setCount] = React.useState(testControls.upgradeCounts);

  const cls = gameState.selectedClass;
  if (!cls) return null;

  const updateCount = (n: number) => {
    testControls.upgradeCounts = n;
    setCount(n);
    // Keep gameState.upgradeCounts in sync so HUDs that read it stay accurate.
    setGameState(prev => ({ ...prev, upgradeCounts: n }));
  };

  const exitTest = () => {
    setGameState({
      screen: "menu",
      selectedClass: null,
      round: 1,
      coins: 0,
      playerHp: 10,
      maxHp: 10,
      bossHp: 0,
      bossMaxHp: 0,
      upgradeCounts: 0,
      isBossAlive: false,
      testMode: false,
    });
  };

  // Describe the current upgrade effect.
  let effect = "";
  if (cls === "blitzer") {
    const interval = 0.1 * Math.pow(0.9, count);
    const rate = (1 / interval).toFixed(1);
    effect = `Attack every ${interval.toFixed(3)}s (${rate}/s)`;
  } else if (cls === "brute") {
    effect = `${3 + count} damage per slam`;
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto bg-background/95 border-4 border-foreground px-6 py-4 min-w-[480px]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold tracking-widest text-primary">TEST MODE — {cls.toUpperCase()}</span>
        <button
          onClick={exitTest}
          className="px-3 py-1 text-xs font-bold tracking-widest border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors cursor-pointer"
        >
          EXIT TEST
        </button>
      </div>

      {cls === "wizard" ? (
        <div className="text-center text-sm text-card-foreground">
          All 5 spells unlocked. Press <span className="font-bold text-accent">1</span>–<span className="font-bold text-accent">5</span> to cast.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-muted-foreground w-24 text-right">UPGRADE LV</span>
            <input
              type="range"
              min={0}
              max={MAX_UPGRADE}
              step={1}
              value={count}
              onChange={(e) => updateCount(parseInt(e.target.value, 10))}
              className="flex-1 cursor-pointer accent-primary"
            />
            <span className="text-lg font-bold text-primary w-10 text-center">{count}</span>
          </div>
          <div className="text-center text-xs text-muted-foreground mt-2">{effect}</div>
        </>
      )}
    </div>
  );
};
