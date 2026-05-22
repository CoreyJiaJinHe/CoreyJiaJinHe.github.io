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
import { createQuestSystem, QUEST_DEFS } from './systems/quest/questSystem.js';

import { clampToWorld, clampPointToWorld, clampCameraToWorld } from './utils/MathUtils.js';


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
import { drawScene } from './render/renderer.js';

// Input: component props `{ largeMode, toggleLargeMode }`
// Output: JSX tree for the frame-game screen and overlays
// Purpose: root orchestrator that wires systems, simulation flow, and UI state.
function FrameGame1({ largeMode, toggleLargeMode }) {
    const canvasRef = useRef(null);

    const initialUiState = {
        mouseSeekEnabled: false,
        scaledEnemiesEnabled: false,
        pacingProfile: PROFILE.P2,
        developerMode: true,
        get firstWeaponUpgradeOpen() { return this.developerMode; }, // Dynamic: always true if developerMode is true
        keybindOpen: false,
        shopOpen: false,
        settingsOpen: false,
        activeQuestOverlayOpen: false,
    };

    // Input: current UI reducer state and action
    // Output: next UI reducer state
    // Purpose: centralizes all UI toggle and overlay transitions.
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

            case 'toggleActiveQuestOverlay':
                return {
                    ...state,
                    activeQuestOverlayOpen: !state.activeQuestOverlayOpen,
                };

            case 'setActiveQuestOverlayOpen':
                return {
                    ...state,
                    activeQuestOverlayOpen: action.value,
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

    // Input: next value or updater function, and current value
    // Output: resolved next value
    // Purpose: supports value/function setter semantics for local helper setters.
    function resolveReducerValue(nextValue, currentValue) {
        return typeof nextValue === 'function' ? nextValue(currentValue) : nextValue;
    }

    // Input: nextValue (boolean or updater function)
    // Purpose: updates shop visibility through reducer dispatch.
    function setShopOpen(nextValue) {
        const resolved = resolveReducerValue(nextValue, shopOpen);
        dispatchUi({ type: 'setShopOpen', value: resolved });
    }

    // Input: nextValue (boolean or updater function)
    // Purpose: updates settings overlay visibility through reducer dispatch.
    function setSettingsOpen(nextValue) {
        const resolved = resolveReducerValue(nextValue, settingsOpen);
        dispatchUi({ type: 'setSettingsOpen', value: resolved });
    }

    // Input: nextValue (boolean or updater function)
    // Purpose: updates keybind overlay visibility through reducer dispatch.
    function setKeybindOpen(nextValue) {
        const resolved = resolveReducerValue(nextValue, keybindOpen);
        dispatchUi({ type: 'setKeybindOpen', value: resolved });
    }

    // Input: nextValue (boolean or updater function)
    // Purpose: updates active quest overlay visibility through reducer dispatch.
    function setActiveQuestOverlayOpen(nextValue) {
        const resolved = resolveReducerValue(nextValue, activeQuestOverlayOpen);
        dispatchUi({ type: 'setActiveQuestOverlayOpen', value: resolved });
    }

    // Input: nextValue (boolean or updater function)
    // Purpose: syncs first-weapon-upgrade open state across ref and reducer state.
    function setFirstWeaponUpgradeOpen(nextValue) {
        const resolved = resolveReducerValue(nextValue, firstWeaponUpgradeOpen);
        firstWeaponUpgradeOpenRef.current = resolved;
        dispatchUi({
            type: resolved ? 'setFirstWeaponUpgradeOpen' : 'closeFirstWeaponUpgrade'
        });
    }

    // Purpose: closes keybinds overlay.
    function handleKeybindsClose() {
        dispatchUi({ type: 'setKeybindOpen', value: false });
    }

    // Purpose: closes settings overlay.
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
        activeQuestOverlayOpen,
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
        weaponDamage: 0,
        weaponProjectileSpeedBonus: 0,
        weaponCooldownReduction: 0,
        secondaryTurretCooldownReductions: [0, 0],
        secondaryCooldownUpgradeIndex: 0,
        explosiveRadiusBonus: 0,
        swordSwingDurationReduction: 0,
        swordLengthBonus: 0,
        swordArcSpanBonus: 0,
        flailOrbitRadiusBonus: 0,
        flailBallRadiusBonus: 0,
        flailLengthBonus: 0,
        flailSpinSpeedBonus: 0,
        burstProjectileCountBonus: 0,
        burstCooldownPenalty: 0,
        autoClosestTargetingEnabled: false,
        meleeBonusPct: 0,
        projectileBonusPct: 0,
        explosionBonusPct: 0,
        def: 2,
        range: 220,
        pickupRadiusBonus: 0,
        // Additional stats for secondary turrets
        secondaryTurretAngle: 0,
        secondaryTurretTurnSpeed: Math.PI * 1.8,
    });
    const [playerStatsView, setPlayerStatsView] = useState(playerStatsRef.current);

    const materialsRef = useRef(1000);
    const [materialsView, setMaterialsView] = useState(0);
    const advancedDropsRef = useRef([]);

    const [gameOver, setGameOver] = useState(false);
    const revivesBoughtRef = useRef(0);
    const BASE_REVIVE_COST = 100;

    // Output: numeric revive cost
    // Purpose: computes revive price using exponential scaling by purchases.
    function getReviveCost() {
        return BASE_REVIVE_COST * Math.pow(2, revivesBoughtRef.current);
    }

    // Purpose: starts a fresh run by delegating to hard restart.
    function startNewGame() {
        hardRestartRun()
    }

    // Purpose: resets all runtime refs/state and reseeds initial run entities.
    function hardRestartRun() {
        localStorage.removeItem('frameGameSave');

        const defaultPlayer = { x: 400, y: 300, halfSize: 20, speed: 200 };
        const defaultPlayerStats = {
            alive: true,
            hp: 10,
            maxHP: 10,
            atk: 5,
            weaponDamage: 0,
            weaponProjectileSpeedBonus: 0,
            weaponCooldownReduction: 0,
            secondaryTurretCooldownReductions: [0, 0],
            secondaryCooldownUpgradeIndex: 0,
            explosiveRadiusBonus: 0,
            swordSwingDurationReduction: 0,
            swordLengthBonus: 0,
            swordArcSpanBonus: 0,
            flailOrbitRadiusBonus: 0,
            flailBallRadiusBonus: 0,
            flailLengthBonus: 0,
            flailSpinSpeedBonus: 0,
            burstProjectileCountBonus: 0,
            burstCooldownPenalty: 0,
            autoClosestTargetingEnabled: false,
            meleeBonusPct: 0,
            projectileBonusPct: 0,
            explosionBonusPct: 0,
            def: 2,
            range: 220,
            pickupRadiusBonus: 0,
            secondaryTurretAngle: 0,
            secondaryTurretTurnSpeed: Math.PI * 1.8,
        };

        Object.assign(playerRef.current, defaultPlayer);
        previousPlayerPositionRef.current = { x: defaultPlayer.x, y: defaultPlayer.y };
        cameraRef.current = { x: defaultPlayer.x, y: defaultPlayer.y };

        Object.assign(playerStatsRef.current, defaultPlayerStats);
        setPlayerStatsView({ ...playerStatsRef.current });
        Object.assign(turretRef.current, { ...BASE_TURRET_CONFIG });

        materialsRef.current = 0;
        setMaterialsView(0);
        if (developerMode) {
            materialsRef.current = 1000;
            setMaterialsView(1000);
        }
        killsRef.current = 0;
        setKillsView(0);
        bossesDefeatedRef.current = 0;
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

        upgradeCountsRef.current = 0;
        setShopOpen(false);
        setSettingsOpen(false);
        setKeybindOpen(false);
        setMouseSeekMode(false);
        setScaledEnemiesEnabledSync(false);
        setPacingProfileSync(PROFILE.P2);

        hasChosenAdvancedWeaponRef.current = false;
        setActiveWeaponType('SINGLE');
        dispatchUi({ type: 'setFirstWeaponUpgradeOpen', value: developerMode });
        getQuestSystem().reset();

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

    // Purpose: spends materials to revive player with partial HP.
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


    const enemyArchetypeSpawnConfigRef = useRef(createDefaultEnemyArchetypeSpawnConfig());

    const enemySpawnTimerRef = useRef(0);
    const killsRef = useRef(0);
    const [killsView, setKillsView] = useState(0);
    const enemySpawnConfigRef = useRef({
        startCount: 5, // Hard cap seed count: how many regular enemies are created at game start.
        maxActive: 100, // Hard cap population ceiling: regular enemies cannot exceed this, regardless of difficulty profile.
        spawnInterval: 0.1, // Hard cap spawn floor in seconds: regular refill spawn delay will never go below this value.
    });
    // Input: kills count
    // Output: difficulty profile object `{ maxActive, spawnInterval, profileSpawnInterval, hp, atk, def }`
    // Purpose: derives scaled spawn pacing and enemy stats with global hard caps.
    function getDifficultyFromKills(kills) {
        const d = DIFFICULTY_PROFILES[pacingProfileRef.current]; // Active pacing profile config (P1/P2/P3).
        const effectiveKills = scaledEnemiesEnabledRef.current ? kills : 0; // Disable progression scaling when toggle is OFF.

        const extraActive = Math.floor(effectiveKills / d.killsPerExtraActive); // How many +1 population steps unlocked by kills.
        const profileMaxActive = Math.min(d.maxActiveCap, d.maxActiveBase + extraActive); // Profile-driven max active enemies before global hard cap.

        const spawnStepCount = Math.floor(effectiveKills / d.killsPerSpawnStep); // How many spawn-rate acceleration steps unlocked by kills.
        const scaledProfileSpawnInterval = Math.max(
            d.spawnIntervalMin, // Profile floor: prevents interval from going below this value.
            d.spawnIntervalBase - spawnStepCount * d.spawnStep // Linear reduction: base - (steps * stepSize).
        );
        const profileSpawnInterval = d.spawnIntervalBase; // Initial profile spawn rate (before scaling).


        const hp = d.enemyHpBase + Math.floor(effectiveKills / d.killsPerHpStep) * d.hpStep; // Enemy HP scaling.
        const atk = d.enemyAtkBase + Math.floor(effectiveKills / d.killsPerAtkStep) * d.atkStep; // Enemy ATK scaling.
        const def = d.enemyDefBase + Math.floor(effectiveKills / d.killsPerDefStep) * d.defStep; // Enemy DEF scaling.

        // Apply absolute game-level limits from enemySpawnConfigRef:
        // 1) maxActive is clamped DOWN by hard cap (cannot exceed hard limit)
        // 2) spawnInterval is clamped UP by hard floor (cannot become faster than this)
        const maxActive = Math.min(enemySpawnConfigRef.current.maxActive, profileMaxActive); // Final allowed active count.
        const spawnInterval = Math.max(enemySpawnConfigRef.current.spawnInterval, scaledProfileSpawnInterval); // Final refill delay (seconds).

        return { maxActive, spawnInterval, profileSpawnInterval, hp, atk, def };
    }
    const enemySystemRef = useRef(null);

    // Output: enemy system instance
    // Purpose: lazily creates and returns enemy subsystem with shared refs/callbacks.
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
                callbacks: {
                    emitEvent: emitGameEvent,
                },
            });
        }
        return enemySystemRef.current;
    }

    // Input: kills count
    // Output: archetype id
    // Purpose: wrapper for enemy-system archetype selection.
    function pickRandomEnemyArchetype(kills) {
        return getEnemySystem().pickRandomEnemyArchetype(kills);
    }

    // Input: player object, stat override map, and archetype
    // Output: enemy entity object
    // Purpose: wrapper for enemy-system enemy factory.
    function createEnemy(player, statOverrides = {}, archetype = ENEMY_ARCHETYPES.NORMAL) {
        return getEnemySystem().createEnemy(player, statOverrides, archetype);
    }

    // Input: dt (seconds)
    // Purpose: updates enemy AI simulation.
    function updateEnemyAi(dt) {
        getEnemySystem().updateEnemyAi(dt);
    }

    // Input: dt (seconds), canvas
    // Purpose: updates regular enemy spawn population.
    function updateEnemyPopulation(dt, canvas) {
        getEnemySystem().updateEnemyPopulation(dt);
    }


    const bossConfigRef = useRef(createDefaultBossConfig());
    const bossSpawnTimerRef = useRef(0);
    const [bossesDefeatedView, setBossesDefeatedView] = useState(0);
    const bossesDefeatedRef = useRef(0);

    // Input: dt (seconds), canvas
    // Purpose: updates boss spawn flow.
    function updateBossSpawn(dt, canvas) {
        getEnemySystem().updateBossSpawn(dt);
    }

    // Purpose: removes distant entities through enemy-system culling logic.
    function pruneFarEntities() {
        getEnemySystem().pruneFarEntities();
    }


    const scaledEnemiesEnabledRef = useRef(false);

    // Input: nextValue (boolean or updater function)
    // Purpose: synchronizes scaled-enemies toggle to both ref and reducer state.
    function setScaledEnemiesEnabledSync(nextValue) {
        const resolved =
            typeof nextValue === 'function'
                ? nextValue(scaledEnemiesEnabledRef.current)
                : nextValue;

        scaledEnemiesEnabledRef.current = resolved;
        dispatchUi({ type: 'setScaledEnemies', value: resolved });
    }

    const pacingProfileRef = useRef(PROFILE.P2);

    // Input: nextValue (profile value or updater function)
    // Purpose: synchronizes pacing profile to both ref and reducer state.
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

    // Input: target enemy id (or null)
    // Purpose: keeps target id synchronized between ref and state view.
    function setTargetEnemyId(nextValue) {
        targetEnemyIdRef.current = nextValue;
        setTargetEnemyIdView(nextValue);
    }


    const targetingSystemRef = useRef(null);

    // Output: targeting system instance
    // Purpose: lazily creates and returns targeting subsystem.
    function getTargetingSystem() {
        if (!targetingSystemRef.current) {
            targetingSystemRef.current = createTargetingSystem({
                refs: {
                    playerRef,
                    enemiesRef,
                    targetEnemyIdRef,
                    playerStatsRef,
                },
                callbacks: {
                    setTargetEnemyId: setTargetEnemyId,
                }
            });
        }
        return targetingSystemRef.current;
    }

    // Purpose: validates/corrects active target based on current targeting rules.
    function ensureValidTarget() {
        return getTargetingSystem().ensureValidTarget();
    }

    // Purpose: cycles target selection in reverse distance order.
    function cycleTargetReverseClosestToFarthest() {
        return getTargetingSystem().cycleTargetReverseClosestToFarthest();
    }

    // Purpose: cycles target selection in forward distance order.
    function cycleTargetClosestToFarthest() {
        return getTargetingSystem().cycleTargetClosestToFarthest();
    }

    const firstWeaponUpgradeOpenRef = useRef(firstWeaponUpgradeOpen);

    // Input: damage amount and optional world-space hit position
    // Purpose: applies projectile damage to player and syncs player view state.
    function applyPlayerProjectileDamage(amount, x = playerRef.current.x, y = playerRef.current.y) {
        playerTakeDamage(amount, x, y, true);
        if (playerStatsRef.current.hp <= 0) {
            playerStatsRef.current.alive = false;
        }
        setPlayerStatsView({ ...playerStatsRef.current });
    }

    const progressionSystemRef = useRef(null);

    // Output: progression system instance
    // Purpose: lazily creates and returns progression subsystem.
    function getProgressionSystem() {
        if (!progressionSystemRef.current) {
            progressionSystemRef.current = createProgressionSystem({
                refs: {
                    playerRef,
                    playerStatsRef,
                    turretRef,
                    activeWeaponTypeRef,
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
                    emitEvent: emitGameEvent,
                }
            });
        }
        return progressionSystemRef.current;
    }

    // Input: enemy entity
    // Purpose: single kill side-effect entry for quest and progression updates.
    function onEnemyKilled(enemy) {
        if (!enemy || enemy.__killHandled) {
            return;
        }
        enemy.__killHandled = true;

        getQuestSystem().onEnemyKilled(enemy);
        return getProgressionSystem().onEnemyKilled(enemy);
    }


    // Input: material amount
    // Purpose: delegates material grant to progression system.
    function grantMaterials(amount) {
        return getProgressionSystem().grantMaterials(amount);
    }
    
    // Purpose: updates pickup overlap and advanced drop resolution.
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

    // Output: weapon system instance
    // Purpose: lazily creates and returns weapon subsystem.
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
                    emitEvent: emitGameEvent,
                },
            });
        }

        return weaponSystemRef.current;
    }
    const hasChosenAdvancedWeaponRef = useRef(false);

    // Input: weapon type key
    // Purpose: applies selected advanced weapon and closes first-upgrade overlay.
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

    // Output: active turret config list
    // Purpose: forwards active turret data for render and simulation.
    function getActiveTurrets() {
        return getWeaponSystem().getActiveTurrets();
    }

    // Input: angle in radians
    // Output: normalized angle in radians
    // Purpose: forwards weapon-system angle normalization utility.
    function normalizeAngle(angle) {
        return getWeaponSystem().normalizeAngle(angle);
    }

    // Input: current angle, target angle, optional tolerance
    // Output: boolean aligned flag
    // Purpose: forwards turret alignment check.
    function isTurretAligned(current, target, tolerance = 0.13) {
        return getWeaponSystem().isTurretAligned(current, target, tolerance);
    }

    // --- Unified auto-fire logic for all turrets (main and secondary) ---
    // Input: dt (seconds)
    // Purpose: updates auto-fire decisions for active turrets.
    function updateTurretAutoFire(dt) {
        getWeaponSystem().updateTurretAutoFire(dt);
    }

    // --- Main turret aim and player-controlled fire ---
    // Input: dt (seconds)
    // Purpose: updates player turret aim and manual fire behavior.
    function updateTurret(dt) {
        getWeaponSystem().updateTurret(dt);
    }

    // --- Burst fire handler ---
    // Input: dt (seconds)
    // Purpose: advances burst-fire sequencing/timers.
    function handleBurstFire(dt) {
        getWeaponSystem().handleBurstFire(dt);
    }
    // Input: dt (seconds), canvas
    // Purpose: advances projectile simulation and collision outcomes.
    function updateProjectiles(dt, canvas) {
        return getWeaponSystem().updateProjectiles(dt);
    }


    const keysRef = useRef(new Set());
    const keybinds = useRef(
        {
            shop: "b",
            activeQuestOverlay: "q",
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

    // Input: nextValue (boolean or updater function)
    // Purpose: syncs mouse-seek mode to ref and reducer state.
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

        if (e.key === keybinds.current.activeQuestOverlay) {
            e.preventDefault();
            setActiveQuestOverlayOpen((current) => !current);
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

    // Input: canvas DOM element
    // Output: cleanup function
    // Purpose: registers input listeners and returns disposal callback.
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


    // Input: dt (seconds), canvas
    // Purpose: applies keyboard/mouse movement and world-bound clamping.
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

    // Output: combat system instance
    // Purpose: lazily creates and returns combat subsystem.
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
                    emitEvent: emitGameEvent,
                },
            });
        }
        return combatSystemRef.current;
    }

    // Input: damage amount, world x/y, and player-hit flag
    // Purpose: forwards player damage to combat subsystem.
    function playerTakeDamage(amount, x, y, isPlayer) {
        return getCombatSystem().playerTakeDamage(amount, x, y, isPlayer);
    }

    // Input: enemy entity and hit options
    // Output: combat hit result
    // Purpose: forwards enemy hit resolution to combat subsystem.
    function resolveEnemyHit(enemy, options = {}) {
        return getCombatSystem().resolveEnemyHit(enemy, options);
    }

    // Input: dt (seconds)
    // Purpose: advances melee-weapon simulation.
    function updateMeleeWeapons(dt) {
        return getWeaponSystem().updateMeleeWeapons(dt);
    }

    // Output: melee visual state object
    // Purpose: returns render-facing melee visual data.
    function getMeleeVisualState() {
        return getWeaponSystem().getMeleeVisualState();
    }

    // Input: dt (seconds)
    // Purpose: advances combat simulation step.
    function updateCombat(dt) {
        return getCombatSystem().updateCombat(dt);
    }


    const damageTextsRef = useRef([]); // Array of { id, x, y, text, color, life }
    const shakeRef = useRef(0); // Current shake intensity

    const effectsSystemRef = useRef(null);

    // Output: effects system instance
    // Purpose: lazily creates and returns effects subsystem.
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

    // Input: screen x/y, text, optional color and player-hit flag
    // Purpose: pushes a damage/effect text item and optional shake.
    function triggerEffects(x, y, text, color = "white", isPlayer = false) {
        return getEffectsSystem().triggerEffects(x, y, text, color, isPlayer);
    }

    // Input: world-space x/y and explosion radius
    // Purpose: emits explosion visual effect through effects subsystem.
    function triggerExplosionEffect(worldX, worldY, explosionRadius = 60) {
        return getEffectsSystem().triggerExplosionEffect(worldX, worldY, explosionRadius);
    }

    // Input: dt (seconds)
    // Purpose: advances/decays transient visual effects.
    function updateEffects(dt) {
        return getEffectsSystem().updateEffects(dt);
    }

    const eventQueueRef = useRef([]);

    // Event-driven flow rationale:
    // Input: queued domain events emitted by combat/weapon/enemy/progression systems.
    // Output: deterministic, in-frame side effects and state transitions.
    // Purpose: replace brittle direct cross-system ref coupling with explicit event contracts.
    // Why refactored: direct ref writes from multiple systems made ordering implicit and fragile.
    // Why better now: phase-based event draining keeps causality explicit (combat -> projectiles -> spawn),
    // enables deduping/guard rails in one place, and preserves same-frame correctness without hidden coupling.

    // Input: event envelope `{ type, data }`
    // Purpose: queues domain events for deterministic orchestrator dispatch.
    function emitGameEvent(event) {
        eventQueueRef.current.push(event);
    }

    // Input: spawned enemy or boss entity
    // Purpose: inserts spawned entity once, deduped by id.
    function addSpawnedEnemyIfMissing(spawnedEnemy) {
        if (!spawnedEnemy) return;
        if (!enemiesRef.current.some((enemy) => enemy.id === spawnedEnemy.id)) {
            enemiesRef.current.push(spawnedEnemy);
        }
    }

    // Purpose: processes one queued event batch and routes all supported event types.
    function processGameEvents() {
        if (eventQueueRef.current.length === 0) return;

        const queue = eventQueueRef.current;
        eventQueueRef.current = [];

        for (const evt of queue) {
            if (!evt || !evt.type) continue;

            if (evt.type === 'PLAYER_DAMAGED' || evt.type === 'ENEMY_DAMAGED') {
                const { amount = 0, x = 0, y = 0, color = 'white', isPlayer = false } = evt.data || {};
                const { sx, sy } = worldToScreen(x, y, cameraRef.current, canvasRef.current);
                triggerEffects(sx, sy, `-${amount}`, color, isPlayer);
                continue;
            }

            if (evt.type === 'PLAYER_HIT' || evt.type === 'PLAYER_HIT_BY_PROJECTILE') {
                const { damage = 0, x = playerRef.current.x, y = playerRef.current.y } = evt.data || {};
                applyPlayerProjectileDamage(damage, x, y);
                continue;
            }

            if (evt.type === 'EXPLOSION_TRIGGERED' || evt.type === 'EXPLOSION_OCCURRED') {
                const { x = 0, y = 0, explosionRadius = 60 } = evt.data || {};
                triggerExplosionEffect(x, y, explosionRadius);
                continue;
            }

            if (evt.type === 'ENEMY_KILLED') {
                const enemy = evt.data?.enemy;
                if (!enemy || !enemy.alive) continue;

                // Mark immediately to prevent duplicate reward events in same frame.
                enemy.alive = false;
                enemy.hp = 0;

                onEnemyKilled(enemy);
                continue;
            }

            if (evt.type === 'ENEMY_SPAWNED') {
                addSpawnedEnemyIfMissing(evt.data?.enemy);
                continue;
            }
            //Kept separate from ENEMY_SPAWNED in case we want different handling later (e.g. boss spawn effects, quest triggers, etc.)
            if (evt.type === 'BOSS_SPAWNED') {
                addSpawnedEnemyIfMissing(evt.data?.enemy);
                continue;
            }

            if (evt.type === 'ADVANCED_DROP_PICKED') {
                const { drop, x = 0, y = 0 } = evt.data || {};
                if (drop) {
                    getProgressionSystem().applyAdvancedModifier(drop);
                }

                const { sx, sy } = worldToScreen(x, y, cameraRef.current, canvasRef.current);
                triggerEffects(sx, sy, drop?.label || 'PICKUP', '#34d399', false);
                continue;
            }

        }
    }

    // Input: optional maximum drain passes (default 8)
    // Purpose: drains chained event emissions until queue is stable for the current phase.
    function processGameEventsUntilEmpty(maxPasses = 8) {
        let passes = 0;
        while (eventQueueRef.current.length > 0 && passes < maxPasses) {
            processGameEvents();
            passes += 1;
        }
    }

    // Input: dt (seconds), canvas
    // Purpose: runs event-producing phases in deterministic order with drains between phases.
    // Why better than direct-ref coupling: side effects are explicit, ordered, and centralized,
    // avoiding hidden cross-system mutations and frame-order bugs.
    function runFrameEventPhases(dt, canvas) {
        updateCombat(dt);
        processGameEventsUntilEmpty();

        updateProjectiles(dt, canvas);
        processGameEventsUntilEmpty();

        updateEnemyPopulation(dt, canvas);
        updateBossSpawn(dt, canvas);
        processGameEventsUntilEmpty();
    }


    const runGameFrame = useEffectEvent((dt, canvas) => {
        if (gameOver) return;

        if (!playerStatsRef.current.alive || playerStatsRef.current.hp <= 0) {
            playerStatsRef.current.alive = false;
            setGameOver(true);
            setPlayerStatsView({ ...playerStatsRef.current });
            return;
        }

        if (shopOpen || firstWeaponUpgradeOpen || keybindOpen || settingsOpen || activeQuestOverlayOpen || questSelectionOpen) {
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
        runFrameEventPhases(dt, canvas);


        updateEffects(dt);
    });


    // Input: canvas DOM element
    // Output: cleanup function
    // Purpose: syncs internal canvas size to layout size and observes resize changes.
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
        const loadResult = loadSave(); // <- before enemy spawn so difficulty scaling uses loaded kills
        getQuestSystem().initialize();

        if (!loadResult?.hasEnemies) {
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
        }
        ensureValidTarget();

        const cleanupInput = setupInput(canvas);

        let animFrameId;
        let lastTime = 0;

        // Input: RAF timestamp
        // Output: none
        // Purpose: computes frame dt, advances simulation, and renders one frame.
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

    // Input: upgrade type key and material cost
    // Output: boolean purchase result
    // Purpose: delegates shop upgrade purchase to progression subsystem.
    function applyShopPurchase(upgradeType, cost) {
        return progressionSystemRef.current.applyShopPurchase(upgradeType, cost);
    }
    const liveDifficulty = getDifficultyFromKills(killsRef.current);

    useEffect(() => {
        const handleBeforeUnload = () => {
            const saveFile = {
                player: { ...playerRef.current },
                playerStats: { ...playerStatsRef.current },
                advancedDrops: advancedDropsRef.current.map((drop) => ({ ...drop })),
                enemies: enemiesRef.current.map((enemy) => ({ ...enemy })),
                enemySpawnTimer: enemySpawnTimerRef.current,
                bossSpawnTimer: bossSpawnTimerRef.current,
                targetEnemyId: targetEnemyIdRef.current,
                turretAngle: turretRef.current.angle,
                secondaryTurretAngles: [...secondaryTurretAnglesRef.current],
                upgradeCounts: upgradeCountsRef.current,
                upgradeCost: upgradeCostRef.current,
                revivesBought: revivesBoughtRef.current,
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

    // Output: object with `hasEnemies` boolean
    // Purpose: restores persisted run data into refs/state with compatibility guards.
    function loadSave() {
        try {
            const raw = localStorage.getItem('frameGameSave');
            if (!raw) return { hasEnemies: false };

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
            if (Array.isArray(save.advancedDrops)) {
                advancedDropsRef.current = save.advancedDrops.map((drop) => ({ ...drop }));
            }
            if (Array.isArray(save.enemies)) {
                enemiesRef.current = save.enemies.map((enemy) => ({ ...enemy }));
            }
            if (typeof save.enemySpawnTimer === 'number') {
                enemySpawnTimerRef.current = save.enemySpawnTimer;
            }
            if (typeof save.bossSpawnTimer === 'number') {
                bossSpawnTimerRef.current = save.bossSpawnTimer;
            }
            if (typeof save.targetEnemyId === 'string' || save.targetEnemyId === null) {
                setTargetEnemyId(save.targetEnemyId);
            }
            if (typeof save.turretAngle === 'number') {
                turretRef.current.angle = save.turretAngle;
            }
            if (Array.isArray(save.secondaryTurretAngles)) {
                secondaryTurretAnglesRef.current = [...save.secondaryTurretAngles];
            }
            if (typeof save.upgradeCounts === 'number') {
                upgradeCountsRef.current = Math.max(0, save.upgradeCounts);
            }
            if (typeof save.upgradeCost === 'number') {
                upgradeCostRef.current = Math.max(0, save.upgradeCost);
            }

            if (typeof playerStatsRef.current.weaponDamage !== 'number') playerStatsRef.current.weaponDamage = 0;
            if (typeof playerStatsRef.current.weaponProjectileSpeedBonus !== 'number') playerStatsRef.current.weaponProjectileSpeedBonus = 0;
            if (typeof playerStatsRef.current.weaponCooldownReduction !== 'number') playerStatsRef.current.weaponCooldownReduction = 0;
            if (!Array.isArray(playerStatsRef.current.secondaryTurretCooldownReductions)) {
                const legacyValue = typeof playerStatsRef.current.secondaryTurretCooldownReduction === 'number'
                    ? playerStatsRef.current.secondaryTurretCooldownReduction
                    : 0;
                playerStatsRef.current.secondaryTurretCooldownReductions = [legacyValue, legacyValue];
            }
            if (typeof playerStatsRef.current.secondaryCooldownUpgradeIndex !== 'number') {
                playerStatsRef.current.secondaryCooldownUpgradeIndex = 0;
            }
            if (typeof playerStatsRef.current.explosiveRadiusBonus !== 'number') playerStatsRef.current.explosiveRadiusBonus = 0;
            if (typeof playerStatsRef.current.swordSwingDurationReduction !== 'number') playerStatsRef.current.swordSwingDurationReduction = 0;
            if (typeof playerStatsRef.current.swordLengthBonus !== 'number') playerStatsRef.current.swordLengthBonus = 0;
            if (typeof playerStatsRef.current.swordArcSpanBonus !== 'number') playerStatsRef.current.swordArcSpanBonus = 0;
            if (typeof playerStatsRef.current.flailOrbitRadiusBonus !== 'number') playerStatsRef.current.flailOrbitRadiusBonus = 0;
            if (typeof playerStatsRef.current.flailBallRadiusBonus !== 'number') playerStatsRef.current.flailBallRadiusBonus = 0;
            if (typeof playerStatsRef.current.flailLengthBonus !== 'number') playerStatsRef.current.flailLengthBonus = 0;
            if (typeof playerStatsRef.current.flailSpinSpeedBonus !== 'number') playerStatsRef.current.flailSpinSpeedBonus = 0;
            if (typeof playerStatsRef.current.burstProjectileCountBonus !== 'number') playerStatsRef.current.burstProjectileCountBonus = 0;
            if (typeof playerStatsRef.current.burstCooldownPenalty !== 'number') playerStatsRef.current.burstCooldownPenalty = 0;
            if (typeof playerStatsRef.current.autoClosestTargetingEnabled !== 'boolean') playerStatsRef.current.autoClosestTargetingEnabled = false;
            if (typeof playerStatsRef.current.pickupRadiusBonus !== 'number') playerStatsRef.current.pickupRadiusBonus = 0;
            if (typeof playerStatsRef.current.secondaryTurretTurnSpeed !== 'number') {
                playerStatsRef.current.secondaryTurretTurnSpeed = Math.PI * 1.8;
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

            return { hasEnemies: Array.isArray(save.enemies) && save.enemies.length > 0 };

        } catch (e) {
            console.error('Failed to load save:', e);
            return { hasEnemies: false };
        }
    }

    const [questView, setQuestView] = useState([]);
    const [questChoicesView, setQuestChoicesView] = useState([]);
    const activeQuestsRef = useRef([]);
    const pendingQuestChoicesRef = useRef([]);
    const maxActiveQuestsRef = useRef(3);
    const completedQuestsCountRef = useRef(0);
    const completedQuestDetailsRef = useRef([]);
    const [questSelectionOpen, setQuestSelectionOpen] = useState(false);

    const questSystemRef = useRef(null);
    // Output: quest system instance
    // Purpose: lazily creates and returns quest subsystem and syncs initial quest views.
    function getQuestSystem() {
        if (!questSystemRef.current) {
            questSystemRef.current = createQuestSystem({
                refs: {
                    activeQuestsRef,
                    pendingQuestChoicesRef,
                    maxActiveQuestsRef,
                    bossesDefeatedRef,
                    completedQuestsCountRef,
                    completedQuestDetailsRef,
                },
                callbacks: {
                    setQuestView,
                    setQuestChoicesView,
                    setQuestSelectionOpen,
                    grantMaterials: (amount) => grantMaterials(amount),
                },
            });
            questSystemRef.current.syncView();
            questSystemRef.current.syncChoiceView();
        }
        return questSystemRef.current;
    }
    return (
        <>
            <div className="Frame-Game-1-UI-Row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '4px' }}>

                    <button onClick={() => dispatchUi({ type: 'toggleShop' })}>
                        {shopOpen ? 'Close Shop' : 'Open Shop'}
                    </button>
                    <button onClick={() => setActiveQuestOverlayOpen((open) => !open)}>
                        {activeQuestOverlayOpen ? 'Close Active Quests' : 'Open Active Quests'}
                    </button>
                    <button onClick={() => dispatchUi({ type: 'toggleSettings' })}>
                        {settingsOpen ? 'Close Settings' : 'Open Settings'}
                    </button>
                    <button onClick={() => startNewGame()}>New Game</button>
                </div>
            </div>

            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: 'min(65vh, 600px)',
                }}
            >
                <div className="Frame-Game-1-Active-Quest-Log" style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    zIndex: 10,
                    minWidth: 220,
                    background: 'rgba(17, 24, 39, 0.85)',
                    border: '1px solid #374151',
                    borderRadius: 10,
                    padding: '10px 12px',
                    color: '#f9fafb',
                    fontSize: 13,
                    pointerEvents: 'none',
                }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#e5e7eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quests</div>
                    {questView.map((q) => {
                        const progress = Math.min(q.progress, q.target);
                        return (
                            <div key={q.id} style={{ marginBottom: 6, opacity: q.completed ? 0.6 : 1, lineHeight: 1.4 }}>
                                <div style={{ color: '#f3f4f6' }}>{q.completed ? '✓ ' : ''}{q.label}</div>
                                <div style={{ color: '#9ca3af', fontSize: 12 }}>
                                    {Math.floor(progress)} / {q.target}
                                    {q.reward?.materials ? ` · +${q.reward.materials} mat` : ''}
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
                    playerStatsView={playerStatsView}
                    playerSpeed={playerRef.current.speed}
                    mainTurretTurnSpeed={turretRef.current.turnSpeed}
                    handleShopClose={setShopOpen}
                    upgradeCountsRef={upgradeCountsRef}
                    upgradeCostRef={upgradeCostRef}
                    pacingProfileRef={pacingProfileRef}
                    activeWeaponType={activeWeaponType} />)}

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
                                {developerMode ? (
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


                {activeQuestOverlayOpen && (
                    <div className="Frame-Overlay" style={{ zIndex: 11 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Active Quest Log</h2>
                            <button
                                type="button"
                                className="Frame-Overlay-Close-Button"
                                aria-label="Close quest log"
                                onClick={() => setActiveQuestOverlayOpen(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div style={{ marginBottom: 8, fontSize: 13, color: '#d1d5db' }}>
                            Active: {questView.length} / {maxActiveQuestsRef.current}
                        </div>
                        {questView.length === 0 ? (
                            <div style={{ fontSize: 13, color: '#9ca3af' }}>No active quests.</div>
                        ) : (
                            questView.map((q) => {
                                const progress = Math.min(q.progress, q.target);
                                return (
                                    <div key={q.id} style={{ marginBottom: 8, padding: 8, border: '1px solid #374151', borderRadius: 8 }}>
                                        <div style={{ fontWeight: 600 }}>{q.label}</div>
                                        <div style={{ fontSize: 13, color: '#d1d5db' }}>
                                            {Math.floor(progress)} / {q.target}
                                        </div>
                                        {q.reward?.materials && (
                                            <div style={{ fontSize: 13, color: '#fbbf24', fontWeight: 500 }}>+{q.reward.materials} materials</div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {questSelectionOpen && (
                    <div className="Frame-Overlay" style={{ zIndex: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Choose a Quest</h2>
                        </div>
                        {questChoicesView.map((q) => (
                            <div key={q.id} style={{ marginBottom: 10, padding: 10, border: '1px solid #4b5563', borderRadius: 8 }}>
                                <div style={{ fontWeight: 600, marginBottom: 6 }}>{q.label}</div>
                                {q.reward?.materials && (
                                    <div style={{ fontSize: 13, color: '#fbbf24', fontWeight: 500, marginBottom: 8 }}>+{q.reward.materials} materials</div>
                                )}
                                <button
                                    onClick={() => getQuestSystem().selectQuest(q.id)}
                                    disabled={questView.length >= maxActiveQuestsRef.current}
                                    style={{
                                        alignSelf: 'flex-start',
                                        padding: '6px 18px',
                                        borderRadius: '6px',
                                        border: '1px solid #6b7280',
                                        background: '#374151',
                                        color: '#f9fafb',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        opacity: questView.length >= maxActiveQuestsRef.current ? 0.4 : 1,
                                    }}
                                >
                                    Select
                                </button>
                            </div>
                        ))}
                        {questChoicesView.length === 0 && (
                            <div style={{ fontSize: 13, color: '#9ca3af' }}>No quest choices available.</div>
                        )}
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