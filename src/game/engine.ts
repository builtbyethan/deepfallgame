import { TransientGameState, GameState, Vector2, Enemy, Projectile, Particle, FloatingText, Coin, FistSlam } from "./types";

import { liveWizardState, takePendingCasts } from "./wizardInput";
import {
  liveBlitzerState,
  resetBlitzerState,
  COMBO_DURATION,
  CHARGE_DURATION,
  DASH_COOLDOWN,
  DASH_DISTANCE,
  DASH_DAMAGE,
  DASH_HIT_RADIUS,
  DASH_IFRAMES,
  DASH_TRAIL_FADE,
  OVERCLOCK_COOLDOWN,
  OVERCLOCK_DURATION,
  OVERCLOCK_ENEMY_SCALE,
  CLONES_COOLDOWN,
  CLONES_DURATION,
  CLONE_COUNT,
  CLONE_STRIKE_INTERVAL,
  CLONE_STRIKE_DAMAGE,
  CLONE_STRIKE_RADIUS,
  CLONE_FINAL_BASE,
  CLONE_FINAL_PER_LEVEL,
  BLITZER_DMG_COLOR,
  CLONE_FINAL_COLOR,
  BLITZER_ULT_CHARGE_DAMAGE,
  ULT_DASH_TIME,
  ULT_DASH_HIT_RADIUS,
  ULT_TRAIL_FADE,
  ULT_DASH_DAMAGE_BASE,
  ULT_DASH_DAMAGE_PER_LEVEL,
  ULT_GHOST_SHATTER_RADIUS,
  ULT_GHOST_SHATTER_DAMAGE_BASE,
  ULT_GHOST_SHATTER_DAMAGE_PER_LEVEL,
  ULT_GHOST_SHATTER_DURATION,
  ULT_PENALTY_STEP,
  takePendingDash,
  takePendingOverclock,
  takePendingClones,
  takePendingBlitzerUltimate,
} from "./blitzerState";
import {
  liveBruteState,
  resetBruteState,
  HITS_TO_CHARGE,
  MEGA_DAMAGE_MULT,
  MEGA_DROP_DURATION,
  MEGA_IMPACT_DURATION,
  CHARGE_COOLDOWN,
  CHARGE_DURATION as BRUTE_CHARGE_DURATION,
  CHARGE_SPEED,
  CHARGE_DAMAGE,
  CHARGE_HIT_RADIUS,
  CHARGE_KNOCKBACK,
  CLASH_WINDOW,
  CLASH_DAMAGE_MULT,
  CLASH_KNOCKBACK,
  CLASH_GOOD_DAMAGE_MULT,
  CLASH_GOOD_KNOCKBACK,
  CLASH_PERFECT_ZONE,
  CLASH_MISS_CD_FRACTION,
  CLASH_RESULT_LINGER,
  QUAKE_COOLDOWN,
  QUAKE_RADIUS,
  QUAKE_DAMAGE,
  QUAKE_PARALYZE,
  QUAKE_RING_DURATION,
  RAGE_COOLDOWN,
  RAGE_DURATION,
  RAGE_ATTACK_INTERVAL_MULT,
  RAGE_DAMAGE_MULT,
  BRUTE_ABILITY_COLOR,
  ABILITIES_UNLOCK_ROUND,
  takePendingCharge,
  takePendingQuake,
  takePendingRage,
  takePendingClashHit,
} from "./bruteState";
import {
  liveWizardUltimateState,
  resetWizardUltimateState,
  takePendingUltimate,
  ULT_CHARGE_DAMAGE,
  RING_COUNT,
  RING_BUILD_TIME,
  BEAM_DURATION,
  RADIANCE_DURATION,
  RADIANCE_TOTAL_DAMAGE,
  RADIANCE_TICK,
  SHIELD_SHOCKWAVE_DAMAGE,
  SHIELD_BREAK_DURATION,
  RADIANCE_COLOR,
} from "./wizardUltimateState";
import { testControls } from "./testControls";
import { SPRITES, drawSprite, makeEnemySprite, makeBossSprite, getEnemyTier, getBossTier } from "./sprites";
import {
  sfxHit, sfxDash, sfxBlitzFire, sfxBlitzShatter,
  sfxDeath, sfxBossDeath, sfxCoin, sfxHurt, sfxRoundClear,
  sfxOverclock, sfxClones, sfxWizardCast, sfxWizardUlt, sfxSlam,
  sfxBruteCharge, sfxQuake, sfxRage,
  sfxClashLock, sfxClashSuccess, sfxClashMiss,
} from "./audio";

// Grey training-dummy sprite (matches enemy silhouette but desaturated).
const DUMMY_SPRITE: (string | null)[][] = (() => {
  const D = "#3F3F46", M = "#71717A", L = "#D4D4D8"; // dark / mid / light grey
  return [
    [null, null, D, D, D, D, null, null],
    [null, D, M, M, M, M, D, null],
    [D, M, L, M, M, L, M, D],
    [D, M, M, M, M, M, M, D],
    [null, D, D, D, D, D, D, null],
  ];
})();

// Cache sprite arrays so they are never rebuilt per-frame
const _enemySpriteCache = new Map<number, (string | null)[][]>();
const _bossSpriteCache  = new Map<number, (string | null)[][]>();
const getCachedEnemy = (tier: number) => {
  if (!_enemySpriteCache.has(tier)) _enemySpriteCache.set(tier, makeEnemySprite(tier));
  return _enemySpriteCache.get(tier)!;
};
const getCachedBoss = (tier: number) => {
  if (!_bossSpriteCache.has(tier)) _bossSpriteCache.set(tier, makeBossSprite(tier));
  return _bossSpriteCache.get(tier)!;
};

