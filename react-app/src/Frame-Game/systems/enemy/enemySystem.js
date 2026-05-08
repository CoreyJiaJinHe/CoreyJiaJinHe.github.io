import { ENEMY_ARCHETYPES, ARCHETYPE_CONFIGS } from '../../configs/enemyArchetypeConfigs.js';
import { ENEMY_AI_DIFFICULTY_PROFILES } from '../../configs/difficultyProfiles.js';
import { randomBetween, normalize2D, distanceSqToPlayer } from '../../utils/MathUtils.js';

export function createEnemySystem({
    refs,
    configRefs,
    getDifficultyFromKills,
    getCombatCallbacks,
}) {
    const {
        playerRef,
        previousPlayerPositionRef,
        enemiesRef,
        worldBandsRef,
        enemySpawnTimerRef,
        killsRef,
        scaledEnemiesEnabledRef,
        pacingProfileRef,
        bossSpawnTimerRef,
    } = refs;

    const {
        enemyArchetypeSpawnConfigRef,
        bossConfigRef,
    } = configRefs;

    function clamp01(v) {
        return Math.max(0, Math.min(1, v));
    }

    function getEnemyAiConfig() {
        return ENEMY_AI_DIFFICULTY_PROFILES[pacingProfileRef.current];
    }

    function pickRandomIdleMoveDirection() {
        const dirs = [
            { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
            { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
        ];
        const d = dirs[Math.floor(Math.random() * dirs.length)];
        const n = normalize2D(d.x, d.y);
        return { x: n.x, y: n.y };
    }

    function pickRandomInitialAiState() {
        const states = ['idle-zigzag', 'idle-move', 'chase', 'attack-range'];
        return states[Math.floor(Math.random() * states.length)];
    }

    function getArchetypeSpawnWeights(kills) {
        const cfg = enemyArchetypeSpawnConfigRef.current;
        const effectiveKills = scaledEnemiesEnabledRef.current ? kills : 0;
        const t = clamp01(effectiveKills / Math.max(1, cfg.killsToMaxMix));

        const weights = {};
        let totalWeight = 0;

        for (const [archetype, curve] of Object.entries(cfg.archetypeWeightCurves)) {
            const start = curve?.start ?? 0;
            const end = curve?.end ?? start;
            const weight = Math.max(0, start + (end - start) * t);
            weights[archetype] = weight;
            totalWeight += weight;
        }

        if (totalWeight <= 0) {
            return {
                weights: { [ENEMY_ARCHETYPES.NORMAL]: 1 },
                totalWeight: 1,
            };
        }

        return { weights, totalWeight };
    }

    function pickRandomEnemyArchetype(kills) {
        const { weights, totalWeight } = getArchetypeSpawnWeights(kills);
        let roll = Math.random() * totalWeight;

        for (const [archetype, weight] of Object.entries(weights)) {
            if (weight <= 0) continue;
            roll -= weight;
            if (roll <= 0) return archetype;
        }

        return ENEMY_ARCHETYPES.NORMAL;
    }

    function createEnemy(player, statOverrides = {}, archetype = ENEMY_ARCHETYPES.NORMAL) {
        const cfg = getEnemyAiConfig();
        const archetypeCfg = ARCHETYPE_CONFIGS[archetype];
        const halfSize = 18 * (archetypeCfg?.sizeMultiplier ?? 1);
        const spawnOrigin = statOverrides.spawnOrigin ?? player;
        const minSpawnDistance = statOverrides.spawnDistanceMin ?? worldBandsRef.current.spawnMinRadius;
        const maxSpawnDistance = statOverrides.spawnDistanceMax ?? worldBandsRef.current.spawnMaxRadius;

        const angle = Math.random() * Math.PI * 2;
        const distance = randomBetween(minSpawnDistance, maxSpawnDistance);
        const x = spawnOrigin.x + Math.cos(angle) * distance;
        const y = spawnOrigin.y + Math.sin(angle) * distance;

        const baseDifficulty = getDifficultyFromKills(killsRef.current);
        const baseHp = statOverrides.hp ?? baseDifficulty.hp;
        const baseAtk = statOverrides.atk ?? baseDifficulty.atk;
        const baseDef = statOverrides.def ?? baseDifficulty.def;

        const hpMultiplier = archetypeCfg?.hpMultiplier ?? 1;
        const atkMultiplier = archetypeCfg?.atkMultiplier ?? 1;
        const defMultiplier = archetypeCfg?.defMultiplier ?? 1;
        const speedMultiplier = archetypeCfg?.speedMultiplier ?? 1;

        const enemy = {
            id: crypto.randomUUID(),
            x,
            y,
            halfSize,
            hp: Math.ceil(baseHp * hpMultiplier),
            maxHp: Math.ceil(baseHp * hpMultiplier),
            atk: Math.ceil(baseAtk * atkMultiplier),
            def: Math.ceil(baseDef * defMultiplier),
            alive: true,
            damagePlayerCooldown: 0,
            takeDamageCooldown: 0,
            archetype,
            speed: cfg.chaseSpeed * speedMultiplier,
            aiState: pickRandomInitialAiState(),
            aiTimer: 0,
            wanderAngle: Math.random() * Math.PI * 2,
            strafePhase: Math.random() * Math.PI * 2,
            desiredRange: cfg.attackRange * (archetypeCfg?.aggroRadiusMultiplier ?? 1),
            idleMoveDir: pickRandomIdleMoveDirection(),
            idleMoveRemaining: randomBetween(cfg.idleMoveSegmentMin, cfg.idleMoveSegmentMax),
        };

        if (archetype === ENEMY_ARCHETYPES.ARMORED) {
            enemy.shieldHealth = archetypeCfg.shieldHealth;
            enemy.maxShieldHealth = archetypeCfg.shieldHealth;
        }
        if (archetype === ENEMY_ARCHETYPES.SPAWNER) {
            enemy.spawnTimer = archetypeCfg.spawnInterval;
            enemy.spawnedSwarmIds = [];
            const baseAngle = Math.random() * Math.PI * 2;
            enemy.spawnerSatelliteAngles = Array.from({ length: 4 }, (_, i) => {
                const evenlySpaced = baseAngle + i * (Math.PI / 2);
                const jitter = randomBetween(-0.45, 0.45);
                return evenlySpaced + jitter;
            });
        }
        if (archetype === ENEMY_ARCHETYPES.SWARM) {
            enemy.spawnerParentId = statOverrides.spawnerParentId || null;
        }
        if (archetype === ENEMY_ARCHETYPES.SPEEDSTER) {
            const directions = [
                { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
                { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
            ];
            enemy.speedsterDirection = directions[Math.floor(Math.random() * 8)];
        }
        if (archetype === ENEMY_ARCHETYPES.RANGED) {
            enemy.turretAngle = 0;
            enemy.turretCooldown = 0;
            enemy.rangedOrbitSign = Math.random() < 0.5 ? -1 : 1;
        }

        return enemy;
    }

    function getActiveEnemyCountInBand() {
        const activeRadiusSq = worldBandsRef.current.activeRadius * worldBandsRef.current.activeRadius;

        return enemiesRef.current.reduce((count, enemy) => {
            if (!enemy.alive) return count;
            if (enemy.isBoss) return count;
            if (distanceSqToPlayer(enemy.x, enemy.y, playerRef.current.x, playerRef.current.y) > activeRadiusSq) return count;
            return count + 1;
        }, 0);
    }

    function updateSpeedsterMovement(enemy, dt) {
        const cfg = getEnemyAiConfig();
        const p = playerRef.current;
        const dx = p.x - enemy.x;
        const dy = p.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= enemy.desiredRange) {
            enemy.aiState = 'attack-range';
        } else if (dist <= cfg.aggroRadius) {
            enemy.aiState = 'chase';
        } else {
            enemy.aiState = 'idle-move';
        }

        if (enemy.aiState === 'chase') {
            const dirNorm = normalize2D(dx, dy);
            enemy.speedsterDirection = dirNorm;
            enemy.x += dirNorm.x * enemy.speed * dt;
            enemy.y += dirNorm.y * enemy.speed * dt;
        } else if (enemy.aiState === 'attack-range') {
            const dirNorm = normalize2D(dx, dy);
            enemy.speedsterDirection = dirNorm;
            enemy.x += dirNorm.x * enemy.speed * dt;
            enemy.y += dirNorm.y * enemy.speed * dt;
        } else if (enemy.aiState === 'idle-move') {
            enemy.idleMoveRemaining -= cfg.idleMoveSpeed * dt;
            const dir = enemy.speedsterDirection;
            enemy.x += dir.x * enemy.speed * dt;
            enemy.y += dir.y * enemy.speed * dt;

            if (enemy.idleMoveRemaining <= 0) {
                const directions = [
                    { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
                    { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
                ];
                enemy.speedsterDirection = directions[Math.floor(Math.random() * 8)];
                enemy.idleMoveRemaining = randomBetween(cfg.idleMoveSegmentMin, cfg.idleMoveSegmentMax);
            }
        }
    }

    function updateSpawnerEnemy(enemy, dt) {
        const cfg = getEnemyAiConfig();
        const archetypeCfg = ARCHETYPE_CONFIGS[ENEMY_ARCHETYPES.SPAWNER];
        const p = playerRef.current;
        const dx = p.x - enemy.x;
        const dy = p.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        const toPlayer = normalize2D(dx, dy);

        const spawnerAggroRadius = cfg.aggroRadius * (archetypeCfg.aggroRadiusMultiplier ?? 1.5);

        if (dist <= enemy.desiredRange) {
            enemy.aiState = 'attack-range';
        } else if (dist <= spawnerAggroRadius) {
            enemy.aiState = 'chase';
        } else {
            enemy.aiState = 'idle-move';
        }

        if (enemy.aiState === 'chase') {
            enemy.x += toPlayer.x * enemy.speed * dt;
            enemy.y += toPlayer.y * enemy.speed * dt;
        } else if (enemy.aiState === 'idle-move') {
            enemy.idleMoveRemaining -= cfg.idleMoveSpeed * dt;
            enemy.x += enemy.idleMoveDir.x * enemy.speed * dt;
            enemy.y += enemy.idleMoveDir.y * enemy.speed * dt;

            if (enemy.idleMoveRemaining <= 0) {
                enemy.idleMoveDir = pickRandomIdleMoveDirection();
                enemy.idleMoveRemaining = randomBetween(cfg.idleMoveSegmentMin, cfg.idleMoveSegmentMax);
            }
        }

        enemy.spawnTimer = Math.max(0, enemy.spawnTimer - dt);
        const swarmIds = enemy.spawnedSwarmIds.filter(id => {
            const swarm = enemiesRef.current.find(e => e.id === id && e.alive);
            return swarm !== undefined;
        });
        enemy.spawnedSwarmIds = swarmIds;

        if (enemy.spawnTimer <= 0 && swarmIds.length < archetypeCfg.swarmCap) {
            const newSwarm = createEnemy(
                playerRef.current,
                {
                    spawnerParentId: enemy.id,
                    spawnOrigin: { x: enemy.x, y: enemy.y },
                    spawnDistanceMin: enemy.halfSize + 6,
                    spawnDistanceMax: enemy.halfSize + 20,
                },
                ENEMY_ARCHETYPES.SWARM
            );
            enemiesRef.current.push(newSwarm);
            enemy.spawnedSwarmIds.push(newSwarm.id);
            enemy.spawnTimer = archetypeCfg.spawnInterval;
        }
    }

    function updateSwarmMovement(enemy, dt) {
        const cfg = getEnemyAiConfig();
        const archetypeCfg = ARCHETYPE_CONFIGS[ENEMY_ARCHETYPES.SPAWNER];
        const p = playerRef.current;

        const spawner = enemiesRef.current.find(e => e.id === enemy.spawnerParentId && e.alive);

        if (!spawner) {
            const dx = p.x - enemy.x;
            const dy = p.y - enemy.y;
            const dist = Math.hypot(dx, dy);
            const toPlayer = normalize2D(dx, dy);

            if (dist <= enemy.desiredRange) {
                enemy.aiState = 'attack-range';
            } else if (dist <= cfg.aggroRadius) {
                enemy.aiState = 'chase';
            } else {
                enemy.aiState = 'idle-move';
            }

            if (enemy.aiState === 'chase') {
                enemy.x += toPlayer.x * enemy.speed * dt;
                enemy.y += toPlayer.y * enemy.speed * dt;
            } else if (enemy.aiState === 'idle-move') {
                enemy.idleMoveRemaining -= cfg.idleMoveSpeed * dt;
                enemy.x += enemy.idleMoveDir.x * cfg.idleMoveSpeed * dt;
                enemy.y += enemy.idleMoveDir.y * cfg.idleMoveSpeed * dt;

                if (enemy.idleMoveRemaining <= 0) {
                    enemy.idleMoveDir = pickRandomIdleMoveDirection();
                    enemy.idleMoveRemaining = randomBetween(cfg.idleMoveSegmentMin, cfg.idleMoveSegmentMax);
                }
            }
            return;
        }

        const dx = p.x - enemy.x;
        const dy = p.y - enemy.y;
        const distToPlayer = Math.hypot(dx, dy);
        const toPlayer = normalize2D(dx, dy);

        const dxToSpawner = spawner.x - enemy.x;
        const dyToSpawner = spawner.y - enemy.y;
        const distToSpawner = Math.hypot(dxToSpawner, dyToSpawner);
        const retentionDistance = archetypeCfg.swarmRetentionDistance;

        const spawnerChasing = spawner.aiState === 'chase' || spawner.aiState === 'attack-range';

        if (distToPlayer <= enemy.desiredRange) {
            enemy.aiState = 'attack-range';
        } else if (distToPlayer <= cfg.aggroRadius || spawnerChasing) {
            enemy.aiState = 'chase';
        } else if (distToSpawner > retentionDistance) {
            enemy.aiState = 'chase';
        } else {
            enemy.aiState = 'idle-move';
        }

        if (enemy.aiState === 'chase') {
            if (distToSpawner > retentionDistance) {
                const toSpawner = normalize2D(dxToSpawner, dyToSpawner);
                enemy.x += toSpawner.x * enemy.speed * dt;
                enemy.y += toSpawner.y * enemy.speed * dt;
            } else {
                enemy.x += toPlayer.x * enemy.speed * dt;
                enemy.y += toPlayer.y * enemy.speed * dt;
            }
        } else if (enemy.aiState === 'idle-move') {
            enemy.idleMoveRemaining -= cfg.idleMoveSpeed * dt;
            enemy.x += enemy.idleMoveDir.x * cfg.idleMoveSpeed * dt;
            enemy.y += enemy.idleMoveDir.y * cfg.idleMoveSpeed * dt;

            if (enemy.idleMoveRemaining <= 0) {
                enemy.idleMoveDir = pickRandomIdleMoveDirection();
                enemy.idleMoveRemaining = randomBetween(cfg.idleMoveSegmentMin, cfg.idleMoveSegmentMax);
            }
        }
    }

    function updateEnemyAi(dt) {
        const p = playerRef.current;
        const cfg = getEnemyAiConfig();
        const playerPrev = previousPlayerPositionRef.current;
        const { isTurretAligned, normalizeAngle, fireEnemyTurret } = getCombatCallbacks();

        const playerMoveX = p.x - playerPrev.x;
        const playerMoveY = p.y - playerPrev.y;
        const playerMoveLen = Math.hypot(playerMoveX, playerMoveY);
        const hasPlayerMoved = playerMoveLen > 0.001;
        const playerMoveDir = hasPlayerMoved
            ? normalize2D(playerMoveX, playerMoveY)
            : { x: 0, y: 0 };

        for (const enemy of enemiesRef.current) {
            if (!enemy.alive) continue;

            if (enemy.archetype === ENEMY_ARCHETYPES.SPEEDSTER) {
                updateSpeedsterMovement(enemy, dt);
                continue;
            }
            if (enemy.archetype === ENEMY_ARCHETYPES.SPAWNER) {
                updateSpawnerEnemy(enemy, dt);
                continue;
            }
            if (enemy.archetype === ENEMY_ARCHETYPES.SWARM) {
                updateSwarmMovement(enemy, dt);
                continue;
            }

            if (enemy.archetype === ENEMY_ARCHETYPES.RANGED) {
                const turretCfg = ARCHETYPE_CONFIGS[ENEMY_ARCHETYPES.RANGED].turretConfig;
                const dx = p.x - enemy.x;
                const dy = p.y - enemy.y;
                const dist = Math.hypot(dx, dy);
                const toPlayer = normalize2D(dx, dy);

                const idealDistance = Math.max(0, turretCfg.range - 10);
                const distanceTolerance = 10;
                const radialIntentThreshold = 0.25;

                const radialIntent = hasPlayerMoved
                    ? (playerMoveDir.x * toPlayer.x + playerMoveDir.y * toPlayer.y)
                    : 0;

                let moveX = 0;
                let moveY = 0;

                if (dist > idealDistance + distanceTolerance) {
                    enemy.aiState = 'chase';
                    moveX = toPlayer.x;
                    moveY = toPlayer.y;
                } else if (dist < idealDistance - distanceTolerance) {
                    enemy.aiState = 'attack-range';
                    moveX = -toPlayer.x;
                    moveY = -toPlayer.y;
                } else {
                    enemy.aiState = 'attack-range';

                    if (!hasPlayerMoved) {
                        const orbitSign = enemy.rangedOrbitSign ?? 1;
                        const tangentX = -toPlayer.y;
                        const tangentY = toPlayer.x;
                        moveX = tangentX * orbitSign;
                        moveY = tangentY * orbitSign;
                    } else if (radialIntent > radialIntentThreshold) {
                        moveX = toPlayer.x;
                        moveY = toPlayer.y;
                    } else if (radialIntent < -radialIntentThreshold) {
                        moveX = -toPlayer.x;
                        moveY = -toPlayer.y;
                    } else {
                        moveX = playerMoveDir.x;
                        moveY = playerMoveDir.y;
                    }

                    const idealDenom = Math.max(idealDistance, 1);
                    const radialError = (dist - idealDistance) / idealDenom;
                    const correction = Math.max(-0.65, Math.min(0.65, radialError));
                    moveX += toPlayer.x * correction;
                    moveY += toPlayer.y * correction;
                }

                const moveDir = normalize2D(moveX, moveY);
                enemy.x += moveDir.x * enemy.speed * dt;
                enemy.y += moveDir.y * enemy.speed * dt;

                const aimDx = p.x - enemy.x;
                const aimDy = p.y - enemy.y;
                const aimDist = Math.hypot(aimDx, aimDy);
                const targetAngle = Math.atan2(aimDy, aimDx);
                let delta = normalizeAngle(targetAngle - enemy.turretAngle);
                const maxStep = turretCfg.turnSpeed * dt;
                if (Math.abs(delta) <= maxStep) {
                    enemy.turretAngle = targetAngle;
                } else {
                    enemy.turretAngle += Math.sign(delta) * maxStep;
                    enemy.turretAngle = normalizeAngle(enemy.turretAngle);
                }

                enemy.turretCooldown = Math.max(0, enemy.turretCooldown - dt);
                if (
                    enemy.turretCooldown <= 0
                    && isTurretAligned(enemy.turretAngle, targetAngle, turretCfg.alignTolerance)
                    && aimDist <= turretCfg.range
                ) {
                    fireEnemyTurret(enemy, p);
                    enemy.turretCooldown = turretCfg.cooldown;
                }

                continue;
            }

            const dx = p.x - enemy.x;
            const dy = p.y - enemy.y;
            const dist = Math.hypot(dx, dy);
            const toPlayer = normalize2D(dx, dy);

            const contactRange = p.halfSize + enemy.halfSize - 1;

            if (dist <= enemy.desiredRange) {
                enemy.aiState = 'attack-range';
            } else if (dist <= cfg.aggroRadius) {
                enemy.aiState = 'chase';
            } else if (enemy.aiState === 'chase' || enemy.aiState === 'attack-range') {
                enemy.aiState = Math.random() < 0.5 ? 'idle-zigzag' : 'idle-move';
            }

            enemy.aiTimer -= dt;

            if (enemy.aiState === 'idle-zigzag') {
                if (enemy.aiTimer <= 0) {
                    enemy.aiTimer = randomBetween(cfg.repathIntervalMin, cfg.repathIntervalMax);
                    enemy.wanderAngle += randomBetween(-0.9, 0.9);
                }

                enemy.strafePhase += dt * cfg.strafeFrequency;
                const strafe = Math.sin(enemy.strafePhase) * cfg.strafeAmplitude;

                const forwardX = Math.cos(enemy.wanderAngle);
                const forwardY = Math.sin(enemy.wanderAngle);
                const rightX = -forwardY;
                const rightY = forwardX;

                enemy.x += (forwardX * cfg.idleDriftSpeed + rightX * strafe) * dt;
                enemy.y += (forwardY * cfg.idleDriftSpeed + rightY * strafe) * dt;
            }

            if (enemy.aiState === 'idle-move') {
                enemy.idleMoveRemaining -= cfg.idleMoveSpeed * dt;
                enemy.x += enemy.idleMoveDir.x * cfg.idleMoveSpeed * dt;
                enemy.y += enemy.idleMoveDir.y * cfg.idleMoveSpeed * dt;

                if (enemy.idleMoveRemaining <= 0) {
                    enemy.idleMoveDir = pickRandomIdleMoveDirection();
                    enemy.idleMoveRemaining = randomBetween(cfg.idleMoveSegmentMin, cfg.idleMoveSegmentMax);
                }
            }

            if (enemy.aiState === 'chase') {
                enemy.x += toPlayer.x * enemy.speed * dt;
                enemy.y += toPlayer.y * enemy.speed * dt;
            }

            if (enemy.aiState === 'attack-range') {
                if (dist > contactRange) {
                    enemy.x += toPlayer.x * cfg.contactPullSpeed * dt;
                    enemy.y += toPlayer.y * cfg.contactPullSpeed * dt;
                } else {
                    enemy.strafePhase += dt * cfg.strafeFrequency;
                    const orbitDir = Math.sin(enemy.strafePhase);
                    const tangentX = -toPlayer.y;
                    const tangentY = toPlayer.x;

                    enemy.x += tangentX * orbitDir * cfg.idleDriftSpeed * dt;
                    enemy.y += tangentY * orbitDir * cfg.idleDriftSpeed * dt;

                    if (dist < contactRange * 0.7) {
                        enemy.x -= toPlayer.x * cfg.pushOutSpeed * dt;
                        enemy.y -= toPlayer.y * cfg.pushOutSpeed * dt;
                    }
                }
            }
        }

        previousPlayerPositionRef.current = { x: p.x, y: p.y };
    }

    function updateEnemyPopulation(dt) {
        const y = killsRef.current;
        const scaled = getDifficultyFromKills(y);
        const activeCount = getActiveEnemyCountInBand();

        if (activeCount >= scaled.maxActive) {
            enemySpawnTimerRef.current = 0;
            return;
        }

        enemySpawnTimerRef.current += dt;

        if (enemySpawnTimerRef.current >= scaled.spawnInterval) {
            enemySpawnTimerRef.current = 0;
            const archetype = pickRandomEnemyArchetype(y);

            enemiesRef.current.push(
                createEnemy(playerRef.current, {
                    hp: scaled.hp,
                    atk: scaled.atk,
                    def: scaled.def,
                }, archetype)
            );
        }
    }

    function createBoss(player, scaled) {
        return {
            ...createEnemy(player, {
                hp: Math.floor(scaled.hp * 6),
                atk: Math.max(2, Math.floor(scaled.atk * 2)),
                def: Math.max(2, scaled.def + 2),
            }),
            halfSize: 30,
            isBoss: true,
        };
    }

    function updateBossSpawn(dt) {
        const cfg = bossConfigRef.current;
        const kills = killsRef.current;
        const profile = pacingProfileRef.current;

        if (kills < cfg.nextBossAt) {
            bossSpawnTimerRef.current = 0;
            cfg.pendingBossSpawn = false;
            return;
        }

        const maxAllowed = cfg.maxSimultaneousBosses[profile];
        const aliveBosSCount = enemiesRef.current.filter((e) => e.alive && e.isBoss).length;

        if (aliveBosSCount >= maxAllowed) {
            cfg.pendingBossSpawn = true;
            bossSpawnTimerRef.current = 0;
            return;
        }

        cfg.pendingBossSpawn = false;
        bossSpawnTimerRef.current += dt;
        if (bossSpawnTimerRef.current >= cfg.spawnDelay) {
            bossSpawnTimerRef.current = 0;
            const scaled = getDifficultyFromKills(kills);
            enemiesRef.current.push(createBoss(playerRef.current, scaled));
            cfg.nextBossAt += cfg.killsPerBoss;
        }
    }

    function pruneFarEntities() {
        const {
            despawnRadius,
            bossDespawnRadius,
        } = worldBandsRef.current;

        const despawnSq = despawnRadius * despawnRadius;
        const bossDespawnSq = bossDespawnRadius * bossDespawnRadius;

        enemiesRef.current = enemiesRef.current.filter((enemy) => {
            if (!enemy.alive) return false;

            const d2 = distanceSqToPlayer(enemy.x, enemy.y, playerRef.current.x, playerRef.current.y);
            if (enemy.isBoss) {
                return d2 <= bossDespawnSq;
            }
            return d2 <= despawnSq;
        });
    }

    return {
        createEnemy,
        pickRandomEnemyArchetype,
        updateEnemyAi,
        updateEnemyPopulation,
        updateBossSpawn,
        pruneFarEntities,
    };
}
