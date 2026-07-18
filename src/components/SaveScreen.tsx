import React, { useState } from "react";
import { GameState } from "../game/types";
import { classDefinitions } from "../game/classes";
import {
  loadAllSaves,
  saveToSlot,
  loadFromSlot,
  deleteSlot,
  getDerivedStats,
  NUM_SLOTS,
  SaveSlot,
} from "../game/saves";

interface Props {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

export const SaveScreen: React.FC<Props> = ({ gameState, setGameState }) => {
  const returnTo: "menu" | "shop" = gameState.selectedClass ? "shop" : "menu";
  const [slots, setSlots] = useState<(SaveSlot | null)[]>(() => loadAllSaves());
  const [status, setStatus] = useState<string>("");

  const refresh = () => setSlots(loadAllSaves());

  const hasActiveRun = !!gameState.selectedClass && gameState.screen !== "menu";

  const onSave = (i: number) => {
    if (!hasActiveRun) {
      setStatus("No active run to save — start a game first.");
      return;
    }
    const ok = saveToSlot(i, gameState);
    refresh();
    setStatus(ok ? `Saved to Slot ${i + 1}.` : `Save failed — storage may be full or blocked.`);
  };

  const onLoad = (i: number) => {
    const data = loadFromSlot(i);
    if (!data) {
      setStatus(`Slot ${i + 1} is empty.`);
      return;
    }
    setGameState({
      screen: "shop",
      selectedClass: data.selectedClass,
      round: data.round,
      coins: data.coins,
      playerHp: data.playerHp,
      maxHp: data.maxHp,
      bossHp: 0,
      bossMaxHp: 0,
      upgradeCounts: data.upgradeCounts,
      isBossAlive: false,
    });
  };

  const onDelete = (i: number) => {
    if (!slots[i]) return;
    if (!window.confirm(`Delete save in Slot ${i + 1}? This cannot be undone.`)) return;
    deleteSlot(i);
    refresh();
    setStatus(`Slot ${i + 1} cleared.`);
  };

  const goBack = () => {
    if (returnTo === "menu") {
      setGameState(prev => ({ ...prev, screen: "menu" }));
    } else {
      setGameState(prev => ({ ...prev, screen: "shop" }));
    }
  };

  return (
    <div className="absolute inset-0 bg-background z-50 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-4xl text-primary font-bold tracking-widest">SAVE FILES</h2>
          <button
            onClick={goBack}
            className="py-3 px-8 bg-background border-4 border-foreground text-foreground text-lg font-bold hover:bg-foreground hover:text-background transition-colors cursor-pointer"
          >
            ← BACK
          </button>
        </div>

        {status && (
          <div className="mb-6 p-4 border-2 border-accent bg-card text-accent text-center font-bold">
            {status}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: NUM_SLOTS }).map((_, i) => (
            <SlotCard
              key={i}
              index={i}
              slot={slots[i]}
              hasActiveRun={hasActiveRun}
              onSave={() => onSave(i)}
              onLoad={() => onLoad(i)}
              onDelete={() => onDelete(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const SlotCard: React.FC<{
  index: number;
  slot: SaveSlot | null;
  hasActiveRun: boolean;
  onSave: () => void;
  onLoad: () => void;
  onDelete: () => void;
}> = ({ index, slot, hasActiveRun, onSave, onLoad, onDelete }) => {
  const isEmpty = !slot;
  const def = slot ? classDefinitions[slot.selectedClass] : null;
  const stats = slot ? getDerivedStats(slot.selectedClass, slot.upgradeCounts) : [];

  return (
    <div
      className="border-4 bg-card p-6 flex flex-col"
      style={{ borderColor: def ? def.color : "hsl(var(--muted))" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-card-foreground tracking-widest">
          SLOT {index + 1}
        </h3>
        {!isEmpty && (
          <button
            onClick={onDelete}
            className="text-xs px-2 py-1 border-2 border-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive cursor-pointer"
            title="Delete this save"
          >
            DELETE
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center py-8 text-muted-foreground text-xl text-center">
          — EMPTY —
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-3 mb-4">
          <div
            className="text-3xl font-bold text-center py-2 mb-1"
            style={{ color: def!.color }}
          >
            {def!.name.toUpperCase()}
          </div>
          <Stat label="Round" value={`${slot!.round}`} />
          <Stat label="Coins" value={`${slot!.coins}`} />
          <Stat
            label="HP"
            value={`${slot!.playerHp.toFixed(1)} / ${slot!.maxHp}`}
          />
          {stats.map(s => (
            <Stat key={s.label} label={s.label} value={s.value} />
          ))}
          <div className="text-xs text-muted-foreground mt-2 text-right">
            Saved {new Date(slot!.savedAt).toLocaleString()}
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-auto">
        <button
          onClick={onSave}
          disabled={!hasActiveRun}
          className={`flex-1 py-3 text-lg font-bold tracking-wider transition-all
            ${hasActiveRun
              ? "bg-primary text-primary-foreground hover:bg-primary/80 cursor-pointer"
              : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"}`}
        >
          SAVE
        </button>
        <button
          onClick={onLoad}
          disabled={isEmpty}
          className={`flex-1 py-3 text-lg font-bold tracking-wider transition-all
            ${!isEmpty
              ? "bg-accent text-accent-foreground hover:bg-accent/80 cursor-pointer"
              : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"}`}
        >
          LOAD
        </button>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-baseline justify-between border-b border-muted pb-1">
    <span className="text-sm text-muted-foreground uppercase tracking-wider">{label}</span>
    <span className="text-base text-card-foreground font-bold text-right">{value}</span>
  </div>
);
