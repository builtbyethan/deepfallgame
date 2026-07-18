export type Vector2 = { x: number; y: number };

export type ClassType = "blitzer" | "brute" | "wizard";

export type GameScreen = "menu" | "game" | "shop" | "gameover" | "saves";

export interface GameState {
  screen: GameScreen;
  selectedClass: ClassType | null;
  round: number;
  coins: number;
  playerHp: number;
  maxHp: number;
  bossHp: number;
  bossMaxHp: number;
  upgradeCounts: number; // specialized per class logic, keep simple for now
  isBossAlive: boolean;
  testMode?: boolean;
  // Blitz Storm ultimate charge persisted across rounds so it carries over
  // instead of resetting to zero each round (seeded into the player on init).
  blitzerUltCharge?: number;
  // How many times any ultimate has been used this run. Each use scales up the
  // charge requirement for ALL ultimates (blitzer + wizard). Persists per run.
  ultChargePenalty?: number;
}

export interface Entity {
  id: string;
  pos: Vector2;
  radius: number;
  color?: string;
  markedForDeletion?: boolean;
}

export interface Player extends Entity {
  classType: ClassType;
  vel: Vector2;
  hp: number;
  maxHp: number;
  speed: number;
  iFrames: number;
  // Blitzer
  attackTimer: number;
  attackInterval: number;
  blitzerTargetId: string | null;
  blitzerHitCount: number;
  blitzerCombo: {
    enemyId: string;
    timeLeft: number;
    nextHitTimer: number;
    hitInterval: number;
    fistIndex: number;
  } | null;
  // Blitzer abilities (Dash / Overclock / Phantom Clones) — cooldown + active timers.
  blitzerFacing: Vector2;        // last movement direction, used for the dash blink
  blitzerDashCd: number;         // seconds until Lightning Dash is ready again
  blitzerOverclockCd: number;    // seconds until Overclock is ready again
  blitzerOverclockActive: number;// seconds of slow-mo remaining (0 = inactive)
  blitzerClonesCd: number;       // seconds until Phantom Clones is ready again
  blitzerUltCharge: number;      // damage dealt accumulated toward the Blitz Storm ultimate
  // Brute
  bruteTimer: number;
  bruteDamage: number;
  bruteHitCount: number; // landed hits toward the mega slam
  // Wizard
  wizardSpells: number; // unlocked spells count
  spellTimers: Record<string, number>;
  wizardUltCharge: number; // accumulated spell damage toward the Divine Pillar
}

export interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  speed: number;
  isBoss: boolean;
  damage: number;
  burnTicks: number;
  burnTimer: number;
  slowTimer: number;
  flashTimer: number;
  paralyzedTimer: number; // >0 → fully immobilised by thunderbolt
  shockTimer: number;     // countdown to next shock-damage tick
  cursedTimer: number;    // >0 → all damage taken amplified ×1.5
  soakedTimer: number;    // >0 → primed for lightning / fire combos
  evaporateTimer: number; // >0 → all damage taken amplified ×1.5 (stacks with curse)
  enhancedBurn: boolean;  // burn ticks deal 1.0 instead of 0.1 (set by shatter)
  superShock: boolean;    // shock ticks deal 0.45 instead of 0.3 (set by soaked-thunderbolt)
  tier: number;
  isDummy?: boolean;
}

export interface Projectile extends Entity {
  vel: Vector2;
  damage: number;
  pierce: number;
  lifeTime: number;
  type: "dart" | "fireball" | "thunderbolt" | "iceshard" | "waterwave" | "arcaneorb";
  // Pre-computed zigzag polyline for thunderbolt (origin → target → bounce1 → bounce2)
  chainPoints?: Vector2[];
  maxLifeTime?: number;
}

export interface Particle extends Entity {
  vel: Vector2;
  lifeTime: number;
  maxLife: number;
  color: string;
}

export interface FloatingText extends Entity {
  text: string;
  lifeTime: number;
  maxLife: number;
  color: string;
  vel: Vector2;
}

export interface Coin extends Entity {
  value: number;
  bobTimer: number;
  magnetized: boolean;
}

