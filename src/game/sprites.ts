export const drawSprite = (
  ctx: CanvasRenderingContext2D,
  sprite: (string | null)[][],
  x: number,
  y: number,
  scale: number,
  alpha: number = 1
) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  const width = sprite[0].length * scale;
  const height = sprite.length * scale;
  ctx.translate(x - width / 2, y - height / 2);

  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const color = sprite[row][col];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(col * scale, row * scale, scale, scale);
      }
    }
  }
  ctx.restore();
};

const B1 = "#0EA5E9"; // Sky Blue (outline)
const B2 = "#38BDF8"; // Light Sky Blue (mid)
const B3 = "#E0F2FE"; // Pale Sky (highlight)

// Tier-based enemy palettes (each tier = every 5 rounds)
const ENEMY_TIERS: { dark: string; mid: string; light: string }[] = [
  { dark: "#064E3B", mid: "#10B981", light: "#34D399" }, // tier 0: green slime
  { dark: "#1E3A8A", mid: "#3B82F6", light: "#93C5FD" }, // tier 1: blue specter
  { dark: "#581C87", mid: "#A855F7", light: "#D8B4FE" }, // tier 2: violet wraith
  { dark: "#7C2D12", mid: "#F97316", light: "#FDBA74" }, // tier 3: ember imp
  { dark: "#831843", mid: "#EC4899", light: "#F9A8D4" }, // tier 4: blood fiend
  { dark: "#111827", mid: "#4B5563", light: "#9CA3AF" }, // tier 5+: voidling
];

export const getEnemyTier = (tier: number) =>
  ENEMY_TIERS[Math.min(tier, ENEMY_TIERS.length - 1)];

export const makeEnemySprite = (tier: number): (string | null)[][] => {
  const { dark: D, mid: M, light: L } = getEnemyTier(tier);
  return [
    [null, null, D, D, D, D, null, null],
    [null, D, M, M, M, M, D, null],
    [D, M, L, M, M, L, M, D],
    [D, M, M, M, M, M, M, D],
    [null, D, D, D, D, D, D, null],
  ];
};

const BOSS_TIERS: { dark: string; mid: string; light: string; crown: string }[] = [
  { dark: "#7F1D1D", mid: "#DC2626", light: "#FCA5A5", crown: "#FBBF24" }, // tier 1: crimson king
  { dark: "#1E3A8A", mid: "#2563EB", light: "#93C5FD", crown: "#F0ABFC" }, // tier 2: azure tyrant
  { dark: "#581C87", mid: "#9333EA", light: "#D8B4FE", crown: "#FDE047" }, // tier 3: void archon
  { dark: "#7C2D12", mid: "#EA580C", light: "#FDBA74", crown: "#FACC15" }, // tier 4: inferno lord
  { dark: "#831843", mid: "#DB2777", light: "#F9A8D4", crown: "#A5F3FC" }, // tier 5+: blood empress
];

export const getBossTier = (tier: number) =>
  BOSS_TIERS[Math.min(Math.max(tier - 1, 0), BOSS_TIERS.length - 1)];

export const makeBossSprite = (tier: number): (string | null)[][] => {
  const t = getBossTier(tier);
  const { dark: D, mid: M, light: L, crown: C } = t;
  return [
    [null, null, C, null, C, null, C, null, null],
    [null, null, D, D, D, D, D, null, null],
    [null, D, D, D, D, D, D, D, null],
    [D, M, M, M, M, M, M, M, D],
    [D, M, L, M, M, M, L, M, D],
    [D, M, M, M, M, M, M, M, D],
    [D, M, M, M, M, M, M, M, D],
    [null, D, D, D, D, D, D, D, null],
  ];
};

