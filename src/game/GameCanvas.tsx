import React, { useEffect, useRef } from "react";
import { ClassType, GameState, TransientGameState } from "./types";
import { initGame, updateGame, renderGame } from "./engine";
import { SPELL_BY_KEY } from "./wizardSpells";
import { requestCast } from "./wizardInput";
import { requestUltimate } from "./wizardUltimateState";
import { requestDash, requestOverclock, requestClones, requestBlitzerUltimate } from "./blitzerState";
import { requestCharge, requestQuake, requestRage, requestClashHit, liveBruteState } from "./bruteState";
import { initAudio, startMusic, stopMusic } from "./audio";

interface GameCanvasProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transientState = useRef<TransientGameState | null>(null);
  const keys = useRef<{ [key: string]: boolean }>({
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false
  });
  const requestRef = useRef<number | null>(null);
  // Keep a live reference to the current screen so the game loop can
  // pause simulation without needing to be restarted on screen changes.
  const screenRef = useRef(gameState.screen);
  screenRef.current = gameState.screen;

  // Start / stop music when the active screen changes.
  useEffect(() => {
    if (gameState.screen === "game") {
      startMusic();
    } else {
      stopMusic();
    }
  }, [gameState.screen]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    transientState.current = initGame(gameState, canvas.width, canvas.height);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Any keypress is a valid user gesture — boot the AudioContext here so
      // music and SFX can play immediately without a separate click.
      initAudio();
      keys.current[e.key] = true;
      // Wizard spell cast bindings (1–5) — edge-triggered per keydown
      const spell = SPELL_BY_KEY[e.key];
      if (spell && !e.repeat) requestCast(spell.id);
      // G — manually fire the Divine Pillar ultimate when the meter is full
      if ((e.key === "g" || e.key === "G") && !e.repeat) requestUltimate();
      // Blitzer abilities (edge-triggered; repeat-guarded so a held key can't re-fire):
      // Shift = Lightning Dash, Q = Overclock, E = Phantom Clones.
      if (e.key === "Shift" && !e.repeat) requestDash();
      if ((e.key === "q" || e.key === "Q") && !e.repeat) requestOverclock();
      if ((e.key === "e" || e.key === "E") && !e.repeat) requestClones();
      // R — fire the Blitz Storm ultimate once the meter is full.
      if ((e.key === "r" || e.key === "R") && !e.repeat) requestBlitzerUltimate();
      // Brute abilities (edge-triggered; repeat-guarded so a held key can't
      // re-fire). Only queue while actually playing so a press in the shop /
      // pause can't fire on the first frame back in the arena.
      // Shift = Shoulder Charge, Q = Ground Quake, E = Berserker Rage.
      if (screenRef.current === "game") {
        if (e.key === "Shift" && !e.repeat) requestCharge();
        if ((e.key === "q" || e.key === "Q") && !e.repeat) requestQuake();
        if ((e.key === "e" || e.key === "E") && !e.repeat) requestRage();
        // SPACE — Shoulder Charge clash QTE hit. Only queued while the clash
        // window is live so stray presses can never bank a hidden success.
        if (e.key === " " && !e.repeat && liveBruteState.clashActive) requestClashHit();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.key] = false; };
    // Pointer on the canvas is also a valid gesture (mobile / first click).
    const handlePointer = () => initAudio();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("pointerdown", handlePointer);

    // Provide a callback to update React state
    const syncState = (updates: Partial<GameState>) => {
      setGameState(prev => ({ ...prev, ...updates }));
    };

    let lastTime = performance.now();

    const loop = (time: number) => {
      if (!transientState.current) return;
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;

        // Pause simulation while the player is in any non-game screen
        if (screenRef.current === "game") {
          updateGame(transientState.current, dt, keys.current, canvas.width, canvas.height, gameState, syncState);
        }
        renderGame(ctx, transientState.current, canvas.width, canvas.height);
      }
      
      requestRef.current = requestAnimationFrame(loop);
    };
    
    requestRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("pointerdown", handlePointer);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState.round, gameState.selectedClass]); // Re-init per round

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full cursor-default block bg-background"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};