// Fist pixel grid — defined once, reused every frame
const FIST_GRID = [
  [0, 0, 2, 2, 2, 2, 2, 0],
  [0, 1, 2, 1, 2, 1, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 1],
  [2, 2, 3, 2, 2, 2, 2, 1],
  [2, 2, 2, 2, 2, 2, 2, 1],
  [0, 2, 1, 2, 2, 2, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
] as const;
const FIST_COLORS: Record<number, string> = { 1: "#7F1D1D", 2: "#EF4444", 3: "#FCA5A5" };
// Sky-blue palette for blitzer punches (outline / mid / highlight)
const BLITZER_FIST_COLORS: Record<number, string> = { 1: "#0EA5E9", 2: "#38BDF8", 3: "#E0F2FE" };

const SLIME_PUDDLE_LIFETIME = 5;
const SLIME_PUDDLE_INTERVAL = 0.6;
// A full late wave is 30 enemies plus one boss. At one drop every 0.6 seconds,
// 360 patches safely retains every five-second trail (31 × ceil(5 / 0.6) = 279).
const SLIME_PUDDLE_MAX = 360;
const SLIME_PUDDLE_SLOW_MULTIPLIER = 0.58;
const SLIME_PUDDLE_DAMAGE_MULTIPLIER = 0.25;
const SLIME_PUDDLE_DAMAGE_INTERVAL = 1;
const BOSS_SWARM_ROUND = 30;
const BOSS_SWARM_TIER = 5; // the boss introduced at round 25
const BOSS_SWARM_COUNT = 10;
const BOSS_SWARM_WARNING_DURATION = 2.8;

export const initGame = (gameState: GameState, width: number, height: number): TransientGameState => {
  // Clear any leftover barrage charge from a previous run so the HUD bar
  // starts empty on the very first frame of a new blitzer game.
  resetBlitzerState();
  resetBruteState();
  resetWizardUltimateState();

  const player = {
    id: "player",
    pos: { x: width / 2, y: height / 2 },
    radius: 12,
    classType: gameState.selectedClass!,
    vel: { x: 0, y: 0 },
    hp: gameState.playerHp,
    maxHp: gameState.maxHp,
    speed: 150,
    iFrames: 0,
    attackTimer: 0,
    attackInterval: gameState.selectedClass === "blitzer" ? 0.1 * Math.pow(0.9, gameState.upgradeCounts) : 3,
    blitzerTargetId: null,
    blitzerHitCount: 0,
    blitzerCombo: null,
    blitzerFacing: { x: 1, y: 0 },
    blitzerDashCd: 0,
    blitzerOverclockCd: 0,
    blitzerOverclockActive: 0,
    blitzerClonesCd: 0,
    // Carry the Blitz Storm charge over from the previous round instead of
    // resetting to zero each round.
    blitzerUltCharge: gameState.blitzerUltCharge ?? 0,
    bruteTimer: 0,
    bruteDamage: 3 + (gameState.selectedClass === "brute" ? gameState.upgradeCounts : 0),
    bruteHitCount: 0,
    bruteChargeCd: 0,
    bruteQuakeCd: 0,
    bruteRageCd: 0,
    bruteRageActive: 0,
    wizardSpells: gameState.selectedClass === "wizard" ? gameState.upgradeCounts : 0,
    spellTimers: {
      fireball: 0,
      thunderbolt: 0,
      iceshard: 0,
      waterwave: 0,
      arcaneorb: 0
    },
    wizardUltCharge: 0
  };

  // Apply live test-mode upgrade selection to initial stats so the first frame
  // already reflects what the TestPanel slider is set to.
  if (gameState.testMode) {
    const tc = testControls.upgradeCounts;
    if (gameState.selectedClass === "blitzer") player.attackInterval = 0.1 * Math.pow(0.9, tc);
    else if (gameState.selectedClass === "brute") player.bruteDamage = 3 + tc;
    else if (gameState.selectedClass === "wizard") player.wizardSpells = tc;
  }

  const state: TransientGameState = {
    player,
    enemies: [],
    projectiles: [],
    particles: [],
    texts: [],
    coins: [],
    slimePuddles: [],
    slimeDamageTimer: 0,
    announcement: gameState.round === BOSS_SWARM_ROUND && !gameState.testMode
      ? { text: "WARNING! BOSS SWARM", timer: BOSS_SWARM_WARNING_DURATION, maxTime: BOSS_SWARM_WARNING_DURATION }
      : null,
    fistSlams: [],
    megaSlam: null,
    bruteCharge: null,
    bruteClash: null,
    bruteQuake: null,
    launchedEnemies: [],
    blitzerDashTrail: [],
    phantomClones: [],
    blitzerUltimate: null,
    blitzerUltGhosts: [],
    wizardUlt: null,
    wizardShield: null,
    lastTime: performance.now(),
    shakeTimer: 0,
    roundActive: true,
    animTime: 0,
    playerMoving: false,
  };

  // Test mode: spawn a single immobile grey training dummy and skip normal waves.
  if (gameState.testMode) {
    state.enemies.push(makeDummy(width, height));
    return state;
  }

  // Spawn enemies
  const round = gameState.round;
  const numEnemies = Math.min(30, 4 + round);
  const tier = Math.floor(round / 5);
  const hpBase = round === 1 ? 1 : round === 2 ? 2 : 2 + (round - 2) * 2;
  const enemyRadius = 10 + tier * 2;
  const enemySpeedBase = 60 + tier * 8;
  const safeRadius = Math.max(width, height) / 2 + 50;

  const spawnBoss = (id: string, bossTier: number, angle: number, dist: number) => {
    const bossHp = 10 + 15 * (bossTier - 1);
    state.enemies.push({
      id,
      pos: { x: width / 2 + Math.cos(angle) * dist, y: height / 2 + Math.sin(angle) * dist },
      radius: 24,
      hp: bossHp,
      maxHp: bossHp,
      speed: 40,
      isBoss: true,
      damage: 2,
      burnTicks: 0,
      burnTimer: 0,
      slowTimer: 0,
      flashTimer: 0,
      paralyzedTimer: 0,
      shockTimer: 0,
      cursedTimer: 0,
      soakedTimer: 0,
      evaporateTimer: 0,
      enhancedBurn: false,
      superShock: false,
      tier: bossTier
    });
  };

  if (round === BOSS_SWARM_ROUND) {
    // Round 30 is a dedicated swarm: ten copies of the round-25 Blood Empress.
    for (let i = 0; i < BOSS_SWARM_COUNT; i++) {
      const angle = (i / BOSS_SWARM_COUNT) * Math.PI * 2 + Math.random() * 0.22;
      spawnBoss(`swarm_boss_${i}`, BOSS_SWARM_TIER, angle, safeRadius + 30 + Math.random() * 90);
    }
  } else {
    for (let i = 0; i < numEnemies; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = safeRadius + Math.random() * 100;
      state.enemies.push({
        id: `e_${i}`,
        pos: { x: width / 2 + Math.cos(angle) * dist, y: height / 2 + Math.sin(angle) * dist },
        radius: enemyRadius,
        hp: hpBase,
        maxHp: hpBase,
        speed: enemySpeedBase + Math.random() * 10,
        isBoss: false,
        damage: 1 + Math.floor(tier / 2),
        burnTicks: 0,
        burnTimer: 0,
        slowTimer: 0,
        flashTimer: 0,
        paralyzedTimer: 0,
        shockTimer: 0,
        cursedTimer: 0,
        soakedTimer: 0,
        evaporateTimer: 0,
        enhancedBurn: false,
        superShock: false,
        tier
      });
    }
  }

  if (round % 5 === 0 && round !== BOSS_SWARM_ROUND) {
    const angle = Math.random() * Math.PI * 2;
    spawnBoss(`boss`, Math.floor(round / 5), angle, safeRadius);
  }

  return state;
};

const distSq = (a: Vector2, b: Vector2) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

const slimeColorFor = (enemy: Enemy) =>
  enemy.isBoss ? getBossTier(enemy.tier).mid : getEnemyTier(enemy.tier).mid;

const spawnSlimePuddle = (state: TransientGameState, enemy: Enemy) => {
  state.slimePuddles.push({
    id: `slime_${Math.random().toString(36).slice(2, 9)}`,
    pos: {
      x: enemy.pos.x + (Math.random() - 0.5) * enemy.radius * 0.4,
      y: enemy.pos.y + (Math.random() - 0.5) * enemy.radius * 0.4,
    },
    radius: Math.max(13, enemy.radius * (enemy.isBoss ? 0.95 : 0.8)),
    lifeTime: SLIME_PUDDLE_LIFETIME,
    maxLife: SLIME_PUDDLE_LIFETIME,
    sourceDamage: enemy.damage,
    color: slimeColorFor(enemy),
  });
  if (state.slimePuddles.length > SLIME_PUDDLE_MAX) state.slimePuddles.shift();
};

const advanceSlimeTrail = (
  state: TransientGameState,
  enemy: Enemy,
  elapsed: number,
  distanceMoved: number
) => {
  if (distanceMoved <= 0.1) return;
  enemy.slimeTrailTimer = (enemy.slimeTrailTimer ?? Math.random() * SLIME_PUDDLE_INTERVAL) - elapsed;
  while (enemy.slimeTrailTimer <= 0) {
    spawnSlimePuddle(state, enemy);
    enemy.slimeTrailTimer += SLIME_PUDDLE_INTERVAL;
  }
};

// Squared distance from point p to the line segment a→b (used for dash-path hits).
const distToSegmentSq = (p: Vector2, a: Vector2, b: Vector2) => {
  const abx = b.x - a.x, aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return distSq(p, a);
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + abx * t, cy = a.y + aby * t;
  return (p.x - cx) ** 2 + (p.y - cy) ** 2;
};

// Spawns a 250-hp grey dummy positioned ahead of the player. Speed 0 = stationary;
// damage 0 = harmless even on touch. Marked with isDummy so the renderer can
// swap in the grey sprite and so update logic can respawn it on death.
const makeDummy = (width: number, height: number): Enemy => ({
  id: `dummy_${Math.random().toString(36).slice(2, 8)}`,
  // 150px ahead — within the brute's 200px slam range so test mode exercises
  // every melee class (the blitzer/wizard reach it regardless of distance).
  pos: { x: width / 2 + 150, y: height / 2 },
  radius: 14,
  hp: 250,
  maxHp: 250,
  speed: 0,
  isBoss: false,
  damage: 0,
  burnTicks: 0,
  burnTimer: 0,
  slowTimer: 0,
  flashTimer: 0,
  tier: 0,
  paralyzedTimer: 0,
  shockTimer: 0,
  cursedTimer: 0,
  soakedTimer: 0,
  evaporateTimer: 0,
  enhancedBurn: false,
  superShock: false,
  isDummy: true,
});

export const updateGame = (
  state: TransientGameState,
  dt: number,
  keys: { [key: string]: boolean },
  width: number,
  height: number,
  gameState: GameState,
  syncState: (updates: Partial<GameState>) => void
) => {
  if (!state.roundActive) return;

  const { player, enemies, projectiles, particles, texts, coins } = state;

  // --- Shoulder Charge clash QTE ------------------------------------------
  // While the clash is unresolved the whole world freezes: no movement,
  // attacks, or enemy updates — only the QTE timer runs, so it can never
  // soft-lock (timeout resolves as a miss).
  if (state.bruteClash && state.bruteClash.resolved === null) {
    const clash = state.bruteClash;
    clash.timer += dt;
    const pressed = takePendingClashHit();
    const timedOut = clash.timer >= CLASH_WINDOW;
    if (pressed || timedOut) {
      // Grade the timing: perfect zone is when the shrinking ring has almost
      // reached the inner target ring (progress ≤ CLASH_PERFECT_ZONE).
      const prog = Math.max(0, 1 - clash.timer / CLASH_WINDOW);
      let result: "perfect" | "good" | "miss";
      if (!pressed || timedOut) {
        result = "miss";
      } else if (prog <= CLASH_PERFECT_ZONE) {
        result = "perfect";
      } else {
        result = "good";
      }
      clash.resolved = result;
      clash.timer = 0; // reuse the timer for the result linger

      const dmg = result === "perfect" ? CHARGE_DAMAGE * CLASH_DAMAGE_MULT
                : result === "good"    ? CHARGE_DAMAGE * CLASH_GOOD_DAMAGE_MULT
                : CHARGE_DAMAGE;
      const kb  = result === "perfect" ? CLASH_KNOCKBACK
                : result === "good"    ? CLASH_GOOD_KNOCKBACK
                : CHARGE_KNOCKBACK;
      const dmgColor = result === "perfect" ? "#FBBF24"
                     : result === "good"    ? "#FB923C"
                     : BRUTE_ABILITY_COLOR;

      // Launch speed and chain-damage config (defined here to stay near the clash block).
      // perfect: ~340 px at 970 px/s over 0.35 s.  good: ~200 px at 715 px/s over 0.28 s.
      const LAUNCH_SPEED_PERFECT = 970;
      const LAUNCH_SPEED_GOOD   = 715;
      const LAUNCH_TIME_PERFECT = 0.35;
      const LAUNCH_TIME_GOOD    = 0.28;
      // Chain collision: launched enemy deals this much damage to each enemy it plows through.
      const CHAIN_DMG_PERFECT = CHARGE_DAMAGE * CLASH_DAMAGE_MULT * 0.5;    // 8
      const CHAIN_DMG_GOOD    = CHARGE_DAMAGE * CLASH_GOOD_DAMAGE_MULT * 0.4; // 3.2
      // Bonus damage to the launched enemy itself if it smacks a wall.
      const WALL_DMG_PERFECT = 4;
      const WALL_DMG_GOOD    = 2;

      enemies.forEach(e => {
        if (e.markedForDeletion || !clash.enemyIds.includes(e.id)) return;
        // Same curse/evaporate amplifiers applyDmg uses (brute never charges
        // the wizard/blitzer meters, so inline application is equivalent).
        let mult = 1;
        if (e.cursedTimer > 0) mult *= 1.5;
        if (e.evaporateTimer > 0) mult *= 1.5;
        const dealt = dmg * mult;
        e.hp -= dealt;
        e.flashTimer = 0.2;
        spawnText(state, e.pos, dealt.toFixed(1), dmgColor);
        spawnParticles(state, e.pos, result === "miss" ? "#EF4444" : dmgColor);
        if (result === "perfect") spawnParticles(state, e.pos, "#FDE68A");

        if (result === "perfect" || result === "good") {
          // Visually tween the enemy through the air instead of teleporting.
          const speed = result === "perfect" ? LAUNCH_SPEED_PERFECT : LAUNCH_SPEED_GOOD;
          const travelTime = result === "perfect" ? LAUNCH_TIME_PERFECT : LAUNCH_TIME_GOOD;
          const chainDmg  = result === "perfect" ? CHAIN_DMG_PERFECT : CHAIN_DMG_GOOD;
          const wallDmg   = result === "perfect" ? WALL_DMG_PERFECT : WALL_DMG_GOOD;
          const color     = result === "perfect" ? "#FBBF24" : "#FB923C";
          // Remove any existing launch entry for this enemy so a fresh one takes over.
          state.launchedEnemies = state.launchedEnemies.filter(lc => lc.enemyId !== e.id);
          state.launchedEnemies.push({
            enemyId: e.id,
            vel: { x: clash.dir.x * speed, y: clash.dir.y * speed },
            timeLeft: travelTime,
            chainDmg,
            wallDmg,
            hitIds: new Set(clash.enemyIds), // don't chain-hit siblings from the same clash
            color,
            hasHitWall: false,
          });
        } else {
          // Miss: small instant shove (unchanged original behaviour).
          const startX = e.pos.x;
          const startY = e.pos.y;
          e.pos.x = Math.max(e.radius, Math.min(width - e.radius, e.pos.x + clash.dir.x * kb));
          e.pos.y = Math.max(e.radius, Math.min(height - e.radius, e.pos.y + clash.dir.y * kb));
          advanceSlimeTrail(state, e, dt, Math.hypot(e.pos.x - startX, e.pos.y - startY));
        }
      });

      if (result === "perfect") {
        spawnText(state, { x: clash.pos.x, y: clash.pos.y - 44 }, "PERFECT!", "#FBBF24");
        state.shakeTimer = Math.max(state.shakeTimer, 0.4);
        sfxClashSuccess();
        // The full (long) cooldown was already applied when the charge began.
      } else if (result === "good") {
        spawnText(state, { x: clash.pos.x, y: clash.pos.y - 44 }, "GOOD!", "#FB923C");
        state.shakeTimer = Math.max(state.shakeTimer, 0.22);
        sfxClashSuccess();
        // Good hit: keep the full cooldown (earned something, just not peak).
      } else {
        spawnText(state, { x: clash.pos.x, y: clash.pos.y - 44 }, "MISS", "#9CA3AF");
        // Consolation: the long cooldown restarts at half length.
        player.bruteChargeCd = CHARGE_COOLDOWN * CLASH_MISS_CD_FRACTION;
        state.shakeTimer = Math.max(state.shakeTimer, 0.12);
        sfxClashMiss();
      }
    } else {
      // Continuous strain shake while the two are locked.
      state.shakeTimer = Math.max(state.shakeTimer, 0.05);
    }
    // Mirror for the HUD/overlay even though the rest of the frame is skipped.
    liveBruteState.clashActive = clash.resolved === null;
    liveBruteState.clashProgress = Math.max(0, 1 - clash.timer / CLASH_WINDOW);
    liveBruteState.clashResult = clash.resolved;
    if (clash.resolved === null) return; // hold the freeze until resolved
  }

  // Every prior ultimate use scales up the charge required by ALL ultimates
  // (blitzer Blitz Storm + wizard Divine Pillar) so repeat ults cost more.
  const ultPenaltyMult = 1 + (gameState.ultChargePenalty ?? 0) * ULT_PENALTY_STEP;
  const blitzerUltThreshold = BLITZER_ULT_CHARGE_DAMAGE * ultPenaltyMult;
  const wizardUltThreshold = ULT_CHARGE_DAMAGE * ultPenaltyMult;

  // Move player
  let dx = 0, dy = 0;
  if (keys.w || keys.ArrowUp) dy -= 1;
  if (keys.s || keys.ArrowDown) dy += 1;
  if (keys.a || keys.ArrowLeft) dx -= 1;
  if (keys.d || keys.ArrowRight) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len; dy /= len;
    // Remember the latest movement direction so the Lightning Dash has a
    // sensible blink vector even on the frame the key is tapped while standing.
    player.blitzerFacing.x = dx;
    player.blitzerFacing.y = dy;
  }

  const slowedBySlime = state.slimePuddles.some(
    puddle => distSq(player.pos, puddle.pos) < (player.radius + puddle.radius) ** 2
  );
  const playerSpeed = player.speed * (slowedBySlime ? SLIME_PUDDLE_SLOW_MULTIPLIER : 1);
  player.pos.x = Math.max(player.radius, Math.min(width - player.radius, player.pos.x + dx * playerSpeed * dt));
  player.pos.y = Math.max(player.radius, Math.min(height - player.radius, player.pos.y + dy * playerSpeed * dt));

  state.playerMoving = dx !== 0 || dy !== 0;
  state.animTime += dt;

  // Test mode: live-apply slider-driven upgrade level to the active player.
  if (gameState.testMode) {
    const tc = testControls.upgradeCounts;
    if (player.classType === "blitzer") {
      player.attackInterval = 0.1 * Math.pow(0.9, tc);
    } else if (player.classType === "brute") {
      player.bruteDamage = 3 + tc;
    } else if (player.classType === "wizard") {
      player.wizardSpells = tc;
    }
  }

  // Mirror wizard live-state for the side HUD (cooldowns + unlocks).
  liveWizardState.isWizard = player.classType === "wizard";
  if (liveWizardState.isWizard) {
    liveWizardState.wizardSpells = player.wizardSpells;
    // Copy timers (cheap — 5 keys)
    for (const k of Object.keys(player.spellTimers)) {
      liveWizardState.spellTimers[k] = player.spellTimers[k];
    }
  }

  liveBlitzerState.isBlitzer = player.classType === "blitzer";
  if (!liveBlitzerState.isBlitzer) resetBlitzerState();

  // Mirror wizard-ultimate live-state for the bottom Divine Pillar bar.
  liveWizardUltimateState.isWizard = player.classType === "wizard";
  if (!liveWizardUltimateState.isWizard) resetWizardUltimateState();

  if (player.iFrames > 0) player.iFrames -= dt;
  if (state.shakeTimer > 0) state.shakeTimer -= dt;
  if (state.announcement) {
    state.announcement.timer -= dt;
    if (state.announcement.timer <= 0) state.announcement = null;
  }

  let needSync = false;
  const updates: Partial<GameState> = {};

  // Slime patches fade independently. A single strongest overlapping puddle
  // controls the one-second hazard tick so dense trails remain dangerous but
  // never become frame-rate or overlap-count damage.
  state.slimePuddles.forEach(puddle => { puddle.lifeTime -= dt; });
  state.slimePuddles = state.slimePuddles.filter(puddle => puddle.lifeTime > 0);
  const puddlesUnderPlayer = state.slimePuddles.filter(
    puddle => distSq(player.pos, puddle.pos) < (player.radius + puddle.radius) ** 2
  );
  if (puddlesUnderPlayer.length) {
    state.slimeDamageTimer -= dt;
    if (state.slimeDamageTimer <= 0) {
      state.slimeDamageTimer += SLIME_PUDDLE_DAMAGE_INTERVAL;
      const strongest = puddlesUnderPlayer.reduce((best, puddle) =>
        puddle.sourceDamage > best.sourceDamage ? puddle : best
      );
      if (player.iFrames <= 0 && !state.wizardShield) {
        const damage = Math.max(0.25, strongest.sourceDamage * SLIME_PUDDLE_DAMAGE_MULTIPLIER);
        player.hp -= damage;
        player.iFrames = 0.25;
        spawnText(state, player.pos, `-${damage.toFixed(1)}`, strongest.color);
        sfxHurt();
        updates.playerHp = player.hp;
        needSync = true;
        if (player.hp <= 0) {
          updates.screen = "gameover";
          state.roundActive = false;
        }
      }
    }
  } else {
    state.slimeDamageTimer = 0;
  }

  // Damage helper — automatically applies the ×1.5 curse amplifier if active.
  // Returns actual damage dealt (for accurate floating text).
  const applyDmg = (e: Enemy, amount: number, isUltimate = false, noCharge = false): number => {
    let mult = 1;
    if (e.cursedTimer > 0) mult *= 1.5;
    if (e.evaporateTimer > 0) mult *= 1.5;
    const actual = amount * mult;
    e.hp -= actual;
    // Charge the Divine Pillar from spell damage dealt (wizard only). Divine
    // Radiance ticks / shockwave (isUltimate) never recharge the meter, and we
    // pause charging while the sequence is already running so it can't refill.
    if (
      player.classType === "wizard" &&
      !isUltimate &&
      !noCharge &&
      !liveWizardUltimateState.ready &&
      !state.wizardShield
    ) {
      player.wizardUltCharge = Math.min(wizardUltThreshold, player.wizardUltCharge + actual);
    }
    // Charge the blitzer's Blitz Storm from damage dealt. The storm's own
    // streaks pass isUltimate=true so they can't refill the meter mid-cast.
    if (player.classType === "blitzer" && !isUltimate && !noCharge && !state.blitzerUltimate) {
      player.blitzerUltCharge = Math.min(blitzerUltThreshold, player.blitzerUltCharge + actual);
    }
    return actual;
  };

  // Attacks
  const getNearestEnemies = (n: number) => {
    return [...enemies]
      .sort((a, b) => distSq(player.pos, a.pos) - distSq(player.pos, b.pos))
      .slice(0, n);
  };

  const nearest = getNearestEnemies(1)[0];

  if (player.classType === "blitzer") {
    const baseInterval = player.attackInterval;        // 0.1s base, scales with upgrades
    const comboHitInterval = baseInterval / 6;         // 6x faster during combo
    const PUNCH_DAMAGE = 0.1;

    const spawnPunch = (target: Enemy, fromAngle: number, isCombo: boolean) => {
      const actualPunch = applyDmg(target, PUNCH_DAMAGE);
      target.flashTimer = 0.08;
      spawnText(state, target.pos, actualPunch.toFixed(2), isCombo ? "#F0F9FF" : "#E0F2FE");
      spawnParticles(state, target.pos, isCombo ? "#E0F2FE" : "#7DD3FC");
      if (target.isBoss) state.shakeTimer = Math.max(state.shakeTimer, 0.06);
      state.fistSlams.push({
        id: `bf_${Math.random()}`,
        targetPos: { x: target.pos.x, y: target.pos.y },
        timer: 0,
        phase: "impact",
        enemyId: target.id,
        damage: 0,                // already applied above
        kind: "punch",
        fromAngle,
      });
    };

    // --- Blitz Storm ultimate -------------------------------------------------
    // Apply one streak: damage every enemy hugging the anchor→end line once and
    // drop afterimages along it for the speed-line look.
    const fireStormStreak = (anchor: Vector2, end: Vector2, damage: number) => {
      const hitR2 = ULT_DASH_HIT_RADIUS * ULT_DASH_HIT_RADIUS;
      enemies.forEach(e => {
        if (e.markedForDeletion) return;
        if (distToSegmentSq(e.pos, anchor, end) < hitR2) {
          const dealt = applyDmg(e, damage, true); // isUltimate: doesn't recharge the meter
          e.flashTimer = 0.15;
          spawnText(state, e.pos, dealt.toFixed(0), CLONE_FINAL_COLOR);
          spawnParticles(state, e.pos, "#A5F3FC");
          if (e.isBoss) state.shakeTimer = Math.max(state.shakeTimer, 0.12);
        }
      });
      const steps = 5;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        state.blitzerDashTrail.push({
          pos: { x: anchor.x + (end.x - anchor.x) * t, y: anchor.y + (end.y - anchor.y) * t },
          timer: ULT_TRAIL_FADE,
          maxTime: ULT_TRAIL_FADE,
        });
      }
      // Leave a persistent afterimage at the dash endpoint. It stays frozen for
      // the whole storm, then shatters for AoE damage once the storm ends.
      state.blitzerUltGhosts.push({ pos: { x: end.x, y: end.y }, shattering: false, shatterTimer: 0 });
    };

    // While the storm plays, the blitzer streaks out from a locked anchor in 8
    // directions (one per ULT_DASH_TIME window) and normal attacking/abilities
    // are suppressed below until it finishes.
    if (state.blitzerUltimate) {
      const ult = state.blitzerUltimate;
      ult.timer += dt;
      const end = ult.ends[Math.min(ult.index, ult.ends.length - 1)];
      const prog = Math.min(1, ult.timer / ULT_DASH_TIME);
      player.pos.x = ult.anchor.x + (end.x - ult.anchor.x) * prog;
      player.pos.y = ult.anchor.y + (end.y - ult.anchor.y) * prog;
      player.iFrames = Math.max(player.iFrames, 0.1); // invulnerable throughout the storm
      if (ult.timer >= ULT_DASH_TIME) {
        ult.index += 1;
        player.pos.x = ult.anchor.x;
        player.pos.y = ult.anchor.y;
        if (ult.index >= ult.ends.length) {
          // Storm complete — every persistent afterimage shatters at once,
          // dealing one-time AoE damage to enemies near each ghost.
          const shatterR2 = ULT_GHOST_SHATTER_RADIUS * ULT_GHOST_SHATTER_RADIUS;
          sfxBlitzShatter();
          let shatterCount = 0;
          state.blitzerUltGhosts.forEach(g => {
            if (g.shattering) return; // already burst — never double-apply
            g.shattering = true;
            g.shatterTimer = 0;
            shatterCount += 1;
            enemies.forEach(e => {
              if (e.markedForDeletion) return;
              if (distSq(e.pos, g.pos) < shatterR2) {
                const dealt = applyDmg(e, ult.shatterDamage, true);
                e.flashTimer = 0.2;
                spawnText(state, e.pos, dealt.toFixed(0), CLONE_FINAL_COLOR);
                spawnParticles(state, e.pos, "#A5F3FC");
                if (e.isBoss) state.shakeTimer = Math.max(state.shakeTimer, 0.12);
              }
            });
            spawnParticles(state, g.pos, "#E0F2FE");
          });
          state.shakeTimer = Math.max(state.shakeTimer, 0.3);
          // EACH afterimage shatter raises the charge required by EVERY ultimate
          // (blitzer + wizard) next time — the more ghosts burst, the steeper it gets.
          gameState.ultChargePenalty = (gameState.ultChargePenalty ?? 0) + shatterCount;
          state.blitzerUltimate = null; // storm complete — home and clear
        } else {
          ult.timer = 0;
          fireStormStreak(ult.anchor, ult.ends[ult.index], ult.damage);
        }
      }
    }

    // Advance shattering afterimages and drop them once their burst has faded.
    if (state.blitzerUltGhosts.length) {
      for (const g of state.blitzerUltGhosts) {
        if (g.shattering) g.shatterTimer += dt;
      }
      state.blitzerUltGhosts = state.blitzerUltGhosts.filter(
        g => !g.shattering || g.shatterTimer < ULT_GHOST_SHATTER_DURATION
      );
    }

    if (!state.blitzerUltimate) {
    if (player.blitzerCombo) {
      // 5-second barrage: 6 fists circle the nearest target at 6x speed.
      const combo = player.blitzerCombo;
      // Re-target nearest if the original target died so the barrage keeps going.
      let target = enemies.find(e => e.id === combo.enemyId && !e.markedForDeletion);
      if (!target) target = getNearestEnemies(1)[0];
      if (target) combo.enemyId = target.id;
      combo.timeLeft -= dt;
      if (!target || combo.timeLeft <= 0) {
        player.blitzerCombo = null;
        player.blitzerHitCount = 0;   // blitzerHitCount reused as charge-time accumulator
      } else {
        combo.nextHitTimer -= dt;
        if (combo.nextHitTimer <= 0) {
          const angle = (combo.fistIndex / 6) * Math.PI * 2;
          spawnPunch(target, angle, true);
          combo.fistIndex = (combo.fistIndex + 1) % 6;
          combo.nextHitTimer = combo.hitInterval;
        }
      }
    } else {
      // Charge bar fills over CHARGE_DURATION seconds while enemies are present.
      // This is time-based so it stays constant regardless of attack speed / level.
      if (nearest) player.blitzerHitCount += dt;   // blitzerHitCount = seconds charged

      // Normal punching continues at full attack speed independent of charge.
      if (nearest) {
        player.attackTimer -= dt;
        if (player.attackTimer <= 0) {
          player.attackTimer = baseInterval;
          const angle = Math.random() * Math.PI * 2;
          spawnPunch(nearest, angle, false);
        }
      }

      // Trigger barrage once the bar is full.
      if (player.blitzerHitCount >= CHARGE_DURATION && nearest) {
        player.blitzerCombo = {
          enemyId: nearest.id,
          timeLeft: COMBO_DURATION,
          nextHitTimer: 0,
          hitInterval: comboHitInterval,
          fistIndex: 0,
        };
        player.blitzerHitCount = 0;
        state.shakeTimer = Math.max(state.shakeTimer, 0.15);
      }
    }
    } // end !blitzerUltimate — normal attack/barrage suppressed during the storm

    // Mirror barrage charge for the right-side HUD bar.
    if (player.blitzerCombo) {
      liveBlitzerState.barrageActive = true;
      liveBlitzerState.barragePct = Math.max(0, player.blitzerCombo.timeLeft / COMBO_DURATION);
      liveBlitzerState.charge = 1;
    } else {
      liveBlitzerState.barrageActive = false;
      liveBlitzerState.barragePct = 0;
      liveBlitzerState.charge = Math.min(1, player.blitzerHitCount / CHARGE_DURATION);
    }

    // --- Active abilities: Lightning Dash / Overclock / Phantom Clones ---
    // The same upgrade counter that speeds up punches also scales the clones'
    // final strike, so the burst grows visibly as the player buys upgrades.
    const blitzerLevel = gameState.testMode ? testControls.upgradeCounts : gameState.upgradeCounts;

    // Tick cooldowns and the Overclock active window.
    if (player.blitzerDashCd > 0) player.blitzerDashCd -= dt;
    if (player.blitzerClonesCd > 0) player.blitzerClonesCd -= dt;
    if (player.blitzerOverclockActive > 0) {
      player.blitzerOverclockActive -= dt;
      if (player.blitzerOverclockActive <= 0) {
        player.blitzerOverclockActive = 0;
        player.blitzerOverclockCd = OVERCLOCK_COOLDOWN; // cooldown starts when it ends
      }
    } else if (player.blitzerOverclockCd > 0) {
      player.blitzerOverclockCd -= dt;
    }

    // Lightning Dash [SHIFT] — instant blink along the facing direction, brief
    // i-frames, and one-time damage to every enemy hugging the dash line.
    if (takePendingDash() && player.blitzerDashCd <= 0 && !state.blitzerUltimate) {
      let dirX = player.blitzerFacing.x, dirY = player.blitzerFacing.y;
      const dlen = Math.hypot(dirX, dirY) || 1;
      dirX /= dlen; dirY /= dlen;
      const start = { x: player.pos.x, y: player.pos.y };
      const end = {
        x: Math.max(player.radius, Math.min(width - player.radius, start.x + dirX * DASH_DISTANCE)),
        y: Math.max(player.radius, Math.min(height - player.radius, start.y + dirY * DASH_DISTANCE)),
      };
      const hitR2 = DASH_HIT_RADIUS * DASH_HIT_RADIUS;
      enemies.forEach(e => {
        if (e.markedForDeletion) return;
        if (distToSegmentSq(e.pos, start, end) < hitR2) {
          const dealt = applyDmg(e, DASH_DAMAGE);
          e.flashTimer = 0.12;
          spawnText(state, e.pos, dealt.toFixed(1), BLITZER_DMG_COLOR);
          spawnParticles(state, e.pos, "#7DD3FC");
        }
      });
      // Fading electric afterimages dropped evenly along the blink path.
      const steps = 6;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        state.blitzerDashTrail.push({
          pos: { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t },
          timer: DASH_TRAIL_FADE,
          maxTime: DASH_TRAIL_FADE,
        });
      }
      player.pos.x = end.x;
      player.pos.y = end.y;
      player.iFrames = Math.max(player.iFrames, DASH_IFRAMES);
      player.blitzerDashCd = DASH_COOLDOWN;
      state.shakeTimer = Math.max(state.shakeTimer, 0.08);
      sfxDash();
    }

    // Overclock [Q] — open the bullet-time window (enemy time-step scaling is
    // applied below in the enemy/projectile updates).
    if (takePendingOverclock() && player.blitzerOverclockCd <= 0 && player.blitzerOverclockActive <= 0 && !state.blitzerUltimate) {
      player.blitzerOverclockActive = OVERCLOCK_DURATION;
      state.shakeTimer = Math.max(state.shakeTimer, 0.2);
      spawnText(state, { x: player.pos.x, y: player.pos.y - 32 }, "OVERCLOCK", "#A5F3FC");
      sfxOverclock();
    }

    // Phantom Clones [E] — spawn afterimages ringing the nearest enemy.
    if (takePendingClones() && player.blitzerClonesCd <= 0 && !state.blitzerUltimate) {
      const cx = nearest ? nearest.pos.x : player.pos.x;
      const cy = nearest ? nearest.pos.y : player.pos.y;
      const finalDamage = CLONE_FINAL_BASE + blitzerLevel * CLONE_FINAL_PER_LEVEL;
      for (let i = 0; i < CLONE_COUNT; i++) {
        const ang = (i / CLONE_COUNT) * Math.PI * 2 + Math.random() * 0.4;
        state.phantomClones.push({
          pos: { x: cx + Math.cos(ang) * 48, y: cy + Math.sin(ang) * 48 },
          angle: ang,
          life: CLONES_DURATION,
          maxLife: CLONES_DURATION,
          strikeTimer: (i / CLONE_COUNT) * CLONE_STRIKE_INTERVAL, // stagger the strikes
          finalDamage,
          flashTimer: 0,
        });
      }
      player.blitzerClonesCd = CLONES_COOLDOWN;
      state.shakeTimer = Math.max(state.shakeTimer, 0.12);
      spawnText(state, { x: player.pos.x, y: player.pos.y - 32 }, "PHANTOMS", "#A5F3FC");
      sfxClones();
    }

    // Blitz Storm [R] — multidirectional dash storm; fires when the meter is full.
    if (
      takePendingBlitzerUltimate() &&
      player.blitzerUltCharge >= blitzerUltThreshold &&
      !state.blitzerUltimate
    ) {
      const anchor = { x: player.pos.x, y: player.pos.y };
      const reach = Math.hypot(width, height); // always long enough to reach an edge
      // Order: up, down, left, right, then the four diagonals.
      const dirs: Vector2[] = [
        { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
        { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 },
      ];
      const ends = dirs.map(d => {
        const len = Math.hypot(d.x, d.y) || 1;
        return {
          x: Math.max(player.radius, Math.min(width - player.radius, anchor.x + (d.x / len) * reach)),
          y: Math.max(player.radius, Math.min(height - player.radius, anchor.y + (d.y / len) * reach)),
        };
      });
      const damage = ULT_DASH_DAMAGE_BASE + blitzerLevel * ULT_DASH_DAMAGE_PER_LEVEL;
      const shatterDamage = ULT_GHOST_SHATTER_DAMAGE_BASE + blitzerLevel * ULT_GHOST_SHATTER_DAMAGE_PER_LEVEL;
      state.blitzerUltimate = { anchor, ends, index: 0, timer: 0, damage, shatterDamage };
      player.blitzerUltCharge = 0;
      player.iFrames = Math.max(player.iFrames, ULT_DASH_TIME * ends.length + 0.1);
      state.shakeTimer = Math.max(state.shakeTimer, 0.25);
      spawnText(state, { x: anchor.x, y: anchor.y - 36 }, "BLITZ STORM", "#A5F3FC");
      sfxBlitzFire();
      fireStormStreak(anchor, ends[0], damage); // frame-0 streak deals damage immediately
    }

    // Mirror ability cooldown / active state for the HUD readout.
    liveBlitzerState.dashCdPct = Math.max(0, player.blitzerDashCd / DASH_COOLDOWN);
    liveBlitzerState.dashReady = player.blitzerDashCd <= 0;
    liveBlitzerState.overclockActive = player.blitzerOverclockActive > 0;
    liveBlitzerState.overclockCdPct = player.blitzerOverclockActive > 0
      ? 1
      : Math.max(0, player.blitzerOverclockCd / OVERCLOCK_COOLDOWN);
    liveBlitzerState.overclockReady = player.blitzerOverclockActive <= 0 && player.blitzerOverclockCd <= 0;
    liveBlitzerState.clonesActive = state.phantomClones.length > 0;
    liveBlitzerState.clonesCdPct = Math.max(0, player.blitzerClonesCd / CLONES_COOLDOWN);
    liveBlitzerState.clonesReady = player.blitzerClonesCd <= 0;
    liveBlitzerState.ultActive = !!state.blitzerUltimate;
    liveBlitzerState.ultReady = player.blitzerUltCharge >= blitzerUltThreshold && !state.blitzerUltimate;
    liveBlitzerState.ultCharge = Math.min(1, player.blitzerUltCharge / blitzerUltThreshold);
    // Persist charge + escalating penalty so they carry into the next round
    // (rides the next critical sync; always present on the round-end flush).
    updates.blitzerUltCharge = player.blitzerUltCharge;
    updates.ultChargePenalty = gameState.ultChargePenalty ?? 0;
  } else if (player.classType === "brute") {
    // --- Active abilities: Shoulder Charge / Ground Quake / Berserker Rage ---
    // Tick cooldowns and the Rage active window.
    if (player.bruteChargeCd > 0) player.bruteChargeCd -= dt;
    if (player.bruteQuakeCd > 0) player.bruteQuakeCd -= dt;
    if (player.bruteRageActive > 0) {
      player.bruteRageActive -= dt;
      if (player.bruteRageActive <= 0) {
        player.bruteRageActive = 0;
        player.bruteRageCd = RAGE_COOLDOWN; // cooldown starts when the fury ends
      }
    } else if (player.bruteRageCd > 0) {
      player.bruteRageCd -= dt;
    }

    // Shoulder Charge [SHIFT] — start a short rush along the facing direction.
    if (
      takePendingCharge() &&
      player.bruteChargeCd <= 0 &&
      !state.bruteCharge &&
      (gameState.testMode || gameState.round >= ABILITIES_UNLOCK_ROUND)
    ) {
      let dirX = player.blitzerFacing.x, dirY = player.blitzerFacing.y;
      const dlen = Math.hypot(dirX, dirY) || 1;
      state.bruteCharge = {
        dir: { x: dirX / dlen, y: dirY / dlen },
        timeLeft: BRUTE_CHARGE_DURATION,
        hitIds: new Set<string>(),
      };
      player.bruteChargeCd = CHARGE_COOLDOWN;
      state.shakeTimer = Math.max(state.shakeTimer, 0.1);
      sfxBruteCharge();
    }

    // Advance the rush: high-speed movement + plow-through damage/knockback.
    if (state.bruteCharge) {
      const ch = state.bruteCharge;
      ch.timeLeft -= dt;
      player.pos.x = Math.max(player.radius, Math.min(width - player.radius, player.pos.x + ch.dir.x * CHARGE_SPEED * dt));
      player.pos.y = Math.max(player.radius, Math.min(height - player.radius, player.pos.y + ch.dir.y * CHARGE_SPEED * dt));
      // Fading afterimages along the rush path (reuses the dash-trail pool).
      state.blitzerDashTrail.push({
        pos: { x: player.pos.x, y: player.pos.y },
        timer: 0.3,
        maxTime: 0.3,
      });
      // First enemy contact ends the rush and opens the clash QTE instead of
      // resolving damage immediately. No contact → the rush just expires and
      // the full (long) cooldown set at activation stands.
      const hitR2 = CHARGE_HIT_RADIUS * CHARGE_HIT_RADIUS;
      const contacts = enemies.filter(e => !e.markedForDeletion && distSq(player.pos, e.pos) < hitR2);
      if (contacts.length > 0) {
        const first = contacts[0];
        state.bruteClash = {
          pos: { x: (player.pos.x + first.pos.x) / 2, y: (player.pos.y + first.pos.y) / 2 },
          dir: { x: ch.dir.x, y: ch.dir.y },
          enemyIds: contacts.map(e => e.id),
          timer: 0,
          resolved: null,
        };
        state.bruteCharge = null;
        contacts.forEach(e => { e.flashTimer = 0.15; });
        state.shakeTimer = Math.max(state.shakeTimer, 0.15);
        sfxClashLock();
      } else if (ch.timeLeft <= 0) {
        state.bruteCharge = null;
      }
    }

    // Result linger — hold the resolved clash pose briefly for the flash, then clear.
    if (state.bruteClash && state.bruteClash.resolved !== null) {
      state.bruteClash.timer += dt;
      if (state.bruteClash.timer >= CLASH_RESULT_LINGER) state.bruteClash = null;
    }

    // Ground Quake [Q] — instant stomp: AoE damage + brief paralyze.
    if (
      takePendingQuake() &&
      player.bruteQuakeCd <= 0 &&
      (gameState.testMode || gameState.round >= ABILITIES_UNLOCK_ROUND)
    ) {
      player.bruteQuakeCd = QUAKE_COOLDOWN;
      state.bruteQuake = { pos: { x: player.pos.x, y: player.pos.y }, timer: 0 };
      const r2 = QUAKE_RADIUS * QUAKE_RADIUS;
      enemies.forEach(e => {
        if (e.markedForDeletion) return;
        if (distSq(player.pos, e.pos) < r2) {
          const dealt = applyDmg(e, QUAKE_DAMAGE);
          e.flashTimer = 0.15;
          e.paralyzedTimer = Math.max(e.paralyzedTimer, QUAKE_PARALYZE);
          spawnText(state, e.pos, dealt.toFixed(1), BRUTE_ABILITY_COLOR);
          spawnParticles(state, e.pos, "#FBBF24");
        }
      });
      state.shakeTimer = Math.max(state.shakeTimer, 0.35);
      sfxQuake();
    }

    // Berserker Rage [E] — open the fury window (modifiers applied below).
    if (
      takePendingRage() &&
      player.bruteRageCd <= 0 &&
      player.bruteRageActive <= 0 &&
      (gameState.testMode || gameState.round >= ABILITIES_UNLOCK_ROUND)
    ) {
      player.bruteRageActive = RAGE_DURATION;
      state.shakeTimer = Math.max(state.shakeTimer, 0.2);
      spawnText(state, { x: player.pos.x, y: player.pos.y - 32 }, "RAGE", "#F87171");
      spawnParticles(state, player.pos, "#EF4444");
      sfxRage();
    }

    // Quake shockwave ring visual clock.
    if (state.bruteQuake) {
      state.bruteQuake.timer += dt;
      if (state.bruteQuake.timer >= QUAKE_RING_DURATION) state.bruteQuake = null;
    }

    // Auto-smash — Rage speeds up the swing interval and amplifies damage.
    const raging = player.bruteRageActive > 0;
    player.attackTimer -= dt;
    if (player.attackTimer <= 0) {
      player.attackTimer = raging ? 3 * RAGE_ATTACK_INTERVAL_MULT : 3;
      const targets = getNearestEnemies(3);
      targets.forEach(t => {
        if (distSq(player.pos, t.pos) < 200 * 200) {
          state.fistSlams.push({
            id: `fist_${Math.random()}`,
            targetPos: { x: t.pos.x, y: t.pos.y },
            timer: 0,
            phase: "drop",
            enemyId: t.id,
            damage: raging ? player.bruteDamage * RAGE_DAMAGE_MULT : player.bruteDamage,
          });
        }
      });
    }
  } else if (player.classType === "wizard") {
    // Tick all cooldowns each frame regardless of cast input.
    for (const key of Object.keys(player.spellTimers)) {
      if (player.spellTimers[key] > 0) player.spellTimers[key] -= dt;
    }
    // Drain cast requests from key presses / HUD button clicks.
    const requests = takePendingCasts();

    if (requests.has("fireball") && player.spellTimers.fireball <= 0 && nearest) {
      player.spellTimers.fireball = 1.5;
      sfxWizardCast();
      const angle = Math.atan2(nearest.pos.y - player.pos.y, nearest.pos.x - player.pos.x);
      projectiles.push({
        id: `p_${Math.random()}`,
        pos: { ...player.pos },
        radius: 6,
        vel: { x: Math.cos(angle) * 300, y: Math.sin(angle) * 300 },
        damage: 0.5,
        pierce: 1,
        lifeTime: 3,
        type: "fireball"
      });
    }

    if (player.wizardSpells >= 1) {
      if (requests.has("thunderbolt") && player.spellTimers.thunderbolt <= 0 && nearest) {
        player.spellTimers.thunderbolt = 2;

        // Build chain: primary target then up to 2 bounces, each to the nearest
        // unhit enemy within bounce range.
        const BOUNCE_RANGE_SQ = 220 * 220;
        const hitTargets: Enemy[] = [nearest];
        let current = nearest;
        for (let b = 0; b < 2; b++) {
          let bestEnemy: Enemy | null = null;
          let bestDistSq = BOUNCE_RANGE_SQ;
          for (const e of enemies) {
            if (e.markedForDeletion) continue;
            if (hitTargets.includes(e)) continue;
            const d = distSq(current.pos, e.pos);
            if (d < bestDistSq) {
              bestDistSq = d;
              bestEnemy = e;
            }
          }
          if (!bestEnemy) break;
          hitTargets.push(bestEnemy);
          current = bestEnemy;
        }

        // Damage falls off slightly on bounces; all hit targets are paralysed.
        // Soaked enemies suffer ×2 hit damage, 8 s paralysis (vs 5 s), and
        // 1.5× shock-tick damage for the duration of the paralysis.
        const damages = [2, 1.5, 1];
        hitTargets.forEach((e, idx) => {
          const wasSoaked = e.soakedTimer > 0;
          const boltDmg = damages[idx] * (wasSoaked ? 2 : 1);
          const actualBolt = applyDmg(e, boltDmg);
          e.flashTimer = 0.1;
          e.paralyzedTimer = wasSoaked ? 8 : 5;
          e.shockTimer = 0.5;
          // Explicitly set every reapplication — a later non-soaked
          // thunderbolt must NOT inherit a previous super-shock window.
          e.superShock = wasSoaked;
          if (wasSoaked) {
            e.soakedTimer = 0; // consumed
            spawnText(state, { x: e.pos.x, y: e.pos.y - 32 }, "ELECTROCUTED", "#FACC15");
            spawnParticles(state, e.pos, "#FDE047");
          }
          spawnText(state, e.pos, actualBolt.toFixed(1), "#93C5FD");
          spawnText(state, { x: e.pos.x, y: e.pos.y - 20 }, "PARALYZED", "#FDE047");
          if (e.isBoss) state.shakeTimer = 0.1;
          spawnParticles(state, e.pos, "#60A5FA");
        });

        // Build zigzag polyline through player → all hit targets
        const anchors: Vector2[] = [
          { ...player.pos },
          ...hitTargets.map(e => ({ ...e.pos })),
        ];
        const chainPoints: Vector2[] = [anchors[0]];
        for (let i = 1; i < anchors.length; i++) {
          const a = anchors[i - 1];
          const b = anchors[i];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len;  // perpendicular
          const ny = dx / len;
          const segs = Math.max(4, Math.floor(len / 18));
          for (let s = 1; s < segs; s++) {
            const t = s / segs;
            const jitter = (Math.random() - 0.5) * 18;
            chainPoints.push({
              x: a.x + dx * t + nx * jitter,
              y: a.y + dy * t + ny * jitter,
            });
          }
          chainPoints.push(b);
        }

        projectiles.push({
          id: `p_${Math.random()}`,
          pos: { ...nearest.pos },
          radius: 0,
          vel: { x: 0, y: 0 },
          damage: 0,
          pierce: 0,
          lifeTime: 0.25,
          maxLifeTime: 0.25,
          type: "thunderbolt",
          chainPoints,
        }); // Visual only
      }
    }

    if (player.wizardSpells >= 2) {
      if (requests.has("iceshard") && player.spellTimers.iceshard <= 0 && nearest) {
        player.spellTimers.iceshard = 3;
        const baseAngle = Math.atan2(nearest.pos.y - player.pos.y, nearest.pos.x - player.pos.x);
        [-0.3, 0, 0.3].forEach(offset => {
          projectiles.push({
            id: `p_${Math.random()}`,
            pos: { ...player.pos },
            radius: 5,
            vel: { x: Math.cos(baseAngle + offset) * 250, y: Math.sin(baseAngle + offset) * 250 },
            damage: 1,
            pierce: 1,
            lifeTime: 2,
            type: "iceshard"
          });
        });
      }
    }

    if (player.wizardSpells >= 3) {
      if (requests.has("waterwave") && player.spellTimers.waterwave <= 0) {
        player.spellTimers.waterwave = 4;
        projectiles.push({
          id: `p_${Math.random()}`,
          pos: { ...player.pos },
          radius: 10, // expands
          vel: { x: 0, y: 0 },
          damage: 1.5,
          pierce: 999,
          lifeTime: 0.5,
          type: "waterwave"
        });
      }
    }

    if (player.wizardSpells >= 4) {
      if (requests.has("arcaneorb") && player.spellTimers.arcaneorb <= 0 && nearest) {
        player.spellTimers.arcaneorb = 5;
        const angle = Math.atan2(nearest.pos.y - player.pos.y, nearest.pos.x - player.pos.x);
        projectiles.push({
          id: `p_${Math.random()}`,
          pos: { ...player.pos },
          radius: 8,
          vel: { x: Math.cos(angle) * 100, y: Math.sin(angle) * 100 },
          damage: 3,
          pierce: 5,
          lifeTime: 5,
          type: "arcaneorb"
        });
      }
    }

    // ---- Divine Pillar ultimate ----
    // Fires when the meter is full AND the player presses G. The HUD shows
    // "[G] READY" when the bar is full so the player knows to trigger it.
    const ultPressed = takePendingUltimate();
    if (
      ultPressed &&
      !state.wizardUlt &&
      !state.wizardShield &&
      player.wizardUltCharge >= wizardUltThreshold
    ) {
      liveWizardUltimateState.ready = true;
      liveWizardUltimateState.active = true;
      sfxWizardUlt();
      state.wizardUlt = {
        phase: "rings",
        center: { x: width / 2, y: height / 2 },
        ringsBuilt: 0,
        ringGrowT: 0,
        beamTimer: 0,
        stars: [],
        radianceTimer: RADIANCE_DURATION,
        radianceTickTimer: RADIANCE_TICK,
      };
      state.shakeTimer = Math.max(state.shakeTimer, 0.2);
    }

    // Advance the ultimate sequence state machine.
    if (state.wizardUlt) {
      const u = state.wizardUlt;
      if (u.phase === "rings") {
        // Build one rune ring at a time, each larger than the last.
        u.ringGrowT += dt / RING_BUILD_TIME;
        if (u.ringGrowT >= 1) {
          u.ringGrowT = 0;
          u.ringsBuilt++;
          state.shakeTimer = Math.max(state.shakeTimer, 0.1);
          if (u.ringsBuilt >= RING_COUNT) {
            // All five rings exist → fire the beam and spawn cosmetic stars.
            u.phase = "beam";
            u.beamTimer = 0;
            const starCount = 28;
            for (let i = 0; i < starCount; i++) {
              u.stars.push({
                angle: (i / starCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.25,
                dist: 0,
                speed: 360 + Math.random() * 340,
                len: 8 + Math.random() * 12,
                color: Math.random() < 0.5 ? "#FEF9C3" : "#FDE047",
              });
            }
            state.shakeTimer = Math.max(state.shakeTimer, 0.55);
          }
        }
      } else if (u.phase === "beam") {
        u.beamTimer += dt;
        if (u.beamTimer >= BEAM_DURATION) {
          // Beam has struck → start the radiant field and reset the meter.
          u.phase = "radiance";
          player.wizardUltCharge = 0;
        }
      } else if (u.phase === "radiance") {
        u.radianceTimer -= dt;
        u.radianceTickTimer -= dt;
        if (u.radianceTickTimer <= 0) {
          u.radianceTickTimer += RADIANCE_TICK;
          const nTicks = RADIANCE_DURATION / RADIANCE_TICK;
          const tickDmg = RADIANCE_TOTAL_DAMAGE / nTicks;
          enemies.forEach(e => {
            if (e.markedForDeletion) return;
            const dealt = applyDmg(e, tickDmg, true);
            e.flashTimer = Math.max(e.flashTimer, 0.08);
            spawnText(
              state,
              { x: e.pos.x + (Math.random() - 0.5) * 16, y: e.pos.y - 12 },
              dealt.toFixed(1),
              RADIANCE_COLOR
            );
          });
        }
        if (u.radianceTimer <= 0) {
          // Radiance complete → grant the aura + wings shield.
          state.wizardUlt = null;
          state.wizardShield = { breaking: false, breakTimer: 0 };
          liveWizardUltimateState.active = false;
          liveWizardUltimateState.ready = false;
          liveWizardUltimateState.shieldActive = true;
        }
      }

      // Advance cosmetic stars outward from the ring centre.
      for (const s of u.stars) s.dist += s.speed * dt;

      // Keep the player fully invulnerable for the entire Divine Pillar sequence.
      player.iFrames = Math.max(player.iFrames, 0.1);
    }

    // Mirror charge to the bottom Divine Pillar bar.
    liveWizardUltimateState.charge = Math.min(1, player.wizardUltCharge / wizardUltThreshold);
  }

  // Blitzer Overclock: scale the time-step used for enemy movement, enemy
  // projectiles, and the enemy approach so they crawl while the player and
  // player-spawned fists keep running at full speed. 1 = normal.
  const enemyTimeScale =
    player.classType === "blitzer" && player.blitzerOverclockActive > 0
      ? OVERCLOCK_ENEMY_SCALE
      : 1;
  const enemyDt = dt * enemyTimeScale;

  // Update projectiles
  projectiles.forEach(p => {
    p.pos.x += p.vel.x * enemyDt;
    p.pos.y += p.vel.y * enemyDt;
    p.lifeTime -= dt;
    if (p.type === "waterwave") {
      p.pos = { ...player.pos };
      p.radius += 300 * dt;
    } else if (p.type === "arcaneorb" && nearest) {
      const angle = Math.atan2(nearest.pos.y - p.pos.y, nearest.pos.x - p.pos.x);
      const speed = 100;
      p.vel.x += Math.cos(angle) * speed * dt;
      p.vel.y += Math.sin(angle) * speed * dt;
    }
    if (p.lifeTime <= 0) p.markedForDeletion = true;
  });

  // --- Launched-enemy flight (clash chain-collision + wall impact) ---
  // Must run BEFORE the main enemy forEach so chain-hit positions are up-to-date.
  if (state.launchedEnemies.length) {
    const CHAIN_KNOCKBACK = 70; // px the chain-hit victim is shoved in the launch direction
    state.launchedEnemies.forEach(lc => {
      const e = enemies.find(e => e.id === lc.enemyId && !e.markedForDeletion);
      if (!e) { lc.timeLeft = 0; return; }

      lc.timeLeft -= dt;
      const startX = e.pos.x;
      const startY = e.pos.y;

      // Move along the velocity vector.
      const nx = e.pos.x + lc.vel.x * dt;
      const ny = e.pos.y + lc.vel.y * dt;

      // Wall impact — reflect partially, apply one-time bonus damage.
      let wallHit = false;
      if ((nx - e.radius < 0 && lc.vel.x < 0) || (nx + e.radius > width && lc.vel.x > 0)) {
        lc.vel.x = -lc.vel.x * 0.35;
        wallHit = true;
      }
      if ((ny - e.radius < 0 && lc.vel.y < 0) || (ny + e.radius > height && lc.vel.y > 0)) {
        lc.vel.y = -lc.vel.y * 0.35;
        wallHit = true;
      }
      if (wallHit && !lc.hasHitWall) {
        lc.hasHitWall = true;
        e.hp -= lc.wallDmg;
        e.flashTimer = Math.max(e.flashTimer, 0.2);
        spawnText(state, e.pos, lc.wallDmg.toFixed(1), lc.color);
        spawnParticles(state, e.pos, lc.color);
        spawnParticles(state, e.pos, "#FFFFFF");
        state.shakeTimer = Math.max(state.shakeTimer, 0.18);
        sfxHit();
      }

      e.pos.x = Math.max(e.radius, Math.min(width - e.radius, nx));
      e.pos.y = Math.max(e.radius, Math.min(height - e.radius, ny));
      advanceSlimeTrail(state, e, dt, Math.hypot(e.pos.x - startX, e.pos.y - startY));

      // Spawn a brief trail spark behind the flying enemy.
      if (Math.random() < 0.55) {
        spawnParticles(state, e.pos, lc.color);
      }

      // Chain collision: damage any enemy the launched one physically overlaps.
      const velLen = Math.hypot(lc.vel.x, lc.vel.y) || 1;
      const dirX = lc.vel.x / velLen;
      const dirY = lc.vel.y / velLen;
      enemies.forEach(other => {
        if (other.markedForDeletion || lc.hitIds.has(other.id)) return;
        if (distSq(e.pos, other.pos) < (e.radius + other.radius) ** 2) {
          lc.hitIds.add(other.id);
          const dealt = applyDmg(other, lc.chainDmg);
          other.flashTimer = Math.max(other.flashTimer, 0.2);
          // Knock the victim in the same direction the projectile is traveling.
          const startX = other.pos.x;
          const startY = other.pos.y;
          other.pos.x = Math.max(other.radius, Math.min(width - other.radius, other.pos.x + dirX * CHAIN_KNOCKBACK));
          other.pos.y = Math.max(other.radius, Math.min(height - other.radius, other.pos.y + dirY * CHAIN_KNOCKBACK));
          advanceSlimeTrail(state, other, dt, Math.hypot(other.pos.x - startX, other.pos.y - startY));
          spawnText(state, other.pos, dealt.toFixed(1), lc.color);
          spawnParticles(state, other.pos, lc.color);
          spawnParticles(state, other.pos, "#FFFFFF");
          state.shakeTimer = Math.max(state.shakeTimer, 0.14);
          sfxHit();
        }
      });
    });
    state.launchedEnemies = state.launchedEnemies.filter(lc => lc.timeLeft > 0);
  }

  // Enemy logic
  let bossAlive = false;
  enemies.forEach(e => {
    if (e.isBoss) bossAlive = true;

    if (e.flashTimer > 0) e.flashTimer -= dt;
    if (e.slowTimer > 0) e.slowTimer -= dt;
    if (e.cursedTimer > 0) e.cursedTimer -= dt;
    if (e.soakedTimer > 0) e.soakedTimer -= dt;
    if (e.evaporateTimer > 0) e.evaporateTimer -= dt;

    // Paralysis: tick down the timer and deal shock damage every 0.5 s.
    if (e.paralyzedTimer > 0) {
      e.paralyzedTimer -= dt;
      e.shockTimer -= dt;
      if (e.shockTimer <= 0) {
        const shockBase = e.superShock ? 0.45 : 0.3;
        const actualShock = applyDmg(e, shockBase);
        e.shockTimer = 0.5;
        e.flashTimer = 0.08;
        spawnText(state, { x: e.pos.x + (Math.random() - 0.5) * 20, y: e.pos.y - 10 }, actualShock.toFixed(2), e.superShock ? "#FACC15" : "#FDE047");
      }
      if (e.paralyzedTimer <= 0) e.superShock = false; // reset when paralysis ends
    }

    if (e.burnTicks > 0) {
      e.burnTimer -= dt;
      if (e.burnTimer <= 0) {
        const burnBase = e.enhancedBurn ? 1.0 : 0.1;
        const actualBurn = applyDmg(e, burnBase);
        e.burnTicks--;
        e.burnTimer = 1;
        e.flashTimer = 0.1;
        spawnText(state, e.pos, actualBurn.toFixed(2), e.enhancedBurn ? "#FB923C" : "#F97316");
        if (e.burnTicks <= 0) e.enhancedBurn = false; // reset after burn ends
      }
    }

    // Paralysed enemies are fully rooted; slow only halves speed.
    // Enemies also freeze completely during the Divine Pillar ultimate sequence.
    // Launched enemies are driven by the launchedEnemies block above — no AI movement.
    const angle = Math.atan2(player.pos.y - e.pos.y, player.pos.x - e.pos.x);
    const isLaunched = state.launchedEnemies.some(lc => lc.enemyId === e.id);
    const startX = e.pos.x;
    const startY = e.pos.y;
    if (!isLaunched && e.paralyzedTimer <= 0 && !state.wizardUlt) {
      const speed = e.slowTimer > 0 ? e.speed * 0.5 : e.speed;
      e.pos.x += Math.cos(angle) * speed * enemyDt;
      e.pos.y += Math.sin(angle) * speed * enemyDt;
    }
    if (!isLaunched) {
      advanceSlimeTrail(state, e, enemyDt, Math.hypot(e.pos.x - startX, e.pos.y - startY));
    }

    // Player collision — launched enemies are projectiles, not attackers; skip their contact.
    if (!isLaunched && player.iFrames <= 0 && distSq(player.pos, e.pos) < (player.radius + e.radius) ** 2) {
      if (state.wizardShield) {
        // While the Divine Shield exists (active OR in its break animation) the
        // wizard is completely invulnerable — no HP is ever deducted.
        if (!state.wizardShield.breaking) {
          // First incoming hit: trigger the wings-spread burst and shockwave.
          state.wizardShield.breaking = true;
          state.wizardShield.breakTimer = 0;
          liveWizardUltimateState.shieldActive = false;
          player.iFrames = 0.5;
          state.shakeTimer = Math.max(state.shakeTimer, 0.4);
          spawnText(state, { x: player.pos.x, y: player.pos.y - 30 }, "DIVINE SHIELD", "#FEF3C7");
          spawnParticles(state, player.pos, "#FDE047");
          const SHOCK_R2 = 160 * 160;
          enemies.forEach(other => {
            if (other.markedForDeletion) return;
            if (distSq(player.pos, other.pos) < SHOCK_R2) {
              const dealt = applyDmg(other, SHIELD_SHOCKWAVE_DAMAGE, true);
              other.flashTimer = 0.15;
              spawnText(state, other.pos, dealt.toFixed(1), RADIANCE_COLOR);
              spawnParticles(state, other.pos, "#FEF9C3");
            }
          });
        }
        // Breaking or not: shield absorbs the hit, player takes zero damage.
      } else {
        player.hp -= e.damage;
        player.iFrames = 0.5;
        sfxHurt();
        updates.playerHp = player.hp;
        needSync = true;
        if (player.hp <= 0) {
          updates.screen = "gameover";
          state.roundActive = false;
          needSync = true;
        }
      }
    }

    // Projectile collisions
    projectiles.forEach(p => {
      if (p.markedForDeletion || p.type === "thunderbolt") return;
      if (distSq(e.pos, p.pos) < (e.radius + p.radius) ** 2) {
        // Pre-impact combo checks: shatter (fireball on frozen) and
        // evaporate (fireball on soaked) both buff the base hit damage
        // of *this* fireball before applyDmg is called.
        let baseDmg = p.damage;
        let didShatter = false;
        let didEvaporate = false;
        if (p.type === "fireball" && e.slowTimer > 0) {
          baseDmg *= 3.5;
          didShatter = true;
        }
        if (p.type === "fireball" && e.soakedTimer > 0) {
          // Apply the evaporate amp before the hit so this fireball
          // already benefits from the ×1.5 amplifier.
          e.evaporateTimer = 5;
          e.soakedTimer = 0;
          didEvaporate = true;
        }

        const actualProj = applyDmg(e, baseDmg);
        e.flashTimer = 0.1;
        spawnText(state, e.pos, actualProj.toFixed(1), didShatter ? "#FBBF24" : "#FFF");
        if (e.isBoss) state.shakeTimer = 0.1;

        p.pierce--;
        if (p.pierce <= 0) p.markedForDeletion = true;

        if (p.type === "fireball") {
          e.burnTicks = 5;
          e.burnTimer = 1;
          // Explicitly set the flag every time burn is (re)applied so a
          // later non-shatter fireball cannot preserve a stale enhanced burn.
          e.enhancedBurn = didShatter;
          if (didShatter) {
            spawnText(state, { x: e.pos.x, y: e.pos.y - 32 }, "SHATTER", "#FBBF24");
            spawnParticles(state, e.pos, "#FBBF24");
            if (e.isBoss) state.shakeTimer = Math.max(state.shakeTimer, 0.18);
          }
          if (didEvaporate) {
            spawnText(state, { x: e.pos.x, y: e.pos.y - 44 }, "EVAPORATE", "#FCA5A5");
            spawnParticles(state, e.pos, "#FED7AA");
          }
        } else if (p.type === "iceshard") {
          e.slowTimer = 2;
        } else if (p.type === "waterwave") {
          e.soakedTimer = 5;
          spawnText(state, { x: e.pos.x, y: e.pos.y - 20 }, "SOAKED", "#7DD3FC");
          spawnParticles(state, e.pos, "#3B82F6");
        } else if (p.type === "arcaneorb") {
          e.cursedTimer = 5;
          spawnText(state, { x: e.pos.x, y: e.pos.y - 20 }, "CURSED", "#D8B4FE");
          spawnParticles(state, e.pos, "#A855F7");
        }
      }
    });

    if (e.hp <= 0) {
      e.markedForDeletion = true;
      if (e.isBoss) { sfxBossDeath(); } else { sfxDeath(); }
      spawnParticles(state, e.pos, e.isBoss ? "#FBBF24" : "#10B981");
      const coinValue = e.isBoss ? 10 : Math.floor((gameState.round + 1) / 2);
      coins.push({
        id: `c_${Math.random()}`,
        pos: { ...e.pos },
        radius: 8,
        value: coinValue,
        bobTimer: Math.random() * Math.PI * 2,
        magnetized: false
      });
    }
  });

  // A swarm has multiple simultaneous bosses, so report one aggregate health
  // pool and only clear the boss state once every swarm member is gone.
  const livingBosses = enemies.filter(e => e.isBoss && !e.markedForDeletion);
  bossAlive = livingBosses.length > 0;
  if (bossAlive) {
    updates.bossHp = livingBosses.reduce((total, boss) => total + Math.max(0, boss.hp), 0);
    updates.bossMaxHp = livingBosses.reduce((total, boss) => total + boss.maxHp, 0);
    needSync = true;
  }
  if (gameState.isBossAlive !== bossAlive) {
    updates.isBossAlive = bossAlive;
    needSync = true;
  }

  // Coins
  coins.forEach(c => {
    c.bobTimer += dt * 5;
    if (!c.magnetized && distSq(player.pos, c.pos) < 30 * 30) {
      c.magnetized = true;
    }
    if (c.magnetized) {
      const angle = Math.atan2(player.pos.y - c.pos.y, player.pos.x - c.pos.x);
      c.pos.x += Math.cos(angle) * 300 * dt;
      c.pos.y += Math.sin(angle) * 300 * dt;
      if (distSq(player.pos, c.pos) < 15 * 15) {
        c.markedForDeletion = true;
        sfxCoin();
        gameState.coins += c.value; // Mutable update to avoid race
        updates.coins = gameState.coins;
        needSync = true;
      }
    }
  });

  particles.forEach(p => {
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.lifeTime -= dt;
    if (p.lifeTime <= 0) p.markedForDeletion = true;
  });

  texts.forEach(t => {
    t.pos.x += t.vel.x * dt;
    t.pos.y += t.vel.y * dt;
    t.lifeTime -= dt;
    if (t.lifeTime <= 0) t.markedForDeletion = true;
  });

  // Tick fist slams — apply damage precisely when fist lands
  const DROP_DURATION = 0.3;
  const IMPACT_DURATION = 0.25;
  state.fistSlams.forEach(f => {
    f.timer += dt;
    if (f.phase === "drop" && f.timer >= DROP_DURATION) {
      f.phase = "impact";
      f.timer = 0;
      const target = state.enemies.find(e => e.id === f.enemyId);
      if (target) {
        const actualSlam = applyDmg(target, f.damage);
        sfxHit();
        target.flashTimer = 0.15;
        spawnText(state, target.pos, actualSlam.toFixed(1), "#EF4444");
        if (target.isBoss) state.shakeTimer = 0.15;
        // Each landed brute slam charges the mega-slam meter. Pause charging
        // while a slam is already firing so it can't immediately retrigger.
        if (state.player.classType === "brute" && f.kind !== "punch" && !state.megaSlam) {
          state.player.bruteHitCount++;
          if (state.player.bruteHitCount >= HITS_TO_CHARGE) {
            state.player.bruteHitCount = 0;
            state.megaSlam = {
              x: width / 2,
              timer: 0,
              phase: "drop",
              damage: state.player.bruteDamage * MEGA_DAMAGE_MULT,
            };
          }
        }
      }
    }
  });
  state.fistSlams = state.fistSlams.filter(f => {
    const dur = f.kind === "punch" ? 0.25 : IMPACT_DURATION;
    return !(f.phase === "impact" && f.timer >= dur);
  });

  // Mega slam: a giant fist falls from the top of the screen, then hits ALL
  // enemies for 1.5x the brute's current per-hit damage.
  if (state.megaSlam) {
    const ms = state.megaSlam;
    ms.timer += dt;
    if (ms.phase === "drop" && ms.timer >= MEGA_DROP_DURATION) {
      ms.phase = "impact";
      ms.timer = 0;
      sfxSlam();
      state.shakeTimer = Math.max(state.shakeTimer, 0.5);
      state.enemies.forEach(e => {
        if (e.markedForDeletion) return;
        const dealt = applyDmg(e, ms.damage);
        e.flashTimer = 0.2;
        spawnText(state, e.pos, dealt.toFixed(1), "#FCD34D");
        spawnParticles(state, e.pos, "#FBBF24");
      });
    } else if (ms.phase === "impact" && ms.timer >= MEGA_IMPACT_DURATION) {
      state.megaSlam = null;
    }
  }

  // Wizard divine shield: advance the wings-spread + shockwave break, then
  // consume the shield once the animation finishes.
  if (state.wizardShield && state.wizardShield.breaking) {
    state.wizardShield.breakTimer += dt;
    if (state.wizardShield.breakTimer >= SHIELD_BREAK_DURATION) {
      state.wizardShield = null;
    }
  }

  // Blitzer Lightning Dash afterimages — fade and expire.
  if (state.blitzerDashTrail.length) {
    state.blitzerDashTrail.forEach(a => { a.timer -= dt; });
    state.blitzerDashTrail = state.blitzerDashTrail.filter(a => a.timer > 0);
  }

  // Blitzer Phantom Clones — rapid-strike nearby enemies for the duration, then
  // each delivers one upgrade-scaled final strike before poofing.
  if (state.phantomClones.length) {
    state.phantomClones.forEach(c => {
      if (c.flashTimer > 0) c.flashTimer -= dt;
      c.life -= dt;

      // Trail the nearest living enemy so the clones stay useful as it moves.
      const tgt = [...enemies]
        .filter(e => !e.markedForDeletion)
        .sort((a, b) => distSq(c.pos, a.pos) - distSq(c.pos, b.pos))[0];
      if (tgt) {
        const desiredX = tgt.pos.x + Math.cos(c.angle) * 46;
        const desiredY = tgt.pos.y + Math.sin(c.angle) * 46;
        c.pos.x += (desiredX - c.pos.x) * Math.min(1, dt * 6);
        c.pos.y += (desiredY - c.pos.y) * Math.min(1, dt * 6);
      }

      if (c.life > 0) {
        // Rapid basic strikes on the nearest enemy within reach.
        c.strikeTimer -= dt;
        if (c.strikeTimer <= 0 && tgt && distSq(c.pos, tgt.pos) < CLONE_STRIKE_RADIUS * CLONE_STRIKE_RADIUS) {
          c.strikeTimer = CLONE_STRIKE_INTERVAL;
          c.flashTimer = 0.1;
          const dealt = applyDmg(tgt, CLONE_STRIKE_DAMAGE, false, true);
          tgt.flashTimer = Math.max(tgt.flashTimer, 0.06);
          spawnText(state, { x: tgt.pos.x + (Math.random() - 0.5) * 16, y: tgt.pos.y - 8 }, dealt.toFixed(2), BLITZER_DMG_COLOR);
          const fromAngle = Math.atan2(c.pos.y - tgt.pos.y, c.pos.x - tgt.pos.x);
          state.fistSlams.push({
            id: `pc_${Math.random()}`,
            targetPos: { x: tgt.pos.x, y: tgt.pos.y },
            timer: 0,
            phase: "impact",
            enemyId: tgt.id,
            damage: 0,
            kind: "punch",
            fromAngle,
          });
        }
      }
    });

    // Resolve final strikes for clones whose duration just ended.
    const expired = state.phantomClones.filter(c => c.life <= 0);
    expired.forEach(c => {
      const tgt = [...enemies]
        .filter(e => !e.markedForDeletion)
        .sort((a, b) => distSq(c.pos, a.pos) - distSq(c.pos, b.pos))[0];
      if (tgt) {
        const dealt = applyDmg(tgt, c.finalDamage, false, true);
        tgt.flashTimer = 0.2;
        spawnText(state, { x: tgt.pos.x, y: tgt.pos.y - 26 }, dealt.toFixed(1), CLONE_FINAL_COLOR);
        spawnParticles(state, tgt.pos, "#E0F2FE");
        spawnParticles(state, tgt.pos, CLONE_FINAL_COLOR);
        if (tgt.isBoss) state.shakeTimer = Math.max(state.shakeTimer, 0.15);
        else state.shakeTimer = Math.max(state.shakeTimer, 0.1);
        const fromAngle = Math.atan2(c.pos.y - tgt.pos.y, c.pos.x - tgt.pos.x);
        state.fistSlams.push({
          id: `pcf_${Math.random()}`,
          targetPos: { x: tgt.pos.x, y: tgt.pos.y },
          timer: 0,
          phase: "impact",
          enemyId: tgt.id,
          damage: 0,
          kind: "punch",
          fromAngle,
        });
      }
      // Poof particles where the clone vanishes.
      spawnParticles(state, c.pos, "#67E8F9");
    });
    state.phantomClones = state.phantomClones.filter(c => c.life > 0);
  }

  // Mirror brute mega-slam charge + ability state for the HUD readouts.
  liveBruteState.isBrute = state.player.classType === "brute";
  if (liveBruteState.isBrute) {
    liveBruteState.slamActive = !!state.megaSlam;
    liveBruteState.charge = Math.min(1, state.player.bruteHitCount / HITS_TO_CHARGE);
    liveBruteState.chargeActive = !!state.bruteCharge;
    liveBruteState.chargeCdPct = Math.max(0, state.player.bruteChargeCd / CHARGE_COOLDOWN);
    liveBruteState.chargeReady = state.player.bruteChargeCd <= 0;
    liveBruteState.quakeCdPct = Math.max(0, state.player.bruteQuakeCd / QUAKE_COOLDOWN);
    liveBruteState.quakeReady = state.player.bruteQuakeCd <= 0;
    liveBruteState.rageActive = state.player.bruteRageActive > 0;
    liveBruteState.rageCdPct = state.player.bruteRageActive > 0
      ? 1
      : Math.max(0, state.player.bruteRageCd / RAGE_COOLDOWN);
    liveBruteState.rageReady = state.player.bruteRageActive <= 0 && state.player.bruteRageCd <= 0;
    liveBruteState.clashActive = !!state.bruteClash && state.bruteClash.resolved === null;
    liveBruteState.clashResult = state.bruteClash?.resolved ?? null;
    liveBruteState.abilitiesUnlocked =
      !!gameState.testMode || gameState.round >= ABILITIES_UNLOCK_ROUND;
  } else {
    resetBruteState();
  }

  state.enemies = enemies.filter(e => !e.markedForDeletion);
  state.projectiles = projectiles.filter(p => !p.markedForDeletion);
  state.coins = coins.filter(c => !c.markedForDeletion);
  state.particles = particles.filter(p => !p.markedForDeletion);
  state.texts = texts.filter(t => !t.markedForDeletion);

  if (state.enemies.length === 0 && state.roundActive) {
    if (gameState.testMode) {
      // Endless training: drop a fresh dummy so the user can keep testing.
      state.enemies.push(makeDummy(width, height));
    } else {
      state.roundActive = false;
      sfxRoundClear();
      // Sweep all uncollected coins into the player's total
      let swept = 0;
      state.coins.forEach(c => { swept += c.value; });
      state.coins = [];
      gameState.coins += swept;
      updates.coins = gameState.coins;
      updates.screen = "shop";
      needSync = true;
    }
  }

  if (needSync) {
    // Always flush critical state (HP, screen changes, coin pickups).
    // Throttle the constant boss-HP ticker to avoid flooding React.
    const critical = updates.playerHp !== undefined
      || updates.screen !== undefined
      || updates.coins !== undefined
      || updates.isBossAlive !== undefined;
    if (critical || Math.random() < 0.25) {
      syncState(updates);
    }
  }
};