export const SPRITES = {
  blitzer: [
    [null, null, B1, B1, B1, B1, null, null],
    [null, B1, B2, B2, B2, B2, B1, null],
    [B1, B2, B3, B2, B2, B3, B2, B1],
    [B1, B2, B2, B2, B2, B2, B2, B1],
    [B1, B1, B2, B2, B2, B2, B1, B1],
    [null, B1, B1, B1, B1, B1, B1, null],
    [null, B1, null, null, null, null, B1, null],
    [null, B1, null, null, null, null, B1, null],
  ],

  brute: [
    [null, "#7F1D1D", "#7F1D1D", "#7F1D1D", "#7F1D1D", "#7F1D1D", "#7F1D1D", null],
    ["#7F1D1D", "#EF4444", "#EF4444", "#EF4444", "#EF4444", "#EF4444", "#EF4444", "#7F1D1D"],
    ["#7F1D1D", "#EF4444", "#FCA5A5", "#EF4444", "#EF4444", "#FCA5A5", "#EF4444", "#7F1D1D"],
    ["#7F1D1D", "#EF4444", "#EF4444", "#EF4444", "#EF4444", "#EF4444", "#EF4444", "#7F1D1D"],
    ["#7F1D1D", "#EF4444", "#EF4444", "#EF4444", "#EF4444", "#EF4444", "#EF4444", "#7F1D1D"],
    ["#7F1D1D", "#7F1D1D", "#7F1D1D", "#7F1D1D", "#7F1D1D", "#7F1D1D", "#7F1D1D", "#7F1D1D"],
    [null, "#7F1D1D", "#7F1D1D", null, null, "#7F1D1D", "#7F1D1D", null],
    [null, "#7F1D1D", "#7F1D1D", null, null, "#7F1D1D", "#7F1D1D", null],
  ],

  wizard: [
    [null, null, null, "#581C87", "#581C87", null, null, null],
    [null, null, "#581C87", "#FBBF24", "#581C87", "#581C87", null, null],
    [null, "#581C87", "#581C87", "#581C87", "#581C87", "#581C87", "#581C87", null],
    ["#581C87", "#581C87", "#581C87", "#581C87", "#581C87", "#581C87", "#581C87", "#581C87"],
    [null, null, "#A855F7", "#A855F7", "#A855F7", "#A855F7", null, null],
    [null, "#A855F7", "#D8B4FE", "#A855F7", "#A855F7", "#D8B4FE", "#A855F7", null],
    [null, "#A855F7", "#A855F7", "#A855F7", "#A855F7", "#A855F7", "#A855F7", null],
    [null, null, "#581C87", null, null, "#581C87", null, null],
  ],

  enemySmall: [
    [null, null, "#064E3B", "#064E3B", "#064E3B", "#064E3B", null, null],
    [null, "#064E3B", "#10B981", "#10B981", "#10B981", "#10B981", "#064E3B", null],
    ["#064E3B", "#10B981", "#34D399", "#10B981", "#10B981", "#34D399", "#10B981", "#064E3B"],
    ["#064E3B", "#10B981", "#10B981", "#10B981", "#10B981", "#10B981", "#10B981", "#064E3B"],
    [null, "#064E3B", "#064E3B", "#064E3B", "#064E3B", "#064E3B", "#064E3B", null],
  ],

  boss: [
    [null, null, "#FBBF24", null, "#FBBF24", null, "#FBBF24", null, null],
    [null, null, "#B45309", "#B45309", "#B45309", "#B45309", "#B45309", null, null],
    [null, "#7F1D1D", "#7F1D1D", "#7F1D1D", "#7F1D1D", "#7F1D1D", "#7F1D1D", "#7F1D1D", null],
    ["#7F1D1D", "#DC2626", "#DC2626", "#DC2626", "#DC2626", "#DC2626", "#DC2626", "#DC2626", "#7F1D1D"],
    ["#7F1D1D", "#DC2626", "#FCA5A5", "#DC2626", "#DC2626", "#DC2626", "#FCA5A5", "#DC2626", "#7F1D1D"],
    ["#7F1D1D", "#DC2626", "#DC2626", "#DC2626", "#DC2626", "#DC2626", "#DC2626", "#DC2626", "#7F1D1D"],
    ["#7F1D1D", "#DC2626", "#DC2626", "#DC2626", "#DC2626", "#DC2626", "#DC2626", "#DC2626", "#7F1D1D"],
    [null, "#7F1D1D", "#7F1D1D", "#7F1D1D", "#7F1D1D", "#7F1D1D", "#7F1D1D", "#7F1D1D", null],
  ],

  coin: [
    [null, "#B45309", "#B45309", null],
    ["#B45309", "#FBBF24", "#FBBF24", "#B45309"],
    ["#B45309", "#FBBF24", "#FDE68A", "#B45309"],
    [null, "#B45309", "#B45309", null],
  ]
};