export interface FistSlam {
  id: string;
  targetPos: Vector2;
  timer: number;
  phase: "drop" | "impact";
  enemyId: string;
  damage: number;
  kind?: "slam" | "punch";
  fromAngle?: number;
}

export interface MegaSlam {
  x: number;            // horizontal landing position
  timer: number;
  phase: "drop" | "impact";
  damage: number;       // damage dealt to every enemy on impact
}

// One cosmetic star shot outward from the centre of the Divine Pillar rings.
export interface WizardUltStar {
  angle: number;
  dist: number;
  speed: number;
  len: number;
  color: string;
}

// Transient state machine for the wizard's Divine Pillar ultimate:
// builds five rune rings, fires a map-wide beam, then runs a radiant field.
export interface WizardUltimate {
  phase: "rings" | "beam" | "radiance";
  center: Vector2;
  ringsBuilt: number;   // count of fully constructed rings (0..RING_COUNT)
  ringGrowT: number;    // 0..1 growth of the currently-constructing ring
  beamTimer: number;    // counts up during the beam flash
  stars: WizardUltStar[];
  radianceTimer: number;     // counts down over the 5 s radiant field
  radianceTickTimer: number; // countdown to the next radiance damage tick
}

// The aftermath aura + wings shield granted once the radiance ends.
export interface WizardShield {
  breaking: boolean;   // true once the first incoming hit is blocked
  breakTimer: number;  // wings-spread + shockwave animation clock
}

// A fading electric afterimage dropped along a Lightning Dash path.
export interface DashAfterimage {
  pos: Vector2;
  timer: number;     // counts down to 0
  maxTime: number;   // initial lifetime (for fade)
}

// A Phantom Clone afterimage that rapid-strikes nearby enemies, then delivers
// one upgrade-scaled final strike on expiry before poofing.
export interface PhantomClone {
  pos: Vector2;
  angle: number;        // visual facing / spawn offset around the target
  life: number;         // seconds remaining before the final strike
  maxLife: number;      // initial lifetime (for fade)
  strikeTimer: number;  // countdown to the next rapid strike
  finalDamage: number;  // pre-computed upgrade-scaled final-strike damage
  flashTimer: number;   // brief lunge flash when a rapid strike lands
}

// The Blitz Storm ultimate — the blitzer streaks out from a fixed anchor point
// in 8 directions (up, down, left, right, then the 4 diagonals) in sequence,
// damaging enemies along each streak line once as it fires.
export interface BlitzerUltimate {
  anchor: Vector2;     // locked centre the blitzer streaks out from and snaps back to
  ends: Vector2[];     // pre-computed streak endpoints, one per direction (8 total)
  index: number;       // which streak is currently playing (0..ends.length)
  timer: number;       // seconds elapsed within the current streak
  damage: number;      // pre-computed upgrade-scaled damage per streak
  shatterDamage: number; // pre-computed upgrade-scaled AoE damage when afterimages shatter
}

// A persistent afterimage left by the Blitz Storm at a dash endpoint. It lingers
// for the whole storm, then shatters (one-time AoE damage + burst) once the
// multidirectional sequence finishes, fading over shatterTimer.
export interface BlitzerUltGhost {
  pos: Vector2;
  shattering: boolean;  // false while frozen during the storm, true once shattering
  shatterTimer: number; // counts up during the shatter fade-out
}

export interface TransientGameState {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: Particle[];
  texts: FloatingText[];
  coins: Coin[];
  fistSlams: FistSlam[];
  megaSlam: MegaSlam | null;
  blitzerDashTrail: DashAfterimage[];
  phantomClones: PhantomClone[];
  blitzerUltimate: BlitzerUltimate | null;
  blitzerUltGhosts: BlitzerUltGhost[];
  wizardUlt: WizardUltimate | null;
  wizardShield: WizardShield | null;
  lastTime: number;
  shakeTimer: number;
  roundActive: boolean;
  // Animation clock (seconds since round start) for idle/walk bobs
  animTime: number;
  // True while the player held a movement key this frame
  playerMoving: boolean;
}
