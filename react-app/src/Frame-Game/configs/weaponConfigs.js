// Consolidated weapon configuration: each weapon type key maps to an array of turret configs
export const WEAPON_CONFIGS = {
        SINGLE: [
            {
                damage: 5,
                fireInterval: 0.5,
                projectileSpeed: 420,
                spread: 0,
                projectileType: 'STANDARD',
                rangeMultiplier: 1,
            },
        ],
        DOUBLE: [
            {
                damage: 3,
                fireInterval: 0.5,
                projectileSpeed: 420,
                spread: 0,
                projectileType: 'STANDARD',
                rangeMultiplier: 1,
            },
            {
                damage: 3,
                fireInterval: 0.5,
                projectileSpeed: 420,
                spread: 0,
                projectileType: 'STANDARD',
                rangeMultiplier: 0.6,
            },
        ],
        TRIPLE: [
            {
                damage: 3,
                fireInterval: 0.5,
                projectileSpeed: 420,
                spread: 0,
                projectileType: 'STANDARD',
                rangeMultiplier: 1,
            },
            {
                damage: 3,
                fireInterval: 0.5,
                projectileSpeed: 420,
                spread: 0,
                projectileType: 'STANDARD',
                rangeMultiplier: 0.6,
            },
            {
                damage: 3,
                fireInterval: 0.5,
                projectileSpeed: 420,
                spread: 0,
                projectileType: 'STANDARD',
                rangeMultiplier: 0.6,
            },
        ],
        BURST: [
            {
                damage: 2,
                fireInterval: 0.6,
                projectileSpeed: 420,
                burstCount: 3,
                projectileType: 'STANDARD',
                rangeMultiplier: 1,
            },
        ],
        EXPLOSIVE: [
            {
                damage: 10,
                fireInterval: 1.0,
                projectileSpeed: 320,
                explosionRadius: 60,
                projectileType: 'EXPLOSIVE',
                rangeMultiplier: 1,
            },
        ],
    };