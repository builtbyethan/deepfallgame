import React, { useState, useEffect, useRef } from "react";
import { GameState } from "./game/types";
import { MainMenu } from "./components/MainMenu";
import { GameCanvas } from "./game/GameCanvas";
import { UpgradeShop } from "./components/UpgradeShop";
import { GameOver } from "./components/GameOver";
import { HUD } from "./components/HUD";
import { SpellHUD } from "./components/SpellHUD";
import { BlitzerHUD } from "./components/BlitzerHUD";
import { BruteHUD } from "./components/BruteHUD";
import { UltimateHUD } from "./components/UltimateHUD";
import { TestPanel } from "./components/TestPanel";
import { SaveScreen } from "./components/SaveScreen";
import { setMuted, isMuted, sfxBossSpawn } from "./game/audio";

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    screen: "menu",
    selectedClass: null,
    round: 1,
    coins: 0,
    playerHp: 10,
    maxHp: 10,
    bossHp: 0,
    bossMaxHp: 0,
    upgradeCounts: 0,
    isBossAlive: false
  });

  const prevBossAlive = useRef(false);
  useEffect(() => {
    if (gameState.isBossAlive && !prevBossAlive.current) sfxBossSpawn();
    prevBossAlive.current = gameState.isBossAlive;
  }, [gameState.isBossAlive]);

  const [muted, setMutedState] = useState(false);
  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  };

  return (
    <div className="w-full h-screen relative bg-background overflow-hidden selection:bg-primary selection:text-primary-foreground">
      {gameState.screen === "menu" && <MainMenu setGameState={setGameState} />}
      
      {(gameState.screen === "game" || gameState.screen === "shop" || gameState.screen === "gameover" || gameState.screen === "saves") && (
        <>
          <GameCanvas gameState={gameState} setGameState={setGameState} />
          <HUD gameState={gameState} />
          {gameState.screen === "game" && gameState.selectedClass === "wizard" && <SpellHUD />}
          {gameState.screen === "game" && gameState.selectedClass === "wizard" && <UltimateHUD />}
          {gameState.screen === "game" && gameState.selectedClass === "blitzer" && <BlitzerHUD />}
          {gameState.screen === "game" && gameState.selectedClass === "brute" && <BruteHUD />}
          {gameState.screen === "game" && gameState.testMode && (
            <TestPanel gameState={gameState} setGameState={setGameState} />
          )}
        </>
      )}

      {gameState.screen === "shop" && <UpgradeShop gameState={gameState} setGameState={setGameState} />}
      {gameState.screen === "gameover" && <GameOver gameState={gameState} setGameState={setGameState} />}
      {gameState.screen === "saves" && <SaveScreen gameState={gameState} setGameState={setGameState} />}

      {/* Mute toggle — visible on all screens except the main menu */}
      {gameState.screen !== "menu" && (
        <button
          onClick={toggleMute}
          title={muted ? "Unmute" : "Mute"}
          className="fixed bottom-4 right-4 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 border border-white/20 text-white text-sm hover:bg-black/80 transition-colors select-none"
           style={{ fontFamily: "Quicksand, sans-serif" }}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      )}
    </div>
  );
}
