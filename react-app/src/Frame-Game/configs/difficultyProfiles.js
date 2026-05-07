export const PROFILE = {
    P1: 'p1', // slow
    P2: 'p2', // default
    P3: 'p3', // chaos
};

export const DIFFICULTY_PROFILES = {
    [PROFILE.P1]: {
        maxActiveBase: 10, maxActiveCap: 15, killsPerExtraActive: 18,
        spawnIntervalBase: 1.8, spawnIntervalMin: 0.9, killsPerSpawnStep: 24, spawnStep: 0.08,
        enemyHpBase: 10, enemyAtkBase: 1, enemyDefBase: 2,
        killsPerHpStep: 10, hpStep: 1,
        killsPerAtkStep: 24, atkStep: 1,
        killsPerDefStep: 32, defStep: 1,
    },
    [PROFILE.P2]: {
        maxActiveBase: 15, maxActiveCap: 30, killsPerExtraActive: 12,
        spawnIntervalBase: 1.5, spawnIntervalMin: 0.45, killsPerSpawnStep: 18, spawnStep: 0.1,
        enemyHpBase: 10, enemyAtkBase: 1, enemyDefBase: 2,
        killsPerHpStep: 6, hpStep: 2,
        killsPerAtkStep: 14, atkStep: 1,
        killsPerDefStep: 22, defStep: 1,
    },
    [PROFILE.P3]: {
        maxActiveBase: 20, maxActiveCap: 40, killsPerExtraActive: 8,
        spawnIntervalBase: 1.2, spawnIntervalMin: 0.25, killsPerSpawnStep: 12, spawnStep: 0.12,
        enemyHpBase: 12, enemyAtkBase: 2, enemyDefBase: 2,
        killsPerHpStep: 4, hpStep: 2,
        killsPerAtkStep: 10, atkStep: 1,
        killsPerDefStep: 18, defStep: 1,
    },
};


export const ENEMY_AI_DIFFICULTY_PROFILES = {
    [PROFILE.P1]: {
        aggroRadius: 280,
        attackRange: 36,
        idleDriftSpeed: 20,
        idleMoveSpeed: 24,
        chaseSpeed: 64,
        strafeAmplitude: 20,
        strafeFrequency: 2.4,
        repathIntervalMin: 1.0,
        repathIntervalMax: 1.8,
        idleMoveSegmentMin: 40,
        idleMoveSegmentMax: 140,
        contactPullSpeed: 86,
        pushOutSpeed: 120,
    },
    [PROFILE.P2]: {
        aggroRadius: 320,
        attackRange: 40,
        idleDriftSpeed: 28,
        idleMoveSpeed: 32,
        chaseSpeed: 78,
        strafeAmplitude: 26,
        strafeFrequency: 3.2,
        repathIntervalMin: 0.8,
        repathIntervalMax: 1.6,
        idleMoveSegmentMin: 50,
        idleMoveSegmentMax: 170,
        contactPullSpeed: 102,
        pushOutSpeed: 148,
    },
    [PROFILE.P3]: {
        aggroRadius: 360,
        attackRange: 46,
        idleDriftSpeed: 34,
        idleMoveSpeed: 40,
        chaseSpeed: 96,
        strafeAmplitude: 34,
        strafeFrequency: 4.1,
        repathIntervalMin: 0.55,
        repathIntervalMax: 1.2,
        idleMoveSegmentMin: 70,
        idleMoveSegmentMax: 230,
        contactPullSpeed: 124,
        pushOutSpeed: 182,
    }
};