export const renderGame = (ctx: CanvasRenderingContext2D, state: TransientGameState, width: number, height: number) => {
  ctx.clearRect(0, 0, width, height);
  
  ctx.save();
  if (state.shakeTimer > 0) {
    ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
  }

  // Grid
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  const gridSize = 40;
  ctx.beginPath();
  for (let x = 0; x <= width; x += gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
  for (let y = 0; y <= height; y += gridSize) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
  ctx.stroke();

  // Slime trails sit on the arena floor beneath enemies and the player. Their
  // irregular double-blob shape makes connected drops read as liquid rather
  // than as a line of identical circles.
  state.slimePuddles.forEach(puddle => {
    const life = Math.max(0, puddle.lifeTime / puddle.maxLife);
    const fade = life < 0.25 ? life / 0.25 : 1;
    const pulse = 0.88 + Math.sin(state.animTime * 5 + puddle.pos.x * 0.04) * 0.08;
    ctx.save();
    ctx.globalAlpha = 0.32 * fade;
    ctx.fillStyle = puddle.color;
    ctx.beginPath();
    ctx.ellipse(puddle.pos.x, puddle.pos.y, puddle.radius * pulse, puddle.radius * 0.68 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.18 * fade;
    ctx.beginPath();
    ctx.ellipse(
      puddle.pos.x - puddle.radius * 0.26,
      puddle.pos.y + puddle.radius * 0.16,
      puddle.radius * 0.52,
      puddle.radius * 0.36,
      0.55,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  });

  // Coins
  state.coins.forEach(c => {
    const yOffset = Math.sin(c.bobTimer) * 3;
    drawSprite(ctx, SPRITES.coin, c.pos.x, c.pos.y + yOffset, 2);
  });

  // Projectiles
  state.projectiles.forEach(p => {
    if (p.type === "dart") {
      ctx.fillStyle = "#60A5FA";
      ctx.fillRect(p.pos.x - 2, p.pos.y - 2, 4, 4);
    } else if (p.type === "fireball") {
      ctx.fillStyle = "#F97316";
      ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, 6, 0, Math.PI*2); ctx.fill();
    } else if (p.type === "thunderbolt") {
      const pts = p.chainPoints;
      if (pts && pts.length >= 2) {
        const life = p.maxLifeTime ? Math.max(0, p.lifeTime / p.maxLifeTime) : 1;

        // Outer glow halo — wide, soft, faded
        ctx.strokeStyle = `rgba(96, 165, 250, ${0.18 * life})`;
        ctx.lineWidth = 12;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        // Mid glow — electric blue
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.55 * life})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        // Bright white-blue core
        ctx.strokeStyle = `rgba(219, 234, 254, ${life})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.lineCap = "butt";

        // Random sparks shimmering along the bolt
        ctx.fillStyle = `rgba(191, 219, 254, ${life})`;
        const sparkCount = Math.floor(pts.length * 0.5);
        for (let i = 0; i < sparkCount; i++) {
          const sp = pts[Math.floor(Math.random() * pts.length)];
          const ox = (Math.random() - 0.5) * 10;
          const oy = (Math.random() - 0.5) * 10;
          ctx.fillRect(sp.x + ox - 1, sp.y + oy - 1, 2, 2);
        }
      }
    } else if (p.type === "iceshard") {
      ctx.fillStyle = "#22D3EE";
      ctx.beginPath(); ctx.moveTo(p.pos.x + 5, p.pos.y); ctx.lineTo(p.pos.x - 5, p.pos.y - 3); ctx.lineTo(p.pos.x - 5, p.pos.y + 3); ctx.fill();
    } else if (p.type === "waterwave") {
      ctx.strokeStyle = `rgba(56, 189, 248, ${p.lifeTime / 0.5})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI*2); ctx.stroke();
    } else if (p.type === "arcaneorb") {
      ctx.fillStyle = "#D8B4FE";
      ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, 8, 0, Math.PI*2); ctx.fill();
    }
  });

  // Launched-enemy motion streaks — drawn before the sprite so they appear behind it.
  state.launchedEnemies.forEach(lc => {
    const e = state.enemies.find(e => e.id === lc.enemyId);
    if (!e) return;
    const velLen = Math.hypot(lc.vel.x, lc.vel.y) || 1;
    const dx = lc.vel.x / velLen;
    const dy = lc.vel.y / velLen;
    const streakLen = Math.min(velLen * 0.045, 48); // length proportional to speed
    for (let i = 4; i >= 1; i--) {
      const t = i / 4;
      const sx = e.pos.x - dx * streakLen * t;
      const sy = e.pos.y - dy * streakLen * t;
      ctx.globalAlpha = (1 - t) * 0.55;
      ctx.fillStyle = lc.color;
      const r = e.radius * (1 - t * 0.4);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Outer glow ring around the flying enemy.
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = lc.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(e.pos.x, e.pos.y, e.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // Enemies — use cached sprites; replace ctx.filter with cheap overlays
  state.enemies.forEach(e => {
    const sprite = e.isDummy ? DUMMY_SPRITE : e.isBoss ? getCachedBoss(e.tier) : getCachedEnemy(e.tier);
    const scale = e.isDummy ? 4 : (e.isBoss ? 4 : 3) + Math.min(e.tier, 4) * 0.5;
    // Walking bob: hop up on each step; per-enemy phase so they don't sync.
    // Dummies don't move, so they don't bob.
    const phase = (e.pos.x * 0.013 + e.pos.y * 0.017);
    const hopAmount = e.isBoss ? 3 : 2;
    const bobY = e.isDummy ? 0 : -Math.abs(Math.sin(state.animTime * (e.isBoss ? 5 : 7) + phase)) * hopAmount;
    drawSprite(ctx, sprite, e.pos.x, e.pos.y + bobY, scale);

    // Dummy HP bar — always visible so the user can read DPS at a glance.
    if (e.isDummy) {
      const barW = 60;
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = "#111827";
      ctx.fillRect(e.pos.x - barW / 2 - 1, e.pos.y - 28, barW + 2, 7);
      ctx.fillStyle = "#EF4444";
      ctx.fillRect(e.pos.x - barW / 2, e.pos.y - 27, barW * pct, 5);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 10px Quicksand, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${e.hp.toFixed(1)} / ${e.maxHp}`, e.pos.x, e.pos.y - 34);
      ctx.textAlign = "left";
    }

    // Hit flash: white overlay rect (far cheaper than ctx.filter brightness)
    if (e.flashTimer > 0) {
      const hw = sprite[0].length * scale / 2;
      const hh = sprite.length * scale / 2;
      ctx.globalAlpha = Math.min(e.flashTimer / 0.15, 1) * 0.7;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(e.pos.x - hw, e.pos.y + bobY - hh, hw * 2, hh * 2);
      ctx.globalAlpha = 1;
    }

    // Slow: cyan tint overlay (far cheaper than ctx.filter hue-rotate)
    if (e.slowTimer > 0) {
      const hw = sprite[0].length * scale / 2;
      const hh = sprite.length * scale / 2;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#22D3EE";
      ctx.fillRect(e.pos.x - hw, e.pos.y + bobY - hh, hw * 2, hh * 2);
      ctx.globalAlpha = 1;
    }

    // Soaked: blue overlay + 3 droplets sliding down the sprite.
    if (e.soakedTimer > 0) {
      const hw = sprite[0].length * scale / 2;
      const hh = sprite.length * scale / 2;
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = "#3B82F6";
      ctx.fillRect(e.pos.x - hw, e.pos.y + bobY - hh, hw * 2, hh * 2);
      ctx.globalAlpha = 1;

      // Falling droplets — each loops over (1.2 s)
      for (let i = 0; i < 3; i++) {
        const phase = ((state.animTime + i * 0.4) % 1.2) / 1.2;
        const dx = (i - 1) * (hw * 0.6);
        const dy = -hh + phase * (hh * 2 + 4);
        ctx.fillStyle = "#7DD3FC";
        ctx.globalAlpha = 0.85 * (1 - phase * 0.4);
        ctx.beginPath();
        ctx.arc(e.pos.x + dx, e.pos.y + bobY + dy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Evaporate: hot orange-red pulse + rising steam wisps.
    if (e.evaporateTimer > 0) {
      const hw = sprite[0].length * scale / 2;
      const hh = sprite.length * scale / 2;
      ctx.globalAlpha = 0.22 + Math.abs(Math.sin(state.animTime * 8)) * 0.18;
      ctx.fillStyle = "#F97316";
      ctx.fillRect(e.pos.x - hw, e.pos.y + bobY - hh, hw * 2, hh * 2);
      ctx.globalAlpha = 1;

      // Rising steam wisps — 4 wisps loop over 1 s
      for (let i = 0; i < 4; i++) {
        const phase = ((state.animTime * 1.5 + i * 0.25) % 1);
        const wx = (i - 1.5) * (hw * 0.45) + Math.sin(phase * Math.PI * 2 + i) * 3;
        const wy = -hh - phase * 18;
        ctx.fillStyle = "#FED7AA";
        ctx.globalAlpha = 0.7 * (1 - phase);
        ctx.beginPath();
        ctx.arc(e.pos.x + wx, e.pos.y + bobY + wy, 2 + phase * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Curse: pulsing purple tint + 3 small orbs orbiting the enemy.
    if (e.cursedTimer > 0) {
      const hw = sprite[0].length * scale / 2;
      const hh = sprite.length * scale / 2;
      // Tint pulses gently
      ctx.globalAlpha = 0.25 + Math.abs(Math.sin(state.animTime * 6)) * 0.15;
      ctx.fillStyle = "#A855F7";
      ctx.fillRect(e.pos.x - hw, e.pos.y + bobY - hh, hw * 2, hh * 2);
      ctx.globalAlpha = 1;

      // 3 small orbiting orbs — spread 120° apart, drift inward/outward
      const orbitR = (sprite[0].length * scale) / 2 + 6 + Math.sin(state.animTime * 4) * 3;
      for (let i = 0; i < 3; i++) {
        const θ = (i / 3) * Math.PI * 2 + state.animTime * 2.5;
        const ox = e.pos.x + Math.cos(θ) * orbitR;
        const oy = e.pos.y + bobY + Math.sin(θ) * orbitR * 0.5; // squash vertically
        // Glow halo
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "#DDD6FE";
        ctx.beginPath();
        ctx.arc(ox, oy, 5, 0, Math.PI * 2);
        ctx.fill();
        // Core
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = "#7C3AED";
        ctx.beginPath();
        ctx.arc(ox, oy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Paralysis: yellow tint + 6 radiating shock spark arcs.
    if (e.paralyzedTimer > 0) {
      // Yellow tint that pulses with shockTimer progress
      const hw = sprite[0].length * scale / 2;
      const hh = sprite.length * scale / 2;
      ctx.globalAlpha = 0.28 + Math.abs(Math.sin(state.animTime * 18)) * 0.18;
      ctx.fillStyle = "#FDE047";
      ctx.fillRect(e.pos.x - hw, e.pos.y + bobY - hh, hw * 2, hh * 2);
      ctx.globalAlpha = 1;

      // 6 short zigzag spark arcs radiating outward from the enemy centre.
      const numArcs = 6;
      const arcLen = 18 + Math.abs(Math.sin(state.animTime * 22)) * 8;
      const arcColors = ["#FDE047", "#FDE047", "#BAE6FD", "#FDE047", "#BAE6FD", "#FDE047"];
      ctx.lineWidth = 1.5;
      for (let i = 0; i < numArcs; i++) {
        // Base angle rotates slowly, per-arc offset creates spread
        const baseAngle = (i / numArcs) * Math.PI * 2 + state.animTime * 3.5;
        // Rapid flicker via high-freq sin — each arc flickers independently
        const flicker = Math.sin(state.animTime * 30 + i * 2.4);
        const alpha = Math.max(0, 0.6 + flicker * 0.4);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = arcColors[i];

        // 3-point zigzag: centre → midpoint → endpoint
        const midR = arcLen * 0.45;
        const perpJitter = (flicker * 6);
        const px = e.pos.x + bobY * 0; // centre x (no vertical offset for arcs)
        const py = e.pos.y + bobY;

        const mx = px + Math.cos(baseAngle) * midR - Math.sin(baseAngle) * perpJitter;
        const my = py + Math.sin(baseAngle) * midR + Math.cos(baseAngle) * perpJitter;
        const ex2 = px + Math.cos(baseAngle) * arcLen;
        const ey2 = py + Math.sin(baseAngle) * arcLen;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(mx, my);
        ctx.lineTo(ex2, ey2);
        ctx.stroke();

        // Bright dot at arc tip
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = "#FEF9C3";
        ctx.beginPath();
        ctx.arc(ex2, ey2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  });

  // Fist slams (brute attack animation) + blitzer punches
  state.fistSlams.forEach(f => {
    const { targetPos, phase, timer } = f;

    if (f.kind === "punch") {
      const PUNCH_DURATION = 0.25;
      const t = Math.min(1, timer / PUNCH_DURATION);
      const fromAngle = f.fromAngle ?? 0;
      // Fist slides in from `fromAngle` toward target, snapping closed
      const distance = 28 * Math.pow(1 - t, 2);
      const px = targetPos.x + Math.cos(fromAngle) * distance;
      const py = targetPos.y + Math.sin(fromAngle) * distance;

      // Small blue punching fist — slightly smaller than enemy sprites
      const s = 2;
      const fw = FIST_GRID[0].length * s;
      const fh = FIST_GRID.length * s;
      ctx.globalAlpha = 1 - t * 0.4;
      FIST_GRID.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (!cell) return;
          ctx.fillStyle = BLITZER_FIST_COLORS[cell];
          ctx.fillRect(px - fw / 2 + c * s, py - fh / 2 + r * s, s, s);
        });
      });
      ctx.globalAlpha = 1;

      // Impact starburst at the target — 4-pointed blue cross expanding
      if (t < 0.5) {
        const a = 1 - t / 0.5;
        const r = 4 + t * 14;
        ctx.strokeStyle = `rgba(186, 230, 253, ${a})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(targetPos.x - r, targetPos.y); ctx.lineTo(targetPos.x + r, targetPos.y);
        ctx.moveTo(targetPos.x, targetPos.y - r); ctx.lineTo(targetPos.x, targetPos.y + r);
        // Diagonals smaller
        const r2 = r * 0.6;
        ctx.moveTo(targetPos.x - r2, targetPos.y - r2); ctx.lineTo(targetPos.x + r2, targetPos.y + r2);
        ctx.moveTo(targetPos.x - r2, targetPos.y + r2); ctx.lineTo(targetPos.x + r2, targetPos.y - r2);
        ctx.stroke();
        // White-hot core dot
        ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
        ctx.fillRect(targetPos.x - 2, targetPos.y - 2, 4, 4);
      }
      return;
    }

    if (phase === "drop") {
      // Fist drops from 56px above the target down to the target
      const DROP_DURATION = 0.3;
      const progress = timer / DROP_DURATION;
      const eased = progress * progress; // ease-in: slow start, fast land
      const yOffset = -56 + eased * 56;

      // Draw pixel fist using module-level constant (no per-frame allocation)
      const px = targetPos.x;
      const py = targetPos.y + yOffset;
      const s = 5;
      const fw = FIST_GRID[0].length * s;
      const fh = FIST_GRID.length * s;
      FIST_GRID.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (!cell) return;
          ctx.fillStyle = FIST_COLORS[cell];
          ctx.fillRect(px - fw / 2 + c * s, py - fh / 2 + r * s, s, s);
        });
      });
    } else {
      // Impact: expanding red ring + flash
      const IMPACT_DURATION = 0.25;
      const t = timer / IMPACT_DURATION;
      const radius = 8 + t * 28;
      const alpha = 1 - t;
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.lineWidth = 4 - t * 3;
      ctx.beginPath();
      ctx.arc(targetPos.x, targetPos.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      // Second smaller burst ring
      ctx.strokeStyle = `rgba(252, 165, 165, ${alpha * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(targetPos.x, targetPos.y, radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // Mega slam: giant fist falling from the top of the screen, then a huge impact.
  if (state.megaSlam) {
    const ms = state.megaSlam;
    const s = 16; // giant pixel scale
    const fw = FIST_GRID[0].length * s;
    const fh = FIST_GRID.length * s;
    const landY = height / 2;

    if (ms.phase === "drop") {
      const progress = Math.min(1, ms.timer / MEGA_DROP_DURATION);
      const eased = progress * progress; // ease-in: slow start, fast land
      const startY = -fh; // fully above the screen
      const py = startY + eased * (landY - startY);
      const px = ms.x;

      // Telegraph: pulsing target ring on the ground where it will land
      const pulse = 0.4 + 0.3 * Math.sin(state.animTime * 18);
      ctx.strokeStyle = `rgba(251, 191, 36, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, landY, fw * 0.55, 0, Math.PI * 2);
      ctx.stroke();

      // Motion streaks trailing above the fist
      ctx.strokeStyle = "rgba(252, 165, 165, 0.5)";
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(px + i * (fw / 6), py - fh);
        ctx.lineTo(px + i * (fw / 6), py - fh / 2);
        ctx.stroke();
      }

      FIST_GRID.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (!cell) return;
          ctx.fillStyle = FIST_COLORS[cell];
          ctx.fillRect(px - fw / 2 + c * s, py - fh / 2 + r * s, s, s);
        });
      });
    } else {
      // Impact: expanding gold shockwave rings + lingering fist that fades
      const t = ms.timer / MEGA_IMPACT_DURATION;
      const px = ms.x;
      const py = landY;
      ctx.globalAlpha = 1 - t;
      FIST_GRID.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (!cell) return;
          ctx.fillStyle = FIST_COLORS[cell];
          ctx.fillRect(px - fw / 2 + c * s, py - fh / 2 + r * s, s, s);
        });
      });
      ctx.globalAlpha = 1;

      const maxR = Math.max(width, height);
      [0, 0.25].forEach((delay, idx) => {
        const rt = Math.max(0, (t - delay) / (1 - delay));
        if (rt <= 0) return;
        ctx.strokeStyle = `rgba(251, 191, 36, ${(1 - rt) * (idx === 0 ? 0.9 : 0.5)})`;
        ctx.lineWidth = (idx === 0 ? 8 : 4) * (1 - rt);
        ctx.beginPath();
        ctx.arc(px, py, rt * maxR, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
  }

  // Ground Quake shockwave — expanding gold/red rings + ground crack lines.
  if (state.bruteQuake) {
    const q = state.bruteQuake;
    const t = Math.min(1, q.timer / QUAKE_RING_DURATION);
    const a = 1 - t;
    ctx.save();
    ctx.strokeStyle = `rgba(251, 191, 36, ${a * 0.9})`;
    ctx.lineWidth = 6 * a;
    ctx.beginPath();
    ctx.arc(q.pos.x, q.pos.y, QUAKE_RADIUS * t, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(239, 68, 68, ${a * 0.6})`;
    ctx.lineWidth = 3 * a;
    ctx.beginPath();
    ctx.arc(q.pos.x, q.pos.y, QUAKE_RADIUS * t * 0.65, 0, Math.PI * 2);
    ctx.stroke();
    // Radiating crack lines that fade with the rings.
    ctx.strokeStyle = `rgba(120, 53, 15, ${a * 0.8})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + 0.4;
      const inner = 12;
      const outer = inner + QUAKE_RADIUS * 0.5 * t;
      ctx.beginPath();
      ctx.moveTo(q.pos.x + Math.cos(ang) * inner, q.pos.y + Math.sin(ang) * inner);
      ctx.lineTo(q.pos.x + Math.cos(ang) * outer, q.pos.y + Math.sin(ang) * outer);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Wizard Divine Pillar sequence (rings → beam → stars → radiant field).
  drawWizardUltimate(ctx, state, width, height);

  // Blitzer Lightning Dash afterimages — fading blitzer ghosts + spark dots.
  if (state.blitzerDashTrail.length) {
    const sprite = SPRITES[state.player.classType];
    state.blitzerDashTrail.forEach(a => {
      const f = Math.max(0, a.timer / a.maxTime); // 1 → 0
      drawSprite(ctx, sprite, a.pos.x, a.pos.y, 3, f * 0.45);
      ctx.globalAlpha = f * 0.9;
      ctx.fillStyle = "#E0F2FE";
      ctx.fillRect(a.pos.x - 1, a.pos.y - 1, 2, 2);
    });
    ctx.globalAlpha = 1;
  }

  // Blitz Storm afterimages — persistent frozen ghosts left at each dash
  // endpoint. They flicker in place while the storm plays, then burst into an
  // expanding shockwave ring as they shatter.
  if (state.blitzerUltGhosts.length) {
    const sprite = SPRITES.blitzer;
    const hw = (sprite[0].length * 3) / 2;
    const hh = (sprite.length * 3) / 2;
    state.blitzerUltGhosts.forEach(g => {
      if (g.shattering) {
        const f = Math.max(0, 1 - g.shatterTimer / ULT_GHOST_SHATTER_DURATION); // 1 → 0
        // Expanding shockwave ring.
        ctx.save();
        ctx.globalAlpha = f * 0.8;
        ctx.strokeStyle = "#A5F3FC";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(g.pos.x, g.pos.y, ULT_GHOST_SHATTER_RADIUS * (1 - f), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        // Fading sprite flash.
        drawSprite(ctx, sprite, g.pos.x, g.pos.y, 3, f * 0.5);
      } else {
        const flicker = 0.3 + Math.abs(Math.sin(state.animTime * 18 + g.pos.x)) * 0.2;
        drawSprite(ctx, sprite, g.pos.x, g.pos.y, 3, flicker);
        ctx.globalAlpha = flicker * 0.5;
        ctx.fillStyle = "#22D3EE";
        ctx.fillRect(g.pos.x - hw, g.pos.y - hh, hw * 2, hh * 2);
        ctx.globalAlpha = 1;
      }
    });
    ctx.globalAlpha = 1;
  }

  // Blitzer Phantom Clones — flickering blitzer ghosts with a cyan phantom tint.
  if (state.phantomClones.length) {
    const sprite = SPRITES[state.player.classType];
    const hw = (sprite[0].length * 3) / 2;
    const hh = (sprite.length * 3) / 2;
    state.phantomClones.forEach(c => {
      const fade = Math.max(0, Math.min(1, c.life / 0.4)); // fade out in last 0.4s
      const flicker = 0.4 + Math.abs(Math.sin(state.animTime * 22 + c.angle)) * 0.25;
      const lunge = c.flashTimer > 0 ? 3 : 0;
      const a = fade * (flicker + (c.flashTimer > 0 ? 0.3 : 0));
      drawSprite(ctx, sprite, c.pos.x, c.pos.y - lunge, 3, a);
      ctx.globalAlpha = a * 0.5;
      ctx.fillStyle = "#22D3EE";
      ctx.fillRect(c.pos.x - hw, c.pos.y - lunge - hh, hw * 2, hh * 2);
    });
    ctx.globalAlpha = 1;
  }

  // Blitzer Overclock: cool cyan screen tint + vignette so the slow-mo window
  // is unmistakable. Drawn under the player/particles so numbers stay readable.
  if (state.player.classType === "blitzer" && state.player.blitzerOverclockActive > 0) {
    const intro = Math.min(1, (OVERCLOCK_DURATION - state.player.blitzerOverclockActive) / 0.3);
    const outro = Math.min(1, state.player.blitzerOverclockActive / 0.5);
    const a = Math.min(intro, outro);
    ctx.save();
    ctx.fillStyle = `rgba(8, 145, 178, ${0.16 * a})`;
    ctx.fillRect(0, 0, width, height);
    const grad = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.25,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, `rgba(8, 47, 73, ${0.55 * a})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // Blitz Storm ultimate — a pulsing electric flash + radiating streak lines from
  // the locked anchor while the 8-direction dash sequence plays.
  if (state.player.classType === "blitzer" && state.blitzerUltimate) {
    const ult = state.blitzerUltimate;
    ctx.save();
    ctx.fillStyle = `rgba(165, 243, 252, ${0.07 + Math.abs(Math.sin(state.animTime * 40)) * 0.05})`;
    ctx.fillRect(0, 0, width, height);
    // Faint guide lines showing every direction the storm strikes.
    ctx.lineWidth = 2;
    ult.ends.forEach((end, i) => {
      ctx.strokeStyle = i <= ult.index ? "rgba(224, 242, 254, 0.35)" : "rgba(34, 211, 238, 0.15)";
      ctx.beginPath();
      ctx.moveTo(ult.anchor.x, ult.anchor.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    });
    ctx.restore();
  }

  // Player — idle: slow gentle bob; walking: faster hop
  if (state.player.iFrames <= 0 || Math.floor(state.player.iFrames * 20) % 2 === 0) {
    const pBobY = state.playerMoving
      ? -Math.abs(Math.sin(state.animTime * 10)) * 3
      : Math.sin(state.animTime * 2.5) * 1;
    const pSwayX = state.playerMoving ? Math.sin(state.animTime * 10) * 1 : 0;
    drawSprite(
      ctx,
      SPRITES[state.player.classType],
      state.player.pos.x + pSwayX,
      state.player.pos.y + pBobY,
      3
    );
  }

  // Berserker Rage — pulsing red tint over the brute + rising ember particles.
  if (state.player.classType === "brute" && state.player.bruteRageActive > 0) {
    const sprite = SPRITES.brute;
    const hw = (sprite[0].length * 3) / 2;
    const hh = (sprite.length * 3) / 2;
    ctx.globalAlpha = 0.25 + Math.abs(Math.sin(state.animTime * 12)) * 0.2;
    ctx.fillStyle = "#EF4444";
    ctx.fillRect(state.player.pos.x - hw, state.player.pos.y - hh, hw * 2, hh * 2);
    ctx.globalAlpha = 1;
    // Flickering embers rising around the raging brute.
    for (let i = 0; i < 6; i++) {
      const phase = (state.animTime * 1.6 + i * 0.37) % 1;
      const ex = state.player.pos.x + Math.sin(i * 2.1 + state.animTime * 5) * (hw + 6);
      const ey = state.player.pos.y + hh - phase * (hh * 2 + 14);
      ctx.globalAlpha = 0.8 * (1 - phase);
      ctx.fillStyle = i % 2 === 0 ? "#F87171" : "#FBBF24";
      ctx.fillRect(ex - 1.5, ey - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  // Wizard aftermath shield (aura + wings) drawn over the player sprite.
  drawWizardShield(ctx, state);

  // Particles
  state.particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.lifeTime / p.maxLife;
    ctx.fillRect(p.pos.x, p.pos.y, 4, 4);
  });
  ctx.globalAlpha = 1;

  // Texts
  ctx.font = "bold 16px Quicksand, sans-serif";
  ctx.textAlign = "center";
  state.texts.forEach(t => {
    ctx.fillStyle = t.color;
    ctx.globalAlpha = t.lifeTime / t.maxLife;
    ctx.fillText(t.text, t.pos.x, t.pos.y);
  });
  ctx.globalAlpha = 1;

  // Shoulder Charge clash QTE — dim the arena, spark the clash point, and draw
  // the shrinking timing ring + perfect-zone band + SPACE prompt; then the result flash.
  if (state.bruteClash) {
    const clash = state.bruteClash;
    ctx.save();
    if (clash.resolved === null) {
      const prog = Math.max(0, 1 - clash.timer / CLASH_WINDOW); // 1 → 0
      // Freeze-frame dim over everything already drawn.
      ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
      ctx.fillRect(0, 0, width, height);
      // Strain sparks flying off the lock point.
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = 6 + Math.random() * 22;
        ctx.fillStyle = i % 2 === 0 ? "#FBBF24" : "#F87171";
        ctx.fillRect(clash.pos.x + Math.cos(a) * d - 1.5, clash.pos.y + Math.sin(a) * d - 1.5, 3, 3);
      }
      const maxR = 64, minR = 14;
      const perfectZoneR = minR + CLASH_PERFECT_ZONE * (maxR - minR); // inner edge of perfect band
      // Perfect-zone band: highlighted ring between minR and perfectZoneR showing
      // the window where a PERFECT press fires. Always visible so the player
      // knows where to aim before the first attempt.
      ctx.beginPath();
      ctx.arc(clash.pos.x, clash.pos.y, perfectZoneR, 0, Math.PI * 2);
      ctx.arc(clash.pos.x, clash.pos.y, minR, 0, Math.PI * 2, true);
      ctx.fillStyle = "rgba(52, 211, 153, 0.28)"; // translucent green band
      ctx.fill();
      // Perfect zone outer edge marker.
      ctx.strokeStyle = "rgba(52, 211, 153, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(clash.pos.x, clash.pos.y, perfectZoneR, 0, Math.PI * 2); ctx.stroke();

      // Shrinking timing ring — gold → orange → red, snaps green inside perfect zone.
      const r = minR + (maxR - minR) * prog;
      const inPerfect = r <= perfectZoneR + 1; // +1px tolerance for visual snap
      ctx.strokeStyle = inPerfect ? "#34D399" : (prog < 0.35 ? "#EF4444" : "#FBBF24");
      ctx.lineWidth = inPerfect ? 6 : 5;
      ctx.beginPath(); ctx.arc(clash.pos.x, clash.pos.y, r, 0, Math.PI * 2); ctx.stroke();
      // Static inner target ring.
      ctx.strokeStyle = "rgba(254, 243, 199, 0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(clash.pos.x, clash.pos.y, minR, 0, Math.PI * 2); ctx.stroke();
      // Prompt — shows PERFECT! hint when inside the zone.
      ctx.font = "bold 22px Quicksand, sans-serif";
      ctx.textAlign = "center";
      if (inPerfect) {
        ctx.fillStyle = "#34D399";
        ctx.fillText("★ PERFECT ZONE! ★", clash.pos.x, clash.pos.y - maxR - 16);
      } else {
        ctx.fillStyle = prog < 0.35 ? "#FCA5A5" : "#FDE68A";
        ctx.fillText("PRESS SPACE!", clash.pos.x, clash.pos.y - maxR - 16);
      }
    } else {
      // Result flash — expanding ring + verdict text fading over the linger.
      const t = Math.min(1, clash.timer / CLASH_RESULT_LINGER); // 0 → 1
      const a = 1 - t;
      const result = clash.resolved; // "perfect" | "good" | "miss"
      const col = result === "perfect" ? "251, 191, 36"
                : result === "good"    ? "251, 146, 60"
                : "156, 163, 175";
      const expandR = result === "perfect" ? 220 : result === "good" ? 140 : 90;
      ctx.strokeStyle = `rgba(${col}, ${a})`;
      ctx.lineWidth = (result === "perfect" ? 8 : result === "good" ? 6 : 4) * a;
      ctx.beginPath();
      ctx.arc(clash.pos.x, clash.pos.y, expandR * t + 14, 0, Math.PI * 2);
      ctx.stroke();
      if (result === "perfect") {
        ctx.fillStyle = `rgba(253, 230, 138, ${a * 0.25})`;
        ctx.fillRect(0, 0, width, height);
      } else if (result === "good") {
        ctx.fillStyle = `rgba(251, 146, 60, ${a * 0.12})`;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.font = "bold 26px Quicksand, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = `rgba(${col}, ${a})`;
      const label = result === "perfect" ? "PERFECT!" : result === "good" ? "GOOD!" : "MISS";
      ctx.fillText(label, clash.pos.x, clash.pos.y - 80 - t * 20);
    }
    ctx.restore();
  }

  ctx.restore();

  // Round announcements are screen-space UI: they ignore the arena shake and
  // never block player input.
  if (state.announcement) {
    const a = state.announcement;
    const age = 1 - a.timer / a.maxTime;
    const fade = Math.min(1, age * 5, a.timer * 2);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = "rgba(69, 10, 10, 0.26)";
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = "center";
    ctx.font = "bold 34px Quicksand, sans-serif";
    ctx.fillStyle = "#FCA5A5";
    ctx.fillText(a.text, width / 2, height / 2 - 6);
    ctx.font = "bold 15px Quicksand, sans-serif";
    ctx.fillStyle = "#FDE68A";
    ctx.fillText("THE BLOOD EMPRESSES APPROACH", width / 2, height / 2 + 26);
    ctx.restore();
  }
};

const spawnParticles = (state: TransientGameState, pos: Vector2, color: string) => {
  for (let i=0; i<5; i++) {
    state.particles.push({
      id: `part_${Math.random()}`,
      pos: { ...pos },
      vel: { x: (Math.random()-0.5)*100, y: (Math.random()-0.5)*100 },
      lifeTime: 0.5 + Math.random()*0.5,
      maxLife: 1,
      color,
      radius: 2
    });
  }
};

const spawnText = (state: TransientGameState, pos: Vector2, text: string, color: string) => {
  state.texts.push({
    id: `txt_${Math.random()}`,
    pos: { x: pos.x, y: pos.y - 10 },
    vel: { x: (Math.random()-0.5)*20, y: -30 },
    lifeTime: 0.8,
    maxLife: 0.8,
    color,
    text,
    radius: 0
  });
};

// A rune-covered charge ring for the Divine Pillar — golden double circle with
// rotating glyphs spaced around its circumference.
const drawRuneRing = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  animTime: number,
  index: number,
  alpha: number
) => {
  if (r < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  // Outer glow + bright inner rim
  ctx.strokeStyle = "rgba(253, 224, 71, 0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "rgba(254, 243, 199, 0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, r - 4), 0, Math.PI * 2); ctx.stroke();

  // Rotating runes — alternate rings spin opposite directions.
  const count = Math.max(8, Math.floor(r / 26));
  const dir = index % 2 === 0 ? 1 : -1;
  const rot = animTime * 0.6 * dir;
  ctx.fillStyle = "#FEF9C3";
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rot;
    const rx = cx + Math.cos(a) * r;
    const ry = cy + Math.sin(a) * r;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(a);
    // Simple glyph: a vertical bar crossed by a shorter horizontal bar.
    ctx.fillRect(-1.5, -5, 3, 10);
    ctx.fillRect(-4, -1.5, 8, 3);
    ctx.restore();
  }
  ctx.restore();
};

// One white feathered wing (gold-edged) fanning out from a shoulder anchor.
// side: -1 left / +1 right. spread: 0 folded → 1 fully spread.
const drawWing = (
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  side: number,
  spread: number,
  alpha: number
) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  const n = 5;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    // Folded feathers hang down-and-out; spread feathers fan up-and-out.
    const fold = Math.PI * 0.62;
    const open = Math.PI * (0.15 + t * 0.32);
    const ang = fold + (open - fold) * spread;
    const dirX = Math.sin(ang) * side;
    const dirY = -Math.cos(ang);
    const len = 14 + t * 12 + spread * 12;
    const ex = sx + dirX * len;
    const ey = sy + dirY * len;
    ctx.strokeStyle = "#FDE047";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.lineCap = "butt";
  ctx.restore();
};

// Draws the full Divine Pillar sequence: rune rings, the map-wide beam, the
// radiating cosmetic stars, and the lingering radiant field overlay.
const drawWizardUltimate = (
  ctx: CanvasRenderingContext2D,
  state: TransientGameState,
  width: number,
  height: number
) => {
  const u = state.wizardUlt;
  if (!u) return;
  const cx = u.center.x;
  const cy = u.center.y;
  const maxR = Math.hypot(width, height) / 2; // 5th ring covers the whole map
  const animTime = state.animTime;

  // Rune rings — fully built ones at full size, plus the growing current ring.
  for (let i = 0; i < u.ringsBuilt; i++) {
    const r = ((i + 1) / RING_COUNT) * maxR;
    drawRuneRing(ctx, cx, cy, r, animTime, i, 0.85);
  }
  if (u.phase === "rings" && u.ringsBuilt < RING_COUNT) {
    const target = ((u.ringsBuilt + 1) / RING_COUNT) * maxR;
    drawRuneRing(ctx, cx, cy, target * u.ringGrowT, animTime, u.ringsBuilt, 0.85);
  }

  // Beam: a blinding full-screen radiant flash + vertical pillar of light.
  if (u.phase === "beam") {
    const flash = 1 - u.beamTimer / BEAM_DURATION; // 1 → 0
    ctx.save();
    // Layer 1: deep gold wash — full screen
    ctx.fillStyle = `rgba(253, 224, 71, ${0.75 * flash})`;
    ctx.fillRect(0, 0, width, height);
    // Layer 2: pure white overexposure — full screen (peaks to near-solid at start)
    ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * flash})`;
    ctx.fillRect(0, 0, width, height);
    // Layer 3: wide gold halo column for the pillar shape
    const halo = width * (0.35 + 0.25 * flash);
    ctx.fillStyle = `rgba(253, 224, 71, ${0.55 * flash})`;
    ctx.fillRect(cx - halo / 2, 0, halo, height);
    // Layer 4: white-hot core column
    const core = width * (0.15 + 0.10 * flash);
    ctx.fillStyle = `rgba(255, 251, 235, ${0.95 * flash})`;
    ctx.fillRect(cx - core / 2, 0, core, height);
    // Layer 5: radial burst at the ring centre
    ctx.fillStyle = `rgba(255, 255, 255, ${flash})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 80 + (1 - flash) * 200, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Radiant field — subtle pulsing gold tint during the radiance window.
  if (u.phase === "radiance") {
    const rf = Math.max(0, u.radianceTimer / RADIANCE_DURATION); // 1 → 0
    const pulse = 0.07 + Math.abs(Math.sin(animTime * 4)) * 0.06;
    ctx.save();
    ctx.fillStyle = `rgba(253, 224, 71, ${pulse * rf})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // Cosmetic stars radiating outward from the ring centre (beam + radiance).
  if (u.stars.length) {
    ctx.save();
    for (const s of u.stars) {
      const x = cx + Math.cos(s.angle) * s.dist;
      const y = cy + Math.sin(s.angle) * s.dist;
      const fade = Math.max(0, 1 - s.dist / (maxR * 1.1));
      if (fade <= 0) continue;
      ctx.globalAlpha = fade;
      ctx.fillStyle = s.color;
      const L = s.len;
      // 4-point star
      ctx.beginPath();
      ctx.moveTo(x, y - L);
      ctx.lineTo(x + L * 0.28, y - L * 0.28);
      ctx.lineTo(x + L, y);
      ctx.lineTo(x + L * 0.28, y + L * 0.28);
      ctx.lineTo(x, y + L);
      ctx.lineTo(x - L * 0.28, y + L * 0.28);
      ctx.lineTo(x - L, y);
      ctx.lineTo(x - L * 0.28, y - L * 0.28);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

// Draws the aftermath shield: yellow aura + white wings around the wizard, and
// the wings-spread + shockwave burst on the first blocked hit.
const drawWizardShield = (
  ctx: CanvasRenderingContext2D,
  state: TransientGameState
) => {
  const sh = state.wizardShield;
  if (!sh) return;
  const px = state.player.pos.x;
  const py = state.player.pos.y;
  const animTime = state.animTime;
  const bp = sh.breaking ? Math.min(1, sh.breakTimer / SHIELD_BREAK_DURATION) : 0;

  // Aura — pulsing gold disc that fades out as the shield breaks.
  const auraAlpha = (0.22 + Math.abs(Math.sin(animTime * 5)) * 0.16) * (1 - bp);
  if (auraAlpha > 0.01) {
    const auraR = 24 + Math.sin(animTime * 5) * 2;
    ctx.save();
    ctx.globalAlpha = auraAlpha;
    ctx.fillStyle = "#FDE047";
    ctx.beginPath(); ctx.arc(px, py, auraR, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = Math.min(1, auraAlpha + 0.3);
    ctx.strokeStyle = "#FEF3C7";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, auraR, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // Wings — gentle idle flutter when held; spread wide as the shield breaks.
  const idle = 0.3 + Math.sin(animTime * 3) * 0.06;
  const spread = sh.breaking ? Math.max(idle, bp) : idle;
  const wingAlpha = 1 - bp * 0.7;
  drawWing(ctx, px - 7, py - 4, -1, spread, wingAlpha);
  drawWing(ctx, px + 7, py - 4, 1, spread, wingAlpha);

  // Shockwave burst on break.
  if (sh.breaking) {
    const sr = bp * 175;
    ctx.save();
    ctx.strokeStyle = `rgba(253, 224, 71, ${1 - bp})`;
    ctx.lineWidth = 8 * (1 - bp);
    ctx.beginPath(); ctx.arc(px, py, sr, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(254, 249, 195, ${(1 - bp) * 0.7})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, sr * 0.7, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
};
