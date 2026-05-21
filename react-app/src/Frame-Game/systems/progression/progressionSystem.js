
import { squareOverlapsCircle,  } from '../../utils/MathUtils.js';
import { WEAPON_CONFIGS, MAX_SWORD_ARC_SPAN} from '../../configs/weaponConfigs.js';

export function createProgressionSystem({
    refs,
    callbacks = {},
}) {

    const {
        playerRef,
        playerStatsRef,
        turretRef,
        activeWeaponTypeRef,

        advancedDropsRef,
        materialsRef,
        killsRef,
        bossesDefeatedRef,
        firstWeaponUpgradeOpenRef

    } = refs;

    const {
        setMaterialsView,
        setKillsView,
        setBossesDefeatedView,
        setPlayerStatsView,
        setFirstWeaponUpgradeOpen,
    } = callbacks;






    function grantMaterials(amount) {
        materialsRef.current += amount;
        setMaterialsView(materialsRef.current);
    }

    function maybeSpawnAdvancedDrop(x, y) {
        const chance = 0.2; // 20%
        if (Math.random() > chance) {
            return;
        }

        const modifiers = [
            { stat: 'atk', amount: 1, label: '+ATK' },
            { stat: 'def', amount: 1, label: '+DEF' },
            { stat: 'range', amount: 20, label: '+RANGE' },
            { stat: 'maxHP', amount: 2, label: '+MAX HP' },
            { stat: 'speed', amount: 20, label: '+SPEED' },
        ];

        const mod = modifiers[Math.floor(Math.random() * modifiers.length)];

        advancedDropsRef.current.push({
            id: crypto.randomUUID(),
            x,
            y,
            radius: 8,
            ...mod,
            alive: true,
        });
    }

    function applyAdvancedModifier(drop) {
        const stats = playerStatsRef.current;
        const player = playerRef.current;

        if (drop.stat === 'atk') stats.atk += drop.amount;
        if (drop.stat === 'def') stats.def += drop.amount;
        if (drop.stat === 'range') stats.range += drop.amount;
        if (drop.stat === 'maxHP') {
            stats.maxHP += drop.amount;
            stats.hp = Math.min(stats.maxHP, stats.hp + drop.amount);
        }
        if (drop.stat === 'speed') player.speed += drop.amount;

        setPlayerStatsView({ ...stats });
    }

    function updateAdvancedDrops() {
        const p = playerRef.current;

        for (const drop of advancedDropsRef.current) {
            if (!drop.alive) continue;

            if (!squareOverlapsCircle(p, drop)) {
                continue;
            }

            drop.alive = false;
            applyAdvancedModifier(drop);
        }

        advancedDropsRef.current = advancedDropsRef.current.filter((d) => d.alive);
    }

    function onEnemyKilled(enemy) {
        enemy.hp = 0;
        enemy.alive = false;
        killsRef.current += 1;
        setKillsView(killsRef.current);
        // Basic material: auto-loot
        grantMaterials(1);

        // Advanced drop: rare physical pickup
        maybeSpawnAdvancedDrop(enemy.x, enemy.y);
        if (enemy.isBoss) {
            grantMaterials(4);
            bossesDefeatedRef.current += 1;
            setBossesDefeatedView(bossesDefeatedRef.current);
            if (bossesDefeatedRef.current === 1) {
                setFirstWeaponUpgradeOpen(true);
                firstWeaponUpgradeOpenRef.current = true;
            }
        }
    }

    function applyShopPurchase(upgradeType, cost) {
        const activeWeaponType = activeWeaponTypeRef.current;
        let purchased = true;

        if (upgradeType === 'range') {
            playerStatsRef.current.range += 20;
        }
        else if (upgradeType === 'atk') {
            playerStatsRef.current.atk += 1;
        }
        else if (upgradeType === 'def') {
            playerStatsRef.current.def += 1;
        }
        else if (upgradeType === 'maxHP') {
            playerStatsRef.current.maxHP += 2;
            playerStatsRef.current.hp += 2;
        }
        else if (upgradeType === 'speed') {
            playerRef.current.speed += 20;

        }
        else if (upgradeType === 'heal') {
            if (playerStatsRef.current.hp >= playerStatsRef.current.maxHP) {
                purchased = false;
            } else {
            playerStatsRef.current.hp = Math.min(playerStatsRef.current.maxHP, playerStatsRef.current.hp + 10);
        }
        else if (upgradeType === 'weaponTurnSpeed') {
            turretRef.current.turnSpeed += Math.PI / 18;
            playerStatsRef.current.secondaryTurretTurnSpeed += Math.PI / 18;
        }
        else if (upgradeType === 'projectileSpeed') {
            if (activeWeaponType !== 'SWORD' && activeWeaponType !== 'FLAIL') {
                playerStatsRef.current.weaponProjectileSpeedBonus += 20;
            } else {
                purchased = false;
            }
        }
        else if (upgradeType === 'weaponCooldown') {
            const mainWeaponConfig = WEAPON_CONFIGS[activeWeaponType]?.[0] ?? {};
            const cooldownFloor = mainWeaponConfig.cooldownFloor ?? 0.08;
            const baseCooldown = mainWeaponConfig.cooldown ?? 0;
            const burstPenalty = activeWeaponType === 'BURST' ? (playerStatsRef.current.burstCooldownPenalty ?? 0) : 0;
            const currentReduction = playerStatsRef.current.weaponCooldownReduction ?? 0;
            const currentCooldown = Math.max(cooldownFloor, baseCooldown + burstPenalty - currentReduction);

            if (currentCooldown <= cooldownFloor + 0.0001) {
                purchased = false;
            } else {
                const remaining = currentCooldown - cooldownFloor;
                playerStatsRef.current.weaponCooldownReduction += Math.min(0.03, remaining);
            }
        }
        else if (upgradeType === 'secondaryWeaponCooldown0') {
            if (activeWeaponType === 'DOUBLE' || activeWeaponType === 'TRIPLE') {
                const secondaryConfig = WEAPON_CONFIGS[activeWeaponType]?.[1];
                const cooldownFloor = secondaryConfig?.cooldownFloor ?? 0.08;
                const baseCooldown = secondaryConfig?.cooldown;
                if (typeof baseCooldown !== 'number') {
                    purchased = false;
                } else {
                const reductions = [...(playerStatsRef.current.secondaryTurretCooldownReductions ?? [0, 0])];
                    const currentCooldown = Math.max(cooldownFloor, baseCooldown - (reductions[0] ?? 0));

                    if (currentCooldown <= cooldownFloor + 0.0001) {
                        purchased = false;
                    } else {
                        const remaining = currentCooldown - cooldownFloor;
                        reductions[0] = (reductions[0] ?? 0) + Math.min(0.03, remaining);
                        playerStatsRef.current.secondaryTurretCooldownReductions = reductions;
                    }
                }
            } else {
                purchased = false;
            }
        }
        else if (upgradeType === 'secondaryWeaponCooldown1') {
            if (activeWeaponType === 'TRIPLE') {
                const secondaryConfig = WEAPON_CONFIGS[activeWeaponType]?.[2];
                const cooldownFloor = secondaryConfig?.cooldownFloor ?? 0.08;
                const baseCooldown = secondaryConfig?.cooldown;
                if (typeof baseCooldown !== 'number') {
                    purchased = false;
                } else {
                const reductions = [...(playerStatsRef.current.secondaryTurretCooldownReductions ?? [0, 0])];
                    const currentCooldown = Math.max(cooldownFloor, baseCooldown - (reductions[1] ?? 0));

                    if (currentCooldown <= cooldownFloor + 0.0001) {
                        purchased = false;
                    } else {
                        const remaining = currentCooldown - cooldownFloor;
                        reductions[1] = (reductions[1] ?? 0) + Math.min(0.03, remaining);
                        playerStatsRef.current.secondaryTurretCooldownReductions = reductions;
                    }
                }
            } else {
                purchased = false;
            }
        }
        else if (upgradeType === 'weaponDamage') {
            playerStatsRef.current.weaponDamage += 1;
        }
        else if (upgradeType === 'explosionRadius') {
            if (activeWeaponType === 'EXPLOSIVE') {
                playerStatsRef.current.explosiveRadiusBonus += 8;
            } else {
                purchased = false;
            }
        }
        else if (upgradeType === 'swordSwingSpeed') {
            if (activeWeaponType === 'SWORD') {
                const swordConfig = WEAPON_CONFIGS.SWORD?.[0] ?? {};
                const swingFloor = swordConfig.swingDurationFloor ?? 0.06;
                const baseSwing = swordConfig.swingDuration ?? 0.16;
                const currentReduction = playerStatsRef.current.swordSwingDurationReduction ?? 0;
                const currentSwing = Math.max(swingFloor, baseSwing - currentReduction);

                if (currentSwing <= swingFloor + 0.0001) {
                    purchased = false;
                } else {
                    const remaining = currentSwing - swingFloor;
                    playerStatsRef.current.swordSwingDurationReduction += Math.min(0.01, remaining);
                }
            } else {
                purchased = false;
            }
        }
        else if (upgradeType === 'swordLength') {
            if (activeWeaponType === 'SWORD') {
                playerStatsRef.current.swordLengthBonus += 8;
            } else {
                purchased = false;
            }
        }
        else if (upgradeType === 'swordArcSize') {
            if (activeWeaponType === 'SWORD') {
                const baseArc = WEAPON_CONFIGS.SWORD?.[0]?.arcSpan ?? (Math.PI * 0.95);
                const currentArc = baseArc + (playerStatsRef.current.swordArcSpanBonus ?? 0);

                if (currentArc >= MAX_SWORD_ARC_SPAN) {
                    purchased = false;
                } else {
                    const upgradeStep = Math.PI * 0.06;
                    const remaining = MAX_SWORD_ARC_SPAN - currentArc;
                    playerStatsRef.current.swordArcSpanBonus += Math.min(upgradeStep, remaining);
                }
            } else {
                purchased = false;
            }
        }
        else if (upgradeType === 'flailSize') {
            if (activeWeaponType === 'FLAIL') {
                playerStatsRef.current.flailOrbitRadiusBonus += 4;
                playerStatsRef.current.flailBallRadiusBonus += 2;
                playerStatsRef.current.flailLengthBonus += 5;
            } else {
                purchased = false;
            }
        }
        else if (upgradeType === 'flailSpinSpeed') {
            if (activeWeaponType === 'FLAIL') {
                playerStatsRef.current.flailSpinSpeedBonus += Math.PI * 0.2;
            } else {
                purchased = false;
            }
        }
        else if (upgradeType === 'burstProjectileCount') {
            if (activeWeaponType === 'BURST') {
                playerStatsRef.current.burstProjectileCountBonus += 1;
                playerStatsRef.current.burstCooldownPenalty += 0.06;
            } else {
                purchased = false;
            }
        }
        else if (upgradeType === 'autoClosestTargeting') {
            if (playerStatsRef.current.autoClosestTargetingEnabled) {
                purchased = false;
            } else {
                playerStatsRef.current.autoClosestTargetingEnabled = true;
            }
        }
        else {
            console.log('Error has occured with purchasing your shop upgrade.');
            purchased = false;
        }

        if (purchased) {
            materialsRef.current -= cost;
            setMaterialsView(materialsRef.current);
            setPlayerStatsView({ ...playerStatsRef.current });
        }

        return purchased;
    }







    return{
        grantMaterials,
        maybeSpawnAdvancedDrop,
        applyAdvancedModifier,
        updateAdvancedDrops,
        onEnemyKilled,
        applyShopPurchase
    }


}