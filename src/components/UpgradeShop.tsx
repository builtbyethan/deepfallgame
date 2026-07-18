import React from "react";
import { GameState } from "../game/types";
import { getUpgradeCost } from "../game/classes";
import { sfxUpgrade } from "../game/audio";

const HEAL_COST = 5;
const MAX_HP_COST = 10;
const MAX_HP_GAIN = 2;

export const UpgradeShop: React.FC<{ gameState: GameState, setGameState: React.Dispatch<React.SetStateAction<GameState>> }> = ({ gameState, setGameState }) => {
  const nextRound = () => {
    setGameState(prev => ({
      ...prev,
      screen: "game",
      round: prev.round + 1,
    }));
  };

  const cost = getUpgradeCost(gameState.selectedClass!, gameState.upgradeCounts);
  const canAfford = gameState.coins >= cost;
  const isMaxed = cost === Infinity;

  const buy = () => {
    if (canAfford && !isMaxed) {
      sfxUpgrade();
      setGameState(prev => ({
        ...prev,
        coins: prev.coins - cost,
        upgradeCounts: prev.upgradeCounts + 1
      }));
    }
  };

  const canHeal = gameState.playerHp < gameState.maxHp && gameState.coins >= HEAL_COST;
  const buyHeal = () => {
    if (canHeal) {
      sfxUpgrade();
      setGameState(prev => ({
        ...prev,
        coins: prev.coins - HEAL_COST,
        playerHp: prev.maxHp
      }));
    }
  };

  const canMaxHp = gameState.coins >= MAX_HP_COST;
  const buyMaxHp = () => {
    if (canMaxHp) {
      sfxUpgrade();
      setGameState(prev => ({
        ...prev,
        coins: prev.coins - MAX_HP_COST,
        maxHp: prev.maxHp + MAX_HP_GAIN,
        playerHp: Math.min(prev.playerHp + MAX_HP_GAIN, prev.maxHp + MAX_HP_GAIN)
      }));
    }
  };

  let upgradeName = "";
  if (gameState.selectedClass === "blitzer") upgradeName = "Attack Speed Up (-10% interval)";
  else if (gameState.selectedClass === "brute") upgradeName = "Damage Up (+1 dmg)";
  else if (gameState.selectedClass === "wizard") upgradeName = "Unlock Next Spell";

  const isFullHp = gameState.playerHp >= gameState.maxHp;

  return (
    <div className="absolute inset-0 bg-background/95 z-50 flex flex-col items-center justify-center p-8 border-8 border-border m-8">
      <h2 className="text-4xl text-primary font-bold mb-8 tracking-widest text-center">ROUND {gameState.round} CLEAR!</h2>

      <div className="text-2xl mb-8 flex items-center gap-4 text-accent font-bold">
        COINS: {gameState.coins}
      </div>

      <div className="w-full max-w-2xl border-4 border-muted p-8 flex flex-col items-center gap-6 mb-8 bg-card">
        <h3 className="text-2xl font-bold text-card-foreground text-center">UPGRADES</h3>

        {/* Class upgrade */}
        <div className="w-full flex items-center justify-between border-b-2 border-muted pb-4">
          <div>
            <div className="text-xl text-card-foreground">{upgradeName}</div>
            <div className="text-sm text-muted-foreground mt-1">Class ability</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xl text-accent">{isMaxed ? "MAXED" : `${cost} COINS`}</span>
            <button
              onClick={buy}
              disabled={!canAfford || isMaxed}
              className={`py-3 px-8 text-xl font-bold tracking-wider transition-all
                ${canAfford && !isMaxed ? 'bg-primary text-primary-foreground hover:bg-primary/80 cursor-pointer' : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'}`}
            >
              {isMaxed ? "MAX" : "BUY"}
            </button>
          </div>
        </div>

        {/* Restore HP */}
        <div className="w-full flex items-center justify-between border-b-2 border-muted pb-4">
          <div>
            <div className="text-xl text-card-foreground">
              Heal Potion
              <span className="ml-3 text-base text-muted-foreground">
                ({gameState.playerHp.toFixed(1)} / {gameState.maxHp} HP)
              </span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">Restore HP to full</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xl text-accent">{HEAL_COST} COINS</span>
            <button
              onClick={buyHeal}
              disabled={!canHeal}
              className={`py-3 px-8 text-xl font-bold tracking-wider transition-all
                ${canHeal ? 'bg-[#10B981] text-white hover:bg-[#059669] cursor-pointer' : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'}`}
            >
              {isFullHp ? "FULL" : "BUY"}
            </button>
          </div>
        </div>

        {/* Max HP upgrade */}
        <div className="w-full flex items-center justify-between">
          <div>
            <div className="text-xl text-card-foreground">Max HP +{MAX_HP_GAIN}</div>
            <div className="text-sm text-muted-foreground mt-1">Permanently increase max health</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xl text-accent">{MAX_HP_COST} COINS</span>
            <button
              onClick={buyMaxHp}
              disabled={!canMaxHp}
              className={`py-3 px-8 text-xl font-bold tracking-wider transition-all
                ${canMaxHp ? 'bg-[#EF4444] text-white hover:bg-[#DC2626] cursor-pointer' : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'}`}
            >
              BUY
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setGameState(prev => ({ ...prev, screen: "saves" }))}
          className="py-4 px-10 bg-background border-4 border-accent text-accent text-xl font-bold hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer tracking-widest"
        >
          SAVE FILES
        </button>
        <button
          onClick={nextRound}
          className="py-4 px-16 bg-background border-4 border-foreground text-foreground text-2xl font-bold hover:bg-foreground hover:text-background transition-colors cursor-pointer"
        >
          NEXT ROUND
        </button>
      </div>
    </div>
  );
};
