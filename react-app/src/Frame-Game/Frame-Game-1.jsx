import { useEffect, useRef, useState, useCallback } from 'react';
import ToggleableSwitchComponent from '../components/ToggleComponent'
import { PROFILE, DIFFICULTY_PROFILES, ENEMY_AI_DIFFICULTY_PROFILES } from './configs/difficultyProfiles.js';
import { WEAPON_CONFIGS } from './configs/weaponConfigs.js';
import FrameGameShopOverlay from './components/Shop.jsx'
import FrameGameKeybindsOverlay from './components/Keybinds.jsx'
import FrameGameWeaponUpgradeOverlay from './components/WeaponUpgrade.jsx'
import {
    squareOverlapsCircle,
    squaresOverlap,
    calculateDistance,
    randomBetween,
    normalize2D,
    worldToScreen,
    distanceSqToPlayer,
    isOnScreen
} from './utils/MathUtils.js';
import {drawScene, drawEffects, drawOffscreenMarkers} from './render/renderer.js';

function FrameGame1({ largeMode, toggleLargeMode }) {
    const canvasRef = useRef(null);



    const playerRef = useRef({ x: 400, y: 300, halfSize: 20, speed: 200 });
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
        startCount: 5,
        maxActive: 10,
        spawnInterval: 1.5, // seconds between refill spawns
    });

    const enemySpawnTimerRef = useRef(0);
    const killsRef = useRef(0);
    const [killsView, setKillsView] = useState(0);

    function getDifficultyFromKills(kills) {
        const d = DIFFICULTY_PROFILES[pacingProfileRef.current];
        const effectiveKills = scaledEnemiesEnabledRef.current ? kills : 0;

        const extraActive = Math.floor(effectiveKills / d.killsPerExtraActive);
        const profileMaxActive = Math.min(d.maxActiveCap, d.maxActiveBase + extraActive);

        const spawnStepCount = Math.floor(effectiveKills / d.killsPerSpawnStep);
        const profileSpawnInterval = Math.max(
            d.spawnIntervalMin,
            d.spawnIntervalBase - spawnStepCount * d.spawnStep
        );

        const hp = d.enemyHpBase + Math.floor(effectiveKills / d.killsPerHpStep) * d.hpStep;
        const atk = d.enemyAtkBase + Math.floor(effectiveKills / d.killsPerAtkStep) * d.atkStep;
        const def = d.enemyDefBase + Math.floor(effectiveKills / d.killsPerDefStep) * d.defStep;

        // Global hard bounds
        const maxActive = Math.min(enemySpawnConfigRef.current.maxActive, profileMaxActive);
        const spawnInterval = Math.max(enemySpawnConfigRef.current.spawnInterval, profileSpawnInterval);

        return { maxActive, spawnInterval, hp, atk, def };
    }

    function createEnemy(player, statOverrides = {}) {
        function updateEnemyAi(dt) {
            const p = playerRef.current;
            const cfg = getEnemyAiConfig();

            for (const enemy of enemiesRef.current) {
                if (!enemy.alive) continue;

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
        }
        const cfg = getEnemyAiConfig();
        const halfSize = 18;
        const minSpawnDistance = worldBandsRef.current.spawnMinRadius;
        const maxSpawnDistance = worldBandsRef.current.spawnMaxRadius;
        let attempts = 0;

        const angle = Math.random() * Math.PI * 2;
        const distance = randomBetween(minSpawnDistance, maxSpawnDistance);
        const x = player.x + Math.cos(angle) * distance;
        const y = player.y + Math.sin(angle) * distance;

        return {
            id: crypto.randomUUID(),
            x,
            y,
            halfSize: 18,
            hp: statOverrides.hp ?? 10,
            maxHp: statOverrides.hp ?? 10,
            atk: statOverrides.atk ?? 1,
            def: statOverrides.def ?? 2,
            alive: true,
            damagePlayerCooldown: 0,
            takeDamageCooldown: 0,

            speed: cfg.chaseSpeed,
            aiState: pickRandomInitialAiState(),
            aiTimer: 0,
            wanderAngle: Math.random() * Math.PI * 2,
            strafePhase: Math.random() * Math.PI * 2,
            desiredRange: cfg.attackRange,
            idleMoveDir: pickRandomIdleMoveDirection(),
            idleMoveRemaining: randomBetween(cfg.idleMoveSegmentMin, cfg.idleMoveSegmentMax),
        };
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
    function updateEnemyAi(dt) {
        const p = playerRef.current;
        const cfg = getEnemyAiConfig();

        for (const enemy of enemiesRef.current) {
            if (!enemy.alive) continue;

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
    }


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

            enemiesRef.current.push(
                createEnemy(playerRef.current, {
                    hp: scaled.hp,
                    atk: scaled.atk,
                    def: scaled.def,
                })
            );
        }
    }

    const bossConfigRef = useRef({
        killsPerBoss: 50,
        spawnDelay: 2.0,
        nextBossAt: 50,
        maxSimultaneousBosses: {
            [PROFILE.P1]: 1,
            [PROFILE.P2]: 1,
            [PROFILE.P3]: 3,
        },
        pendingBossSpawn: false,
    });
    const bossSpawnTimerRef = useRef(0);
    const [bossesDefeatedView, setBossesDefeatedView] = useState(0);
    const bossesDefeatedRef = useRef(0);

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

    function updateBossSpawn(dt, canvas) {
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
            // Queue the spawn, don't proceed
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
        fireInterval: 0.35,
        projectileSpeed: 420,
    });
    // Secondary turret angles (for up to 2 secondaries)
    const secondaryTurretAnglesRef = useRef([0, 0]);

    // --- Main turret auto-fire flag (for future upgrade) ---
    const [mainTurretAutoFireEnabled, setMainTurretAutoFireEnabled] = useState(false); // Set to true to enable auto-fire for main turret

    // --- Unified turret cooldown state: one entry per turret (main + all secondaries) ---
    const turretCooldownsRef = useRef(getActiveTurrets().map(() => ({ fireCooldown: 0 })));

    const projectilesRef = useRef([]);
    const fireRequestRef = useRef(false);
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
    // function calculateDistance(x1, y1, x2, y2) {
    //     return Math.hypot(x2 - x1, y2 - y1);
    // }

    // --- Generalized turret fire (used for both main and secondary turrets) ---
    function fireTurret(idx, target) {
        const config = getActiveTurrets()[idx];
        if (!config || !target) return false;
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
    function setTurretCooldown(idx, cooldown) {
        if (!Array.isArray(turretCooldownsRef.current)) turretCooldownsRef.current = [];
        while (turretCooldownsRef.current.length <= idx) {
            turretCooldownsRef.current.push({ fireCooldown: 0 });
        }
        turretCooldownsRef.current[idx] = { fireCooldown: cooldown };
    }
    // --- Unified auto-fire logic for all turrets (main and secondary) ---
    function updateTurretAutoFire(dt) {
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
                        if (fired) turretCooldownsRef.current[0] = { fireCooldown: activeTurrets[0].fireInterval };
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
                    turretCooldownsRef.current[idx] = { fireCooldown: config.fireInterval };
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
                        turretCooldownsRef.current[0] = { fireCooldown: getActiveTurrets()[0].fireInterval };
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
            turretCooldownsRef.current[0] = { fireCooldown: getActiveTurrets()[0].fireInterval };
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
                    enemyTakeDamage(enemy, Math.max(1, projectile.damage - enemy.def));
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
                        const dmg = Math.max(1, Math.round((projectile.damage - enemy.def) * falloff));
                        enemyTakeDamage(enemy, dmg);
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
                const damageToEnemy = Math.max(1, playerStats.atk - enemy.def);
                enemyTakeDamage(enemy, damageToEnemy);
                enemy.takeDamageCooldown = 0.25;
            }

            if (enemy.damagePlayerCooldown <= 0) {
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
            createEnemy(playerRef.current, {
                hp: scaled.hp,
                atk: scaled.atk,
                def: scaled.def,
            })
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