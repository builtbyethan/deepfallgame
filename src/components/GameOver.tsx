import React from "react";
import { GameState } from "../game/types";

export const GameOver: React.FC<{ gameState: GameState, setGameState: React.Dispatch<React.SetStateAction<GameState>> }> = ({ gameState, setGameState }) => {
  const backToMenu = () => {
    setGameState(prev => ({
      ...prev,
      screen: "menu",
    }));
  };

  return (
    <div className="absolute inset-0 bg-background/95 z-50 flex flex-col items-center justify-center p-8 border-8 border-destructive m-8">
      <h2 className="text-6xl text-destructive font-bold mb-4 tracking-widest text-center animate-pulse">GAME OVER</h2>
      <p className="text-xl text-muted-foreground mb-12">THE SWARM CONSUMED YOU</p>
      
      <div className="flex flex-col gap-4 text-2xl mb-12 bg-card border-4 border-border p-8 w-full max-w-md text-center">
        <div className="text-card-foreground">ROUNDS SURVIVED: <span className="text-primary font-bold">{gameState.round}</span></div>
        <div className="text-card-foreground">COINS COLLECTED: <span className="text-accent font-bold">{gameState.coins}</span></div>
      </div>

      <button 
        onClick={backToMenu}
        className="py-4 px-12 bg-background border-4 border-foreground text-foreground text-2xl font-bold hover:bg-foreground hover:text-background transition-colors cursor-pointer tracking-wider"
      >
        BACK TO MENU
      </button>
    </div>
  );
};
