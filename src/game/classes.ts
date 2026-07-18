import { ClassType } from "./types";

export const classDefinitions: Record<
  ClassType,
  {
    name: string;
    color: string;
    description: string;
    stats: string;
  }
> = {
  blitzer: {
    name: "Blitzer",
    color: "#38BDF8",
    description: "Lightning-quick strikes. Attacks 10x per second for 0.1 dmg each. Upgrade attack speed between rounds.",
    stats: "HP: 10 | SPD: Fast",
  },
  brute: {
    name: "Brute",
    color: "#EF4444",
    description: "Crushing blows. Smashes the 3 nearest enemies for 3 damage every 3 seconds. Upgrade damage between rounds.",
    stats: "HP: 10 | SPD: Normal",
  },
  wizard: {
    name: "Wizard",
    color: "#A855F7",
    description: "Arcane caster. Hurls fireballs (0.5 dmg + burn). Unlock new spells between rounds.",
    stats: "HP: 10 | SPD: Normal",
  },
};

export const getUpgradeCost = (classType: ClassType, count: number): number => {
  if (classType === "blitzer" || classType === "brute") {
    const costs = [1, 3, 5, 10, 20, 30, 40, 50];
    if (count < costs.length) return costs[count];
    return 50 + (count - 7) * 10;
  } else if (classType === "wizard") {
    if (count >= 4) return Infinity; // Max spells unlocked
    const wizardCosts = [10, 25, 50];
    if (count < wizardCosts.length) return wizardCosts[count];
    return 50 + (count - 2) * 25; // ...75, 100, ...
  }
  return 999;
};
