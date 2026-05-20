// Shared base turret values extracted from runtime defaults.
export const BASE_TURRET_CONFIG = {
    angle: 0,
    turnSpeed: (25 * Math.PI) / 18,
    length: 26,
    width: 10,
    alignTolerance: 0.12,
    fireCooldown: 0,
    cooldown: 0.35,
    projectileSpeed: 420,
};

export const MAX_SWORD_ARC_SPAN = Math.PI * 1.5;

// Consolidated weapon configuration: each weapon type key maps to an array of turret configs
export const WEAPON_CONFIGS = {
        SINGLE: [
            {
                ...BASE_TURRET_CONFIG,
                damage: 5,
                cooldown: 0.5,
                projectileSpeed: 420,
                spread: 0,
                projectileType: 'STANDARD',
                rangeMultiplier: 1,
            },
        ],
        DOUBLE: [
            {
                ...BASE_TURRET_CONFIG,
                damage: 3,
                cooldown: 0.5,
                projectileSpeed: 420,
                spread: 0,
                projectileType: 'STANDARD',
                rangeMultiplier: 1,
            },
            {
                ...BASE_TURRET_CONFIG,
                damage: 3,
                cooldown: 0.5,
                projectileSpeed: 420,
                spread: 0,
                projectileType: 'STANDARD',
                rangeMultiplier: 0.6,
            },
        ],
        TRIPLE: [
            {
                ...BASE_TURRET_CONFIG,
                damage: 3,
                cooldown: 0.5,
                projectileSpeed: 420,
                spread: 0,
                projectileType: 'STANDARD',
                rangeMultiplier: 1,
            },
            {
                ...BASE_TURRET_CONFIG,
                damage: 3,
                cooldown: 0.5,
                projectileSpeed: 420,
                spread: 0,
                projectileType: 'STANDARD',
                rangeMultiplier: 0.6,
            },
            {
                ...BASE_TURRET_CONFIG,
                damage: 3,
                cooldown: 0.5,
                projectileSpeed: 420,
                spread: 0,
                projectileType: 'STANDARD',
                rangeMultiplier: 0.6,
            },
        ],
        BURST: [
            {
                ...BASE_TURRET_CONFIG,
                damage: 2,
                cooldown: 0.6,
                projectileSpeed: 420,
                burstCount: 3,
                projectileType: 'STANDARD',
                rangeMultiplier: 1,
            },
        ],
        EXPLOSIVE: [
            {
                ...BASE_TURRET_CONFIG,
                damage: 10,
                cooldown: 1.0,
                projectileSpeed: 320,
                explosionRadius: 60,
                projectileType: 'EXPLOSIVE',
                rangeMultiplier: 1,
            },
        ],
        SWORD: [
            {
                ...BASE_TURRET_CONFIG,
                damage: 6,
                projectileType: 'MELEE_SWORD',
                arcSpan: Math.PI * 0.95,
                swingDuration: 0.16,
                cooldown: 0.34,
                innerRadiusOffset: 6,
                outerRadiusOffset: 52,
                length: 44,
            },
        ],
        FLAIL: [
            {
                ...BASE_TURRET_CONFIG,
                damage: 5,
                projectileType: 'MELEE_FLAIL',
                length: 40,
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