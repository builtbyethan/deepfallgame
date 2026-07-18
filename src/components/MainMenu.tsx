import React from "react";
import { ClassType, GameState } from "../game/types";
import { classDefinitions } from "../game/classes";
import { SPRITES, drawSprite } from "../game/sprites";
import { testControls } from "../game/testControls";

export const MainMenu: React.FC<{ setGameState: React.Dispatch<React.SetStateAction<GameState>> }> = ({ setGameState }) => {
  const start = (classType: ClassType) => {
    setGameState({
      screen: "game",
      selectedClass: classType,
      round: 1,
      coins: 0,
      playerHp: 10,
      maxHp: 10,
      bossHp: 0,
      bossMaxHp: 0,
      upgradeCounts: 0,
      isBossAlive: false
    });
  };

  const startTest = (classType: ClassType) => {
    // Wizard: instantly unlock all 5 spells (0..4). Blitzer/Brute: start at 0
    // and the slider in TestPanel lets the user pick a level live.
    testControls.upgradeCounts = classType === "wizard" ? 4 : 0;
    setGameState({
      screen: "game",
      selectedClass: classType,
      round: 1,
      coins: 0,
      playerHp: 999,
      maxHp: 999, // effectively invincible — dummy can't hurt them but feels good
      bossHp: 0,
      bossMaxHp: 0,
      upgradeCounts: testControls.upgradeCounts,
      isBossAlive: false,
      testMode: true,
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-8 relative overflow-hidden bg-background">
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0" 
           style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      <h1 className="text-6xl text-center font-bold mb-16 z-10 tracking-widest" style={{ color: "hsl(var(--primary))", textShadow: "4px 4px 0 hsl(var(--border))" }}>DUNGEON DELVE</h1>
      
      <button
        onClick={() => setGameState(prev => ({ ...prev, screen: "saves" }))}
        className="z-10 mb-8 py-3 px-10 bg-background border-4 border-accent text-accent text-xl font-bold hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer tracking-widest"
      >
        LOAD GAME
      </button>

      <div className="flex gap-8 max-w-6xl w-full z-10 flex-wrap justify-center">
        {(Object.entries(classDefinitions) as [ClassType, typeof classDefinitions[ClassType]][]).map(([key, def]) => (
          <div key={key} className="relative flex-1 min-w-[300px] border-4 p-6 flex flex-col items-center justify-between transition-transform hover:-translate-y-2 bg-card" style={{ borderColor: def.color }}>
            <button
              onClick={(e) => { e.stopPropagation(); startTest(key); }}
              className="absolute top-2 right-2 px-3 py-1 text-xs font-bold tracking-widest border-2 bg-background hover:bg-muted transition-colors cursor-pointer z-10"
              style={{ borderColor: def.color, color: def.color }}
              title="Test arena: hit a 250 HP dummy with adjustable upgrades"
            >
              TEST
            </button>
            <h2 className="text-3xl font-bold mb-4" style={{ color: def.color }}>{def.name}</h2>
            <div className="h-32 flex items-center justify-center mb-4 relative">
              <CanvasSprite sprite={SPRITES[key as keyof typeof SPRITES]} scale={4} />
            </div>
            <p className="text-center text-sm mb-6 min-h-[60px] leading-relaxed text-card-foreground">{def.description}</p>
            <div className="w-full text-center py-2 bg-muted text-muted-foreground mb-6 font-bold tracking-widest">{def.stats}</div>
            <button 
              className="w-full py-4 text-xl font-bold transition-colors uppercase cursor-pointer text-white" 
              style={{ backgroundColor: def.color, boxShadow: `0 4px 0 0 ${def.color}80` }}
              onClick={() => start(key)}
            >
              Select
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const CanvasSprite = ({ sprite, scale }: { sprite: (string|null)[][], scale: number }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0,0, canvasRef.current.width, canvasRef.current.height);
        drawSprite(ctx, sprite, canvasRef.current.width/2, canvasRef.current.height/2, scale);
      }
    }
  }, [sprite, scale]);
  return <canvas ref={canvasRef} width={100} height={100} style={{ imageRendering: 'pixelated' }} />
};
