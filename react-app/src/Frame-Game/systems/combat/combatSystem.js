import { squaresOverlap, worldToScreen } from '../../utils/MathUtils.js';
import { ENEMY_ARCHETYPES, ARCHETYPE_CONFIGS } from '../../configs/enemyArchetypeConfigs.js';





export function createCombatSystem({
    refs,
    callbacks = {},
}) {
    const {
        playerRef,
        playerStatsRef,
        //targetEnemyIdRef,
        enemiesRef,
        projectilesRef,

        cameraRef,
        canvasRef,
    } = refs;


    const {
        setPlayerStatsView,
        onEnemyKilled,
        // setTargetEnemyId,
        triggerEffects,
        // getAliveEnemiesSortedByDistance,
    } = callbacks;

    function playerTakeDamage(amount, x, y, isPlayer) {
        playerStatsRef.current.hp = Math.max(0, playerStatsRef.current.hp - amount);
        const { sx, sy } = worldToScreen(playerRef.current.x, playerRef.current.y, cameraRef.current, canvasRef.current);
        triggerEffects(sx, sy, `-${amount}`, isPlayer ? "red" : "white", isPlayer);
    }

    function enemyTakeDamage(enemy, amount) {
        enemy.hp -= amount;
        const { sx, sy } = worldToScreen(enemy.x, enemy.y, cameraRef.current, canvasRef.current);
        triggerEffects(sx, sy, `-${amount}`, '#ffcc00');
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


    function updateCombat(dt) {
        const p = playerRef.current;
        const playerStats = playerStatsRef.current;

        // const targetAlive = enemiesRef.current.some(
        //     (enemy) => enemy.alive && enemy.id === targetEnemyIdRef.current
        // );
        // if (!targetAlive) {
        //     const sorted = getAliveEnemiesSortedByDistance();
        //     setTargetEnemyId(sorted.length ? sorted[0].id : null);
        // }

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


    return {
        playerTakeDamage,
        resolveEnemyHit,
        updateCombat,
    }
}