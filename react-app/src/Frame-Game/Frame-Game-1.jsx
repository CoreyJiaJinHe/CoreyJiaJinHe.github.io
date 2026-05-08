import { useEffect, useRef, useState, useCallback } from 'react';
import ToggleableSwitchComponent from '../components/ToggleComponent'
import {
    PROFILE,
    DIFFICULTY_PROFILES,
    createDefaultEnemyArchetypeSpawnConfig,
    createDefaultBossConfig,
} from './configs/difficultyProfiles.js';
import { WEAPON_CONFIGS } from './configs/weaponConfigs.js';
import { ENEMY_ARCHETYPES, ARCHETYPE_CONFIGS } from './configs/enemyArchetypeConfigs.js';
import { createEnemySystem } from './systems/enemy/enemySystem.js';
import FrameGameShopOverlay from './components/Shop.jsx'
import FrameGameKeybindsOverlay from './components/Keybinds.jsx'
import FrameGameWeaponUpgradeOverlay from './components/WeaponUpgrade.jsx'
import {
    squareOverlapsCircle,
    squaresOverlap,
    calculateDistance,
    worldToScreen,
    isOnScreen
} from './utils/MathUtils.js';
import {drawScene, drawEffects, drawOffscreenMarkers} from './render/renderer.js';

