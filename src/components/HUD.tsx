import React from "react";
import { GameState } from "../game/types";

export const HUD: React.FC<{ gameState: GameState }> = ({ gameState }) => {
  const hpPercent = Math.max(0, gameState.playerHp / gameState.maxHp) * 100;
  
  return (
    <div className="absolute inset-0 pointer-events-none z-40 p-4">
      {/* Top Left: HP */}
      <div className="absolute top-6 left-6 w-64">
        <div className="text-destructive font-bold mb-2 tracking-widest">HP {Math.ceil(gameState.playerHp)}/{gameState.maxHp}</div>
        <div className="w-full h-6 border-4 border-border bg-muted">
          <div className="h-full bg-destructive transition-all duration-200" style={{ width: `${hpPercent}%` }} />
        </div>
      </div>

      {/* Top Center: Round & Boss HP */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className="text-3xl font-bold text-primary tracking-widest" style={{ textShadow: "2px 2px 0 hsl(var(--border))" }}>
          ROUND {gameState.round}
        </div>
        {gameState.isBossAlive && gameState.bossMaxHp > 0 && (
          <div className="w-96 mt-4">
            <div className="text-center text-destructive font-bold mb-1 tracking-widest text-sm">BOSS</div>
            <div className="w-full h-4 border-2 border-border bg-muted">
              <div className="h-full bg-destructive transition-all duration-200" style={{ width: `${Math.max(0, gameState.bossHp / gameState.bossMaxHp) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Top Right: Coins */}
      <div className="absolute top-6 right-6 text-3xl font-bold text-accent tracking-widest flex items-center gap-3">
        {gameState.coins} COINS
      </div>
    </div>
  );
};
