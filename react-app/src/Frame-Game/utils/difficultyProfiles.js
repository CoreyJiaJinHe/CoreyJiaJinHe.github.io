export const PROFILE = {
    P1: 'p1', // slow
    P2: 'p2', // default
    P3: 'p3', // chaos
};

export const DIFFICULTY_PROFILES = {
    [PROFILE.P1]: {
        maxActiveBase: 8, maxActiveCap: 14, killsPerExtraActive: 18,
        spawnIntervalBase: 1.8, spawnIntervalMin: 0.9, killsPerSpawnStep: 24, spawnStep: 0.08,
        enemyHpBase: 10, enemyAtkBase: 1, enemyDefBase: 2,
        killsPerHpStep: 10, hpStep: 1,
        killsPerAtkStep: 24, atkStep: 1,
        killsPerDefStep: 32, defStep: 1,
    },
    [PROFILE.P2]: {
        maxActiveBase: 10, maxActiveCap: 20, killsPerExtraActive: 12,
        spawnIntervalBase: 1.5, spawnIntervalMin: 0.45, killsPerSpawnStep: 18, spawnStep: 0.1,
        enemyHpBase: 10, enemyAtkBase: 1, enemyDefBase: 2,
        killsPerHpStep: 6, hpStep: 2,
        killsPerAtkStep: 14, atkStep: 1,
        killsPerDefStep: 22, defStep: 1,
    },
    [PROFILE.P3]: {
        maxActiveBase: 12, maxActiveCap: 28, killsPerExtraActive: 8,
        spawnIntervalBase: 1.2, spawnIntervalMin: 0.25, killsPerSpawnStep: 12, spawnStep: 0.12,
        enemyHpBase: 12, enemyAtkBase: 2, enemyDefBase: 2,
        killsPerHpStep: 4, hpStep: 2,
        killsPerAtkStep: 10, atkStep: 1,
        killsPerDefStep: 18, defStep: 1,
    },
};