function FrameGame1({ largeMode, toggleLargeMode }) {
    const canvasRef = useRef(null);



    const playerRef = useRef({ x: 400, y: 300, halfSize: 20, speed: 200 });
    const previousPlayerPositionRef = useRef({ x: 400, y: 300 });
    const cameraRef = useRef({ x: playerRef.current.x, y: playerRef.current.y });

    const worldBandsRef = useRef({
        activeRadius: 1200,       // counts toward normal population cap
        despawnRadius: 2200,      // normal enemies removed past this
        bossDespawnRadius: 3200,  // bosses culled less aggressively
        spawnMinRadius: 220,      // should match your createEnemy min
        spawnMaxRadius: 520,      // should match your createEnemy max
    });

    const playerStatsRef = useRef({
        alive: true,
        hp: 10,
        maxHP: 10,
        atk: 5,
        meleeBonusPct: 0,
        projectileBonusPct: 0,
        explosionBonusPct: 0,
        def: 2,
        range: 220,
        // Additional stats for secondary turrets
        secondaryTurretAngle: 0,
        secondaryTurretTurnSpeed: Math.PI * 1.8,
    });
    const [playerStatsView, setPlayerStatsView] = useState(playerStatsRef.current);

    const materialsRef = useRef(0);
    const [materialsView, setMaterialsView] = useState(0);
    const advancedDropsRef = useRef([]);

    const tabPressedRef = useRef(false);
    const enemiesRef = useRef([]);
    const enemySpawnConfigRef = useRef({
        startCount: 5, // Hard cap seed count: how many regular enemies are created at game start.
        maxActive: 30, // Hard cap population ceiling: regular enemies cannot exceed this, regardless of difficulty profile.
        spawnInterval: 0.5, // Hard cap spawn floor in seconds: regular refill spawn delay will never go below this value.
    });

    // const enemyArchetypeSpawnConfigRef = useRef({
    //     // Kills needed to fully transition from start -> end weights.
    //     killsToMaxMix: 250,
    //     // Tune these values to control how the spawn mix evolves over time.
    //     // SWARM is intentionally excluded here; swarm enemies are spawner-only.
    //     archetypeWeightCurves: {
    //         [ENEMY_ARCHETYPES.NORMAL]: { start: 80, end: 45 },
    //         [ENEMY_ARCHETYPES.ARMORED]: { start: 5, end: 16 },
    //         [ENEMY_ARCHETYPES.SPAWNER]: { start: 5, end: 12 },
    //         [ENEMY_ARCHETYPES.SPEEDSTER]: { start: 5, end: 14 },
    //         [ENEMY_ARCHETYPES.RANGED]: { start: 5, end: 13 },
    //     },
    // });

    const enemyArchetypeSpawnConfigRef = useRef(createDefaultEnemyArchetypeSpawnConfig());

    const enemySpawnTimerRef = useRef(0);
    const killsRef = useRef(0);
    const [killsView, setKillsView] = useState(0);

    function getDifficultyFromKills(kills) {
        const d = DIFFICULTY_PROFILES[pacingProfileRef.current]; // Active pacing profile config (P1/P2/P3).
        const effectiveKills = scaledEnemiesEnabledRef.current ? kills : 0; // Disable progression scaling when toggle is OFF.

        const extraActive = Math.floor(effectiveKills / d.killsPerExtraActive); // How many +1 population steps unlocked by kills.
        const profileMaxActive = Math.min(d.maxActiveCap, d.maxActiveBase + extraActive); // Profile-driven max active enemies before global hard cap.

        const spawnStepCount = Math.floor(effectiveKills / d.killsPerSpawnStep); // How many spawn-rate acceleration steps unlocked by kills.
        const profileSpawnInterval = Math.max(
            d.spawnIntervalMin, // Profile floor: prevents interval from going below this value.
            d.spawnIntervalBase - spawnStepCount * d.spawnStep // Linear reduction: base - (steps * stepSize).
        );

        const hp = d.enemyHpBase + Math.floor(effectiveKills / d.killsPerHpStep) * d.hpStep; // Enemy HP scaling.
        const atk = d.enemyAtkBase + Math.floor(effectiveKills / d.killsPerAtkStep) * d.atkStep; // Enemy ATK scaling.
        const def = d.enemyDefBase + Math.floor(effectiveKills / d.killsPerDefStep) * d.defStep; // Enemy DEF scaling.

        // Apply absolute game-level limits from enemySpawnConfigRef:
        // 1) maxActive is clamped DOWN by hard cap (cannot exceed hard limit)
        // 2) spawnInterval is clamped UP by hard floor (cannot become faster than this)
        const maxActive = Math.min(enemySpawnConfigRef.current.maxActive, profileMaxActive); // Final allowed active count.
        const spawnInterval = Math.max(enemySpawnConfigRef.current.spawnInterval, profileSpawnInterval); // Final refill delay (seconds).

        return { maxActive, spawnInterval, hp, atk, def };
    }

    // function clamp01(v) {
    //     return Math.max(0, Math.min(1, v));
    // }

    // function getArchetypeSpawnWeights(kills) {
    //     const cfg = enemyArchetypeSpawnConfigRef.current;
    //     const effectiveKills = scaledEnemiesEnabledRef.current ? kills : 0;
    //     // Linear blend progress in [0, 1]: 0 = early-game weights, 1 = late-game weights.
    //     const t = clamp01(effectiveKills / Math.max(1, cfg.killsToMaxMix));

    //     const weights = {};
    //     let totalWeight = 0;

    //     for (const [archetype, curve] of Object.entries(cfg.archetypeWeightCurves)) {
    //         const start = curve?.start ?? 0;
    //         const end = curve?.end ?? start;
    //         // Linear interpolation formula: weight = start + (end - start) * t
    //         const weight = Math.max(0, start + (end - start) * t);
    //         weights[archetype] = weight;
    //         totalWeight += weight;
    //     }

    //     if (totalWeight <= 0) {
    //         return {
    //             weights: { [ENEMY_ARCHETYPES.NORMAL]: 1 },
    //             totalWeight: 1,
    //         };
    //     }

    //     return { weights, totalWeight };
    // }

    function getEnemySystem() {
        return createEnemySystem({
            refs: {
                playerRef,
                previousPlayerPositionRef,
                enemiesRef,
                worldBandsRef,
                enemySpawnTimerRef,
                killsRef,
                scaledEnemiesEnabledRef,
                pacingProfileRef,
                bossSpawnTimerRef,
            },
            configRefs: {
                enemyArchetypeSpawnConfigRef,
                bossConfigRef,
            },
            getDifficultyFromKills,
            getCombatCallbacks: () => ({
                isTurretAligned,
                normalizeAngle,
                fireEnemyTurret,
            }),
        });
    }
    function pickRandomEnemyArchetype(kills) {
        return getEnemySystem().pickRandomEnemyArchetype(kills);
    }

    // function pickRandomEnemyArchetype(kills) {
    //     const { weights, totalWeight } = getArchetypeSpawnWeights(kills);
    //     // Weighted random roll in [0, totalWeight).
    //     let roll = Math.random() * totalWeight;

    //     for (const [archetype, weight] of Object.entries(weights)) {
    //         if (weight <= 0) continue;
    //         roll -= weight;
    //         if (roll <= 0) return archetype;
    //     }

    //     return ENEMY_ARCHETYPES.NORMAL;
    // }

    // function createEnemy(player, statOverrides = {}, archetype = ENEMY_ARCHETYPES.NORMAL) {
    //     function updateEnemyAi(dt) {
    //         const p = playerRef.current;
    //         const cfg = getEnemyAiConfig();

    //         for (const enemy of enemiesRef.current) {
    //             if (!enemy.alive) continue;

    //             const dx = p.x - enemy.x;
    //             const dy = p.y - enemy.y;
    //             const dist = Math.hypot(dx, dy);
    //             const toPlayer = normalize2D(dx, dy);

    //             const contactRange = p.halfSize + enemy.halfSize - 1;

    //             if (dist <= enemy.desiredRange) {
    //                 enemy.aiState = 'attack-range';
    //             } else if (dist <= cfg.aggroRadius) {
    //                 enemy.aiState = 'chase';
    //             } else if (enemy.aiState === 'chase' || enemy.aiState === 'attack-range') {
    //                 enemy.aiState = Math.random() < 0.5 ? 'idle-zigzag' : 'idle-move';
    //             }

    //             enemy.aiTimer -= dt;

    //             if (enemy.aiState === 'idle-zigzag') {
    //                 if (enemy.aiTimer <= 0) {
    //                     enemy.aiTimer = randomBetween(cfg.repathIntervalMin, cfg.repathIntervalMax);
    //                     enemy.wanderAngle += randomBetween(-0.9, 0.9);
    //                 }

    //                 enemy.strafePhase += dt * cfg.strafeFrequency;
    //                 const strafe = Math.sin(enemy.strafePhase) * cfg.strafeAmplitude;

    //                 const forwardX = Math.cos(enemy.wanderAngle);
    //                 const forwardY = Math.sin(enemy.wanderAngle);
    //                 const rightX = -forwardY;
    //                 const rightY = forwardX;

    //                 enemy.x += (forwardX * cfg.idleDriftSpeed + rightX * strafe) * dt;
    //                 enemy.y += (forwardY * cfg.idleDriftSpeed + rightY * strafe) * dt;
    //             }

    //             if (enemy.aiState === 'idle-move') {
    //                 enemy.idleMoveRemaining -= cfg.idleMoveSpeed * dt;
    //                 enemy.x += enemy.idleMoveDir.x * cfg.idleMoveSpeed * dt;
    //                 enemy.y += enemy.idleMoveDir.y * cfg.idleMoveSpeed * dt;

    //                 if (enemy.idleMoveRemaining <= 0) {
    //                     enemy.idleMoveDir = pickRandomIdleMoveDirection();
    //                     enemy.idleMoveRemaining = randomBetween(cfg.idleMoveSegmentMin, cfg.idleMoveSegmentMax);
    //                 }
    //             }

    //             if (enemy.aiState === 'chase') {
    //                 enemy.x += toPlayer.x * enemy.speed * dt;
    //                 enemy.y += toPlayer.y * enemy.speed * dt;
    //             }

    //             if (enemy.aiState === 'attack-range') {
    //                 if (dist > contactRange) {
    //                     enemy.x += toPlayer.x * cfg.contactPullSpeed * dt;
    //                     enemy.y += toPlayer.y * cfg.contactPullSpeed * dt;
    //                 } else {
    //                     enemy.strafePhase += dt * cfg.strafeFrequency;
    //                     const orbitDir = Math.sin(enemy.strafePhase);
    //                     const tangentX = -toPlayer.y;
    //                     const tangentY = toPlayer.x;

    //                     enemy.x += tangentX * orbitDir * cfg.idleDriftSpeed * dt;
    //                     enemy.y += tangentY * orbitDir * cfg.idleDriftSpeed * dt;

    //                     if (dist < contactRange * 0.7) {
    //                         enemy.x -= toPlayer.x * cfg.pushOutSpeed * dt;
    //                         enemy.y -= toPlayer.y * cfg.pushOutSpeed * dt;
    //                     }
    //                 }
    //             }
    //         }
    //     }
    //     const cfg = getEnemyAiConfig();
    //     const archetypeCfg = ARCHETYPE_CONFIGS[archetype];
    //     const halfSize = 18 * (archetypeCfg?.sizeMultiplier ?? 1);
    //     const spawnOrigin = statOverrides.spawnOrigin ?? player;
    //     const minSpawnDistance = statOverrides.spawnDistanceMin ?? worldBandsRef.current.spawnMinRadius;
    //     const maxSpawnDistance = statOverrides.spawnDistanceMax ?? worldBandsRef.current.spawnMaxRadius;

    //     const angle = Math.random() * Math.PI * 2;
    //     const distance = randomBetween(minSpawnDistance, maxSpawnDistance);
    //     const x = spawnOrigin.x + Math.cos(angle) * distance;
    //     const y = spawnOrigin.y + Math.sin(angle) * distance;

    //     const baseDifficulty = getDifficultyFromKills(killsRef.current);
    //     const baseHp = statOverrides.hp ?? baseDifficulty.hp;
    //     const baseAtk = statOverrides.atk ?? baseDifficulty.atk;
    //     const baseDef = statOverrides.def ?? baseDifficulty.def;

    //     const hpMultiplier = archetypeCfg?.hpMultiplier ?? 1;
    //     const atkMultiplier = archetypeCfg?.atkMultiplier ?? 1;
    //     const defMultiplier = archetypeCfg?.defMultiplier ?? 1;
    //     const speedMultiplier = archetypeCfg?.speedMultiplier ?? 1;

    //     const enemy = {
    //         id: crypto.randomUUID(),
    //         x,
    //         y,
    //         halfSize,
    //         hp: Math.ceil(baseHp * hpMultiplier),
    //         maxHp: Math.ceil(baseHp * hpMultiplier),
    //         atk: Math.ceil(baseAtk * atkMultiplier),
    //         def: Math.ceil(baseDef * defMultiplier),
    //         alive: true,
    //         damagePlayerCooldown: 0,
    //         takeDamageCooldown: 0,
    //         archetype,
    //         speed: cfg.chaseSpeed * speedMultiplier,
    //         aiState: pickRandomInitialAiState(),
    //         aiTimer: 0,
    //         wanderAngle: Math.random() * Math.PI * 2,
    //         strafePhase: Math.random() * Math.PI * 2,
    //         desiredRange: cfg.attackRange * (archetypeCfg?.aggroRadiusMultiplier ?? 1),
    //         idleMoveDir: pickRandomIdleMoveDirection(),
    //         idleMoveRemaining: randomBetween(cfg.idleMoveSegmentMin, cfg.idleMoveSegmentMax),
    //     };

    //     // Archetype-specific state
    //     if (archetype === ENEMY_ARCHETYPES.ARMORED) {
    //         enemy.shieldHealth = archetypeCfg.shieldHealth;
    //         enemy.maxShieldHealth = archetypeCfg.shieldHealth;
    //     }
    //     if (archetype === ENEMY_ARCHETYPES.SPAWNER) {
    //         enemy.spawnTimer = archetypeCfg.spawnInterval;
    //         enemy.spawnedSwarmIds = [];
    //         // Persisted random satellite layout so satellites are random-but-stable per spawner.
    //         const baseAngle = Math.random() * Math.PI * 2;
    //         enemy.spawnerSatelliteAngles = Array.from({ length: 4 }, (_, i) => {
    //             const evenlySpaced = baseAngle + i * (Math.PI / 2);
    //             const jitter = randomBetween(-0.45, 0.45);
    //             return evenlySpaced + jitter;
    //         });
    //     }
    //     if (archetype === ENEMY_ARCHETYPES.SWARM) {
    //         enemy.spawnerParentId = statOverrides.spawnerParentId || null;
    //     }
    //     if (archetype === ENEMY_ARCHETYPES.SPEEDSTER) {
    //         const directions = [
    //             { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
    //             { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
    //         ];
    //         enemy.speedsterDirection = directions[Math.floor(Math.random() * 8)];
    //     }
    //     if (archetype === ENEMY_ARCHETYPES.RANGED) {
    //         enemy.turretAngle = 0;
    //         enemy.turretCooldown = 0;
    //         enemy.rangedOrbitSign = Math.random() < 0.5 ? -1 : 1;
    //     }

    //     return enemy;
    // }


    // function getActiveEnemyCountInBand() {
    //     const activeRadiusSq = worldBandsRef.current.activeRadius * worldBandsRef.current.activeRadius;

    //     return enemiesRef.current.reduce((count, enemy) => {
    //         if (!enemy.alive) return count;
    //         if (enemy.isBoss) return count;
    //         if (distanceSqToPlayer(enemy.x, enemy.y, playerRef.current.x, playerRef.current.y) > activeRadiusSq) return count;
    //         return count + 1;
    //     }, 0);
    // }

    // function getEnemyAiConfig() {
    //     return ENEMY_AI_DIFFICULTY_PROFILES[pacingProfileRef.current];
    // }

    // function pickRandomIdleMoveDirection() {
    //     const dirs = [
    //         { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
    //         { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
    //     ];
    //     const d = dirs[Math.floor(Math.random() * dirs.length)];
    //     const n = normalize2D(d.x, d.y);
    //     return { x: n.x, y: n.y };
    // }

    // function pickRandomInitialAiState() {
    //     const states = ['idle-zigzag', 'idle-move', 'chase', 'attack-range'];
    //     return states[Math.floor(Math.random() * states.length)];
    // }

    // function updateSpeedsterMovement(enemy, dt) {
    //     const cfg = getEnemyAiConfig();
    //     const p = playerRef.current;
    //     const dx = p.x - enemy.x;
    //     const dy = p.y - enemy.y;
    //     const dist = Math.hypot(dx, dy);
        
    //     // Speedsters only move in straight lines (one of 8 cardinal/diagonal directions)
    //     // No zigzag or strafe
    //     if (dist <= enemy.desiredRange) {
    //         enemy.aiState = 'attack-range';
    //     } else if (dist <= cfg.aggroRadius) {
    //         enemy.aiState = 'chase';
    //     } else {
    //         enemy.aiState = 'idle-move';
    //     }
        
    //     if (enemy.aiState === 'chase') {
    //         const dirNorm = normalize2D(dx, dy);
    //         enemy.speedsterDirection = dirNorm;
    //         enemy.x += dirNorm.x * enemy.speed * dt;
    //         enemy.y += dirNorm.y * enemy.speed * dt;
    //     } else if (enemy.aiState === 'attack-range') {
    //         const dirNorm = normalize2D(dx, dy);
    //         enemy.speedsterDirection = dirNorm;
    //         enemy.x += dirNorm.x * enemy.speed * dt;
    //         enemy.y += dirNorm.y * enemy.speed * dt;
    //     } else if (enemy.aiState === 'idle-move') {
    //         enemy.idleMoveRemaining -= cfg.idleMoveSpeed * dt;
    //         const dir = enemy.speedsterDirection;
    //         enemy.x += dir.x * enemy.speed * dt;
    //         enemy.y += dir.y * enemy.speed * dt;
            
    //         if (enemy.idleMoveRemaining <= 0) {
    //             const directions = [
    //                 { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
    //                 { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
    //             ];
    //             enemy.speedsterDirection = directions[Math.floor(Math.random() * 8)];
    //             enemy.idleMoveRemaining = randomBetween(cfg.idleMoveSegmentMin, cfg.idleMoveSegmentMax);
    //         }
    //     }
    // }

    // function updateSpawnerEnemy(enemy, dt) {
    //     const cfg = getEnemyAiConfig();
    //     const archetypeCfg = ARCHETYPE_CONFIGS[ENEMY_ARCHETYPES.SPAWNER];
    //     const p = playerRef.current;
    //     const dx = p.x - enemy.x;
    //     const dy = p.y - enemy.y;
    //     const dist = Math.hypot(dx, dy);
    //     const toPlayer = normalize2D(dx, dy);
        
    //     const contactRange = p.halfSize + enemy.halfSize - 1;
        
    //     // Spawners have large aggro radius
    //     const spawnerAggroRadius = cfg.aggroRadius * (archetypeCfg.aggroRadiusMultiplier ?? 1.5);
        
    //     if (dist <= enemy.desiredRange) {
    //         enemy.aiState = 'attack-range';
    //     } else if (dist <= spawnerAggroRadius) {
    //         enemy.aiState = 'chase';
    //     } else {
    //         enemy.aiState = 'idle-move';
    //     }
        
    //     // Slow movement for spawner
    //     if (enemy.aiState === 'chase') {
    //         enemy.x += toPlayer.x * enemy.speed * dt;
    //         enemy.y += toPlayer.y * enemy.speed * dt;
    //     } else if (enemy.aiState === 'idle-move') {
    //         enemy.idleMoveRemaining -= cfg.idleMoveSpeed * dt;
    //         enemy.x += enemy.idleMoveDir.x * enemy.speed * dt;
    //         enemy.y += enemy.idleMoveDir.y * enemy.speed * dt;
            
    //         if (enemy.idleMoveRemaining <= 0) {
    //             enemy.idleMoveDir = pickRandomIdleMoveDirection();
    //             enemy.idleMoveRemaining = randomBetween(cfg.idleMoveSegmentMin, cfg.idleMoveSegmentMax);
    //         }
    //     }
        
    //     // Spawner spawn logic
    //     enemy.spawnTimer = Math.max(0, enemy.spawnTimer - dt);
    //     const swarmIds = enemy.spawnedSwarmIds.filter(id => {
    //         const swarm = enemiesRef.current.find(e => e.id === id && e.alive);
    //         return swarm !== undefined;
    //     });
    //     enemy.spawnedSwarmIds = swarmIds;
        
    //     if (enemy.spawnTimer <= 0 && swarmIds.length < archetypeCfg.swarmCap) {
    //         const newSwarm = createEnemy(
    //             playerRef.current,
    //             {
    //                 spawnerParentId: enemy.id,
    //                 // Spawn swarm close to the spawner body (not around the player ring).
    //                 spawnOrigin: { x: enemy.x, y: enemy.y },
    //                 spawnDistanceMin: enemy.halfSize + 6,
    //                 spawnDistanceMax: enemy.halfSize + 20,
    //             },
    //             ENEMY_ARCHETYPES.SWARM
    //         );
    //         enemiesRef.current.push(newSwarm);
    //         enemy.spawnedSwarmIds.push(newSwarm.id);
    //         enemy.spawnTimer = archetypeCfg.spawnInterval;
    //     }
    // }

    // function updateSwarmMovement(enemy, dt) {
    //     const cfg = getEnemyAiConfig();
    //     const archetypeCfg = ARCHETYPE_CONFIGS[ENEMY_ARCHETYPES.SPAWNER];
    //     const p = playerRef.current;
        
    //     const spawner = enemiesRef.current.find(e => e.id === enemy.spawnerParentId && e.alive);
        
    //     if (!spawner) {
    //         // Spawner is dead, treat as normal enemy
    //         const dx = p.x - enemy.x;
    //         const dy = p.y - enemy.y;
    //         const dist = Math.hypot(dx, dy);
    //         const toPlayer = normalize2D(dx, dy);
    //         const contactRange = p.halfSize + enemy.halfSize - 1;
            
    //         if (dist <= enemy.desiredRange) {
    //             enemy.aiState = 'attack-range';
    //         } else if (dist <= cfg.aggroRadius) {
    //             enemy.aiState = 'chase';
    //         } else {
    //             enemy.aiState = 'idle-move';
    //         }
            
    //         if (enemy.aiState === 'chase') {
    //             enemy.x += toPlayer.x * enemy.speed * dt;
    //             enemy.y += toPlayer.y * enemy.speed * dt;
    //         } else if (enemy.aiState === 'idle-move') {
    //             enemy.idleMoveRemaining -= cfg.idleMoveSpeed * dt;
    //             enemy.x += enemy.idleMoveDir.x * cfg.idleMoveSpeed * dt;
    //             enemy.y += enemy.idleMoveDir.y * cfg.idleMoveSpeed * dt;
                
    //             if (enemy.idleMoveRemaining <= 0) {
    //                 enemy.idleMoveDir = pickRandomIdleMoveDirection();
    //                 enemy.idleMoveRemaining = randomBetween(cfg.idleMoveSegmentMin, cfg.idleMoveSegmentMax);
    //             }
    //         }
    //         return;
    //     }
        
    //     const dx = p.x - enemy.x;
    //     const dy = p.y - enemy.y;
    //     const distToPlayer = Math.hypot(dx, dy);
    //     const toPlayer = normalize2D(dx, dy);
        
    //     const dxToSpawner = spawner.x - enemy.x;
    //     const dyToSpawner = spawner.y - enemy.y;
    //     const distToSpawner = Math.hypot(dxToSpawner, dyToSpawner);
    //     const retentionDistance = archetypeCfg.swarmRetentionDistance;
        
    //     // If spawner is chasing, all swarm chase
    //     const spawnerChasing = spawner.aiState === 'chase' || spawner.aiState === 'attack-range';
        
    //     if (distToPlayer <= enemy.desiredRange) {
    //         enemy.aiState = 'attack-range';
    //     } else if (distToPlayer <= cfg.aggroRadius || spawnerChasing) {
    //         enemy.aiState = 'chase';
    //     } else if (distToSpawner > retentionDistance) {
    //         enemy.aiState = 'chase'; // Return to spawner
    //     } else {
    //         enemy.aiState = 'idle-move';
    //     }
        
    //     if (enemy.aiState === 'chase') {
    //         if (distToSpawner > retentionDistance) {
    //             // Move toward spawner
    //             const toSpawner = normalize2D(dxToSpawner, dyToSpawner);
    //             enemy.x += toSpawner.x * enemy.speed * dt;
    //             enemy.y += toSpawner.y * enemy.speed * dt;
    //         } else {
    //             // Move toward player
    //             enemy.x += toPlayer.x * enemy.speed * dt;
    //             enemy.y += toPlayer.y * enemy.speed * dt;
    //         }
    //     } else if (enemy.aiState === 'idle-move') {
    //         enemy.idleMoveRemaining -= cfg.idleMoveSpeed * dt;
    //         enemy.x += enemy.idleMoveDir.x * cfg.idleMoveSpeed * dt;
    //         enemy.y += enemy.idleMoveDir.y * cfg.idleMoveSpeed * dt;
            
    //         if (enemy.idleMoveRemaining <= 0) {
    //             enemy.idleMoveDir = pickRandomIdleMoveDirection();
    //             enemy.idleMoveRemaining = randomBetween(cfg.idleMoveSegmentMin, cfg.idleMoveSegmentMax);
    //         }
    //     }
    // }
    
    function createEnemy(player, statOverrides = {}, archetype = ENEMY_ARCHETYPES.NORMAL) {
        return getEnemySystem().createEnemy(player, statOverrides, archetype);
    }
    
    function updateEnemyAi(dt) {
        getEnemySystem().updateEnemyAi(dt);
    }

    // function updateEnemyAi(dt) {
    //     const p = playerRef.current;
    //     const cfg = getEnemyAiConfig();
    //     const playerPrev = previousPlayerPositionRef.current;

    //     // Per-frame player movement vector used by ranged AI to classify intent:
    //     // moving away, moving toward, moving sideways, or standing still.
    //     const playerMoveX = p.x - playerPrev.x;
    //     const playerMoveY = p.y - playerPrev.y;
    //     const playerMoveLen = Math.hypot(playerMoveX, playerMoveY);
    //     const hasPlayerMoved = playerMoveLen > 0.001;
    //     const playerMoveDir = hasPlayerMoved
    //         ? normalize2D(playerMoveX, playerMoveY)
    //         : { x: 0, y: 0 };

    //     for (const enemy of enemiesRef.current) {
    //         if (!enemy.alive) continue;

    //         // Archetype-specific AI
    //         if (enemy.archetype === ENEMY_ARCHETYPES.SPEEDSTER) {
    //             updateSpeedsterMovement(enemy, dt);
    //             continue;
    //         }
    //         if (enemy.archetype === ENEMY_ARCHETYPES.SPAWNER) {
    //             updateSpawnerEnemy(enemy, dt);
    //             continue;
    //         }
    //         if (enemy.archetype === ENEMY_ARCHETYPES.SWARM) {
    //             updateSwarmMovement(enemy, dt);
    //             continue;
    //         }

    //         if (enemy.archetype === ENEMY_ARCHETYPES.RANGED) {
    //             const turretCfg = ARCHETYPE_CONFIGS[ENEMY_ARCHETYPES.RANGED].turretConfig;
    //             const dx = p.x - enemy.x;
    //             const dy = p.y - enemy.y;
    //             const dist = Math.hypot(dx, dy);
    //             const toPlayer = normalize2D(dx, dy);

    //             // Keep ranged enemies just inside turret range.
    //             const idealDistance = Math.max(0, turretCfg.range - 10);
    //             const distanceTolerance = 10;
    //             const radialIntentThreshold = 0.25;

    //             // Positive radial intent means the player is moving away from this enemy.
    //             const radialIntent = hasPlayerMoved
    //                 ? (playerMoveDir.x * toPlayer.x + playerMoveDir.y * toPlayer.y)
    //                 : 0;

    //             let moveX = 0;
    //             let moveY = 0;

    //             // Phase 1: always re-enter and hold the ideal firing band.
    //             if (dist > idealDistance + distanceTolerance) {
    //                 enemy.aiState = 'chase';
    //                 moveX = toPlayer.x; // pursue to get back in range
    //                 moveY = toPlayer.y;
    //             } else if (dist < idealDistance - distanceTolerance) {
    //                 enemy.aiState = 'attack-range';
    //                 moveX = -toPlayer.x; // flee to restore standoff distance
    //                 moveY = -toPlayer.y;
    //             } else {
    //                 enemy.aiState = 'attack-range';

    //                 // Phase 2: once at ideal distance, react to player motion.
    //                 if (!hasPlayerMoved) {
    //                     // Stationary player: circle around target while holding distance.
    //                     const orbitSign = enemy.rangedOrbitSign ?? 1;
    //                     const tangentX = -toPlayer.y;
    //                     const tangentY = toPlayer.x;
    //                     moveX = tangentX * orbitSign;
    //                     moveY = tangentY * orbitSign;
    //                 } else if (radialIntent > radialIntentThreshold) {
    //                     moveX = toPlayer.x; // player moving away -> pursue
    //                     moveY = toPlayer.y;
    //                 } else if (radialIntent < -radialIntentThreshold) {
    //                     moveX = -toPlayer.x; // player moving toward -> flee
    //                     moveY = -toPlayer.y;
    //                 } else {
    //                     moveX = playerMoveDir.x; // player moving sideways -> follow
    //                     moveY = playerMoveDir.y;
    //                 }

    //                 // Small radial correction while following/orbiting to hold ideal distance.
    //                 const idealDenom = Math.max(idealDistance, 1);
    //                 const radialError = (dist - idealDistance) / idealDenom;
    //                 const correction = Math.max(-0.65, Math.min(0.65, radialError));
    //                 moveX += toPlayer.x * correction;
    //                 moveY += toPlayer.y * correction;
    //             }

    //             const moveDir = normalize2D(moveX, moveY);
    //             enemy.x += moveDir.x * enemy.speed * dt;
    //             enemy.y += moveDir.y * enemy.speed * dt;

    //             // Ranged enemy turret aiming and firing (post-move values).
    //             const aimDx = p.x - enemy.x;
    //             const aimDy = p.y - enemy.y;
    //             const aimDist = Math.hypot(aimDx, aimDy);
    //             const targetAngle = Math.atan2(aimDy, aimDx);
    //             let delta = normalizeAngle(targetAngle - enemy.turretAngle);
    //             const maxStep = turretCfg.turnSpeed * dt;
    //             if (Math.abs(delta) <= maxStep) {
    //                 enemy.turretAngle = targetAngle;
    //             } else {
    //                 enemy.turretAngle += Math.sign(delta) * maxStep;
    //                 enemy.turretAngle = normalizeAngle(enemy.turretAngle);
    //             }

    //             enemy.turretCooldown = Math.max(0, enemy.turretCooldown - dt);
    //             if (
    //                 enemy.turretCooldown <= 0
    //                 && isTurretAligned(enemy.turretAngle, targetAngle, turretCfg.alignTolerance)
    //                 && aimDist <= turretCfg.range
    //             ) {
    //                 fireEnemyTurret(enemy, p);
    //                 enemy.turretCooldown = turretCfg.cooldown;
    //             }

    //             continue;
    //         }

    //         // ... Normal AI (for NORMAL, ARMORED, RANGED)
    //         const dx = p.x - enemy.x;
    //         const dy = p.y - enemy.y;
    //         const dist = Math.hypot(dx, dy);
    //         const toPlayer = normalize2D(dx, dy);

    //         const contactRange = p.halfSize + enemy.halfSize - 1;

    //         if (dist <= enemy.desiredRange) {
    //             enemy.aiState = 'attack-range';
    //         } else if (dist <= cfg.aggroRadius) {
    //             enemy.aiState = 'chase';
    //         } else if (enemy.aiState === 'chase' || enemy.aiState === 'attack-range') {
    //             enemy.aiState = Math.random() < 0.5 ? 'idle-zigzag' : 'idle-move';
    //         }

    //         enemy.aiTimer -= dt;

    //         if (enemy.aiState === 'idle-zigzag') {
    //             if (enemy.aiTimer <= 0) {
    //                 enemy.aiTimer = randomBetween(cfg.repathIntervalMin, cfg.repathIntervalMax);
    //                 enemy.wanderAngle += randomBetween(-0.9, 0.9);
    //             }

    //             enemy.strafePhase += dt * cfg.strafeFrequency;
    //             const strafe = Math.sin(enemy.strafePhase) * cfg.strafeAmplitude;

    //             const forwardX = Math.cos(enemy.wanderAngle);
    //             const forwardY = Math.sin(enemy.wanderAngle);
    //             const rightX = -forwardY;
    //             const rightY = forwardX;

    //             enemy.x += (forwardX * cfg.idleDriftSpeed + rightX * strafe) * dt;
    //             enemy.y += (forwardY * cfg.idleDriftSpeed + rightY * strafe) * dt;
    //         }

    //         if (enemy.aiState === 'idle-move') {
    //             enemy.idleMoveRemaining -= cfg.idleMoveSpeed * dt;
    //             enemy.x += enemy.idleMoveDir.x * cfg.idleMoveSpeed * dt;
    //             enemy.y += enemy.idleMoveDir.y * cfg.idleMoveSpeed * dt;

    //             if (enemy.idleMoveRemaining <= 0) {
    //                 enemy.idleMoveDir = pickRandomIdleMoveDirection();
    //                 enemy.idleMoveRemaining = randomBetween(cfg.idleMoveSegmentMin, cfg.idleMoveSegmentMax);
    //             }
    //         }

    //         if (enemy.aiState === 'chase') {
    //             enemy.x += toPlayer.x * enemy.speed * dt;
    //             enemy.y += toPlayer.y * enemy.speed * dt;
    //         }

    //         if (enemy.aiState === 'attack-range') {
    //             if (dist > contactRange) {
    //                 enemy.x += toPlayer.x * cfg.contactPullSpeed * dt;
    //                 enemy.y += toPlayer.y * cfg.contactPullSpeed * dt;
    //             } else {
    //                 enemy.strafePhase += dt * cfg.strafeFrequency;
    //                 const orbitDir = Math.sin(enemy.strafePhase);
    //                 const tangentX = -toPlayer.y;
    //                 const tangentY = toPlayer.x;

    //                 enemy.x += tangentX * orbitDir * cfg.idleDriftSpeed * dt;
    //                 enemy.y += tangentY * orbitDir * cfg.idleDriftSpeed * dt;

    //                 if (dist < contactRange * 0.7) {
    //                     enemy.x -= toPlayer.x * cfg.pushOutSpeed * dt;
    //                     enemy.y -= toPlayer.y * cfg.pushOutSpeed * dt;
    //                 }
    //             }
    //         }

    //     }

    //     previousPlayerPositionRef.current = { x: p.x, y: p.y };
    // }


    const keysRef = useRef(new Set());
    const mouseSeekModeRef = useRef(false);
    const [mouseSeekEnabled, setMouseSeekEnabled] = useState(false);
    const mouseRef = useRef({ x: 0, y: 0, inside: false });

    function setMouseSeekMode(nextValue) {
        const resolved =
            typeof nextValue === 'function'
                ? nextValue(mouseSeekModeRef.current)
                : nextValue;

        mouseSeekModeRef.current = resolved;
        setMouseSeekEnabled(resolved);
    }

    function getAliveEnemiesSortedByDistance() {
        const p = playerRef.current;
        return enemiesRef.current
            .filter((enemy) => enemy.alive)
            .sort((a, b) => {
                const da = (a.x - p.x) ** 2 + (a.y - p.y) ** 2;
                const db = (b.x - p.x) ** 2 + (b.y - p.y) ** 2;
                return da - db; // closest first
            });
    }


    const [scaledEnemiesEnabled, setScaledEnemiesEnabled] = useState(false);
    const scaledEnemiesEnabledRef = useRef(false);


    function setScaledEnemiesEnabledSync(nextValue) {
        const resolved =
            typeof nextValue === 'function'
                ? nextValue(scaledEnemiesEnabledRef.current)
                : nextValue;

        scaledEnemiesEnabledRef.current = resolved;
        setScaledEnemiesEnabled(resolved);
    }


    const [pacingProfile, setPacingProfile] = useState(PROFILE.P2);
    const pacingProfileRef = useRef(PROFILE.P2);

    function setPacingProfileSync(nextValue) {
        const resolved =
            typeof nextValue === 'function'
                ? nextValue(pacingProfileRef.current)
                : nextValue;

        pacingProfileRef.current = resolved;
        setPacingProfile(resolved);
    }
    
    function updateEnemyPopulation(dt, canvas) {
        getEnemySystem().updateEnemyPopulation(dt);
    }


    // function updateEnemyPopulation(dt, canvas) {
    //     const y = killsRef.current;
    //     const scaled = getDifficultyFromKills(y);
    //     const activeCount = getActiveEnemyCountInBand();

    //     if (activeCount >= scaled.maxActive) {
    //         enemySpawnTimerRef.current = 0;
    //         return;
    //     }

    //     enemySpawnTimerRef.current += dt;

    //     if (enemySpawnTimerRef.current >= scaled.spawnInterval) {
    //         enemySpawnTimerRef.current = 0;
    //         const archetype = pickRandomEnemyArchetype(y);

    //         enemiesRef.current.push(
    //             createEnemy(playerRef.current, {
    //                 hp: scaled.hp,
    //                 atk: scaled.atk,
    //                 def: scaled.def,
    //             }, archetype)
    //         );
    //     }
    // }

    // const bossConfigRef = useRef({
    //     killsPerBoss: 50,
    //     spawnDelay: 2.0,
    //     nextBossAt: 50,
    //     maxSimultaneousBosses: {
    //         [PROFILE.P1]: 1,
    //         [PROFILE.P2]: 1,
    //         [PROFILE.P3]: 3,
    //     },
    //     pendingBossSpawn: false,
    // });
    
    const bossConfigRef = useRef(createDefaultBossConfig());
    
    const bossSpawnTimerRef = useRef(0);
    const [bossesDefeatedView, setBossesDefeatedView] = useState(0);
    const bossesDefeatedRef = useRef(0);

    // function createBoss(player, scaled) {
    //     return {
    //         ...createEnemy(player, {
    //             hp: Math.floor(scaled.hp * 6),
    //             atk: Math.max(2, Math.floor(scaled.atk * 2)),
    //             def: Math.max(2, scaled.def + 2),
    //         }),
    //         halfSize: 30,
    //         isBoss: true,
    //     };
    // }

    // function updateBossSpawn(dt, canvas) {
    //     const cfg = bossConfigRef.current;
    //     const kills = killsRef.current;
    //     const profile = pacingProfileRef.current;

    //     if (kills < cfg.nextBossAt) {
    //         bossSpawnTimerRef.current = 0;
    //         cfg.pendingBossSpawn = false;
    //         return;
    //     }

    //     const maxAllowed = cfg.maxSimultaneousBosses[profile];
    //     const aliveBosSCount = enemiesRef.current.filter((e) => e.alive && e.isBoss).length;

    //     if (aliveBosSCount >= maxAllowed) {
    //         // Queue the spawn, don't proceed
    //         cfg.pendingBossSpawn = true;
    //         bossSpawnTimerRef.current = 0;
    //         return;
    //     }

    //     cfg.pendingBossSpawn = false;
    //     bossSpawnTimerRef.current += dt;
    //     if (bossSpawnTimerRef.current >= cfg.spawnDelay) {
    //         bossSpawnTimerRef.current = 0;
    //         const scaled = getDifficultyFromKills(kills);
    //         enemiesRef.current.push(createBoss(playerRef.current, scaled));
    //         cfg.nextBossAt += cfg.killsPerBoss;
    //     }
    // }
    function updateBossSpawn(dt, canvas) {
        getEnemySystem().updateBossSpawn(dt);
    }

    const targetEnemyIdRef = useRef(null);
    const [targetEnemyIdView, setTargetEnemyIdView] = useState(null);


    function cycleTargetReverseClosestToFarthest() {
        const sorted = getAliveEnemiesSortedByDistance();

        if (sorted.length === 0) {
            setTargetEnemyId(null);
            return;
        }

        const closestId = sorted[0].id;
        const currentId = targetEnemyIdRef.current;
        const currentIndex = sorted.findIndex((enemy) => enemy.id === currentId);

        // Re-anchor to closest if current target is missing or no longer closest.
        if (currentIndex === -1 || currentId !== closestId) {
            setTargetEnemyId(closestId);
            return;
        }

        // Reverse cycle from closest: closest -> farthest -> ...
        const prevIndex = (currentIndex - 1 + sorted.length) % sorted.length;
        setTargetEnemyId(sorted[prevIndex].id);
    }


    function cycleTargetClosestToFarthest() {
        const sorted = getAliveEnemiesSortedByDistance();

        if (sorted.length === 0) {
            setTargetEnemyId(null);
            return;
        }
        const closestId = sorted[0].id;
        const currentId = targetEnemyIdRef.current;
        const currentIndex = sorted.findIndex((enemy) => enemy.id === currentId);

        // If no target or target is not closest, snap to closest first.
        if (currentIndex === -1 || currentId !== closestId) {
            setTargetEnemyId(closestId);
            return;
        }

        // Already on closest: now cycle forward.
        const nextIndex = (currentIndex + 1) % sorted.length;
        setTargetEnemyId(sorted[nextIndex].id);
    }

    function setTargetEnemyId(nextValue) {
        targetEnemyIdRef.current = nextValue;
        setTargetEnemyIdView(nextValue);
    }



    const damageTextsRef = useRef([]); // Array of { id, x, y, text, color, life }
    const shakeRef = useRef(0); // Current shake intensity

    // Add a function to trigger effects
    const triggerEffects = (x, y, text, color = "white", isPlayer = false) => {
        const id = Date.now();
        damageTextsRef.current.push({ id, x, y, text, color, life: 1.0 });

        if (isPlayer) {
            shakeRef.current = 10; // Set shake intensity
        }
    };

    const [firstWeaponUpgradeOpen, setFirstWeaponUpgradeOpen] = useState(true);
    const firstWeaponUpgradeOpenRef = useRef(firstWeaponUpgradeOpen);

    function onEnemyKilled(enemy) {
        enemy.hp = 0;
        enemy.alive = false;
        killsRef.current += 1;
        setKillsView(killsRef.current);
        // Basic material: auto-loot
        grantMaterials(1);

        // Advanced drop: rare physical pickup
        maybeSpawnAdvancedDrop(enemy.x, enemy.y);

        if (enemy.id === targetEnemyIdRef.current) {
            setTargetEnemyId(null);
        }

        if (enemy.isBoss) {
            grantMaterials(4);
            bossesDefeatedRef.current += 1;
            setBossesDefeatedView(bossesDefeatedRef.current);
            if (bossesDefeatedRef.current === 1) {
                setFirstWeaponUpgradeOpen(true);
                firstWeaponUpgradeOpenRef.current = true;
            }
        }
    }
    function grantMaterials(amount) {
        materialsRef.current += amount;
        setMaterialsView(materialsRef.current);
    }

    function maybeSpawnAdvancedDrop(x, y) {
        const chance = 0.2; // 20%
        if (Math.random() > chance) {
            return;
        }

        const modifiers = [
            { stat: 'atk', amount: 1, label: '+ATK' },
            { stat: 'def', amount: 1, label: '+DEF' },
            { stat: 'range', amount: 20, label: '+RANGE' },
            { stat: 'maxHP', amount: 2, label: '+MAX HP' },
            { stat: 'speed', amount: 20, label: '+SPEED' },
        ];

        const mod = modifiers[Math.floor(Math.random() * modifiers.length)];

        advancedDropsRef.current.push({
            id: crypto.randomUUID(),
            x,
            y,
            radius: 8,
            ...mod,
            alive: true,
        });
    }


    function applyAdvancedModifier(drop) {
        const stats = playerStatsRef.current;
        const player = playerRef.current;

        if (drop.stat === 'atk') stats.atk += drop.amount;
        if (drop.stat === 'def') stats.def += drop.amount;
        if (drop.stat === 'range') stats.range += drop.amount;
        if (drop.stat === 'maxHP') {
            stats.maxHP += drop.amount;
            stats.hp = Math.min(stats.maxHP, stats.hp + drop.amount);
        }
        if (drop.stat === 'speed') player.speed += drop.amount;

        setPlayerStatsView({ ...stats });
    }

    function updateAdvancedDrops() {
        const p = playerRef.current;

        for (const drop of advancedDropsRef.current) {
            if (!drop.alive) continue;

            if (!squareOverlapsCircle(p, drop)) {
                continue;
            }

            drop.alive = false;
            applyAdvancedModifier(drop);
        }

        advancedDropsRef.current = advancedDropsRef.current.filter((d) => d.alive);
    }

    // --- Weapon type and turrets ---
    const weaponTypeKeys = Object.keys(WEAPON_CONFIGS);
    const [activeWeaponType, setActiveWeaponType] = useState('EXPLOSIVE');
    const activeWeaponTypeRef = useRef(activeWeaponType);
    useEffect(() => {
        activeWeaponTypeRef.current = activeWeaponType;
    }, [activeWeaponType]);

    function getActiveTurrets() {
        return WEAPON_CONFIGS[activeWeaponTypeRef.current] || [];
    }


    function selectAdvancedWeaponUpgrade(weaponType) {
        if (!WEAPON_CONFIGS[weaponType]) {
            console.error('Invalid weapon upgrade selection:', weaponType);
            return;
        }
        setActiveWeaponType(weaponType);
        setFirstWeaponUpgradeOpen(false);
        firstWeaponUpgradeOpenRef.current = false
    }

    // Ensure turretCooldowns and all logic sync when weapon type changes
    useEffect(() => {
        const newTurrets = WEAPON_CONFIGS[activeWeaponType] || [];
        turretCooldownsRef.current = newTurrets.map(() => ({ fireCooldown: 0 }));
        // Optionally reset secondary turret angles if needed
        // secondaryTurretAnglesRef.current = [0, 0];
    }, [activeWeaponType]);

    const turretRef = useRef({
        angle: 0,
        turnSpeed: Math.PI * 1.4,
        length: 26,
        width: 10,
        alignTolerance: 0.12,
        fireCooldown: 0,
        cooldown: 0.35,
        projectileSpeed: 420,
    });
    // Secondary turret angles (for up to 2 secondaries)
    const secondaryTurretAnglesRef = useRef([0, 0]);

    // --- Main turret auto-fire flag (for future upgrade) ---
    const [mainTurretAutoFireEnabled, setMainTurretAutoFireEnabled] = useState(true); // Set to true to enable auto-fire for main turret

    // --- Unified turret cooldown state: one entry per turret (main + all secondaries) ---
    const turretCooldownsRef = useRef(getActiveTurrets().map(() => ({ fireCooldown: 0 })));

    const projectilesRef = useRef([]);
    const fireRequestRef = useRef(false);

    function isMeleeWeaponType(type) {
        return type === 'SWORD' || type === 'FLAIL';
    }

    function getMainWeaponConfig(type = activeWeaponTypeRef.current) {
        const list = WEAPON_CONFIGS[type] || [];
        return list[0] || null;
    }

    const swordSwingsRef = useRef([]);
    const meleeAimAngleRef = useRef(0);
    const flailStateRef = useRef({
        orbitAngle: 0,
        boosted: false,
        boostTimer: 0,
        cooldown: 0,
        enemyHitCooldowns: {},
    });

    const meleeCooldownsRef = useRef({
        sword: 0,
    });
    function normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }

    function getTargetEnemy() {
        return enemiesRef.current.find(
            (enemy) => enemy.alive && enemy.id === targetEnemyIdRef.current
        ) ?? null;
    }

    function getTargetAngle() {
        const target = getTargetEnemy();
        const p = playerRef.current;

        if (!target) {
            return null;
        }

        return Math.atan2(target.y - p.y, target.x - p.x);
    }

    function getTurretMuzzlePosition(idx) {
        const p = playerRef.current;
        let angle, length;
        if (idx === 0) {
            angle = turretRef.current.angle;
            length = turretRef.current.length;
        } else {
            angle = secondaryTurretAnglesRef.current[idx - 1] || 0;
            length = turretRef.current.length * 0.7;
        }
        const muzzleDistance = p.halfSize + length;
        return {
            x: p.x + Math.cos(angle) * muzzleDistance,
            y: p.y + Math.sin(angle) * muzzleDistance,
        };
    }

    // --- Secondary Turret Helpers ---
    function getSecondaryTurretTarget(idx, alreadyTargeted) {
        // idx: 1 or 2 (secondary turrets)
        const config = getActiveTurrets()[idx];
        const p = playerRef.current;
        let closest = null, minDist = Infinity;
        for (const enemy of enemiesRef.current) {
            if (!enemy.alive) continue;
            if (alreadyTargeted.has(enemy.id)) continue;
            const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
            if (dist < minDist && dist <= playerStatsRef.current.range * (config.rangeMultiplier ?? 1)) {
                closest = enemy;
                minDist = dist;
            }
        }
        return closest;
    }

    function rotateTurretAngle(current, target, turnSpeed, dt) {
        let delta = normalizeAngle(target - current);
        const maxStep = turnSpeed * dt;
        if (Math.abs(delta) <= maxStep) {
            return target;
        } else {
            return normalizeAngle(current + Math.sign(delta) * maxStep);
        }
    }

    function isTurretAligned(current, target, tolerance = 0.13) {
        return Math.abs(normalizeAngle(target - current)) <= tolerance;
    }

    function getEffectiveRange(config) {
        return playerStatsRef.current.range * (config.rangeMultiplier ?? 1);
    }

    // --- Generalized turret fire (used for both main and secondary turrets) ---
    function fireTurret(idx, target) {
        const config = getActiveTurrets()[idx];
        if (!config || !target) return false;
        if (isMeleeWeaponType(activeWeaponTypeRef.current)) return false;
        // Burst weapon logic (main turret only)
        if (activeWeaponTypeRef.current === 'BURST' && idx === 0) {
            // Only start burst if not already firing
            if (!burstStateRef.current.firing) {
                // Only initialize burst state; do NOT fire the first shot here
                burstStateRef.current.shotsRemaining = (config.burstCount || 3);
                burstStateRef.current.burstTimer = 0; // Fire immediately on next handleBurstFire
                burstStateRef.current.burstInterval = config.burstInterval || 0.15;
                burstStateRef.current.target = target;
                burstStateRef.current.firing = true;
            }
            return true;
        }
        // Standard projectile logic (single, double, triple, secondary, etc)
        const muzzle = getTurretMuzzlePosition(idx);
        const distance = calculateDistance(muzzle.x, muzzle.y, target.x, target.y);
        const effectiveRange = playerStatsRef.current.range * (config.rangeMultiplier ?? 1);
        if (distance > effectiveRange) return false;
        const speed = config.projectileSpeed;
        const dirX = (target.x - muzzle.x) / distance;
        const dirY = (target.y - muzzle.y) / distance;
        // EXPLOSIVE weapon: mark projectile and add explosionRadius
        if (config.projectileType === 'EXPLOSIVE') {
            projectilesRef.current.push({
                id: crypto.randomUUID(),
                x: muzzle.x,
                y: muzzle.y,
                radius: 8,
                vx: dirX * speed,
                vy: dirY * speed,
                damage: config.damage,
                alive: true,
                maxDistance: effectiveRange,
                traveled: 0,
                projectileType: 'EXPLOSIVE',
                explosionRadius: config.explosionRadius || 60,
            });
        } else {
            projectilesRef.current.push({
                id: crypto.randomUUID(),
                x: muzzle.x,
                y: muzzle.y,
                radius: 5,
                vx: dirX * speed,
                vy: dirY * speed,
                damage: config.damage,
                alive: true,
                maxDistance: effectiveRange,
                traveled: 0,
            });
        }
        return true;
    }
    // function setTurretCooldown(idx, cooldown) {
    //     if (!Array.isArray(turretCooldownsRef.current)) turretCooldownsRef.current = [];
    //     while (turretCooldownsRef.current.length <= idx) {
    //         turretCooldownsRef.current.push({ fireCooldown: 0 });
    //     }
    //     turretCooldownsRef.current[idx] = { fireCooldown: cooldown };
    // }
    // --- Unified auto-fire logic for all turrets (main and secondary) ---
    function updateTurretAutoFire(dt) {
        if (isMeleeWeaponType(activeWeaponTypeRef.current)) {
            return;
        }

        const activeTurrets = getActiveTurrets();
        // Main turret auto-fire (if enabled)
        if (mainTurretAutoFireEnabled && activeTurrets.length > 0) {
            const cooldown = Math.max(0, turretCooldownsRef.current[0].fireCooldown - dt);
            if (cooldown > 0) {
                turretCooldownsRef.current[0] = { fireCooldown: cooldown };
            } else {
                const target = getTargetEnemy();
                if (target) {
                    const targetAngle = Math.atan2(target.y - playerRef.current.y, target.x - playerRef.current.x);
                    if (isTurretAligned(turretRef.current.angle, targetAngle, turretRef.current.alignTolerance)) {
                        const fired = fireTurret(0, target);
                        if (fired)
                            turretCooldownsRef.current[0] = { fireCooldown: getActiveTurrets()[0].cooldown };
                    } else {
                        turretCooldownsRef.current[0] = { fireCooldown: 0 }; // Not aligned, keep cooldown at 0
                    }
                } else {
                    turretCooldownsRef.current[0] = { fireCooldown: 0 }; // No target, keep cooldown at 0
                }
            }
        } else if (activeTurrets.length > 0) {
            const cooldown = Math.max(0, turretCooldownsRef.current[0].fireCooldown - dt);
            turretCooldownsRef.current[0] = { fireCooldown: cooldown };
        }

        // Secondary turrets
        const newAngles = [...secondaryTurretAnglesRef.current];
        const targetedEnemyIds = new Set();
        for (let idx = 1; idx < activeTurrets.length; idx++) {
            const config = activeTurrets[idx];
            let cooldown = Math.max(0, turretCooldownsRef.current[idx].fireCooldown - dt);
            // Target selection
            const target = getSecondaryTurretTarget(idx, targetedEnemyIds);
            if (target) targetedEnemyIds.add(target.id);
            // Rotation
            let currentAngle = secondaryTurretAnglesRef.current[idx - 1] || 0;
            let targetAngle = target ? Math.atan2(target.y - playerRef.current.y, target.x - playerRef.current.x) : currentAngle;
            let newAngle = rotateTurretAngle(currentAngle, targetAngle, Math.PI * 1.8, dt);
            newAngles[idx - 1] = newAngle;
            // Firing
            if (cooldown > 0) {
                turretCooldownsRef.current[idx] = { fireCooldown: cooldown };
                continue; // Still cooling down, skip firing
            } else if (target && isTurretAligned(newAngle, targetAngle)) {
                const fired = fireTurret(idx, target);
                if (fired) {
                    console.log(`Secondary turret ${idx} firing at target ${target.id}. Cooldown: ${getActiveTurrets()[idx].cooldown}s`);
                    turretCooldownsRef.current[idx] = { fireCooldown: getActiveTurrets()[idx].cooldown };
                } else {
                    turretCooldownsRef.current[idx] = { fireCooldown: 0 };
                }
            } else {
                turretCooldownsRef.current[idx] = { fireCooldown: 0 };
            }
        }
        secondaryTurretAnglesRef.current = newAngles;
    }

    // --- Main turret aim and player-controlled fire ---
    function updateTurret(dt) {
        const turret = turretRef.current;
        const targetAngle = getTargetAngle();
        // console.log(`Trying to fire. Cooldown: ${turretCooldownsRef.current[0].fireCooldown.toFixed(2)}, FireRequest: ${fireRequestRef.current}`);
        // console.log(`Turret details: ${turretRef}`)
        turretCooldownsRef.current[0] = { fireCooldown: Math.max(0, turretCooldownsRef.current[0].fireCooldown - dt) };
        if (targetAngle === null) {
            fireRequestRef.current = false;
            return;
        }
        const delta = normalizeAngle(targetAngle - turret.angle);
        const maxStep = turret.turnSpeed * dt;
        if (Math.abs(delta) <= maxStep) {
            turret.angle = targetAngle;
        } else {
            turret.angle += Math.sign(delta) * maxStep;
            turret.angle = normalizeAngle(turret.angle);
        }
        const remainingDelta = Math.abs(normalizeAngle(targetAngle - turret.angle));
        const isAligned = remainingDelta <= turret.alignTolerance;
        // Player-controlled fire: only allow fireRequestRef to be honored if cooldown is zero

        if (isMeleeWeaponType(activeWeaponTypeRef.current)) {
            return;
        }

        if (!mainTurretAutoFireEnabled && fireRequestRef.current) {
            if (isAligned && turretCooldownsRef.current[0]?.fireCooldown <= 0) {
                // Burst weapon: queue burst sequence and process burst
                if (activeWeaponTypeRef.current === 'BURST') {
                    const fired = fireTurret(0, getTargetEnemy());
                    if (fired) {
                        // Cooldown will be set after burst completes
                    }
                    handleBurstFire(dt);
                    fireRequestRef.current = false;
                } else {
                    // Standard fire
                    const fired = fireTurret(0, getTargetEnemy());
                    if (fired) {
                        turretCooldownsRef.current[0] = { fireCooldown: getActiveTurrets()[0].cooldown };
                    }
                    fireRequestRef.current = false;
                }
            }
            // If cooldown is not up, ignore fireRequestRef until next eligible frame
        }
    }
    // Use the config from WEAPON_CONFIGS for burst defaults
    const burstDefaults = WEAPON_CONFIGS.BURST?.[0] || { burstInterval: 0.15, burstCount: 3 };
    const burstStateRef = useRef({
        shotsRemaining: 0,
        burstTimer: 0,
        burstInterval: burstDefaults.burstInterval,
        burstCount: burstDefaults.burstCount,
        target: null,
        firing: false,
    });

    // --- Burst fire handler ---
    function handleBurstFire(dt) {
        if (activeWeaponTypeRef.current !== 'BURST' || !burstStateRef.current.firing) return;
        burstStateRef.current.burstTimer -= dt;
        while (burstStateRef.current.shotsRemaining > 0 && burstStateRef.current.burstTimer <= 0) {
            // Fire a projectile
            const config = getActiveTurrets()[0];
            const muzzle = getTurretMuzzlePosition(0);
            const target = burstStateRef.current.target;
            if (target) {
                const distance = calculateDistance(muzzle.x, muzzle.y, target.x, target.y);
                const effectiveRange = playerStatsRef.current.range * (config.rangeMultiplier ?? 1);
                if (distance <= effectiveRange) {
                    const speed = config.projectileSpeed;
                    const dirX = (target.x - muzzle.x) / distance;
                    const dirY = (target.y - muzzle.y) / distance;
                    projectilesRef.current.push({
                        id: crypto.randomUUID(),
                        x: muzzle.x,
                        y: muzzle.y,
                        radius: 5,
                        vx: dirX * speed,
                        vy: dirY * speed,
                        damage: config.damage,
                        alive: true,
                        maxDistance: effectiveRange,
                        traveled: 0,
                    });
                }
            }
            burstStateRef.current.shotsRemaining--;
            // Only set burstTimer > 0 after the first shot; for first shot, fire immediately
            burstStateRef.current.burstTimer += burstStateRef.current.burstInterval;
        }
        // If all shots fired, start cooldown
        if (burstStateRef.current.shotsRemaining <= 0) {
            burstStateRef.current.firing = false;
            turretCooldownsRef.current[0] = { fireCooldown: getActiveTurrets()[0].cooldown };
        }
    }
    // --- Burst weapon state ---

    function enemyTakeDamage(enemy, amount) {
        enemy.hp -= amount;
        const { sx, sy } = worldToScreen(enemy.x, enemy.y, cameraRef.current, canvasRef.current);
        triggerEffects(sx, sy, `-${amount}`, "#ffcc00");
    };

    function updateProjectiles(dt, canvas) {
        for (const projectile of projectilesRef.current) {
            if (!projectile.alive) {
                continue;
            }

            projectile.x += projectile.vx * dt;
            projectile.y += projectile.vy * dt;

            const stepDistance = Math.hypot(projectile.vx * dt, projectile.vy * dt);
            projectile.traveled += stepDistance;

            let exploded = false;

            if (projectile.traveled >= projectile.maxDistance) {
                projectile.alive = false;
                // Explode if explosive
                if (projectile.projectileType === 'EXPLOSIVE') exploded = true;
                continue;
            }

            for (const enemy of enemiesRef.current) {
                if (!enemy.alive) {
                    continue;
                }

                const hit =
                    Math.abs(projectile.x - enemy.x) < projectile.radius + enemy.halfSize &&
                    Math.abs(projectile.y - enemy.y) < projectile.radius + enemy.halfSize;

                if (!hit) {
                    continue;
                }

                // Explosive: trigger AoE
                if (projectile.projectileType === 'EXPLOSIVE') {
                    exploded = true;
                } else {
                    projectile.alive = false;
                    resolveEnemyHit(enemy, createHitOptions('projectile', projectile.damage));
                    if (enemy.hp <= 0) onEnemyKilled(enemy);
                }
                break;
            }

            // Handle explosion if needed
            if (exploded) {
                projectile.alive = false;
                // AoE damage to all enemies in radius
                for (const enemy of enemiesRef.current) {
                    if (!enemy.alive) continue;
                    const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);
                    if (dist <= (projectile.explosionRadius || 60) + (enemy.halfSize || 0)) {
                        // Optional: radial falloff (full damage at center, half at edge)
                        let falloff = 1;
                        if (dist > (projectile.explosionRadius || 60) * 0.5) {
                            falloff = 0.5 + 0.5 * ((projectile.explosionRadius || 60) - dist) / ((projectile.explosionRadius || 60) * 0.5);
                            falloff = Math.max(0.5, falloff);
                        }
                        resolveEnemyHit(
                            enemy,
                            createHitOptions('explosion', projectile.damage * falloff)
                        );
                        //console.log(`Explosion hit enemy for ${dmg} damage (falloff: ${falloff.toFixed(2)})`);
                        if (enemy.hp <= 0) onEnemyKilled(enemy);
                    }
                }
                // Visual effect: shake and explosion effect
                shakeRef.current = Math.max(shakeRef.current, 16);
                // Add explosion effect to damageTextsRef for visuals
                damageTextsRef.current.push({
                    id: 'explosion-' + Date.now(),
                    x: worldToScreen(projectile.x, projectile.y, cameraRef.current, canvasRef.current).sx,
                    y: worldToScreen(projectile.x, projectile.y, cameraRef.current, canvasRef.current).sy,
                    text: '',
                    color: '#ffb347',
                    life: 0.7,
                    explosionRadius: projectile.explosionRadius || 60,
                });
            }
        }

        projectilesRef.current = projectilesRef.current.filter((projectile) => projectile.alive);
    }

    function setupCanvas(canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const observer = new ResizeObserver(() => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        });
        observer.observe(canvas);

        return () => observer.disconnect();

    }


    const [keybindOpen, setKeybindOpen] = useState(false);
    const keybindOpenRef = useRef(false)

    function handleKeybindsClose() {
        setKeybindOpen(false);
    }
    useEffect(() => {
        keybindOpenRef.current = keybindOpen;
    }, [keybindOpen]);
    const keybinds = useRef(
        {
            shop: "b",
            cycleTarget: "Tab",
            fire: " ",
            // Add more actions and their default keys here
        }
    );
    useEffect(() => {
        const stored = localStorage.getItem('keybinds');
        const savedAt = parseInt(localStorage.getItem('keybinds_saved_at'), 10);
        if (!isNaN(savedAt) && Date.now() - savedAt < 365 * 24 * 60 * 60 * 1000) {
            // Saved keybinds are less than 1 year old, consider them valid
            try {
                const parsed = JSON.parse(stored);
                keybinds.current = { ...keybinds.current, ...parsed };
            } catch (e) {
                console.error('Failed to parse stored keybinds:', e);
            }
        }
        else {
            // Saved keybinds are too old or not present, consider them invalid
        }
    }, [])

    function setupInput(canvas) {
        const onMouseMove = (e) => {
            if (keybindOpenRef.current) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            const rect = canvas.getBoundingClientRect();
            mouseRef.current.x = e.clientX - rect.left;
            mouseRef.current.y = e.clientY - rect.top;
            mouseRef.current.inside = true;
        };

        const onMouseLeave = () => {
            mouseRef.current.inside = false;
        };

        const onKeyDown = (e) => {
            if (keybindOpenRef.current) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            keysRef.current.add(e.key);
            if (e.key === keybinds.current.shop) {
                e.preventDefault();
                setShopOpenSync((current) => !current);
            }

            if (e.key === keybinds.current.cycleTarget) {
                e.preventDefault();
                if (!tabPressedRef.current) {
                    if (e.shiftKey) {
                        cycleTargetReverseClosestToFarthest();
                    } else {
                        cycleTargetClosestToFarthest();
                    }
                    tabPressedRef.current = true;
                }
            }
            if (e.key === keybinds.current.fire) {
                e.preventDefault();
                if (!e.repeat) {
                    fireRequestRef.current = true;
                }
            }
        };

        const onKeyUp = (e) => {
            if (keybindOpenRef.current) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }


            keysRef.current.delete(e.key);
            if (e.key === keybinds.current.cycleTarget) {
                tabPressedRef.current = false;
            }
        };

        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseleave', onMouseLeave);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        return () => {
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('mouseleave', onMouseLeave);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }


    function updatePlayerMovement(dt, canvas) {
        const p = playerRef.current;
        const playerStats = playerStatsRef.current;

        if (!playerStats.alive) {
            return;
        }

        if (mouseSeekModeRef.current && mouseRef.current.inside) {
            const worldMouseX = mouseRef.current.x - canvas.width / 2 + cameraRef.current.x;
            const worldMouseY = mouseRef.current.y - canvas.height / 2 + cameraRef.current.y;
            const dx = worldMouseX - p.x;
            const dy = worldMouseY - p.y;
            const distance = Math.hypot(dx, dy);

            if (distance > 2) {
                const dirX = dx / distance;
                const dirY = dy / distance;
                p.x += dirX * p.speed * dt;
                p.y += dirY * p.speed * dt;
            }
        } else {
            const keys = keysRef.current;
            if (keys.has('w') || keys.has('W') || keys.has('ArrowUp')) p.y -= p.speed * dt;
            if (keys.has('s') || keys.has('S') || keys.has('ArrowDown')) p.y += p.speed * dt;
            if (keys.has('a') || keys.has('A') || keys.has('ArrowLeft')) p.x -= p.speed * dt;
            if (keys.has('d') || keys.has('D') || keys.has('ArrowRight')) p.x += p.speed * dt;
        }


    }
    function playerTakeDamage(amount, x, y, isPlayer) {
        playerStatsRef.current.hp = Math.max(0, playerStatsRef.current.hp - amount);
        const { sx, sy } = worldToScreen(playerRef.current.x, playerRef.current.y, cameraRef.current, canvasRef.current);
        triggerEffects(sx, sy, `-${amount}`, isPlayer ? "red" : "white", isPlayer);
    }

    const HIT_SOURCE_PRESETS = {
        melee: {
            weaponMultiplier: 1,
            flatBonuses: 0,
            ignoreDefense: false,
            minDamage: 1,
        },
        projectile: {
            weaponMultiplier: 1,
            flatBonuses: 0,
            ignoreDefense: false,
            minDamage: 1,
        },
        explosion: {
            weaponMultiplier: 1,
            flatBonuses: 0,
            ignoreDefense: false,
            minDamage: 1,
        },
    };

    function createHitOptions(sourceType, projectileDamage = 0, overrides = {}) {
        return {
            sourceType,
            projectileDamage,
            ...(HIT_SOURCE_PRESETS[sourceType] || HIT_SOURCE_PRESETS.projectile),
            ...overrides,
        };
    }

    function fireEnemyTurret(enemy, targetPos) {
        const turretCfg = ARCHETYPE_CONFIGS[ENEMY_ARCHETYPES.RANGED].turretConfig;
        const muzzleDistance = enemy.halfSize + 12;
        const muzzlePos = {
            x: enemy.x + Math.cos(enemy.turretAngle) * muzzleDistance,
            y: enemy.y + Math.sin(enemy.turretAngle) * muzzleDistance,
        };
        
        const distance = calculateDistance(muzzlePos.x, muzzlePos.y, targetPos.x, targetPos.y);
        if (distance > turretCfg.range) return false;
        
        const dirX = (targetPos.x - muzzlePos.x) / distance;
        const dirY = (targetPos.y - muzzlePos.y) / distance;
        
        projectilesRef.current.push({
            id: crypto.randomUUID(),
            x: muzzlePos.x,
            y: muzzlePos.y,
            radius: 5,
            vx: dirX * turretCfg.projectileSpeed,
            vy: dirY * turretCfg.projectileSpeed,
            damage: turretCfg.projectileDamage,
            alive: true,
            maxDistance: turretCfg.range,
            traveled: 0,
            isEnemyProjectile: true,
        });
        
        return true;
    }

    function resolveEnemyHit(enemy, options = {}) {
        const {
            sourceType = 'projectile',
            projectileDamage = 0,
            weaponMultiplier = 1,
            flatBonuses = 0,
            ignoreDefense = false,
            defenseOverride,
            minDamage = 1,
        } = options;

        const sourceBonusPct = sourceType === 'melee'
            ? (playerStatsRef.current.meleeBonusPct ?? 0)
            : sourceType === 'explosion'
                ? (playerStatsRef.current.explosionBonusPct ?? 0)
                : (playerStatsRef.current.projectileBonusPct ?? 0);

        const targetDefense = ignoreDefense
            ? 0
            : (defenseOverride ?? enemy.def ?? 0);

        // Unified formula (for now): playerAtk + projectileDamage, then modifiers, then defense.
        // sourceType is reserved for future source-specific perks/scaling.
        const baseDamage = playerStatsRef.current.atk + projectileDamage;
        let actualDamage = Math.max(
            minDamage,
            Math.round(baseDamage * weaponMultiplier * (1 + sourceBonusPct) + flatBonuses - targetDefense)
        );

        // Armored shield: reduces all incoming damage to 1 per hit
        if (enemy.archetype === ENEMY_ARCHETYPES.ARMORED && enemy.shieldHealth > 0) {
            enemy.shieldHealth -= 1; // Always 1 per hit
            if (enemy.shieldHealth <= 0) {
                enemy.shieldHealth = 0;
                // Shield just broke, apply full damage to HP
                enemyTakeDamage(enemy, actualDamage);
                return { sourceType, actualDamage };
            } else {
                // Shield absorbs all damage
                return { sourceType, actualDamage: 0 };
            }
        }

        enemyTakeDamage(enemy, actualDamage);
        return { sourceType, actualDamage };
    }

    function getMeleeAimAngle() {
        return meleeAimAngleRef.current;
    }

    function isAngleWithinSweep(angle, start, end) {
        const sweep = normalizeAngle(end - start);
        const relative = normalizeAngle(angle - start);
        if (sweep >= 0) {
            return relative >= 0 && relative <= sweep;
        }
        return relative <= 0 && relative >= sweep;
    }

    function trySwordAttack() {
        if (activeWeaponTypeRef.current !== 'SWORD') {
            return false;
        }

        const swordCfg = getMainWeaponConfig('SWORD');
        if (!swordCfg) {
            return false;
        }

        if (meleeCooldownsRef.current.sword > 0) {
            return false;
        }

        const aimAngle = getMeleeAimAngle();
        const arcSpan = swordCfg.arcSpan ?? (Math.PI * 0.95);
        const startAngle = aimAngle - arcSpan * 0.55;
        const endAngle = aimAngle + arcSpan * 0.45;
        const swingDuration = swordCfg.swingDuration ?? 0.16;
        const innerRadius = playerRef.current.halfSize + (swordCfg.innerRadiusOffset ?? 6);
        const outerRadius = playerRef.current.halfSize + (swordCfg.outerRadiusOffset ?? 52);

        swordSwingsRef.current.push({
            id: crypto.randomUUID(),
            x: playerRef.current.x,
            y: playerRef.current.y,
            innerRadius,
            outerRadius,
            startAngle,
            endAngle,
            duration: swingDuration,
            elapsed: 0,
            life: Math.max(0.18, swingDuration * 1.35),
            weaponDamage: swordCfg.damage ?? 0,
            hitEnemyIds: new Set(),
        });

        meleeCooldownsRef.current.sword = swordCfg.cooldown ?? 0.34;
        return true;
    }

    function tryFlailAttack() {
        if (activeWeaponTypeRef.current !== 'FLAIL') {
            return false;
        }

        const flailCfg = getMainWeaponConfig('FLAIL');
        if (!flailCfg) {
            return false;
        }

        const flail = flailStateRef.current;
        if (flail.cooldown > 0) {
            return false;
        }

        flail.boosted = true;
        flail.boostTimer = flailCfg.boostDuration ?? 1.1;
        flail.cooldown = flailCfg.cooldown ?? 1.25;
        return true;
    }

    function handleMeleeFireRequest() {
        if (!fireRequestRef.current) {
            return;
        }

        if (activeWeaponTypeRef.current === 'SWORD') {
            trySwordAttack();
            fireRequestRef.current = false;
            return;
        }

        if (activeWeaponTypeRef.current === 'FLAIL') {
            tryFlailAttack();
            fireRequestRef.current = false;
        }
    }

    function hasSwordAutoFireTarget() {
        const swordCfg = getMainWeaponConfig('SWORD');
        if (!swordCfg) {
            return false;
        }

        const p = playerRef.current;
        const aimAngle = getMeleeAimAngle();
        const arcSpan = swordCfg.arcSpan ?? (Math.PI * 0.95);
        const startAngle = aimAngle - arcSpan * 0.55;
        const endAngle = aimAngle + arcSpan * 0.45;
        const innerRadius = p.halfSize + (swordCfg.innerRadiusOffset ?? 6);
        const outerRadius = p.halfSize + (swordCfg.outerRadiusOffset ?? 52);

        for (const enemy of enemiesRef.current) {
            if (!enemy.alive) {
                continue;
            }

            const dx = enemy.x - p.x;
            const dy = enemy.y - p.y;
            const dist = Math.hypot(dx, dy);
            const enemyRadius = enemy.halfSize;

            const overlapsAnnulus =
                dist + enemyRadius >= innerRadius &&
                dist - enemyRadius <= outerRadius;

            if (!overlapsAnnulus) {
                continue;
            }

            const angle = Math.atan2(dy, dx);
            if (isAngleWithinSweep(angle, startAngle, endAngle)) {
                return true;
            }
        }

        return false;
    }

    function hasFlailAutoFireTarget() {
        const flailCfg = getMainWeaponConfig('FLAIL');
        if (!flailCfg) {
            return false;
        }

        const p = playerRef.current;
        const flail = flailStateRef.current;
        const anchorAngle = getMeleeAimAngle();
        const stickLength = p.halfSize + (flailCfg.stickLength ?? 40);
        const anchor = {
            x: p.x + Math.cos(anchorAngle) * stickLength,
            y: p.y + Math.sin(anchorAngle) * stickLength,
        };
        const orbitRadius = flailCfg.orbitRadius ?? 28;
        const ballRadius = flailCfg.ballRadius ?? 10;

        const a1 = normalizeAngle(anchorAngle + flail.orbitAngle);
        const a2 = normalizeAngle(a1 + Math.PI);

        const balls = [
            {
                x: anchor.x + Math.cos(a1) * orbitRadius,
                y: anchor.y + Math.sin(a1) * orbitRadius,
            },
            {
                x: anchor.x + Math.cos(a2) * orbitRadius,
                y: anchor.y + Math.sin(a2) * orbitRadius,
            },
        ];

        for (const enemy of enemiesRef.current) {
            if (!enemy.alive) {
                continue;
            }

            for (const ball of balls) {
                const dist = calculateDistance(ball.x, ball.y, enemy.x, enemy.y);
                if (dist <= ballRadius + enemy.halfSize) {
                    return true;
                }
            }
        }

        return false;
    }

    function shouldAutoFireMelee() {
        if (!mainTurretAutoFireEnabled) {
            return false;
        }

        if (activeWeaponTypeRef.current === 'SWORD') {
            return hasSwordAutoFireTarget();
        }

        if (activeWeaponTypeRef.current === 'FLAIL') {
            return hasFlailAutoFireTarget();
        }

        return false;
    }

    function updateSwordSwings(dt) {
        const swings = swordSwingsRef.current;
        if (!swings.length) {
            return;
        }

        for (const swing of swings) {
            swing.elapsed += dt;
            swing.life -= dt;
            const t = Math.min(1, swing.elapsed / swing.duration);
            const currentEndAngle = swing.startAngle + (swing.endAngle - swing.startAngle) * t;

            for (const enemy of enemiesRef.current) {
                if (!enemy.alive) {
                    continue;
                }
                if (swing.hitEnemyIds.has(enemy.id)) {
                    continue;
                }

                const dx = enemy.x - swing.x;
                const dy = enemy.y - swing.y;
                const dist = Math.hypot(dx, dy);
                const enemyRadius = enemy.halfSize;

                const overlapsAnnulus =
                    dist + enemyRadius >= swing.innerRadius &&
                    dist - enemyRadius <= swing.outerRadius;

                if (!overlapsAnnulus) {
                    continue;
                }

                const angle = Math.atan2(dy, dx);
                if (!isAngleWithinSweep(angle, swing.startAngle, currentEndAngle)) {
                    continue;
                }

                resolveEnemyHit(enemy, createHitOptions('melee', swing.weaponDamage));
                swing.hitEnemyIds.add(enemy.id);
                if (enemy.hp <= 0) {
                    onEnemyKilled(enemy);
                }
            }
        }

        swordSwingsRef.current = swings.filter((swing) => swing.life > 0);
    }

    function updateFlail(dt) {
        const flailCfg = getMainWeaponConfig('FLAIL');
        if (!flailCfg) {
            return;
        }

        const flail = flailStateRef.current;
        flail.cooldown = Math.max(0, flail.cooldown - dt);
        if (flail.boosted) {
            flail.boostTimer = Math.max(0, flail.boostTimer - dt);
            if (flail.boostTimer <= 0) flail.boosted = false;
        }
        flail.orbitAngle = normalizeAngle(flail.orbitAngle + (flailCfg.spinSpeed ?? (Math.PI * 2.2)) * dt);

        for (const enemyId of Object.keys(flail.enemyHitCooldowns)) {
            flail.enemyHitCooldowns[enemyId] = Math.max(0, flail.enemyHitCooldowns[enemyId] - dt);
            if (flail.enemyHitCooldowns[enemyId] <= 0) {
                delete flail.enemyHitCooldowns[enemyId];
            }
        }

        if (activeWeaponTypeRef.current !== 'FLAIL') {
            return;
        }

        const p = playerRef.current;
        const anchorAngle = getMeleeAimAngle();
        const stickLength = p.halfSize + (flailCfg.stickLength ?? 40);
        const anchor = {
            x: p.x + Math.cos(anchorAngle) * stickLength,
            y: p.y + Math.sin(anchorAngle) * stickLength,
        };
        const orbitRadius = flailCfg.orbitRadius ?? 28;
        const ballRadius = flailCfg.ballRadius ?? 10;

        const a1 = normalizeAngle(anchorAngle + flail.orbitAngle);
        const a2 = normalizeAngle(a1 + Math.PI);

        const balls = [
            {
                x: anchor.x + Math.cos(a1) * orbitRadius,
                y: anchor.y + Math.sin(a1) * orbitRadius,
            },
            {
                x: anchor.x + Math.cos(a2) * orbitRadius,
                y: anchor.y + Math.sin(a2) * orbitRadius,
            },
        ];

        for (const enemy of enemiesRef.current) {
            if (!enemy.alive) {
                continue;
            }

            let hit = false;
            for (const ball of balls) {
                const dist = calculateDistance(ball.x, ball.y, enemy.x, enemy.y);
                if (dist <= ballRadius + enemy.halfSize) {
                    hit = true;
                    break;
                }
            }

            if (!hit) {
                continue;
            }

            if ((flail.enemyHitCooldowns[enemy.id] ?? 0) > 0) {
                continue;
            }

            const damageOptions = flail.boosted
                ? createHitOptions('melee', flailCfg.damage ?? 0, { weaponMultiplier: flailCfg.boostMultiplier ?? 2.5 })
                : createHitOptions('melee', flailCfg.damage ?? 0);
            resolveEnemyHit(enemy, damageOptions);
            flail.enemyHitCooldowns[enemy.id] = flailCfg.contactInterval ?? 0.14;

            if (enemy.hp <= 0) {
                onEnemyKilled(enemy);
            }
        }
    }

    function updateMeleeWeapons(dt) {
        if (!isMeleeWeaponType(activeWeaponTypeRef.current)) {
            swordSwingsRef.current = [];
            flailStateRef.current.boosted = false;
            flailStateRef.current.boostTimer = 0;
            return;
        }

        // Smooth aim angle rotation toward target (no snapping)
        const rawTarget = getTargetAngle() ?? meleeAimAngleRef.current;
        meleeAimAngleRef.current = rotateTurretAngle(meleeAimAngleRef.current, rawTarget, turretRef.current.turnSpeed, dt);

        meleeCooldownsRef.current.sword = Math.max(0, meleeCooldownsRef.current.sword - dt);

        if (shouldAutoFireMelee()) {
            if (activeWeaponTypeRef.current === 'SWORD') {
                trySwordAttack();
            } else if (activeWeaponTypeRef.current === 'FLAIL') {
                tryFlailAttack();
            }
        }

        handleMeleeFireRequest();
        updateSwordSwings(dt);
        updateFlail(dt);
    }

    function getMeleeVisualState() {
        const p = playerRef.current;
        const currentType = activeWeaponTypeRef.current;
        const currentCfg = getMainWeaponConfig(currentType);

        const swordSwings = swordSwingsRef.current.map((swing) => {
            const t = Math.min(1, swing.elapsed / swing.duration);
            return {
                id: swing.id,
                x: swing.x,
                y: swing.y,
                innerRadius: swing.innerRadius,
                outerRadius: swing.outerRadius,
                startAngle: swing.startAngle,
                currentEndAngle: swing.startAngle + (swing.endAngle - swing.startAngle) * t,
                life: Math.max(0, swing.life / 0.22),
            };
        });

        // Idle sword always at target, visible only when not swinging. Sweeping blade animation preserved.
        let swordIdle = null;
        if (currentType === 'SWORD' && currentCfg) {
            const idleLength = currentCfg.idleLength ?? 44;
            if (swordSwings.length === 0) {
                swordIdle = {
                    x: p.x,
                    y: p.y,
                    angle: getMeleeAimAngle(),
                    length: idleLength,
                };
            }
        }

        let flail = null;
        if (currentType === 'FLAIL' && currentCfg) {
            const flailRuntime = flailStateRef.current;
            const anchorAngle = getMeleeAimAngle();
            const stickLength = p.halfSize + (currentCfg.stickLength ?? 40);
            const anchor = {
                x: p.x + Math.cos(anchorAngle) * stickLength,
                y: p.y + Math.sin(anchorAngle) * stickLength,
            };
            const a1 = normalizeAngle(anchorAngle + flailRuntime.orbitAngle);
            const a2 = normalizeAngle(a1 + Math.PI);
            flail = {
                active: flailRuntime.boosted,
                player: { x: p.x, y: p.y },
                anchor,
                balls: [
                    {
                        x: anchor.x + Math.cos(a1) * (currentCfg.orbitRadius ?? 28),
                        y: anchor.y + Math.sin(a1) * (currentCfg.orbitRadius ?? 28),
                    },
                    {
                        x: anchor.x + Math.cos(a2) * (currentCfg.orbitRadius ?? 28),
                        y: anchor.y + Math.sin(a2) * (currentCfg.orbitRadius ?? 28),
                    },
                ],
                ballRadius: currentCfg.ballRadius ?? 10,
            };
        }

        return {
            weaponType: currentType,
            swordIdle,
            swordSwings,
            flail,
        };
    }
    

    function updateCombat(dt) {
        const p = playerRef.current;
        const playerStats = playerStatsRef.current;

        const targetAlive = enemiesRef.current.some(
            (enemy) => enemy.alive && enemy.id === targetEnemyIdRef.current
        );
        if (!targetAlive) {
            const sorted = getAliveEnemiesSortedByDistance();
            setTargetEnemyId(sorted.length ? sorted[0].id : null);
        }

        for (const enemy of enemiesRef.current) {
            if (!enemy.alive) continue;

            enemy.damagePlayerCooldown = Math.max(0, enemy.damagePlayerCooldown - dt);
            enemy.takeDamageCooldown = Math.max(0, enemy.takeDamageCooldown - dt);

            if (!squaresOverlap(p, enemy)) continue;
            if (!playerStats.alive) continue;

            if (enemy.takeDamageCooldown <= 0) {
                resolveEnemyHit(enemy, createHitOptions('melee', 0));
                enemy.takeDamageCooldown = 0.25;
            }

            // Spawner-type enemies don't deal contact damage
            if (enemy.damagePlayerCooldown <= 0 && enemy.archetype !== ENEMY_ARCHETYPES.SPAWNER) {
                const damageToPlayer = Math.max(1, enemy.atk - playerStats.def);

                playerTakeDamage(damageToPlayer, p.x, p.y, true);
                enemy.damagePlayerCooldown = 0.5;

                if (playerStats.hp <= 0) {
                    playerStats.hp = 0;
                    playerStats.alive = false;
                }

                setPlayerStatsView({ ...playerStats });
            }

            if (enemy.hp <= 0) {
                onEnemyKilled(enemy);
            }
        }

        // Handle enemy projectiles hitting player
        for (const projectile of projectilesRef.current) {
            if (!projectile.alive || !projectile.isEnemyProjectile) continue;
            
            const distToPlayer = Math.hypot(projectile.x - p.x, projectile.y - p.y);
            if (distToPlayer <= projectile.radius + p.halfSize) {
                projectile.alive = false;
                if (playerStats.alive) {
                    const damageToPlayer = Math.max(1, projectile.damage - playerStats.def);
                    playerTakeDamage(damageToPlayer, p.x, p.y, true);
                    if (playerStats.hp <= 0) {
                        playerStats.hp = 0;
                        playerStats.alive = false;
                    }
                    setPlayerStatsView({ ...playerStats });
                }
            }
        }
    }
    

    function pruneFarEntities() {
        getEnemySystem().pruneFarEntities();
    }

    // function pruneFarEntities() {
    //     const {
    //         despawnRadius,
    //         bossDespawnRadius,
    //     } = worldBandsRef.current;

    //     const despawnSq = despawnRadius * despawnRadius;
    //     const bossDespawnSq = bossDespawnRadius * bossDespawnRadius;

    //     enemiesRef.current = enemiesRef.current.filter((enemy) => {
    //         if (!enemy.alive) return false;

    //         const d2 = distanceSqToPlayer(enemy.x, enemy.y, playerRef.current.x, playerRef.current.y);
    //         if (enemy.isBoss) {
    //             return d2 <= bossDespawnSq;
    //         }
    //         return d2 <= despawnSq;
    //     });
    // }

    const updateEffects = (deltaTime) => {
        // 1. Decay Shake
        if (shakeRef.current > 0) {
            shakeRef.current *= 0.9; // Smoothly reduce shake
            if (shakeRef.current < 0.1) shakeRef.current = 0;
        }

        // 2. Decay Damage Text
        damageTextsRef.current = damageTextsRef.current.filter(item => {
            item.life -= 0.02; // Reduce opacity over time
            return item.life > 0;
        });
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const cleanupCanvas = setupCanvas(canvas);

        const { startCount } = enemySpawnConfigRef.current;

        const y = killsRef.current;
        const scaled = getDifficultyFromKills(y);

        enemiesRef.current = Array.from({ length: startCount }, () =>
            createEnemy(
                playerRef.current,
                {
                    hp: scaled.hp,
                    atk: scaled.atk,
                    def: scaled.def,
                },
                pickRandomEnemyArchetype(y)
            )
        );
        const firstSorted = getAliveEnemiesSortedByDistance();
        setTargetEnemyId(firstSorted.length ? firstSorted[0].id : null);

        const cleanupInput = setupInput(canvas);

        let animFrameId;
        let lastTime = 0;

        function loop(timestamp) {
            const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
            lastTime = timestamp;

            cameraRef.current.x = playerRef.current.x;
            cameraRef.current.y = playerRef.current.y;
            // Pause game logic if shop or weapon upgrade popup is open
            //console.log(`KeybindOpenRef.current: ${keybindOpenRef.current}, ${keybindOpen}`)
            if (!(shopOpenRef.current || firstWeaponUpgradeOpenRef.current || keybindOpenRef.current)) {
                pruneFarEntities();
                updateAdvancedDrops();
                updatePlayerMovement(dt, canvas);
                updateTurret(dt);
                updateMeleeWeapons(dt);
                handleBurstFire(dt);
                updateTurretAutoFire(dt)
                updateEnemyAi(dt);
                updateCombat(dt);
                updateProjectiles(dt, canvas);
                updateEnemyPopulation(dt, canvas);
                updateBossSpawn(dt, canvas);
                updateEffects(dt);
            }
            const gameState = {
                player: playerRef.current,
                playerStats: playerStatsRef.current,
                camera: cameraRef.current,
                enemies: enemiesRef.current,
                projectiles: projectilesRef.current,
                advancedDrops: advancedDropsRef.current,
                turrets: getActiveTurrets(), // This should return an array of turret configs for the current weapon
                mainTurretAngle: turretRef.current.angle,
                secondaryTurretAngles: secondaryTurretAnglesRef.current, // Pass the angles for all turrets
                targetEnemyId: targetEnemyIdRef.current,
                weaponType: activeWeaponTypeRef.current,
                damageTexts: damageTextsRef.current,
                shake: shakeRef.current,
                meleeVisuals: getMeleeVisualState(),
            };


            drawScene(ctx, canvas, gameState);

            animFrameId = requestAnimationFrame(loop);
        }

        animFrameId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(animFrameId);
            cleanupInput();
            cleanupCanvas();
        };
    }, []);
    const [shopOpen, setShopOpen] = useState(false);
    const shopOpenRef = useRef(false);


    function setShopOpenSync(nextValue) {
        shopOpenRef.current =
            typeof nextValue === 'function'
                ? nextValue(shopOpenRef.current)
                : nextValue;
        setShopOpen(shopOpenRef.current);
    }

    const upgradeCountsRef = useRef(0)
    const upgradeCostRef = useRef(0);


    function handleShopPurchase(upgradeFunction, cost) {
        //const activeWeaponMain = getMainWeaponConfig();

        if (upgradeFunction == 'range') {
            playerStatsRef.current.range += 20;
        }
        else if (upgradeFunction == 'atk') {
            playerStatsRef.current.atk += 1;
        }
        else if (upgradeFunction == 'def') {
            playerStatsRef.current.def += 1;
        }
        else if (upgradeFunction == 'maxHP') {
            playerStatsRef.current.maxHP += 2;
            playerStatsRef.current.hp += 2;
        }
        else if (upgradeFunction == 'speed') {
            playerRef.current.speed += 20;

        }
        else if (upgradeFunction == "heal") {
            playerStatsRef.current.hp = Math.min(playerStatsRef.current.maxHP, playerStatsRef.current.hp + 10);
        }
        else {
            console.log(`Error has occured with purchasing your shop upgrade.`)
        }
        materialsRef.current -= cost;
        setMaterialsView(materialsRef.current);
        setPlayerStatsView({ ...playerStatsRef.current });
    }


    const [developerMode, setDeveloperMode] = useState(true);

    const liveDifficulty = getDifficultyFromKills(killsRef.current);
    return (
        <>
            <div className="Frame-Game-1-UI-Row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <ToggleableSwitchComponent
                        attachFunction={setMouseSeekMode}
                        onToggle={() => {
                            setMouseSeekMode((current) => !current)
                        }}
                        label="Mouse Seek: "
                    />
                    <ToggleableSwitchComponent
                        attachFunction={setScaledEnemiesEnabledSync}
                        booleanForFunction={scaledEnemiesEnabled}
                        label="Scaled Enemies: "
                    />

                    <ToggleableSwitchComponent
                        attachFunction={toggleLargeMode}
                        booleanForFunction={largeMode}
                        label="Large Mode: "
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Pacing:</span>
                        <select
                            value={pacingProfile}
                            onChange={(e) => setPacingProfileSync(e.target.value)}
                        >
                            <option value={PROFILE.P1}>P1 (Slow)</option>
                            <option value={PROFILE.P2}>P2 (Default)</option>
                            <option value={PROFILE.P3}>P3 (Chaos)</option>
                        </select>
                    </label>
                    <button onClick={() => setShopOpenSync((current) => !current)}>
                        {shopOpen ? 'Close Shop' : 'Open Shop'}
                    </button>
                    <button onClick={() => setKeybindOpen((current) => !current)}>
                        {keybindOpen ? 'Close Keybinds' : 'Open Keybinds'}
                    </button>
                </div>

                {developerMode ?
                    (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <div>MAX ACTIVE: {liveDifficulty.maxActive}</div>
                                <div>SPAWN RATE: {liveDifficulty.spawnInterval.toFixed(2)}s</div>
                                <div>SCALED: {scaledEnemiesEnabled ? 'ON' : 'OFF'}</div>
                                <div>PROFILE: {pacingProfile.toUpperCase()}</div>
                                <div>KILLS/BOSS: {bossConfigRef.current.killsPerBoss}</div>
                                <div>BOSSES DEFEATED: {bossesDefeatedView}</div>
                            </div>
                        </>
                    )
                    : null
                }
                <div className="Frame-Game-1-Stat" style={{ marginRight: '0px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>HP:</span>
                        <div style={{
                            width: '120px',
                            height: '12px',
                            backgroundColor: '#444',
                            borderRadius: '4px',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                width: `${(playerStatsView.hp / playerStatsView.maxHP) * 100}%`,
                                height: '100%',
                                backgroundColor: `hsl(${(playerStatsView.hp / playerStatsView.maxHP) * 120}, 80%, 45%)`,
                                borderRadius: '4px',
                                transition: 'width 0.1s, background-color 0.3s',
                            }} />
                        </div>
                        <span>{playerStatsView.hp} / {playerStatsView.maxHP}</span>
                    </div>
                    <div>ATK: {playerStatsView.atk}</div>
                    <div>DEF: {playerStatsView.def}</div>
                    <div>RANGE: {Math.round(playerStatsView.range)}</div>
                    <div>
                        TARGET: {targetEnemyIdView ? 'LOCKED' : 'NONE'}
                    </div>
                    <div>MATERIALS: {materialsView}</div>
                    <div>KILLS: {killsView}</div>

                </div>

            </div>
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: 'min(65vh, 560px)',
                }}
            >
                <canvas
                    ref={canvasRef}
                    style={{
                        border: "1px solid #000000",
                        display: "block",
                        width: "100%",
                        height: "100%",
                    }}
                />
                {shopOpen && (<FrameGameShopOverlay shopUpgradeCallbacks={handleShopPurchase}
                    materialsView={materialsView}
                    setShopOpenSync={setShopOpen}
                    upgradeCountsRef={upgradeCountsRef}
                    upgradeCostRef={upgradeCostRef}
                    pacingProfileRef={pacingProfileRef} />)}

                {keybindOpen && (<FrameGameKeybindsOverlay
                    handleKeybindsClose={handleKeybindsClose}
                    keybinds={keybinds}
                />)}


                {firstWeaponUpgradeOpen && (<FrameGameWeaponUpgradeOverlay
                    handleWeaponUpgradeClose={setFirstWeaponUpgradeOpen}
                    weaponTypeKeys={weaponTypeKeys}
                    WEAPON_CONFIGS={WEAPON_CONFIGS}
                    selectAdvancedWeaponUpgrade={selectAdvancedWeaponUpgrade}
                />)}
            </div>
        </>
    );
}

export default FrameGame1;