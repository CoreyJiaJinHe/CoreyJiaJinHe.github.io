import { useRef, useState } from 'react';
import { PROFILE, DIFFICULTY_PROFILES } from '../utils/difficultyProfiles.js';

function useEnemySystem(playerRef) {
    const difficultyProfilesRef = useRef(DIFFICULTY_PROFILES);


    const enemiesRef = useRef([]);
    const enemySpawnConfigRef = useRef({
        startCount: 5,
        maxActive: 10,
        spawnInterval: 1.5, // seconds between refill spawns
    });

    const enemySpawnTimerRef = useRef(0);

    const [killsView, setKillsView] = useState(0);
    const killsRef = useRef(0);

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


    function getDifficultyFromKills(kills) {
        const d = difficultyProfilesRef.current[pacingProfileRef.current];
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

    function createEnemy(canvasWidth, canvasHeight, player, statOverrides = {}) {
        const halfSize = 18;
        let x = 0;
        let y = 0;
        let attempts = 0;

        do {
            x = randomBetween(halfSize, canvasWidth - halfSize);
            y = randomBetween(halfSize, canvasHeight - halfSize);
            attempts += 1;
        } while (
            Math.hypot(x - player.x, y - player.y) < 140 &&
            attempts < 50
        );

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
        };
    }
    function getActiveEnemyCount() {
        return enemiesRef.current.reduce((count, enemy) => {
            return count + (enemy.alive ? 1 : 0);
        }, 0);
    }


    function randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }

    function updateEnemyPopulation(dt, canvas) {
        const y = killsRef.current;
        const scaled = getDifficultyFromKills(y);
        const activeCount = getActiveEnemyCount();

        if (activeCount >= scaled.maxActive) {
            enemySpawnTimerRef.current = 0;
            return;
        }

        enemySpawnTimerRef.current += dt;

        if (enemySpawnTimerRef.current >= scaled.spawnInterval) {
            enemySpawnTimerRef.current = 0;

            enemiesRef.current.push(
                createEnemy(canvas.width, canvas.height, playerRef.current, {
                    hp: scaled.hp,
                    atk: scaled.atk,
                    def: scaled.def,
                })
            );
        }
    }

    return {
        // Refs the main loop needs to read/write directly
        enemiesRef,
        killsRef,
        enemySpawnConfigRef,

        // State for UI display
        killsView,
        scaledEnemiesEnabled,
        pacingProfile,

        // Functions the main loop calls each frame
        updateEnemyPopulation,
        getDifficultyFromKills,

        // Functions the UI calls
        setKillsView,
        setScaledEnemiesEnabledSync,
        setPacingProfileSync,

        // Needed by other hooks (boss system needs this)
        createEnemy,
        pacingProfileRef,
        scaledEnemiesEnabledRef,
        difficultyProfilesRef,
    };

}


export default useEnemySystem