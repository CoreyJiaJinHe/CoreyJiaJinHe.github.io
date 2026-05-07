// Enemy archetype configurations
export const ENEMY_ARCHETYPES = {
    NORMAL: 'NORMAL',
    ARMORED: 'ARMORED',
    SPAWNER: 'SPAWNER',
    SWARM: 'SWARM',
    SPEEDSTER: 'SPEEDSTER',
    RANGED: 'RANGED',
};

export const ARCHETYPE_CONFIGS = {
    [ENEMY_ARCHETYPES.NORMAL]: {
        hpMultiplier: 1,
        atkMultiplier: 1,
        defMultiplier: 1,
        speedMultiplier: 1,
        sizeMultiplier: 1,
        color: '#d64545',
        borderColor: '#a03030',
    },
    [ENEMY_ARCHETYPES.ARMORED]: {
        hpMultiplier: 1.5,
        atkMultiplier: 1,
        defMultiplier: 2,
        speedMultiplier: 0.7,
        sizeMultiplier: 1.2,
        color: '#d64545',
        borderColor: '#4a7c9e',
        shieldHealth: 5,
        shieldColor: '#4a7c9e',
        shieldAlpha: 0.3,
        shieldOutlinePadding: 2,
        shieldOutlineWidth: 2,
        damageReductionWhileShielded: 0.9, // 90% damage reduction (only 1 per hit effectively)
    },
    [ENEMY_ARCHETYPES.SPAWNER]: {
        hpMultiplier: 2,
        atkMultiplier: 0,
        defMultiplier: 1,
        speedMultiplier: 0.5,
        sizeMultiplier: 1.5,
        color: '#f59e0b',
        borderColor: '#6b4f7b',
        satelliteColor: '#f59e0b',
        satelliteAlpha: 0.6,
        satelliteLinkColor: '#6b4f7b',
        satelliteLinkWidth: 2,
        satelliteDistanceMultiplier: 2,
        satelliteSizeMultiplier: 0.5,
        spawnInterval: 3, // seconds between spawn attempts
        swarmCap: 5, // max swarm-type enemies spawned by this spawner
        swarmRetentionDistance: 150, // swarm-type must stay within this distance
        swarmStatsOverride: {
            hpMultiplier: 0.6,
            atkMultiplier: 0.8,
            defMultiplier: 0.5,
            speedMultiplier: 1.2,
        },
        aggroRadiusMultiplier: 1.5,
    },
    [ENEMY_ARCHETYPES.SWARM]: {
        hpMultiplier: 0.6,
        atkMultiplier: 0.8,
        defMultiplier: 0.5,
        speedMultiplier: 1.2,
        sizeMultiplier: 0.7,
        color: '#d97706',
        borderColor: '#7b6b4b',
        // Swarm-type enemies link their aggro to the spawner
    },
    [ENEMY_ARCHETYPES.SPEEDSTER]: {
        hpMultiplier: 0.6,
        atkMultiplier: 1.2,
        defMultiplier: 0.7,
        speedMultiplier: 1.8,
        sizeMultiplier: 0.9,
        color: '#ec4899',
        borderColor: '#d97706',
        directionIndicatorLineWidth: 2,
        directionIndicatorLengthOffset: 6,
        // Speedsters move in straight lines only, 8 cardinal/diagonal directions
        // No strafe or jitter movement
    },
    [ENEMY_ARCHETYPES.RANGED]: {
        hpMultiplier: 1.2,
        atkMultiplier: 0,
        defMultiplier: 0.8,
        speedMultiplier: 0.8,
        sizeMultiplier: 1.1,
        color: '#8b5cf6',
        borderColor: '#8b5cf6',
        turretConfig: {
            projectileDamage: 2,
            projectileSpeed: 250,
            cooldown: 1.2,
            range: 180,
            turnSpeed: Math.PI * 0.8,
            alignTolerance: 0.15,
            rangeIndicatorStrokeColor: 'rgba(154, 209, 255, 0.25)',
            rangeIndicatorLineWidth: 2,
            barrelLengthOffset: 8,
            barrelLineWidth: 3,
        },
    },
};
