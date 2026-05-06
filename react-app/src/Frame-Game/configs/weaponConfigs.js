// Consolidated weapon configuration: each weapon type key maps to an array of turret configs
export const WEAPON_CONFIGS = {
        SINGLE: [
            {
                damage: 5,
                // cooldown replaces fireInterval
                projectileSpeed: 420,
                spread: 0,
                projectileType: 'STANDARD',
                rangeMultiplier: 1,
            },
        ],
        DOUBLE: [
            {
                damage: 3,
                projectileSpeed: 420,
                spread: 0,
                projectileType: 'STANDARD',
                rangeMultiplier: 1,
            },
            {
                damage: 3,
                projectileSpeed: 420,
                spread: 0,
                projectileType: 'STANDARD',
                rangeMultiplier: 0.6,
            },
        ],
        TRIPLE: [
            {
                damage: 3,
                projectileSpeed: 420,
                spread: 0,
                projectileType: 'STANDARD',
                rangeMultiplier: 1,
            },
            {
                damage: 3,
                projectileSpeed: 420,
                spread: 0,
                projectileType: 'STANDARD',
                rangeMultiplier: 0.6,
            },
            {
                damage: 3,
                projectileSpeed: 420,
                spread: 0,
                projectileType: 'STANDARD',
                rangeMultiplier: 0.6,
            },
        ],
        BURST: [
            {
                damage: 2,
                projectileSpeed: 420,
                burstCount: 3,
                projectileType: 'STANDARD',
                rangeMultiplier: 1,
            },
        ],
        EXPLOSIVE: [
            {
                damage: 10,
                projectileSpeed: 320,
                explosionRadius: 60,
                projectileType: 'EXPLOSIVE',
                rangeMultiplier: 1,
            },
        ],
        SWORD: [
            {
                damage: 6,
                projectileType: 'MELEE_SWORD',
                // Swing/arc config
                arcSpan: Math.PI * 0.95,
                swingDuration: 0.16,
                cooldown: 0.34,
                innerRadiusOffset: 6,
                outerRadiusOffset: 52,
                // Renderer config
                idleLength: 44,
            },
        ],
        FLAIL: [
            {
                damage: 5,
                projectileType: 'MELEE_FLAIL',
                // Stick + orbit config
                stickLength: 40,
                orbitRadius: 28,
                ballRadius: 10,
                spinSpeed: Math.PI * 2.2,
                boostDuration: 1.1,
                boostMultiplier: 2.5,
                cooldown: 1.25,
                contactInterval: 0.14,
            },
        ],
    };