import { useEffect, useRef, useState, useCallback } from 'react';
import ToggleableSwitchComponent from '../components/ToggleComponent'
import {
    PROFILE,
    DIFFICULTY_PROFILES,
    createDefaultEnemyArchetypeSpawnConfig,
    createDefaultBossConfig,
} from './configs/difficultyProfiles.js';
import { BASE_TURRET_CONFIG, WEAPON_CONFIGS } from './configs/weaponConfigs.js';
import { ENEMY_ARCHETYPES, ARCHETYPE_CONFIGS } from './configs/enemyArchetypeConfigs.js';
import { createEnemySystem } from './systems/enemy/enemySystem.js';
import { createWeaponSystem } from './systems/weapon/weaponSystem.js';
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
                isTurretAligned: getWeaponSystem().isTurretAligned,
                normalizeAngle: getWeaponSystem().normalizeAngle,
                fireEnemyTurret: getWeaponSystem().fireEnemyTurret,
            }),
        });
    }
    function pickRandomEnemyArchetype(kills) {
        return getEnemySystem().pickRandomEnemyArchetype(kills);
    }
    
    function createEnemy(player, statOverrides = {}, archetype = ENEMY_ARCHETYPES.NORMAL) {
        return getEnemySystem().createEnemy(player, statOverrides, archetype);
    }
    
    function updateEnemyAi(dt) {
        getEnemySystem().updateEnemyAi(dt);
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

    function setTargetEnemyId(nextValue) {
        targetEnemyIdRef.current = nextValue;
        setTargetEnemyIdView(nextValue);
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

    const bossConfigRef = useRef(createDefaultBossConfig());
    
    const bossSpawnTimerRef = useRef(0);
    const [bossesDefeatedView, setBossesDefeatedView] = useState(0);
    const bossesDefeatedRef = useRef(0);

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

    function triggerExplosionEffect(worldX, worldY, explosionRadius = 60) {
        shakeRef.current = Math.max(shakeRef.current, 16);
        const { sx, sy } = worldToScreen(worldX, worldY, cameraRef.current, canvasRef.current);
        damageTextsRef.current.push({
            id: `explosion-${Date.now()}`,
            x: sx,
            y: sy,
            text: '',
            color: '#ffb347',
            life: 0.7,
            explosionRadius,
        });
    }

    const [firstWeaponUpgradeOpen, setFirstWeaponUpgradeOpen] = useState(true);
    const firstWeaponUpgradeOpenRef = useRef(firstWeaponUpgradeOpen);
    
    function applyPlayerProjectileDamage(amount) {
        playerTakeDamage(amount, playerRef.current.x, playerRef.current.y, true);
        if (playerStatsRef.current.hp <= 0) {
            playerStatsRef.current.alive = false;
        }
        setPlayerStatsView({ ...playerStatsRef.current });
    }

    // COMMENTED OUT (duplicate): local squareOverlapsCircle conflicts with imported helper.
    // function squareOverlapsCircle(square, circle) {
    //     const closestX = Math.max(
    //         square.x - square.halfSize,
    //         Math.min(circle.x, square.x + square.halfSize)
    //     );
    //     const closestY = Math.max(
    //         square.y - square.halfSize,
    //         Math.min(circle.y, square.y + square.halfSize)
    //     );
    //     const dx = circle.x - closestX;
    //     const dy = circle.y - closestY;
    //     return dx * dx + dy * dy <= circle.radius * circle.radius;
    // }


    function enemyTakeDamage(enemy, amount) {
        enemy.hp -= amount;
        const { sx, sy } = worldToScreen(enemy.x, enemy.y, cameraRef.current, canvasRef.current);
        triggerEffects(sx, sy, `-${amount}`, '#ffcc00');
    }

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

    // COMMENTED OUT (duplicate block): second copy of effect/state/difficulty/enemy-system wiring.
    // useEffect(() => {
    //     firstWeaponUpgradeOpenRef.current = firstWeaponUpgradeOpen;
    // }, [firstWeaponUpgradeOpen]);
    //
    // const [bossesDefeatedView, setBossesDefeatedView] = useState(0);
    // const bossesDefeatedRef = useRef(0);
    //
    // function getDifficultyFromKills(kills) {
    //     const d = DIFFICULTY_PROFILES[pacingProfileRef.current];
    //     const effectiveKills = scaledEnemiesEnabledRef.current ? kills : 0;
    //     const extraActive = Math.floor(effectiveKills / d.killsPerExtraActive);
    //     const profileMaxActive = Math.min(d.maxActiveCap, d.maxActiveBase + extraActive);
    //     const spawnStepCount = Math.floor(effectiveKills / d.killsPerSpawnStep);
    //     const profileSpawnInterval = Math.max(d.spawnIntervalMin, d.spawnIntervalBase - spawnStepCount * d.spawnStep);
    //     const hp = d.enemyHpBase + Math.floor(effectiveKills / d.killsPerHpStep) * d.hpStep;
    //     const atk = d.enemyAtkBase + Math.floor(effectiveKills / d.killsPerAtkStep) * d.atkStep;
    //     const def = d.enemyDefBase + Math.floor(effectiveKills / d.killsPerDefStep) * d.defStep;
    //     const maxActive = Math.min(enemySpawnConfigRef.current.maxActive, profileMaxActive);
    //     const spawnInterval = Math.max(enemySpawnConfigRef.current.spawnInterval, profileSpawnInterval);
    //     return { maxActive, spawnInterval, hp, atk, def };
    // }
    //
    // function getEnemySystem() {
    //     return createEnemySystem({
    //         refs: {
    //             playerRef,
    //             previousPlayerPositionRef,
    //             enemiesRef,
    //             worldBandsRef,
    //             enemySpawnTimerRef,
    //             killsRef,
    //             scaledEnemiesEnabledRef,
    //             pacingProfileRef,
    //             bossSpawnTimerRef,
    //         },
    //         configRefs: {
    //             enemyArchetypeSpawnConfigRef,
    //             bossConfigRef,
    //         },
    //         getDifficultyFromKills,
    //         getCombatCallbacks: () => ({
    //             isTurretAligned: getWeaponSystem().isTurretAligned,
    //             normalizeAngle: getWeaponSystem().normalizeAngle,
    //             fireEnemyTurret: getWeaponSystem().fireEnemyTurret,
    //         }),
    //     });
    // }
    //
    // function pickRandomEnemyArchetype(kills) {
    //     return getEnemySystem().pickRandomEnemyArchetype(kills);
    // }
    //
    // function createEnemy(player, statOverrides = {}, archetype = ENEMY_ARCHETYPES.NORMAL) {
    //     return getEnemySystem().createEnemy(player, statOverrides, archetype);
    // }
    //
    // function updateEnemyAi(dt) {
    //     getEnemySystem().updateEnemyAi(dt);
    // }

    // --- Weapon type and turrets ---
    const weaponTypeKeys = Object.keys(WEAPON_CONFIGS);
    const [activeWeaponType, setActiveWeaponType] = useState('EXPLOSIVE');
    const activeWeaponTypeRef = useRef(activeWeaponType);
    // useEffect(() => {
    //     activeWeaponTypeRef.current = activeWeaponType;
    // }, [activeWeaponType]);

    // function getActiveTurrets() {
    //     return WEAPON_CONFIGS[activeWeaponTypeRef.current] || [];
    // }


    // function selectAdvancedWeaponUpgrade(weaponType) {
    //     if (!WEAPON_CONFIGS[weaponType]) {
    //         console.error('Invalid weapon upgrade selection:', weaponType);
    //         return;
    //     }
    //     setActiveWeaponType(weaponType);
    //     setFirstWeaponUpgradeOpen(false);
    //     firstWeaponUpgradeOpenRef.current = false
    // }

    // Ensure turretCooldowns and all logic sync when weapon type changes
    useEffect(() => {
        const newTurrets = WEAPON_CONFIGS[activeWeaponType] || [];
        turretCooldownsRef.current = newTurrets.map(() => ({ fireCooldown: 0 }));
        // Optionally reset secondary turret angles if needed
        // secondaryTurretAnglesRef.current = [0, 0];
    }, [activeWeaponType]);


    useEffect(() => {
        activeWeaponTypeRef.current = activeWeaponType;
        if (weaponSystemRef.current) {
            weaponSystemRef.current.syncWeaponType();
        }
    }, [activeWeaponType]);

    const weaponSystemRef = useRef(null);

    
    const turretRef = useRef({ ...BASE_TURRET_CONFIG });
    // Secondary turret angles (for up to 2 secondaries)
    const secondaryTurretAnglesRef = useRef([0, 0]);

    // --- Main turret auto-fire flag ---
    const [mainTurretAutoFireEnabled, setMainTurretAutoFireEnabled] = useState(true);
    
    // // --- Unified turret cooldown state: one entry per turret (main + all secondaries) ---
    // const turretCooldownsRef = useRef(getActiveTurrets().map(() => ({ fireCooldown: 0 })));

    const mainTurretAutoFireEnabledRef = useRef(mainTurretAutoFireEnabled);
    
    useEffect(() => {
        mainTurretAutoFireEnabledRef.current = mainTurretAutoFireEnabled;
    }, [mainTurretAutoFireEnabled]);
    const turretCooldownsRef = useRef([]);
    
    const projectilesRef = useRef([]);
    const fireRequestRef = useRef(false);

    // function isMeleeWeaponType(type) {
    //     return type === 'SWORD' || type === 'FLAIL';
    // }

    // function getMainWeaponConfig(type = activeWeaponTypeRef.current) {
    //     const list = WEAPON_CONFIGS[type] || [];
    //     return list[0] || null;
    // }


    // COMMENTED OUT (duplicate): the active meleeCooldownsRef is declared below with burst state.
    // const meleeCooldownsRef = useRef({
    //     sword: 0,
    // });
    // COMMENTED OUT (duplicate helpers): active implementations are delegated through getWeaponSystem() below.
    // function normalizeAngle(angle) {
    //     while (angle > Math.PI) angle -= Math.PI * 2;
    //     while (angle < -Math.PI) angle += Math.PI * 2;
    //     return angle;
    // }
    //
    // function getTargetEnemy() {
    //     return enemiesRef.current.find(
    //         (enemy) => enemy.alive && enemy.id === targetEnemyIdRef.current
    //     ) ?? null;
    // }
    //
    // function getTargetAngle() {
    //     const target = getTargetEnemy();
    //     const p = playerRef.current;
    //
    //     if (!target) {
    //         return null;
    //     }
    //
    //     return Math.atan2(target.y - p.y, target.x - p.x);
    // }
    //
    // function getTurretMuzzlePosition(idx) {
    //     const p = playerRef.current;
    //     let angle, length;
    //     if (idx === 0) {
    //         angle = turretRef.current.angle;
    //         length = turretRef.current.length;
    //     } else {
    //         angle = secondaryTurretAnglesRef.current[idx - 1] || 0;
    //         length = turretRef.current.length * 0.7;
    //     }
    //     const muzzleDistance = p.halfSize + length;
    //     return {
    //         x: p.x + Math.cos(angle) * muzzleDistance,
    //         y: p.y + Math.sin(angle) * muzzleDistance,
    //     };
    // }
    //
    // function getSecondaryTurretTarget(idx, alreadyTargeted) {
    //     const config = getActiveTurrets()[idx];
    //     const p = playerRef.current;
    //     let closest = null, minDist = Infinity;
    //     for (const enemy of enemiesRef.current) {
    //         if (!enemy.alive) continue;
    //         if (alreadyTargeted.has(enemy.id)) continue;
    //         const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
    //         if (dist < minDist && dist <= playerStatsRef.current.range * (config.rangeMultiplier ?? 1)) {
    //             closest = enemy;
    //             minDist = dist;
    //         }
    //     }
    //     return closest;
    // }


    const swordSwingsRef = useRef([]);
    const meleeAimAngleRef = useRef(0);
    const flailStateRef = useRef({
        orbitAngle: 0,
        boosted: false,
        boostTimer: 0,
        enemyHitCooldowns: {},
    });

    const meleeCooldownsRef = useRef({ cooldown: 0 });
    const burstStateRef = useRef({
        shotsRemaining: 0,
        burstTimer: 0,
        burstInterval: WEAPON_CONFIGS.BURST?.[0]?.burstInterval ?? 0.15,
        burstCount: WEAPON_CONFIGS.BURST?.[0]?.burstCount ?? 3,
        target: null,
        firing: false,
    });

    function getWeaponSystem() {
        if (!weaponSystemRef.current) {
            weaponSystemRef.current = createWeaponSystem({
                refs: {
                    playerRef,
                    enemiesRef,
                    playerStatsRef,
                    targetEnemyIdRef,
                    activeWeaponTypeRef,
                    mainTurretAutoFireEnabledRef,
                    turretRef,
                    secondaryTurretAnglesRef,
                    turretCooldownsRef,
                    projectilesRef,
                    fireRequestRef,
                    burstStateRef,
                    swordSwingsRef,
                    meleeAimAngleRef,
                    flailStateRef,
                    meleeCooldownsRef,
                    cameraRef,
                    canvasRef,
                },
                callbacks: {
                    resolveEnemyHit,
                    onEnemyKilled,
                    onPlayerHit: applyPlayerProjectileDamage,
                    onExplosion: triggerExplosionEffect,
                },
            });
        }

        return weaponSystemRef.current;
    }

    function selectAdvancedWeaponUpgrade(weaponType) {
        if (!WEAPON_CONFIGS[weaponType]) {
            console.error('Invalid weapon upgrade selection:', weaponType);
            return;
        }
        setActiveWeaponType(weaponType);
        setFirstWeaponUpgradeOpen(false);
        firstWeaponUpgradeOpenRef.current = false;
    }

    function getActiveTurrets() {
        return getWeaponSystem().getActiveTurrets();
    }

    function isMeleeWeaponType(type) {
        return getWeaponSystem().isMeleeWeaponType(type);
    }

    function getMainWeaponConfig(type = activeWeaponTypeRef.current) {
        return getWeaponSystem().getMainWeaponConfig(type);
    }

    function normalizeAngle(angle) {
        return getWeaponSystem().normalizeAngle(angle);
    }

    function getTargetEnemy() {
        return getWeaponSystem().getTargetEnemy();
    }

    function getTargetAngle() {
        return getWeaponSystem().getTargetAngle();
    }

    function getTurretMuzzlePosition(idx) {
        return getWeaponSystem().getTurretMuzzlePosition(idx);
    }

    function getSecondaryTurretTarget(idx, alreadyTargeted) {
        return getWeaponSystem().getSecondaryTurretTarget(idx, alreadyTargeted);
    }

    function rotateTurretAngle(current, target, turnSpeed, dt) {
        return getWeaponSystem().rotateTurretAngle(current, target, turnSpeed, dt);
    }

    function isTurretAligned(current, target, tolerance = 0.13) {
        return getWeaponSystem().isTurretAligned(current, target, tolerance);
    }

    function fireTurret(idx, target) {
        return getWeaponSystem().fireTurret(idx, target);
    }

    // COMMENTED OUT (legacy weapon block): replaced by createWeaponSystem wrappers above.
    // function rotateTurretAngle(current, target, turnSpeed, dt) {
    //     let delta = normalizeAngle(target - current);
    //     const maxStep = turnSpeed * dt;
    //     if (Math.abs(delta) <= maxStep) {
    //         return target;
    //     } else {
    //         return normalizeAngle(current + Math.sign(delta) * maxStep);
    //     }
    // }
    //
    // function isTurretAligned(current, target, tolerance = 0.13) {
    //     return Math.abs(normalizeAngle(target - current)) <= tolerance;
    // }
    //
    // function getEffectiveRange(config) {
    //     return playerStatsRef.current.range * (config.rangeMultiplier ?? 1);
    // }
    //
    // function fireTurret(idx, target) {
    //     const config = getActiveTurrets()[idx];
    //     if (!config || !target) return false;
    //     if (isMeleeWeaponType(activeWeaponTypeRef.current)) return false;
    //     if (activeWeaponTypeRef.current === 'BURST' && idx === 0) {
    //         if (!burstStateRef.current.firing) {
    //             burstStateRef.current.shotsRemaining = (config.burstCount || 3);
    //             burstStateRef.current.burstTimer = 0;
    //             burstStateRef.current.burstInterval = config.burstInterval || 0.15;
    //             burstStateRef.current.target = target;
    //             burstStateRef.current.firing = true;
    //         }
    //         return true;
    //     }
    //     const muzzle = getTurretMuzzlePosition(idx);
    //     const distance = calculateDistance(muzzle.x, muzzle.y, target.x, target.y);
    //     const effectiveRange = playerStatsRef.current.range * (config.rangeMultiplier ?? 1);
    //     if (distance > effectiveRange) return false;
    //     const speed = config.projectileSpeed;
    //     const dirX = (target.x - muzzle.x) / distance;
    //     const dirY = (target.y - muzzle.y) / distance;
    //     if (config.projectileType === 'EXPLOSIVE') {
    //         projectilesRef.current.push({
    //             id: crypto.randomUUID(),
    //             x: muzzle.x,
    //             y: muzzle.y,
    //             radius: 8,
    //             vx: dirX * speed,
    //             vy: dirY * speed,
    //             damage: config.damage,
    //             alive: true,
    //             maxDistance: effectiveRange,
    //             traveled: 0,
    //             projectileType: 'EXPLOSIVE',
    //             explosionRadius: config.explosionRadius || 60,
    //         });
    //     } else {
    //         projectilesRef.current.push({
    //             id: crypto.randomUUID(),
    //             x: muzzle.x,
    //             y: muzzle.y,
    //             radius: 5,
    //             vx: dirX * speed,
    //             vy: dirY * speed,
    //             damage: config.damage,
    //             alive: true,
    //             maxDistance: effectiveRange,
    //             traveled: 0,
    //         });
    //     }
    //     return true;
    // }
    // function setTurretCooldown(idx, cooldown) {
    //     if (!Array.isArray(turretCooldownsRef.current)) turretCooldownsRef.current = [];
    //     while (turretCooldownsRef.current.length <= idx) {
    //         turretCooldownsRef.current.push({ fireCooldown: 0 });
    //     }
    //     turretCooldownsRef.current[idx] = { fireCooldown: cooldown };
    // }
    // --- Unified auto-fire logic for all turrets (main and secondary) ---
    function updateTurretAutoFire(dt) {
        getWeaponSystem().updateTurretAutoFire(dt);
    }

    // --- Main turret aim and player-controlled fire ---
    function updateTurret(dt) {
        getWeaponSystem().updateTurret(dt);
    }
    // COMMENTED OUT (duplicate): burstStateRef is already declared above and owned by weapon system.
    // const burstDefaults = WEAPON_CONFIGS.BURST?.[0] || { burstInterval: 0.15, burstCount: 3 };
    // const burstStateRef = useRef({
    //     shotsRemaining: 0,
    //     burstTimer: 0,
    //     burstInterval: burstDefaults.burstInterval,
    //     burstCount: burstDefaults.burstCount,
    //     target: null,
    //     firing: false,
    // });

    // --- Burst fire handler ---
    function handleBurstFire(dt) {
        getWeaponSystem().handleBurstFire(dt);
    }
    // --- Burst weapon state ---

    // COMMENTED OUT (duplicate): primary enemyTakeDamage is declared earlier.
    // function enemyTakeDamage(enemy, amount) {
    //     enemy.hp -= amount;
    //     const { sx, sy } = worldToScreen(enemy.x, enemy.y, cameraRef.current, canvasRef.current);
    //     triggerEffects(sx, sy, `-${amount}`, "#ffcc00");
    // };

     /* LEGACY PROJECTILE IMPLEMENTATION (COMMENTED FOR ROLLBACK ONLY):
         canonical active logic is in systems/weapon/weaponSystem.js -> updateProjectiles().
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
    */

    // function updateProjectiles(dt, canvas) {
    //     for (const projectile of projectilesRef.current) {
    //         if (!projectile.alive) {
    //             continue;
    //         }

    //         projectile.x += projectile.vx * dt;
    //         projectile.y += projectile.vy * dt;

    //         const stepDistance = Math.hypot(projectile.vx * dt, projectile.vy * dt);
    //         projectile.traveled += stepDistance;

    //         let exploded = false;

    //         if (projectile.traveled >= projectile.maxDistance) {
    //             projectile.alive = false;
    //             // Explode if explosive
    //             if (projectile.projectileType === 'EXPLOSIVE') exploded = true;
    //             continue;
    //         }

    //         for (const enemy of enemiesRef.current) {
    //             if (!enemy.alive) {
    //                 continue;
    //             }

    //             const hit =
    //                 Math.abs(projectile.x - enemy.x) < projectile.radius + enemy.halfSize &&
    //                 Math.abs(projectile.y - enemy.y) < projectile.radius + enemy.halfSize;

    //             if (!hit) {
    //                 continue;
    //             }

    //             // Explosive: trigger AoE
    //             if (projectile.projectileType === 'EXPLOSIVE') {
    //                 exploded = true;
    //             } else {
    //                 projectile.alive = false;
    //                 resolveEnemyHit(enemy, createHitOptions('projectile', projectile.damage));
    //                 if (enemy.hp <= 0) onEnemyKilled(enemy);
    //             }
    //             break;
    //         }

    //         // Handle explosion if needed
    //         if (exploded) {
    //             projectile.alive = false;
    //             // AoE damage to all enemies in radius
    //             for (const enemy of enemiesRef.current) {
    //                 if (!enemy.alive) continue;
    //                 const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);
    //                 if (dist <= (projectile.explosionRadius || 60) + (enemy.halfSize || 0)) {
    //                     // Optional: radial falloff (full damage at center, half at edge)
    //                     let falloff = 1;
    //                     if (dist > (projectile.explosionRadius || 60) * 0.5) {
    //                         falloff = 0.5 + 0.5 * ((projectile.explosionRadius || 60) - dist) / ((projectile.explosionRadius || 60) * 0.5);
    //                         falloff = Math.max(0.5, falloff);
    //                     }
    //                     resolveEnemyHit(
    //                         enemy,
    //                         createHitOptions('explosion', projectile.damage * falloff)
    //                     );
    //                     if (enemy.hp <= 0) onEnemyKilled(enemy);
    //                 }
    //             }
    //             // Visual effect: shake and explosion effect
    //             shakeRef.current = Math.max(shakeRef.current, 16);
    //             // Add explosion effect to damageTextsRef for visuals
    //             damageTextsRef.current.push({
    //                 id: 'explosion-' + Date.now(),
    //                 x: worldToScreen(projectile.x, projectile.y, cameraRef.current, canvasRef.current).sx,
    //                 y: worldToScreen(projectile.x, projectile.y, cameraRef.current, canvasRef.current).sy,
    //                 text: '',
    //                 color: '#ffb347',
    //                 life: 0.7,
    //                 explosionRadius: projectile.explosionRadius || 60,
    //             });
    //         }
    //     }

    //     projectilesRef.current = projectilesRef.current.filter((projectile) => projectile.alive);
    // }

    function updateProjectiles(dt, canvas) {
        return getWeaponSystem().updateProjectiles(dt);
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

    // COMMENTED OUT (legacy helper): enemy firing is delegated via getWeaponSystem().fireEnemyTurret in getEnemySystem callbacks.
    // function fireEnemyTurret(enemy, targetPos) {
    //     const turretCfg = ARCHETYPE_CONFIGS[ENEMY_ARCHETYPES.RANGED].turretConfig;
    //     const muzzleDistance = enemy.halfSize + 12;
    //     const muzzlePos = {
    //         x: enemy.x + Math.cos(enemy.turretAngle) * muzzleDistance,
    //         y: enemy.y + Math.sin(enemy.turretAngle) * muzzleDistance,
    //     };
    //
    //     const distance = calculateDistance(muzzlePos.x, muzzlePos.y, targetPos.x, targetPos.y);
    //     if (distance > turretCfg.range) return false;
    //
    //     const dirX = (targetPos.x - muzzlePos.x) / distance;
    //     const dirY = (targetPos.y - muzzlePos.y) / distance;
    //
    //     projectilesRef.current.push({
    //         id: crypto.randomUUID(),
    //         x: muzzlePos.x,
    //         y: muzzlePos.y,
    //         radius: 5,
    //         vx: dirX * turretCfg.projectileSpeed,
    //         vy: dirY * turretCfg.projectileSpeed,
    //         damage: turretCfg.projectileDamage,
    //         alive: true,
    //         maxDistance: turretCfg.range,
    //         traveled: 0,
    //         isEnemyProjectile: true,
    //     });
    //
    //     return true;
    // }

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

    /* LEGACY MELEE IMPLEMENTATION (COMMENTED FOR ROLLBACK): moved to systems/weapon/weaponSystem.js
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

        if (meleeCooldownsRef.current.cooldown > 0) {
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

        meleeCooldownsRef.current.cooldown = swordCfg.cooldown ?? 0.34;
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

        if (meleeCooldownsRef.current.cooldown > 0) {
            return false;
        }

        const flail = flailStateRef.current;
        flail.boosted = true;
        flail.boostTimer = flailCfg.boostDuration ?? 1.1;
        meleeCooldownsRef.current.cooldown = flailCfg.cooldown ?? 1.25;
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
        const flailLength = p.halfSize + (flailCfg.length ?? 40);
        const anchor = {
            x: p.x + Math.cos(anchorAngle) * flailLength,
            y: p.y + Math.sin(anchorAngle) * flailLength,
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
        const flailLength = p.halfSize + (flailCfg.length ?? 40);
        const anchor = {
            x: p.x + Math.cos(anchorAngle) * flailLength,
            y: p.y + Math.sin(anchorAngle) * flailLength,
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

        meleeCooldownsRef.current.cooldown = Math.max(0, meleeCooldownsRef.current.cooldown - dt);

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
            const swordLength = currentCfg.length ?? 44;
            if (swordSwings.length === 0) {
                swordIdle = {
                    x: p.x,
                    y: p.y,
                    angle: getMeleeAimAngle(),
                    length: swordLength,
                };
            }
        }

        let flail = null;
        if (currentType === 'FLAIL' && currentCfg) {
            const flailRuntime = flailStateRef.current;
            const anchorAngle = getMeleeAimAngle();
            const flailLength = p.halfSize + (currentCfg.length ?? 40);
            const anchor = {
                x: p.x + Math.cos(anchorAngle) * flailLength,
                y: p.y + Math.sin(anchorAngle) * flailLength,
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
    */

    function getMeleeAimAngle() {
        return getWeaponSystem().getMeleeAimAngle();
    }

    function isAngleWithinSweep(angle, start, end) {
        return getWeaponSystem().isAngleWithinSweep(angle, start, end);
    }

    function trySwordAttack() {
        return getWeaponSystem().trySwordAttack();
    }

    function tryFlailAttack() {
        return getWeaponSystem().tryFlailAttack();
    }

    function handleMeleeFireRequest() {
        return getWeaponSystem().handleMeleeFireRequest();
    }

    function hasSwordAutoFireTarget() {
        return getWeaponSystem().hasSwordAutoFireTarget();
    }

    function hasFlailAutoFireTarget() {
        return getWeaponSystem().hasFlailAutoFireTarget();
    }

    function shouldAutoFireMelee() {
        return getWeaponSystem().shouldAutoFireMelee();
    }

    function updateSwordSwings(dt) {
        return getWeaponSystem().updateSwordSwings(dt);
    }

    function updateFlail(dt) {
        return getWeaponSystem().updateFlail(dt);
    }

    function updateMeleeWeapons(dt) {
        return getWeaponSystem().updateMeleeWeapons(dt);
    }

    function getMeleeVisualState() {
        return getWeaponSystem().getMeleeVisualState();
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