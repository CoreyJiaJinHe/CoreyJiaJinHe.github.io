import { useEffect, useEffectEvent, useRef, useState, useReducer } from 'react';


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
import { createCombatSystem } from './systems/combat/combatSystem.js';
import { createProgressionSystem } from './systems/progression/progressionSystem.js';
import { createTargetingSystem } from './systems/targeting/targetingSystem.js';
import { createEffectsSystem } from './systems/effects/effectsSystem.js';
import { createQuestSystem, INITIAL_QUEST_DEFS } from './systems/quest/questSystem.js';

import FrameGameShopOverlay from './components/Shop.jsx'
import FrameGameKeybindsOverlay from './components/Keybinds.jsx'
import FrameGameWeaponUpgradeOverlay from './components/WeaponUpgrade.jsx'
import FrameGameDifficultyPanel from './components/DifficultyPanel.jsx'
import FrameGamePlayerStatOverlay from './components/PlayerStat.jsx'


import {
    squareOverlapsCircle,
    squaresOverlap,
    calculateDistance,
    worldToScreen,
    isOnScreen
} from './utils/MathUtils.js';
import { drawScene, drawEffects, drawOffscreenMarkers } from './render/renderer.js';

function FrameGame1({ largeMode, toggleLargeMode }) {
    const canvasRef = useRef(null);

    const initialUiState = {
        mouseSeekEnabled: false,
        scaledEnemiesEnabled: false,
        pacingProfile: PROFILE.P2,
        firstWeaponUpgradeOpen: true,
        keybindOpen: false,
        shopOpen: false,
        developerMode: true,
        settingsOpen: false,
    };

    function uiReducer(state, action) {
        switch (action.type) {
            case 'toggleMouseSeek':
                return {
                    ...state,
                    mouseSeekEnabled: !state.mouseSeekEnabled,
                };

            case 'setMouseSeek':
                return {
                    ...state,
                    mouseSeekEnabled: action.value,
                };

            case 'setScaledEnemies':
                return {
                    ...state,
                    scaledEnemiesEnabled: action.value,
                };

            case 'setPacingProfile':
                return {
                    ...state,
                    pacingProfile: action.value,
                };

            case 'closeFirstWeaponUpgrade':
                return {
                    ...state,
                    firstWeaponUpgradeOpen: false,
                };

            case 'toggleShop':
                return {
                    ...state,
                    shopOpen: !state.shopOpen,
                };

            case 'setShopOpen':
                return {
                    ...state,
                    shopOpen: action.value,
                };

            case 'toggleSettings':
                return {
                    ...state,
                    settingsOpen: !state.settingsOpen,
                };

            case 'setSettingsOpen':
                return {
                    ...state,
                    settingsOpen: action.value,
                };

            case 'toggleKeybinds':
                return {
                    ...state,
                    keybindOpen: !state.keybindOpen,
                };

            case 'setKeybindOpen':
                return {
                    ...state,
                    keybindOpen: action.value,
                };

            case 'setDeveloperMode':
                return {
                    ...state,
                    developerMode: action.value,
                };
            case 'setFirstWeaponUpgradeOpen':
                return {
                    ...state,
                    firstWeaponUpgradeOpen: action.value,
                };

            default:
                return state;
        }
    }

    function resolveReducerValue(nextValue, currentValue) {
        return typeof nextValue === 'function' ? nextValue(currentValue) : nextValue;
    }

    function setShopOpen(nextValue) {
        const resolved = resolveReducerValue(nextValue, shopOpen);
        dispatchUi({ type: 'setShopOpen', value: resolved });
    }

    function setSettingsOpen(nextValue) {
        const resolved = resolveReducerValue(nextValue, settingsOpen);
        dispatchUi({ type: 'setSettingsOpen', value: resolved });
    }

    function setKeybindOpen(nextValue) {
        const resolved = resolveReducerValue(nextValue, keybindOpen);
        dispatchUi({ type: 'setKeybindOpen', value: resolved });
    }

    function setFirstWeaponUpgradeOpen(nextValue) {
        const resolved = resolveReducerValue(nextValue, firstWeaponUpgradeOpen);
        firstWeaponUpgradeOpenRef.current = resolved;
        dispatchUi({
            type: resolved ? 'setFirstWeaponUpgradeOpen' : 'closeFirstWeaponUpgrade'
        });
    }

    function handleKeybindsClose() {
        dispatchUi({ type: 'setKeybindOpen', value: false });
    }

    function handleSettingsClose() {
        dispatchUi({ type: 'setSettingsOpen', value: false });
    }

    const [uiState, dispatchUi] = useReducer(uiReducer, initialUiState);

    const {
        mouseSeekEnabled,
        scaledEnemiesEnabled,
        pacingProfile,
        firstWeaponUpgradeOpen,
        keybindOpen,
        shopOpen,
        developerMode,
        settingsOpen,
    } = uiState;


    const playerRef = useRef({ x: 400, y: 300, halfSize: 20, speed: 200 });
    const previousPlayerPositionRef = useRef({ x: 400, y: 300 });
    const cameraRef = useRef({ x: playerRef.current.x, y: playerRef.current.y });
    const worldBoundsRef = useRef({
        minX: -2000,
        maxX: 2000,
        minY: -2000,
        maxY: 2000,
        borderColor: '#ef4444',
        borderWidth: 4,
    });

    const worldBandsRef = useRef({
        activeRadius: 1200,  // Radius used when counting regular enemies toward active population limits.
        despawnRadius: 2200, // Regular enemies beyond this radius are removed.
        spawnMinRadius: 220, // Minimum spawn distance from player for newly created regular enemies.
        spawnMaxRadius: 520, // Maximum spawn distance from player for newly created regular enemies.
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

    const [gameOver, setGameOver] = useState(false);
    const revivesBoughtRef = useRef(0);
    const BASE_REVIVE_COST = 100;

    function getReviveCost() {
        return BASE_REVIVE_COST * Math.pow(2, revivesBoughtRef.current);
    }

    function hardRestartRun() {
        localStorage.removeItem('frameGameSave');

        const defaultPlayer = { x: 400, y: 300, halfSize: 20, speed: 200 };
        const defaultPlayerStats = {
            alive: true,
            hp: 10,
            maxHP: 10,
            atk: 5,
            meleeBonusPct: 0,
            projectileBonusPct: 0,
            explosionBonusPct: 0,
            def: 2,
            range: 220,
            secondaryTurretAngle: 0,
            secondaryTurretTurnSpeed: Math.PI * 1.8,
        };

        Object.assign(playerRef.current, defaultPlayer);
        previousPlayerPositionRef.current = { x: defaultPlayer.x, y: defaultPlayer.y };
        cameraRef.current = { x: defaultPlayer.x, y: defaultPlayer.y };

        Object.assign(playerStatsRef.current, defaultPlayerStats);
        setPlayerStatsView({ ...playerStatsRef.current });

        materialsRef.current = 0;
        killsRef.current = 0;
        bossesDefeatedRef.current = 0;
        setMaterialsView(0);
        setKillsView(0);
        setBossesDefeatedView(0);

        enemiesRef.current = [];
        advancedDropsRef.current = [];
        projectilesRef.current = [];
        swordSwingsRef.current = [];
        damageTextsRef.current = [];
        shakeRef.current = 0;

        targetEnemyIdRef.current = null;
        setTargetEnemyIdView(null);

        fireRequestRef.current = false;
        tabPressedRef.current = false;
        keysRef.current.clear();

        enemySpawnTimerRef.current = 0;
        bossSpawnTimerRef.current = 0;

        revivesBoughtRef.current = 0;
        setGameOver(false);

        setShopOpen(false);
        setSettingsOpen(false);
        setKeybindOpen(false);
        setMouseSeekMode(false);
        setScaledEnemiesEnabledSync(false);
        setPacingProfileSync(PROFILE.P2);

        hasChosenAdvancedWeaponRef.current = false;
        setActiveWeaponType('SINGLE');
        setFirstWeaponUpgradeOpen(initialUiState.firstWeaponUpgradeOpen);

        const y = killsRef.current;
        const scaled = getDifficultyFromKills(y);
        const { startCount } = enemySpawnConfigRef.current;

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
        ensureValidTarget();
    }

    function buyOneLife() {
        const cost = getReviveCost();
        if (materialsRef.current < cost) return;

        materialsRef.current -= cost;
        setMaterialsView(materialsRef.current);

        playerStatsRef.current.alive = true;
        playerStatsRef.current.hp = Math.max(1, Math.ceil(playerStatsRef.current.maxHP * 0.5));
        setPlayerStatsView({ ...playerStatsRef.current });

        revivesBoughtRef.current += 1;
        setGameOver(false);
    }

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
    const enemySystemRef = useRef(null);

    function getEnemySystem() {
        if (!enemySystemRef.current) {
            enemySystemRef.current = createEnemySystem({
                refs: {
                    playerRef,
                    previousPlayerPositionRef,
                    enemiesRef,
                    worldBandsRef,
                    worldBoundsRef,
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
        return enemySystemRef.current;
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

    function pruneFarEntities() {
        getEnemySystem().pruneFarEntities();
    }


    const scaledEnemiesEnabledRef = useRef(false);

    function setScaledEnemiesEnabledSync(nextValue) {
        const resolved =
            typeof nextValue === 'function'
                ? nextValue(scaledEnemiesEnabledRef.current)
                : nextValue;

        scaledEnemiesEnabledRef.current = resolved;
        dispatchUi({ type: 'setScaledEnemies', value: resolved });
    }

    const pacingProfileRef = useRef(PROFILE.P2);

    function setPacingProfileSync(nextValue) {
        const resolved =
            typeof nextValue === 'function'
                ? nextValue(pacingProfileRef.current)
                : nextValue;

        pacingProfileRef.current = resolved;
        dispatchUi({ type: 'setPacingProfile', value: resolved });
    }


    const targetEnemyIdRef = useRef(null);
    const [targetEnemyIdView, setTargetEnemyIdView] = useState(null);

    function setTargetEnemyId(nextValue) {
        targetEnemyIdRef.current = nextValue;
        setTargetEnemyIdView(nextValue);
    }


    const targetingSystemRef = useRef(null);

    function getTargetingSystem() {
        if (!targetingSystemRef.current) {
            targetingSystemRef.current = createTargetingSystem({
                refs: {
                    playerRef,
                    enemiesRef,
                    targetEnemyIdRef
                },
                callbacks: {
                    setTargetEnemyId: setTargetEnemyId,
                }
            });
        }
        return targetingSystemRef.current;
    }

    function ensureValidTarget() {
        return getTargetingSystem().ensureValidTarget();
    }

    function getAliveEnemiesSortedByDistance() {
        return getTargetingSystem().getAliveEnemiesSortedByDistance();
    }

    function cycleTargetReverseClosestToFarthest() {
        return getTargetingSystem().cycleTargetReverseClosestToFarthest();
    }

    function cycleTargetClosestToFarthest() {
        return getTargetingSystem().cycleTargetClosestToFarthest();
    }

    // const [firstWeaponUpgradeOpen, setFirstWeaponUpgradeOpen] = useState(true);
    const firstWeaponUpgradeOpenRef = useRef(firstWeaponUpgradeOpen);

    function applyPlayerProjectileDamage(amount) {
        playerTakeDamage(amount, playerRef.current.x, playerRef.current.y, true);
        if (playerStatsRef.current.hp <= 0) {
            playerStatsRef.current.alive = false;
        }
        setPlayerStatsView({ ...playerStatsRef.current });
    }

    const progressionSystemRef = useRef(null);

    function getProgressionSystem() {
        if (!progressionSystemRef.current) {
            progressionSystemRef.current = createProgressionSystem({
                refs: {
                    playerRef,
                    playerStatsRef,
                    advancedDropsRef,
                    materialsRef,
                    killsRef,
                    bossesDefeatedRef,
                    firstWeaponUpgradeOpenRef
                },
                callbacks: {
                    setMaterialsView: setMaterialsView,
                    setKillsView: setKillsView,
                    setBossesDefeatedView: setBossesDefeatedView,
                    setPlayerStatsView: setPlayerStatsView,
                    setFirstWeaponUpgradeOpen: setFirstWeaponUpgradeOpen,
                }
            });
        }
        return progressionSystemRef.current;
    }

    function onEnemyKilled(enemy) {
        getQuestSystem().onEnemyKilled(enemy);
        return getProgressionSystem().onEnemyKilled(enemy);
    }
    function grantMaterials(amount) {
        return getProgressionSystem().grantMaterials(amount);
    }
    function maybeSpawnAdvancedDrop(x, y) {
        return getProgressionSystem().maybeSpawnAdvancedDrop(x, y);
    }
    function applyAdvancedModifier(drop) {
        return getProgressionSystem().applyAdvancedModifier(drop);
    }
    function updateAdvancedDrops() {
        return getProgressionSystem().updateAdvancedDrops();
    }

    // --- Weapon type and turrets ---
    const weaponTypeKeys = Object.keys(WEAPON_CONFIGS);
    const [activeWeaponType, setActiveWeaponType] = useState('SINGLE');
    const activeWeaponTypeRef = useRef(activeWeaponType);

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

    const mainTurretAutoFireEnabledRef = useRef(mainTurretAutoFireEnabled);

    useEffect(() => {
        mainTurretAutoFireEnabledRef.current = mainTurretAutoFireEnabled;
    }, [mainTurretAutoFireEnabled]);
    const turretCooldownsRef = useRef([]);

    const projectilesRef = useRef([]);
    const fireRequestRef = useRef(false);

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
    const hasChosenAdvancedWeaponRef = useRef(false);

    function selectAdvancedWeaponUpgrade(weaponType) {
        if (!WEAPON_CONFIGS[weaponType]) {
            console.error('Invalid weapon upgrade selection:', weaponType);
            return;
        }

        setActiveWeaponType(weaponType);
        hasChosenAdvancedWeaponRef.current = true; // important
        firstWeaponUpgradeOpenRef.current = false;
        dispatchUi({ type: 'closeFirstWeaponUpgrade' });
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

    // --- Unified auto-fire logic for all turrets (main and secondary) ---
    function updateTurretAutoFire(dt) {
        getWeaponSystem().updateTurretAutoFire(dt);
    }

    // --- Main turret aim and player-controlled fire ---
    function updateTurret(dt) {
        getWeaponSystem().updateTurret(dt);
    }

    // --- Burst fire handler ---
    function handleBurstFire(dt) {
        getWeaponSystem().handleBurstFire(dt);
    }
    function updateProjectiles(dt, canvas) {
        return getWeaponSystem().updateProjectiles(dt);
    }


    const keysRef = useRef(new Set());
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

    const mouseSeekModeRef = useRef(false);
    const mouseRef = useRef({ x: 0, y: 0, inside: false });

    function setMouseSeekMode(nextValue) {
        const resolved =
            typeof nextValue === 'function'
                ? nextValue(mouseSeekModeRef.current)
                : nextValue;

        mouseSeekModeRef.current = resolved;
        dispatchUi({ type: 'setMouseSeek', value: resolved });
    }

    const handleMouseMove = useEffectEvent((e, canvas) => {
        if (keybindOpen) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        const rect = canvas.getBoundingClientRect();
        mouseRef.current.x = e.clientX - rect.left;
        mouseRef.current.y = e.clientY - rect.top;
        mouseRef.current.inside = true;
    });

    const handleMouseLeave = useEffectEvent(() => {
        mouseRef.current.inside = false;
    });

    const handleKeyDown = useEffectEvent((e) => {
        if (keybindOpen) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        keysRef.current.add(e.key);

        if (e.key === keybinds.current.shop) {
            e.preventDefault();
            setShopOpen((current) => !current);
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
    });

    const handleKeyUp = useEffectEvent((e) => {
        if (keybindOpen) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        keysRef.current.delete(e.key);

        if (e.key === keybinds.current.cycleTarget) {
            tabPressedRef.current = false;
        }
    });

    function setupInput(canvas) {
        const onMouseMove = (e) => handleMouseMove(e, canvas);
        const onMouseLeave = () => handleMouseLeave();
        const onKeyDown = (e) => handleKeyDown(e);
        const onKeyUp = (e) => handleKeyUp(e);

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

    //Switch to import later for these four.
    function clampToWorld(x, y, b) {
        return {
            x: Math.max(b.minX, Math.min(b.maxX, x)),
            y: Math.max(b.minY, Math.min(b.maxY, y)),
        };
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function clampPointToWorld(x, y, bounds = worldBoundsRef.current, halfSize = 0) {
        return {
            x: clamp(x, bounds.minX + halfSize, bounds.maxX - halfSize),
            y: clamp(y, bounds.minY + halfSize, bounds.maxY - halfSize),
        };
    }

    function clampCameraToWorld(camX, camY, canvas, b) {
        const halfW = canvas.width / 2;
        const halfH = canvas.height / 2;
        return {
            x: Math.max(b.minX + halfW, Math.min(b.maxX - halfW, camX)),
            y: Math.max(b.minY + halfH, Math.min(b.maxY - halfH, camY)),
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
        const clampedPlayer = clampPointToWorld(p.x, p.y, worldBoundsRef.current, p.halfSize ?? 0);
        p.x = clampedPlayer.x;
        p.y = clampedPlayer.y;
    }
    const combatSystemRef = useRef(null);

    function getCombatSystem() {
        if (!combatSystemRef.current) {
            combatSystemRef.current = createCombatSystem({
                refs: {
                    playerRef,
                    playerStatsRef,
                    enemiesRef,
                    projectilesRef,
                    cameraRef,
                    canvasRef,
                },
                callbacks: {
                    onEnemyKilled,
                    setPlayerStatsView: setPlayerStatsView,
                    triggerEffects: triggerEffects,
                },
            });
        }
        return combatSystemRef.current;
    }

    function playerTakeDamage(amount, x, y, isPlayer) {
        return getCombatSystem().playerTakeDamage(amount, x, y, isPlayer);
    }

    function resolveEnemyHit(enemy, options = {}) {
        return getCombatSystem().resolveEnemyHit(enemy, options);
    }

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
        return getCombatSystem().updateCombat(dt);
    }


    const damageTextsRef = useRef([]); // Array of { id, x, y, text, color, life }
    const shakeRef = useRef(0); // Current shake intensity

    const effectsSystemRef = useRef(null);

    function getEffectsSystem() {
        if (!effectsSystemRef.current) {
            effectsSystemRef.current = createEffectsSystem({
                refs: {
                    damageTextsRef,
                    shakeRef,
                    cameraRef,
                    canvasRef
                },
            });
        }
        return effectsSystemRef.current;
    }

    function triggerEffects(x, y, text, color = "white", isPlayer = false) {
        return getEffectsSystem().triggerEffects(x, y, text, color, isPlayer);
    }

    function triggerExplosionEffect(worldX, worldY, explosionRadius = 60) {
        return getEffectsSystem().triggerExplosionEffect(worldX, worldY, explosionRadius);
    }

    function updateEffects(dt) {
        return getEffectsSystem().updateEffects(dt);
    }

    const runGameFrame = useEffectEvent((dt, canvas) => {
        if (gameOver) return;

        if (!playerStatsRef.current.alive || playerStatsRef.current.hp <= 0) {
            playerStatsRef.current.alive = false;
            setGameOver(true);
            setPlayerStatsView({ ...playerStatsRef.current });
            return;
        }

        if (shopOpen || firstWeaponUpgradeOpen || keybindOpen || settingsOpen) {
            return;
        }

        pruneFarEntities();
        updateAdvancedDrops();

        const beforeX = playerRef.current.x;
        const beforeY = playerRef.current.y;

        updatePlayerMovement(dt, canvas);

        const dx = playerRef.current.x - beforeX;
        const dy = playerRef.current.y - beforeY;
        const traveled = Math.hypot(dx, dy);
        if (traveled > 0) {
            getQuestSystem().onDistanceTraveled(traveled);
        }


        updateTurret(dt);
        updateMeleeWeapons(dt);
        handleBurstFire(dt);
        updateTurretAutoFire(dt);
        updateEnemyAi(dt);
        ensureValidTarget();
        updateCombat(dt);
        updateProjectiles(dt, canvas);
        updateEnemyPopulation(dt, canvas);
        updateBossSpawn(dt, canvas);
        updateEffects(dt);
    });


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

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const cleanupCanvas = setupCanvas(canvas);
        loadSave(); // <- before enemy spawn so difficulty scaling uses loaded kills


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
        ensureValidTarget();

        const cleanupInput = setupInput(canvas);

        let animFrameId;
        let lastTime = 0;

        function loop(timestamp) {
            const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
            lastTime = timestamp;

            const wantedCamX = playerRef.current.x;
            const wantedCamY = playerRef.current.y;
            const clampedCam = clampCameraToWorld(wantedCamX, wantedCamY, canvas, worldBoundsRef.current);
            cameraRef.current.x = clampedCam.x;
            cameraRef.current.y = clampedCam.y;

            runGameFrame(dt, canvas);

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
                worldBounds: worldBoundsRef.current,
            };


            animFrameId = requestAnimationFrame(loop);
            drawScene(ctx, canvas, gameState);

        }
        animFrameId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(animFrameId);
            cleanupInput();
            cleanupCanvas();
        };
    }, []);

    const upgradeCountsRef = useRef(0)
    const upgradeCostRef = useRef(0);

    function applyShopPurchase(upgradeType, cost) {
        progressionSystemRef.current.applyShopPurchase(upgradeType, cost);
    }
    const liveDifficulty = getDifficultyFromKills(killsRef.current);

    useEffect(() => {
        const handleBeforeUnload = () => {
            const saveFile = {
                player: { ...playerRef.current },
                playerStats: { ...playerStatsRef.current },
                materials: materialsRef.current,
                kills: killsRef.current,
                bossesDefeated: bossesDefeatedRef.current,
                activeWeaponType: activeWeaponTypeRef.current,
                pacingProfile: pacingProfileRef.current,
                scaledEnemiesEnabled: scaledEnemiesEnabledRef.current,
                hasChosenAdvancedWeapon: hasChosenAdvancedWeaponRef.current,
                quests: getQuestSystem().getSerializableState(),

            };
            localStorage.setItem('frameGameSave', JSON.stringify(saveFile));
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    function loadSave() {
        try {
            const raw = localStorage.getItem('frameGameSave');
            if (!raw) return;

            const save = JSON.parse(raw);

            // Refs — mutate directly
            if (save.player) {
                Object.assign(playerRef.current, save.player);
                cameraRef.current.x = playerRef.current.x;
                cameraRef.current.y = playerRef.current.y;
            }
            if (save.playerStats) {
                Object.assign(playerStatsRef.current, save.playerStats);
            }
            if (typeof save.materials === 'number') {
                materialsRef.current = save.materials;
            }
            if (typeof save.kills === 'number') {
                killsRef.current = save.kills;
            }
            if (typeof save.bossesDefeated === 'number') {
                bossesDefeatedRef.current = save.bossesDefeated;
            }

            // State — use sync setters so refs + reducer both update
            if (save.pacingProfile) {
                setPacingProfileSync(save.pacingProfile);
            }
            if (typeof save.scaledEnemiesEnabled === 'boolean') {
                setScaledEnemiesEnabledSync(save.scaledEnemiesEnabled);
            }

            if (typeof save.hasChosenAdvancedWeapon === 'boolean') {
                hasChosenAdvancedWeaponRef.current = save.hasChosenAdvancedWeapon;
            }

            // restore weapon
            if (save.activeWeaponType && WEAPON_CONFIGS[save.activeWeaponType]) {
                setActiveWeaponType(save.activeWeaponType);
            }

            // show only if player has killed at least one boss AND has not chosen advanced weapon yet
            const shouldShowFirstWeaponUpgrade =
                bossesDefeatedRef.current > 0 && !hasChosenAdvancedWeaponRef.current;

            setFirstWeaponUpgradeOpen(shouldShowFirstWeaponUpgrade);

            if (typeof save.revivesBought === 'number') {
                revivesBoughtRef.current = Math.max(0, save.revivesBought);
            }

            getQuestSystem().setFromSave(save.quests);

            setGameOver(false);

            // View state — sync since refs were mutated directly
            setMaterialsView(materialsRef.current);
            setKillsView(killsRef.current);
            setBossesDefeatedView(bossesDefeatedRef.current);
            setPlayerStatsView({ ...playerStatsRef.current });

        } catch (e) {
            console.error('Failed to load save:', e);
        }
    }

    const [questView, setQuestView] = useState(
        INITIAL_QUEST_DEFS.map((q) => ({
            ...q,
            reward: { ...q.reward },
            progress: 0,
            completed: false,
            rewarded: false,
        }))
    );
    const questsRef = useRef([]);
    const questSystemRef = useRef(null);

    function getQuestSystem() {
        if (!questSystemRef.current) {
            questSystemRef.current = createQuestSystem({
                refs: { questsRef },
                callbacks: {
                    setQuestView,
                    grantMaterials: (amount) => grantMaterials(amount),
                },
            });
            questSystemRef.current.syncView();
        }
        return questSystemRef.current;
    }


    return (
        <>
            <div className="Frame-Game-1-UI-Row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>

                    <button onClick={() => dispatchUi({ type: 'toggleShop' })}>
                        {shopOpen ? 'Close Shop' : 'Open Shop'}
                    </button>

                    <button onClick={() => dispatchUi({ type: 'toggleSettings' })}>
                        {settingsOpen ? 'Close Settings' : 'Open Settings'}
                    </button>
                </div>



            </div>

            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: 'min(65vh, 560px)',
                }}
            >
                <div className="Frame-Game-1-Active-Quest-Log"
                    style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        zIndex: 20,
                        minWidth: 240,
                        background: 'rgba(17, 24, 39, 0.85)',
                        border: '1px solid #374151',
                        borderRadius: 10,
                        padding: 10,
                        color: '#f9fafb',
                        fontSize: 13,
                        pointerEvents: 'none',
                    }}
                >
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Quests</div>
                    {questView.map((q) => {
                        const progress = Math.min(q.progress, q.target);
                        return (
                            <div key={q.id} style={{ marginBottom: 6, opacity: q.completed ? 0.75 : 1 }}>
                                <div>{q.completed ? 'Completed: ' : 'Active: '}{q.label}</div>
                                <div>
                                    {Math.floor(progress)} / {q.target}
                                    {q.reward?.materials ? ` | +${q.reward.materials} materials` : ''}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="Frame-Game-1-Stat" style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    zIndex: 10,
                    pointerEvents: 'none',
                    color: '#fff',
                }}
                >
                    <FrameGamePlayerStatOverlay
                        playerStatsView={playerStatsView}
                        materialsView={materialsView}
                        killsView={killsView}
                    />
                </div>
                <canvas
                    ref={canvasRef}
                    style={{
                        border: "1px solid #000000",
                        display: "block",
                        width: "100%",
                        height: "100%",
                    }}
                />
                {shopOpen && (<FrameGameShopOverlay
                    shopUpgradeCallbacks={applyShopPurchase}
                    materialsView={materialsView}
                    handleShopClose={setShopOpen}
                    upgradeCountsRef={upgradeCountsRef}
                    upgradeCostRef={upgradeCostRef}
                    pacingProfileRef={pacingProfileRef} />)}

                {firstWeaponUpgradeOpen && (<FrameGameWeaponUpgradeOverlay
                    handleWeaponUpgradeClose={setFirstWeaponUpgradeOpen}
                    weaponTypeKeys={weaponTypeKeys}
                    WEAPON_CONFIGS={WEAPON_CONFIGS}
                    selectAdvancedWeaponUpgrade={selectAdvancedWeaponUpgrade}
                />)}

                {settingsOpen && (
                    <div className="Frame-Overlay">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Settings</h2>
                            {/* Keybinds overlay when opened from settings - rendered last so it appears on top */}
                            {keybindOpen && settingsOpen && (
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 11 }}>
                                    <FrameGameKeybindsOverlay
                                        handleKeybindsClose={handleKeybindsClose}
                                        keybinds={keybinds}
                                    />
                                </div>
                            )}
                            <button
                                type="button"
                                className="Frame-Overlay-Close-Button"
                                aria-label="Close overlay"
                                onClick={() => dispatchUi({ type: 'setSettingsOpen', value: false })}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gameplay</h3>
                            <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '180px' }}>
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
                                </div>
                                {!developerMode ? (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '180px' }}>
                                        <FrameGameDifficultyPanel
                                            liveDifficulty={liveDifficulty}
                                            scaledEnemiesEnabled={scaledEnemiesEnabled}
                                            pacingProfile={pacingProfile}
                                            bossConfigRef={bossConfigRef}
                                            bossesDefeatedView={bossesDefeatedView}
                                        />
                                    </div>)
                                    : null}

                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Difficulty</h3>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px' }}>
                                <span style={{ minWidth: '70px', fontWeight: '500' }}>Pacing:</span>
                                <select
                                    value={pacingProfile}
                                    onChange={(e) => setPacingProfileSync(e.target.value)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #666',
                                        backgroundColor: '#2a2a2a',
                                        color: '#ffffff',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        transition: 'border-color 0.2s',
                                    }}
                                    onMouseEnter={(e) => { e.target.style.borderColor = '#999'; }}
                                    onMouseLeave={(e) => { e.target.style.borderColor = '#666'; }}
                                >
                                    <option value={PROFILE.P1}>P1 (Slow)</option>
                                    <option value={PROFILE.P2}>P2 (Default)</option>
                                    <option value={PROFILE.P3}>P3 (Chaos)</option>
                                </select>
                            </label>
                        </div>

                        <div style={{ borderTop: '1px solid #555', paddingTop: '16px', marginTop: '8px' }}>
                            <button
                                onClick={() => dispatchUi({ type: 'toggleKeybinds' })}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid #666',
                                    backgroundColor: '#3a3a3a',
                                    color: '#ffffff',
                                    fontSize: '15px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = '#4a4a4a';
                                    e.target.style.borderColor = '#888';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = '#3a3a3a';
                                    e.target.style.borderColor = '#666';
                                }}
                            >
                                {keybindOpen ? '✕ Close Keybinds' : '⚙ Open Keybinds'}
                            </button>
                        </div>
                    </div>
                )}
                {gameOver && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: 40,
                            background: 'rgba(0,0,0,0.72)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <div
                            style={{
                                width: 'min(92%, 420px)',
                                background: '#111827',
                                border: '1px solid #374151',
                                borderRadius: 12,
                                padding: 16,
                                color: '#f9fafb',
                            }}
                        >
                            <h2 style={{ margin: '0 0 10px 0' }}>Game Over</h2>
                            <p style={{ margin: '0 0 14px 0', color: '#d1d5db' }}>
                                Choose restart or buy one life.
                            </p>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={hardRestartRun}>Restart</button>
                                <button onClick={buyOneLife}>
                                    Buy 1 Life ({getReviveCost()} materials)
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </>
    );
}

export default FrameGame1;