import { BASE_TURRET_CONFIG, WEAPON_CONFIGS } from '../../configs/weaponConfigs.js';
import { ENEMY_ARCHETYPES, ARCHETYPE_CONFIGS } from '../../configs/enemyArchetypeConfigs.js';
import { calculateDistance, randomBetween, worldToScreen } from '../../utils/MathUtils.js';

function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
}

const MAX_SWORD_ARC_SPAN = Math.PI * 1.5;

function getBurstDefaults() {
    return WEAPON_CONFIGS.BURST?.[0] || { burstInterval: 0.15, burstCount: 3 };
}

export function createWeaponSystem({
    refs,
    callbacks = {},
}) {
    const {
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
    } = refs;

    const {
        resolveEnemyHit,
        onEnemyKilled,
        onPlayerHit,
        onExplosion,
    } = callbacks;

    function getWeaponTypeKeys() {
        return Object.keys(WEAPON_CONFIGS);
    }

    function getActiveTurrets() {
        return WEAPON_CONFIGS[activeWeaponTypeRef.current] || [];
    }

    function syncWeaponType() {
        const activeTurrets = getActiveTurrets();
        turretCooldownsRef.current = activeTurrets.map(() => ({ fireCooldown: 0 }));
    }

    function isMeleeWeaponType(type) {
        return type === 'SWORD' || type === 'FLAIL';
    }

    function getMainWeaponConfig(type = activeWeaponTypeRef.current) {
        const list = WEAPON_CONFIGS[type] || [];
        return list[0] || null;
    }

    function getPlayerStatValue(key, fallback = 0) {
        const value = playerStatsRef.current?.[key];
        return typeof value === 'number' ? value : fallback;
    }

    function getEffectiveProjectileSpeed(config) {
        return (config.projectileSpeed ?? BASE_TURRET_CONFIG.projectileSpeed) + getPlayerStatValue('weaponProjectileSpeedBonus', 0);
    }

    function getEffectiveCooldown(config, idx) {
        const baseCooldown = config.cooldown ?? BASE_TURRET_CONFIG.cooldown;
        const mainReduction = getPlayerStatValue('weaponCooldownReduction', 0);
        const secondaryReductions = playerStatsRef.current?.secondaryTurretCooldownReductions;
        const secondaryReduction = idx > 0 && Array.isArray(secondaryReductions)
            ? (secondaryReductions[idx - 1] ?? 0)
            : 0;
        const burstPenalty = (activeWeaponTypeRef.current === 'BURST' && idx === 0)
            ? getPlayerStatValue('burstCooldownPenalty', 0)
            : 0;
        return Math.max(0.08, baseCooldown + burstPenalty - mainReduction - secondaryReduction);
    }

    function getEffectiveSwordStats(config) {
        return {
            arcSpan: Math.min(MAX_SWORD_ARC_SPAN, (config.arcSpan ?? (Math.PI * 0.95)) + getPlayerStatValue('swordArcSpanBonus', 0)),
            swingDuration: Math.max(0.06, (config.swingDuration ?? 0.16) - getPlayerStatValue('swordSwingDurationReduction', 0)),
            outerRadiusOffset: (config.outerRadiusOffset ?? 52) + getPlayerStatValue('swordLengthBonus', 0),
            length: (config.length ?? 44) + getPlayerStatValue('swordLengthBonus', 0),
        };
    }

    function getEffectiveFlailStats(config) {
        return {
            orbitRadius: (config.orbitRadius ?? 28) + getPlayerStatValue('flailOrbitRadiusBonus', 0),
            ballRadius: (config.ballRadius ?? 10) + getPlayerStatValue('flailBallRadiusBonus', 0),
            spinSpeed: (config.spinSpeed ?? (Math.PI * 2.2)) + getPlayerStatValue('flailSpinSpeedBonus', 0),
            length: (config.length ?? 40) + getPlayerStatValue('flailLengthBonus', 0),
        };
    }

    function getTargetEnemy() {
        return enemiesRef.current.find((enemy) => enemy.alive && enemy.id === targetEnemyIdRef.current) ?? null;
    }

    function getTargetAngle() {
        const target = getTargetEnemy();
        const player = playerRef.current;

        if (!target) {
            return null;
        }

        return Math.atan2(target.y - player.y, target.x - player.x);
    }

    function getTurretMuzzlePosition(idx) {
        const player = playerRef.current;
        const mainTurret = turretRef.current || BASE_TURRET_CONFIG;
        let angle;
        let length;

        if (idx === 0) {
            angle = mainTurret.angle;
            length = mainTurret.length;
        } else {
            angle = secondaryTurretAnglesRef.current[idx - 1] || 0;
            length = mainTurret.length * 0.7;
        }

        const muzzleDistance = player.halfSize + length;
        return {
            x: player.x + Math.cos(angle) * muzzleDistance,
            y: player.y + Math.sin(angle) * muzzleDistance,
        };
    }

    function getSecondaryTurretTarget(idx, alreadyTargeted) {
        const config = getActiveTurrets()[idx];
        if (!config) {
            return null;
        }

        const player = playerRef.current;
        let closest = null;
        let minDist = Infinity;

        for (const enemy of enemiesRef.current) {
            if (!enemy.alive) continue;
            if (alreadyTargeted.has(enemy.id)) continue;

            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            const range = playerStatsRef.current.range * (config.rangeMultiplier ?? 1);
            if (dist < minDist && dist <= range) {
                closest = enemy;
                minDist = dist;
            }
        }

        return closest;
    }

    function rotateTurretAngle(current, target, turnSpeed, dt) {
        const delta = normalizeAngle(target - current);
        const maxStep = turnSpeed * dt;

        if (Math.abs(delta) <= maxStep) {
            return target;
        }

        return normalizeAngle(current + Math.sign(delta) * maxStep);
    }

    function isTurretAligned(current, target, tolerance = 0.13) {
        return Math.abs(normalizeAngle(target - current)) <= tolerance;
    }

    function getEffectiveRange(config) {
        return playerStatsRef.current.range * (config.rangeMultiplier ?? 1);
    }

    function fireTurret(idx, target) {
        const config = getActiveTurrets()[idx];
        if (!config || !target) return false;
        if (isMeleeWeaponType(activeWeaponTypeRef.current)) return false;

        if (activeWeaponTypeRef.current === 'BURST' && idx === 0) {
            if (!burstStateRef.current.firing) {
                const burstBonus = Math.max(0, Math.floor(getPlayerStatValue('burstProjectileCountBonus', 0)));
                burstStateRef.current.shotsRemaining = (config.burstCount || 3) + burstBonus;
                burstStateRef.current.burstTimer = 0;
                burstStateRef.current.burstInterval = config.burstInterval || 0.15;
                burstStateRef.current.target = target;
                burstStateRef.current.firing = true;
            }
            return true;
        }

        const muzzle = getTurretMuzzlePosition(idx);
        const distance = calculateDistance(muzzle.x, muzzle.y, target.x, target.y);
        const effectiveRange = getEffectiveRange(config);
        if (distance > effectiveRange) return false;

        const speed = getEffectiveProjectileSpeed(config);
        const dirX = (target.x - muzzle.x) / distance;
        const dirY = (target.y - muzzle.y) / distance;

        const projectile = {
            id: crypto.randomUUID(),
            x: muzzle.x,
            y: muzzle.y,
            radius: config.projectileRadius ?? 5,
            vx: dirX * speed,
            vy: dirY * speed,
            damage: config.damage,
            alive: true,
            maxDistance: effectiveRange,
            traveled: 0,
        };

        if (config.projectileType === 'EXPLOSIVE') {
            projectile.projectileType = 'EXPLOSIVE';
            projectile.explosionRadius = (config.explosionRadius || 60) + getPlayerStatValue('explosiveRadiusBonus', 0);
            projectile.radius = 8;
        }

        projectilesRef.current.push(projectile);
        return true;
    }

    function updateTurretAutoFire(dt) {
        if (isMeleeWeaponType(activeWeaponTypeRef.current)) {
            return;
        }

        const activeTurrets = getActiveTurrets();
        if (activeTurrets.length === 0) {
            return;
        }

        const mainTurretAutoFireEnabled = mainTurretAutoFireEnabledRef.current;

        if (mainTurretAutoFireEnabled) {
            const cooldown = Math.max(0, turretCooldownsRef.current[0].fireCooldown - dt);
            if (cooldown > 0) {
                turretCooldownsRef.current[0] = { fireCooldown: cooldown };
            } else {
                const target = getTargetEnemy();
                if (target) {
                    const targetAngle = Math.atan2(target.y - playerRef.current.y, target.x - playerRef.current.x);
                    if (isTurretAligned(turretRef.current.angle, targetAngle, turretRef.current.alignTolerance)) {
                        const fired = fireTurret(0, target);
                        if (fired) {
                            turretCooldownsRef.current[0] = { fireCooldown: getEffectiveCooldown(activeTurrets[0], 0) };
                        }
                    } else {
                        turretCooldownsRef.current[0] = { fireCooldown: 0 };
                    }
                } else {
                    turretCooldownsRef.current[0] = { fireCooldown: 0 };
                }
            }
        } else {
            const cooldown = Math.max(0, turretCooldownsRef.current[0].fireCooldown - dt);
            turretCooldownsRef.current[0] = { fireCooldown: cooldown };
        }

        const newAngles = [...secondaryTurretAnglesRef.current];
        const targetedEnemyIds = new Set();

        for (let idx = 1; idx < activeTurrets.length; idx++) {
            let cooldown = Math.max(0, turretCooldownsRef.current[idx].fireCooldown - dt);
            const target = getSecondaryTurretTarget(idx, targetedEnemyIds);
            if (target) targetedEnemyIds.add(target.id);

            const currentAngle = secondaryTurretAnglesRef.current[idx - 1] || 0;
            const targetAngle = target ? Math.atan2(target.y - playerRef.current.y, target.x - playerRef.current.x) : currentAngle;
            const secondaryTurnSpeed = getPlayerStatValue('secondaryTurretTurnSpeed', Math.PI * 1.8);
            const newAngle = rotateTurretAngle(currentAngle, targetAngle, secondaryTurnSpeed, dt);
            newAngles[idx - 1] = newAngle;

            if (cooldown > 0) {
                turretCooldownsRef.current[idx] = { fireCooldown: cooldown };
                continue;
            }

            if (target && isTurretAligned(newAngle, targetAngle)) {
                const fired = fireTurret(idx, target);
                if (fired) {
                    turretCooldownsRef.current[idx] = { fireCooldown: getEffectiveCooldown(activeTurrets[idx], idx) };
                } else {
                    turretCooldownsRef.current[idx] = { fireCooldown: 0 };
                }
            } else {
                turretCooldownsRef.current[idx] = { fireCooldown: 0 };
            }
        }

        secondaryTurretAnglesRef.current = newAngles;
    }

    function updateTurret(dt) {
        const turret = turretRef.current;
        const targetAngle = getTargetAngle();
        turretCooldownsRef.current[0] = { fireCooldown: Math.max(0, turretCooldownsRef.current[0].fireCooldown - dt) };

        if (targetAngle === null) {
            fireRequestRef.current = false;
            return;
        }

        const delta = normalizeAngle(targetAngle - turret.angle);
        const maxStep = turret.turnSpeed * dt;
        if (Math.abs(delta) <= maxStep) {
            turret.angle = targetAngle;
        } else {
            turret.angle += Math.sign(delta) * maxStep;
            turret.angle = normalizeAngle(turret.angle);
        }

        if (isMeleeWeaponType(activeWeaponTypeRef.current)) {
            return;
        }

        const isAligned = Math.abs(normalizeAngle(targetAngle - turret.angle)) <= turret.alignTolerance;
        if (!mainTurretAutoFireEnabledRef.current && fireRequestRef.current) {
            if (isAligned && turretCooldownsRef.current[0]?.fireCooldown <= 0) {
                if (activeWeaponTypeRef.current === 'BURST') {
                    fireTurret(0, getTargetEnemy());
                    handleBurstFire(dt);
                    fireRequestRef.current = false;
                } else {
                    const fired = fireTurret(0, getTargetEnemy());
                    if (fired) {
                        turretCooldownsRef.current[0] = { fireCooldown: getEffectiveCooldown(getActiveTurrets()[0], 0) };
                    }
                    fireRequestRef.current = false;
                }
            }
        }
    }

    function handleBurstFire(dt) {
        if (activeWeaponTypeRef.current !== 'BURST' || !burstStateRef.current.firing) return;

        burstStateRef.current.burstTimer -= dt;
        while (burstStateRef.current.shotsRemaining > 0 && burstStateRef.current.burstTimer <= 0) {
            const config = getActiveTurrets()[0];
            const muzzle = getTurretMuzzlePosition(0);
            const target = burstStateRef.current.target;

            if (target) {
                const distance = calculateDistance(muzzle.x, muzzle.y, target.x, target.y);
                const effectiveRange = getEffectiveRange(config);
                if (distance <= effectiveRange) {
                    const speed = getEffectiveProjectileSpeed(config);
                    const dirX = (target.x - muzzle.x) / distance;
                    const dirY = (target.y - muzzle.y) / distance;
                    projectilesRef.current.push({
                        id: crypto.randomUUID(),
                        x: muzzle.x,
                        y: muzzle.y,
                        radius: config.projectileRadius ?? 5,
                        vx: dirX * speed,
                        vy: dirY * speed,
                        damage: config.damage,
                        alive: true,
                        maxDistance: effectiveRange,
                        traveled: 0,
                    });
                }
            }

            burstStateRef.current.shotsRemaining -= 1;
            burstStateRef.current.burstTimer += burstStateRef.current.burstInterval;
        }

        if (burstStateRef.current.shotsRemaining <= 0) {
            burstStateRef.current.firing = false;
            turretCooldownsRef.current[0] = { fireCooldown: getEffectiveCooldown(getActiveTurrets()[0], 0) };
        }
    }

    function getMeleeAimAngle() {
        return meleeAimAngleRef.current;
    }

    function isAngleWithinSweep(angle, start, end) {
        const sweep = normalizeAngle(end - start);
        const relative = normalizeAngle(angle - start);
        if (sweep >= 0) {
            return relative >= 0 && relative <= sweep;
        }
        return relative <= 0 && relative >= sweep;
    }

    function trySwordAttack() {
        if (activeWeaponTypeRef.current !== 'SWORD') {
            return false;
        }

        const swordCfg = getMainWeaponConfig('SWORD');
        if (!swordCfg || meleeCooldownsRef.current.cooldown > 0) {
            return false;
        }

        const swordStats = getEffectiveSwordStats(swordCfg);

        const player = playerRef.current;
        const aimAngle = getMeleeAimAngle();
        const arcSpan = swordStats.arcSpan;
        const startAngle = aimAngle - arcSpan * 0.55;
        const endAngle = aimAngle + arcSpan * 0.45;
        const swingDuration = swordStats.swingDuration;
        const innerRadius = player.halfSize + (swordCfg.innerRadiusOffset ?? 6);
        const outerRadius = player.halfSize + swordStats.outerRadiusOffset;

        swordSwingsRef.current.push({
            id: crypto.randomUUID(),
            x: player.x,
            y: player.y,
            innerRadius,
            outerRadius,
            startAngle,
            endAngle,
            duration: swingDuration,
            elapsed: 0,
            life: Math.max(0.18, swingDuration * 1.35),
            weaponDamage: swordCfg.damage ?? 0,
            hitEnemyIds: new Set(),
        });

        meleeCooldownsRef.current.cooldown = Math.max(0.08, (swordCfg.cooldown ?? 0.34) - getPlayerStatValue('weaponCooldownReduction', 0));
        return true;
    }

    function tryFlailAttack() {
        if (activeWeaponTypeRef.current !== 'FLAIL') {
            return false;
        }

        const flailCfg = getMainWeaponConfig('FLAIL');
        if (!flailCfg || meleeCooldownsRef.current.cooldown > 0) {
            return false;
        }

        flailStateRef.current.boosted = true;
        flailStateRef.current.boostTimer = flailCfg.boostDuration ?? 1.1;
        meleeCooldownsRef.current.cooldown = Math.max(0.08, (flailCfg.cooldown ?? 1.25) - getPlayerStatValue('weaponCooldownReduction', 0));
        return true;
    }

    function handleMeleeFireRequest() {
        if (!fireRequestRef.current) {
            return;
        }

        if (activeWeaponTypeRef.current === 'SWORD') {
            trySwordAttack();
            fireRequestRef.current = false;
            return;
        }

        if (activeWeaponTypeRef.current === 'FLAIL') {
            tryFlailAttack();
            fireRequestRef.current = false;
        }
    }

    function hasSwordAutoFireTarget() {
        const swordCfg = getMainWeaponConfig('SWORD');
        if (!swordCfg) return false;

        const player = playerRef.current;
        const aimAngle = getMeleeAimAngle();
        const swordStats = getEffectiveSwordStats(swordCfg);
        const arcSpan = swordStats.arcSpan;
        const startAngle = aimAngle - arcSpan * 0.55;
        const endAngle = aimAngle + arcSpan * 0.45;
        const innerRadius = player.halfSize + (swordCfg.innerRadiusOffset ?? 6);
        const outerRadius = player.halfSize + swordStats.outerRadiusOffset;

        for (const enemy of enemiesRef.current) {
            if (!enemy.alive) continue;
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const dist = Math.hypot(dx, dy);
            const enemyRadius = enemy.halfSize;
            const overlapsAnnulus = dist + enemyRadius >= innerRadius && dist - enemyRadius <= outerRadius;
            if (!overlapsAnnulus) continue;

            const angle = Math.atan2(dy, dx);
            if (isAngleWithinSweep(angle, startAngle, endAngle)) {
                return true;
            }
        }

        return false;
    }

    function hasFlailAutoFireTarget() {
        const flailCfg = getMainWeaponConfig('FLAIL');
        if (!flailCfg) return false;
        const flailStats = getEffectiveFlailStats(flailCfg);

        const player = playerRef.current;
        const flail = flailStateRef.current;
        const anchorAngle = getMeleeAimAngle();
        const flailLength = player.halfSize + flailStats.length;
        const anchor = {
            x: player.x + Math.cos(anchorAngle) * flailLength,
            y: player.y + Math.sin(anchorAngle) * flailLength,
        };
        const orbitRadius = flailStats.orbitRadius;
        const ballRadius = flailStats.ballRadius;

        const a1 = normalizeAngle(anchorAngle + flail.orbitAngle);
        const a2 = normalizeAngle(a1 + Math.PI);
        const balls = [
            { x: anchor.x + Math.cos(a1) * orbitRadius, y: anchor.y + Math.sin(a1) * orbitRadius },
            { x: anchor.x + Math.cos(a2) * orbitRadius, y: anchor.y + Math.sin(a2) * orbitRadius },
        ];

        for (const enemy of enemiesRef.current) {
            if (!enemy.alive) continue;
            for (const ball of balls) {
                const dist = calculateDistance(ball.x, ball.y, enemy.x, enemy.y);
                if (dist <= ballRadius + enemy.halfSize) {
                    return true;
                }
            }
        }

        return false;
    }

    function shouldAutoFireMelee() {
        if (!mainTurretAutoFireEnabledRef.current) return false;
        if (activeWeaponTypeRef.current === 'SWORD') return hasSwordAutoFireTarget();
        if (activeWeaponTypeRef.current === 'FLAIL') return hasFlailAutoFireTarget();
        return false;
    }

    function updateSwordSwings(dt) {
        const swings = swordSwingsRef.current;
        if (!swings.length) return;

        for (const swing of swings) {
            swing.elapsed += dt;
            swing.life -= dt;
            const t = Math.min(1, swing.elapsed / swing.duration);
            const currentEndAngle = swing.startAngle + (swing.endAngle - swing.startAngle) * t;

            for (const enemy of enemiesRef.current) {
                if (!enemy.alive || swing.hitEnemyIds.has(enemy.id)) continue;

                const dx = enemy.x - swing.x;
                const dy = enemy.y - swing.y;
                const dist = Math.hypot(dx, dy);
                const enemyRadius = enemy.halfSize;
                const overlapsAnnulus = dist + enemyRadius >= swing.innerRadius && dist - enemyRadius <= swing.outerRadius;
                if (!overlapsAnnulus) continue;

                const angle = Math.atan2(dy, dx);
                if (!isAngleWithinSweep(angle, swing.startAngle, currentEndAngle)) continue;

                resolveEnemyHit?.(enemy, { sourceType: 'melee', projectileDamage: swing.weaponDamage, weaponMultiplier: 1, minDamage: 1 });
                swing.hitEnemyIds.add(enemy.id);
                if (enemy.hp <= 0) onEnemyKilled?.(enemy);
            }
        }

        swordSwingsRef.current = swings.filter((swing) => swing.life > 0);
    }

    function updateFlail(dt) {
        const flailCfg = getMainWeaponConfig('FLAIL');
        if (!flailCfg) return;
        const flailStats = getEffectiveFlailStats(flailCfg);

        const flail = flailStateRef.current;
        if (flail.boosted) {
            flail.boostTimer = Math.max(0, flail.boostTimer - dt);
            if (flail.boostTimer <= 0) flail.boosted = false;
        }
        flail.orbitAngle = normalizeAngle(flail.orbitAngle + flailStats.spinSpeed * dt);

        for (const enemyId of Object.keys(flail.enemyHitCooldowns)) {
            flail.enemyHitCooldowns[enemyId] = Math.max(0, flail.enemyHitCooldowns[enemyId] - dt);
            if (flail.enemyHitCooldowns[enemyId] <= 0) {
                delete flail.enemyHitCooldowns[enemyId];
            }
        }

        if (activeWeaponTypeRef.current !== 'FLAIL') return;

        const player = playerRef.current;
        const anchorAngle = getMeleeAimAngle();
        const flailLength = player.halfSize + flailStats.length;
        const anchor = {
            x: player.x + Math.cos(anchorAngle) * flailLength,
            y: player.y + Math.sin(anchorAngle) * flailLength,
        };
        const orbitRadius = flailStats.orbitRadius;
        const ballRadius = flailStats.ballRadius;

        const a1 = normalizeAngle(anchorAngle + flail.orbitAngle);
        const a2 = normalizeAngle(a1 + Math.PI);
        const balls = [
            { x: anchor.x + Math.cos(a1) * orbitRadius, y: anchor.y + Math.sin(a1) * orbitRadius },
            { x: anchor.x + Math.cos(a2) * orbitRadius, y: anchor.y + Math.sin(a2) * orbitRadius },
        ];

        for (const enemy of enemiesRef.current) {
            if (!enemy.alive) continue;

            let hit = false;
            for (const ball of balls) {
                const dist = calculateDistance(ball.x, ball.y, enemy.x, enemy.y);
                if (dist <= ballRadius + enemy.halfSize) {
                    hit = true;
                    break;
                }
            }

            if (!hit) continue;
            if ((flail.enemyHitCooldowns[enemy.id] ?? 0) > 0) continue;

            const damageOptions = flail.boosted
                ? { sourceType: 'melee', projectileDamage: flailCfg.damage ?? 0, weaponMultiplier: flailCfg.boostMultiplier ?? 2.5, minDamage: 1 }
                : { sourceType: 'melee', projectileDamage: flailCfg.damage ?? 0, weaponMultiplier: 1, minDamage: 1 };

            resolveEnemyHit?.(enemy, damageOptions);
            flail.enemyHitCooldowns[enemy.id] = flailCfg.contactInterval ?? 0.14;

            if (enemy.hp <= 0) onEnemyKilled?.(enemy);
        }
    }

    function updateMeleeWeapons(dt) {
        if (!isMeleeWeaponType(activeWeaponTypeRef.current)) {
            swordSwingsRef.current = [];
            flailStateRef.current.boosted = false;
            flailStateRef.current.boostTimer = 0;
            return;
        }

        const targetAngle = getTargetAngle() ?? meleeAimAngleRef.current;
        meleeAimAngleRef.current = rotateTurretAngle(meleeAimAngleRef.current, targetAngle, turretRef.current.turnSpeed, dt);
        meleeCooldownsRef.current.cooldown = Math.max(0, meleeCooldownsRef.current.cooldown - dt);

        if (shouldAutoFireMelee()) {
            if (activeWeaponTypeRef.current === 'SWORD') {
                trySwordAttack();
            } else if (activeWeaponTypeRef.current === 'FLAIL') {
                tryFlailAttack();
            }
        }

        handleMeleeFireRequest();
        updateSwordSwings(dt);
        updateFlail(dt);
    }

    function getMeleeVisualState() {
        const player = playerRef.current;
        const currentType = activeWeaponTypeRef.current;
        const currentCfg = getMainWeaponConfig(currentType);

        const swordSwings = swordSwingsRef.current.map((swing) => {
            const t = Math.min(1, swing.elapsed / swing.duration);
            return {
                id: swing.id,
                x: swing.x,
                y: swing.y,
                innerRadius: swing.innerRadius,
                outerRadius: swing.outerRadius,
                startAngle: swing.startAngle,
                currentEndAngle: swing.startAngle + (swing.endAngle - swing.startAngle) * t,
                life: Math.max(0, swing.life / 0.22),
            };
        });

        let swordIdle = null;
        if (currentType === 'SWORD' && currentCfg && swordSwings.length === 0) {
            const swordStats = getEffectiveSwordStats(currentCfg);
            swordIdle = {
                x: player.x,
                y: player.y,
                angle: getMeleeAimAngle(),
                length: swordStats.length,
            };
        }

        let flail = null;
        if (currentType === 'FLAIL' && currentCfg) {
            const flailStats = getEffectiveFlailStats(currentCfg);
            const flailRuntime = flailStateRef.current;
            const anchorAngle = getMeleeAimAngle();
            const flailLength = player.halfSize + flailStats.length;
            const anchor = {
                x: player.x + Math.cos(anchorAngle) * flailLength,
                y: player.y + Math.sin(anchorAngle) * flailLength,
            };
            const a1 = normalizeAngle(anchorAngle + flailRuntime.orbitAngle);
            const a2 = normalizeAngle(a1 + Math.PI);
            flail = {
                active: flailRuntime.boosted,
                player: { x: player.x, y: player.y },
                anchor,
                balls: [
                    { x: anchor.x + Math.cos(a1) * flailStats.orbitRadius, y: anchor.y + Math.sin(a1) * flailStats.orbitRadius },
                    { x: anchor.x + Math.cos(a2) * flailStats.orbitRadius, y: anchor.y + Math.sin(a2) * flailStats.orbitRadius },
                ],
                ballRadius: flailStats.ballRadius,
            };
        }

        return { weaponType: currentType, swordIdle, swordSwings, flail };
    }

    function fireEnemyTurret(enemy, targetPos) {
        const turretCfg = ARCHETYPE_CONFIGS[ENEMY_ARCHETYPES.RANGED].turretConfig;
        const muzzleDistance = enemy.halfSize + (turretCfg.barrelLengthOffset ?? 12);
        const muzzlePos = {
            x: enemy.x + Math.cos(enemy.turretAngle) * muzzleDistance,
            y: enemy.y + Math.sin(enemy.turretAngle) * muzzleDistance,
        };

        const distance = calculateDistance(muzzlePos.x, muzzlePos.y, targetPos.x, targetPos.y);
        if (distance > turretCfg.range) return false;

        const dirX = (targetPos.x - muzzlePos.x) / distance;
        const dirY = (targetPos.y - muzzlePos.y) / distance;
        projectilesRef.current.push({
            id: crypto.randomUUID(),
            x: muzzlePos.x,
            y: muzzlePos.y,
            radius: 5,
            vx: dirX * turretCfg.projectileSpeed,
            vy: dirY * turretCfg.projectileSpeed,
            damage: turretCfg.projectileDamage,
            alive: true,
            maxDistance: turretCfg.range,
            traveled: 0,
            isEnemyProjectile: true,
        });

        return true;
    }

    function updateProjectiles(dt) {
        function detonateProjectile(projectile) {
            const explosionRadius = projectile.explosionRadius || 60;

            for (const affectedEnemy of enemiesRef.current) {
                if (!affectedEnemy.alive) continue;

                const dist = Math.hypot(projectile.x - affectedEnemy.x, projectile.y - affectedEnemy.y);
                if (dist <= explosionRadius + (affectedEnemy.halfSize || 0)) {
                    let falloff = 1;
                    if (dist > explosionRadius * 0.5) {
                        falloff = 0.5 + 0.5 * (explosionRadius - dist) / (explosionRadius * 0.5);
                        falloff = Math.max(0.5, falloff);
                    }
                    resolveEnemyHit?.(affectedEnemy, {
                        sourceType: 'explosion',
                        projectileDamage: projectile.damage * falloff,
                        weaponMultiplier: 1,
                        minDamage: 1,
                    });
                    if (affectedEnemy.hp <= 0) onEnemyKilled?.(affectedEnemy);
                }
            }

            onExplosion?.(projectile.x, projectile.y, explosionRadius);
        }

        for (const projectile of projectilesRef.current) {
            if (!projectile.alive) continue;

            projectile.x += projectile.vx * dt;
            projectile.y += projectile.vy * dt;
            projectile.traveled += Math.hypot(projectile.vx * dt, projectile.vy * dt);

            if (projectile.traveled >= projectile.maxDistance) {
                projectile.alive = false;
                if (projectile.projectileType === 'EXPLOSIVE') {
                    detonateProjectile(projectile);
                }
                continue;
            }

            if (projectile.isEnemyProjectile) {
                const player = playerRef.current;
                const distToPlayer = Math.hypot(projectile.x - player.x, projectile.y - player.y);
                if (distToPlayer <= projectile.radius + player.halfSize) {
                    projectile.alive = false;
                    onPlayerHit?.(projectile.damage);
                }
                continue;
            }

            for (const enemy of enemiesRef.current) {
                if (!enemy.alive) continue;

                const hit =
                    Math.abs(projectile.x - enemy.x) < projectile.radius + enemy.halfSize &&
                    Math.abs(projectile.y - enemy.y) < projectile.radius + enemy.halfSize;

                if (!hit) continue;

                if (projectile.projectileType === 'EXPLOSIVE') {
                    projectile.alive = false;
                    detonateProjectile(projectile);
                } else {
                    projectile.alive = false;
                    resolveEnemyHit?.(enemy, { sourceType: 'projectile', projectileDamage: projectile.damage, weaponMultiplier: 1, minDamage: 1 });
                    if (enemy.hp <= 0) onEnemyKilled?.(enemy);
                }

                break;
            }
        }

        projectilesRef.current = projectilesRef.current.filter((projectile) => projectile.alive);
    }

    return {
        getWeaponTypeKeys,
        getActiveTurrets,
        syncWeaponType,
        isMeleeWeaponType,
        getMainWeaponConfig,
        getTargetEnemy,
        getTargetAngle,
        getTurretMuzzlePosition,
        getSecondaryTurretTarget,
        rotateTurretAngle,
        isTurretAligned,
        getEffectiveRange,
        fireTurret,
        updateTurretAutoFire,
        updateTurret,
        handleBurstFire,
        getMeleeAimAngle,
        isAngleWithinSweep,
        trySwordAttack,
        tryFlailAttack,
        handleMeleeFireRequest,
        hasSwordAutoFireTarget,
        hasFlailAutoFireTarget,
        shouldAutoFireMelee,
        updateSwordSwings,
        updateFlail,
        updateMeleeWeapons,
        getMeleeVisualState,
        updateProjectiles,
        fireEnemyTurret,
        normalizeAngle,
    };
}