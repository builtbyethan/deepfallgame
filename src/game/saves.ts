import { ClassType, GameState } from "./types";

export interface SaveSlot {
  selectedClass: ClassType;
  round: number;
  coins: number;
  playerHp: number;
  maxHp: number;
  upgradeCounts: number;
  savedAt: number;
}

const STORAGE_KEY = "dungeon-delve:save-slots:v1";
export const NUM_SLOTS = 3;

const readAll = (): (SaveSlot | null)[] => {
  if (typeof window === "undefined") return Array(NUM_SLOTS).fill(null);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return Array(NUM_SLOTS).fill(null);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== NUM_SLOTS) {
      return Array(NUM_SLOTS).fill(null);
    }
    return parsed.map(validate);
  } catch {
    return Array(NUM_SLOTS).fill(null);
  }
};

const validate = (s: unknown): SaveSlot | null => {
  if (!s || typeof s !== "object") return null;
  const slot = s as Record<string, unknown>;
  if (
    (slot.selectedClass !== "blitzer" && slot.selectedClass !== "brute" && slot.selectedClass !== "wizard") ||
    typeof slot.round !== "number" ||
    typeof slot.coins !== "number" ||
    typeof slot.playerHp !== "number" ||
    typeof slot.maxHp !== "number" ||
    typeof slot.upgradeCounts !== "number" ||
    typeof slot.savedAt !== "number"
  ) {
    return null;
  }
  return {
    selectedClass: slot.selectedClass as ClassType,
    round: slot.round,
    coins: slot.coins,
    playerHp: slot.playerHp,
    maxHp: slot.maxHp,
    upgradeCounts: slot.upgradeCounts,
    savedAt: slot.savedAt,
  };
};

export const loadAllSaves = (): (SaveSlot | null)[] => readAll();

export const saveToSlot = (index: number, gameState: GameState): boolean => {
  if (index < 0 || index >= NUM_SLOTS) return false;
  if (!gameState.selectedClass) return false;
  try {
    const all = readAll();
    all[index] = {
      selectedClass: gameState.selectedClass,
      round: gameState.round,
      coins: gameState.coins,
      playerHp: gameState.playerHp,
      maxHp: gameState.maxHp,
      upgradeCounts: gameState.upgradeCounts,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    // Verify the write
    const verify = window.localStorage.getItem(STORAGE_KEY);
    return verify !== null && verify.includes(`"savedAt":${all[index]!.savedAt}`);
  } catch {
    return false;
  }
};

export const deleteSlot = (index: number): boolean => {
  if (index < 0 || index >= NUM_SLOTS) return false;
  try {
    const all = readAll();
    all[index] = null;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
};

export const loadFromSlot = (index: number): SaveSlot | null => {
  if (index < 0 || index >= NUM_SLOTS) return null;
  return readAll()[index];
};

// Derive class-specific stats from upgradeCounts for display
export const getDerivedStats = (
  cls: ClassType,
  upgradeCounts: number
): { label: string; value: string }[] => {
  if (cls === "blitzer") {
    const baseInterval = 0.1 * Math.pow(0.9, upgradeCounts);
    const rate = 1 / baseInterval;
    const comboRate = rate * 6;
    return [
      { label: "Punch Speed", value: `${rate.toFixed(1)}/sec` },
      { label: "Damage / Hit", value: "0.1" },
      { label: "Combo", value: `5s @ ${comboRate.toFixed(0)}/sec (25 hits)` },
      { label: "Upgrades", value: `${upgradeCounts}` },
    ];
  }
  if (cls === "brute") {
    return [
      { label: "Damage", value: `${3 + upgradeCounts}` },
      { label: "Hit Speed", value: "1 / 3 sec" },
      { label: "Upgrades", value: `${upgradeCounts}` },
    ];
  }
  // wizard
  const spellNames = ["Fireball", "Thunderbolt", "Ice Shard", "Water Wave", "Arcane Orb"];
  const unlocked = spellNames.slice(0, upgradeCounts + 1).join(", ");
  return [
    { label: "Spells", value: `${upgradeCounts + 1} / 5` },
    { label: "Unlocked", value: unlocked },
  ];
};
