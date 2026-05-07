import {worldToScreen} from '../utils/MathUtils.js';
import { ENEMY_ARCHETYPES, ARCHETYPE_CONFIGS } from '../configs/enemyArchetypeConfigs.js';

function drawScene(ctx, canvas, gameState) {
    const {
        player,
        playerStats,
        camera,
        enemies,
        projectiles,
        advancedDrops,
        turrets,
        mainTurretAngle,
        secondaryTurretAngles,
        targetEnemyId,
        weaponType,
        meleeVisuals,
    } = gameState;

    // --- BACKGROUND ---
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- PLAYER ---
    const { sx, sy } = worldToScreen(player.x, player.y, camera, canvas);
    ctx.fillStyle = '#4a9eff';
    ctx.fillRect(
        sx - player.halfSize,
        sy - player.halfSize,
        player.halfSize * 2,
        player.halfSize * 2
    );

    // --- MELEE VISUALS ---
    // Only show idle sword if not swinging
    if (meleeVisuals?.swordIdle && (!meleeVisuals?.swordSwings || meleeVisuals.swordSwings.length === 0)) {
        const swordOrigin = worldToScreen(meleeVisuals.swordIdle.x, meleeVisuals.swordIdle.y, camera, canvas);
        const swordTip = {
            sx: swordOrigin.sx + Math.cos(meleeVisuals.swordIdle.angle) * meleeVisuals.swordIdle.length,
            sy: swordOrigin.sy + Math.sin(meleeVisuals.swordIdle.angle) * meleeVisuals.swordIdle.length,
        };
        ctx.save();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(swordOrigin.sx, swordOrigin.sy);
        ctx.lineTo(swordTip.sx, swordTip.sy);
        ctx.stroke();
        ctx.restore();
    }

    // Show sweeping blade during swing (use last swordSwings entry)
    if (meleeVisuals?.swordSwings && meleeVisuals.swordSwings.length > 0) {
        const swing = meleeVisuals.swordSwings[meleeVisuals.swordSwings.length - 1];
        const swordOrigin = worldToScreen(swing.x, swing.y, camera, canvas);
        const t = Math.min(1, swing.life); // already normalized in getMeleeVisualState
        const bladeAngle = swing.currentEndAngle;
        const bladeLength = 44; // match idleLength default
        const swordTip = {
            sx: swordOrigin.sx + Math.cos(bladeAngle) * bladeLength,
            sy: swordOrigin.sy + Math.sin(bladeAngle) * bladeLength,
        };
        ctx.save();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(swordOrigin.sx, swordOrigin.sy);
        ctx.lineTo(swordTip.sx, swordTip.sy);
        ctx.stroke();
        ctx.restore();
    }

    if (meleeVisuals?.swordSwings?.length) {
        for (const swing of meleeVisuals.swordSwings) {
            const center = worldToScreen(swing.x, swing.y, camera, canvas);
            ctx.save();
            ctx.globalAlpha = Math.max(0.12, Math.min(0.9, swing.life));
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            // Outer arc (fan edge)
            ctx.moveTo(center.sx, center.sy);
            ctx.arc(center.sx, center.sy, swing.outerRadius, swing.startAngle, swing.currentEndAngle, swing.currentEndAngle < swing.startAngle);
            // Inner arc (back to center)
            ctx.lineTo(center.sx + Math.cos(swing.currentEndAngle) * swing.innerRadius, center.sy + Math.sin(swing.currentEndAngle) * swing.innerRadius);
            ctx.arc(center.sx, center.sy, swing.innerRadius, swing.currentEndAngle, swing.startAngle, true);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    if (meleeVisuals?.flail) {
        const playerPoint = worldToScreen(meleeVisuals.flail.player.x, meleeVisuals.flail.player.y, camera, canvas);
        const anchor = worldToScreen(meleeVisuals.flail.anchor.x, meleeVisuals.flail.anchor.y, camera, canvas);
        const ballA = worldToScreen(meleeVisuals.flail.balls[0].x, meleeVisuals.flail.balls[0].y, camera, canvas);
        const ballB = worldToScreen(meleeVisuals.flail.balls[1].x, meleeVisuals.flail.balls[1].y, camera, canvas);

        ctx.save();
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(playerPoint.sx, playerPoint.sy);
        ctx.lineTo(anchor.sx, anchor.sy);
        ctx.stroke();

        ctx.strokeStyle = meleeVisuals.flail.active ? '#fbbf24' : '#64748b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(anchor.sx, anchor.sy);
        ctx.lineTo(ballA.sx, ballA.sy);
        ctx.moveTo(anchor.sx, anchor.sy);
        ctx.lineTo(ballB.sx, ballB.sy);
        ctx.stroke();

        const br = meleeVisuals.flail.ballRadius;
        ctx.fillStyle = meleeVisuals.flail.active ? '#fde68a' : '#94a3b8';
        ctx.beginPath();
        ctx.arc(ballA.sx, ballA.sy, br, 0, Math.PI * 2);
        ctx.arc(ballB.sx, ballB.sy, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    const isMeleeWeapon = weaponType === 'SWORD' || weaponType === 'FLAIL';

    // --- TURRETS ---
    function drawTurret(angle, config) {
        // Use main turret's length/width as base
        const baseLength = turrets[0]?.length ?? 26;
        const baseWidth = turrets[0]?.width ?? 10;
        const isMain = config.isMain;
        const length = isMain ? baseLength : baseLength * 0.7;
        const width = isMain ? baseWidth : baseWidth * 0.7;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle + (config.baseOffset || 0));
        ctx.strokeStyle = isMain ? '#9ad1ff' : '#7a9abf';
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(player.halfSize + length, 0);
        ctx.stroke();
        if (config.tipColor) {
            ctx.beginPath();
            ctx.arc(player.halfSize + length, 0, isMain ? 6 : 4, 0, Math.PI * 2);
            ctx.fillStyle = config.tipColor;
            ctx.fill();
        }
        ctx.restore();
    }

    if (!isMeleeWeapon) {
        // --- Draw secondary turret ranges ---
        for (let idx = 1; idx < turrets.length; idx++) {
            const config = turrets[idx];
            const angle = secondaryTurretAngles[idx - 1] || 0;
            const range = playerStats.range * (config.rangeMultiplier ?? 1);
            ctx.save();
            ctx.strokeStyle = 'rgba(122, 154, 191, 0.18)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.arc(sx, sy, range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // --- Draw main turret and secondaries ---
        if (weaponType === 'DOUBLE') {
            drawTurret(mainTurretAngle, { ...turrets[0], isMain: true });
            drawTurret(secondaryTurretAngles[0] || 0, { isMain: false, baseOffset: 0.25 });
        } else if (weaponType === 'TRIPLE') {
            drawTurret(mainTurretAngle, { ...turrets[0], isMain: true });
            drawTurret(secondaryTurretAngles[0] || 0, { isMain: false, baseOffset: 0.25 });
            drawTurret(secondaryTurretAngles[1] || 0, { isMain: false, baseOffset: -0.25 });
        } else if (weaponType === 'BURST') {
            drawTurret(mainTurretAngle, { ...turrets[0], isMain: true, tipColor: '#222' });
        } else if (weaponType === 'EXPLOSIVE' || weaponType === 'SINGLE') {
            drawTurret(mainTurretAngle, { ...turrets[0], isMain: true, tipColor: weaponType === 'EXPLOSIVE' ? '#e22' : undefined });
        }
    }

    // --- PROJECTILES ---
    for (const projectile of projectiles) {
        const { sx: projectileSx, sy: projectileSy } = worldToScreen(projectile.x, projectile.y, camera, canvas);
        ctx.fillStyle = '#ffd54a';
        ctx.beginPath();
        ctx.arc(projectileSx, projectileSy, projectile.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // --- MAIN TURRET RANGE ---
    if (!isMeleeWeapon) {
        const range = playerStats.range;
        ctx.strokeStyle = 'rgba(154, 209, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, range, 0, Math.PI * 2);
        ctx.stroke();
    }

    // --- ENEMIES ---
    for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const { sx: enemySx, sy: enemySy } = worldToScreen(enemy.x, enemy.y, camera, canvas);
        const archetypeCfg = ARCHETYPE_CONFIGS[enemy.archetype] ?? ARCHETYPE_CONFIGS[ENEMY_ARCHETYPES.NORMAL];

        // Draw archetype-specific visuals
        if (enemy.archetype === ENEMY_ARCHETYPES.ARMORED && enemy.shieldHealth > 0) {
            // Draw shield overlay
            ctx.save();
            ctx.globalAlpha = archetypeCfg.shieldAlpha ?? 0.3;
            ctx.strokeStyle = archetypeCfg.shieldColor ?? archetypeCfg.borderColor ?? archetypeCfg.color;
            ctx.lineWidth = archetypeCfg.shieldOutlineWidth;
            const shieldPadding = archetypeCfg.shieldOutlinePadding;
            ctx.strokeRect(
                enemySx - enemy.halfSize - shieldPadding,
                enemySy - enemy.halfSize - shieldPadding,
                enemy.halfSize * 2 + shieldPadding * 2,
                enemy.halfSize * 2 + shieldPadding * 2
            );
            ctx.restore();
        }

        if (enemy.archetype === ENEMY_ARCHETYPES.SPAWNER) {
            // Draw spawner: large center square + 4 satellite squares
            ctx.save();
            ctx.fillStyle = archetypeCfg.color;
            ctx.fillRect(
                enemySx - enemy.halfSize,
                enemySy - enemy.halfSize,
                enemy.halfSize * 2,
                enemy.halfSize * 2
            );
            
            // Draw 4 satellites at fixed radius with random (persisted) angles from the enemy instance.
            const offset = enemy.halfSize * archetypeCfg.satelliteDistanceMultiplier;
            const satSize = enemy.halfSize * archetypeCfg.satelliteSizeMultiplier;
            const satColor = archetypeCfg.satelliteColor ?? archetypeCfg.color;
            const satAlpha = archetypeCfg.satelliteAlpha ?? 1;
            const satelliteLinkColor = archetypeCfg.satelliteLinkColor ?? archetypeCfg.borderColor ?? archetypeCfg.color;
            const satelliteLinkWidth = archetypeCfg.satelliteLinkWidth;
            const satelliteAngles = enemy.spawnerSatelliteAngles ?? [];
            for (const a of satelliteAngles) {
                const sx = enemySx + Math.cos(a) * offset;
                const sy = enemySy + Math.sin(a) * offset;

                // Connector line from spawner core to satellite.
                ctx.save();
                ctx.strokeStyle = satelliteLinkColor;
                ctx.lineWidth = satelliteLinkWidth;
                ctx.beginPath();
                ctx.moveTo(enemySx, enemySy);
                ctx.lineTo(sx, sy);
                ctx.stroke();
                ctx.restore();

                ctx.save();
                ctx.globalAlpha = satAlpha;
                ctx.fillStyle = satColor;
                ctx.fillRect(sx - satSize, sy - satSize, satSize * 2, satSize * 2);
                ctx.restore();
            }
            
            ctx.restore();
        } else if (enemy.archetype === ENEMY_ARCHETYPES.SPEEDSTER) {
            // Draw speedster with directional indicator
            ctx.save();
            ctx.fillStyle = archetypeCfg.color;
            ctx.fillRect(
                enemySx - enemy.halfSize,
                enemySy - enemy.halfSize,
                enemy.halfSize * 2,
                enemy.halfSize * 2
            );
            
            // Draw movement direction arrow
            if (enemy.speedsterDirection) {
                ctx.save();
                ctx.strokeStyle = archetypeCfg.borderColor ?? archetypeCfg.color;
                ctx.lineWidth = archetypeCfg.directionIndicatorLineWidth;
                const arrowLen = enemy.halfSize + archetypeCfg.directionIndicatorLengthOffset;
                const ax = enemySx + enemy.speedsterDirection.x * arrowLen;
                const ay = enemySy + enemy.speedsterDirection.y * arrowLen;
                ctx.beginPath();
                ctx.moveTo(enemySx, enemySy);
                ctx.lineTo(ax, ay);
                ctx.stroke();
                ctx.restore();
            }
            
            ctx.restore();
        } else if (enemy.archetype === ENEMY_ARCHETYPES.SWARM) {
            // Draw smaller swarm enemy with slightly lighter color
            ctx.save();
            ctx.fillStyle = archetypeCfg.color;
            ctx.fillRect(
                enemySx - enemy.halfSize,
                enemySy - enemy.halfSize,
                enemy.halfSize * 2,
                enemy.halfSize * 2
            );
            ctx.restore();
        } else if (enemy.archetype === ENEMY_ARCHETYPES.RANGED) {
            const turretCfg = archetypeCfg.turretConfig ?? {};

            // Draw ranged enemy attack range using config values.
            if ((turretCfg.range ?? 0) > 0) {
                ctx.save();
                ctx.strokeStyle = turretCfg.rangeIndicatorStrokeColor;
                ctx.lineWidth = turretCfg.rangeIndicatorLineWidth;
                ctx.beginPath();
                ctx.arc(enemySx, enemySy, turretCfg.range, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // Draw ranged enemy with turret
            ctx.save();
            ctx.fillStyle = archetypeCfg.color;
            ctx.fillRect(
                enemySx - enemy.halfSize,
                enemySy - enemy.halfSize,
                enemy.halfSize * 2,
                enemy.halfSize * 2
            );
            
            // Draw turret barrel
            const turretLen = enemy.halfSize + turretCfg.barrelLengthOffset;
            ctx.strokeStyle = archetypeCfg.borderColor ?? archetypeCfg.color;
            ctx.lineWidth = turretCfg.barrelLineWidth;
            ctx.beginPath();
            ctx.moveTo(enemySx, enemySy);
            ctx.lineTo(
                enemySx + Math.cos(enemy.turretAngle) * turretLen,
                enemySy + Math.sin(enemy.turretAngle) * turretLen
            );
            ctx.stroke();
            
            ctx.restore();
        } else {
            // NORMAL archetype
            ctx.save();
            ctx.fillStyle = archetypeCfg.color;
            ctx.fillRect(
                enemySx - enemy.halfSize,
                enemySy - enemy.halfSize,
                enemy.halfSize * 2,
                enemy.halfSize * 2
            );
            ctx.restore();
        }

        // Health bar (same for all archetypes)
        const barWidth = enemy.halfSize * 2;
        const barHeight = 6;
        const barX = enemySx - enemy.halfSize;
        const barY = enemySy - enemy.halfSize - 12;
        const healthRatio = enemy.hp / enemy.maxHp;
        ctx.fillStyle = '#222222';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);

        // Shield health bar for armored
        if (enemy.archetype === ENEMY_ARCHETYPES.ARMORED && enemy.shieldHealth > 0) {
            // Use per-enemy max shield so bar remains correct if shield values scale over time.
            const maxShield = enemy.maxShieldHealth
                ?? ARCHETYPE_CONFIGS[ENEMY_ARCHETYPES.ARMORED]?.shieldHealth
                ?? Math.max(1, enemy.shieldHealth);
            const shieldRatio = Math.max(0, Math.min(1, enemy.shieldHealth / Math.max(1, maxShield)));
            const barY2 = barY - 8;
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(barX, barY2, barWidth, barHeight);
            ctx.fillStyle = archetypeCfg.shieldColor ?? archetypeCfg.borderColor ?? archetypeCfg.color;
            ctx.fillRect(barX, barY2, barWidth * shieldRatio, barHeight);
        }

        // Target highlight
        if (enemy.id === targetEnemyId) {
            const pad = 4;
            ctx.strokeStyle = '#ff3b3b';
            ctx.lineWidth = 3;
            ctx.strokeRect(
                enemySx - enemy.halfSize - pad,
                enemySy - enemy.halfSize - pad,
                enemy.halfSize * 2 + pad * 2,
                enemy.halfSize * 2 + pad * 2
            );
        }
    }

    // --- ADVANCED DROPS ---
    for (const drop of advancedDrops) {
        const { sx: dropSx, sy: dropSy } = worldToScreen(drop.x, drop.y, camera, canvas);
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(dropSx, dropSy, drop.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#6b21a8';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // --- MARKERS (offscreen, bosses, drops) ---
    const markerTargets = [
        ...advancedDrops
            .filter((drop) => drop.alive)
            .map((drop) => ({
                id: drop.id,
                x: drop.x,
                y: drop.y,
                color: '#f59e0b',
                ringOffset: 44,
                size: 12,
            })),
        ...enemies
            .filter((enemy) => enemy.alive && enemy.isBoss)
            .map((boss) => ({
                id: boss.id,
                x: boss.x,
                y: boss.y,
                color: '#ef4444',
                ringOffset: 64,
                size: 14,
            })),
    ];

    drawEffects(ctx, gameState.damageTexts, gameState.shake, player, camera, canvas);
    drawOffscreenMarkers(ctx, canvas, camera, player, markerTargets);

}

function drawEffects(ctx, effects, shake, player, camera, canvas) {
    // Apply shake transform for world rendering only
    if (shake > 0) {
        const sx = (Math.random() - 0.5) * shake;
        const sy = (Math.random() - 0.5) * shake;
        ctx.setTransform(1, 0, 0, 1, sx, sy);
    } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Draw floating damage/explosion text
    for (const textObj of effects) {
        if (textObj.explosionRadius) {
            // Draw explosion effect (radial gradient recommended)
            ctx.save();
            ctx.globalAlpha = Math.max(0, textObj.life);
            ctx.beginPath();
            ctx.arc(textObj.x, textObj.y, textObj.explosionRadius, 0, Math.PI * 2);
            ctx.fillStyle = textObj.color || '#ffb347';
            ctx.fill();
            ctx.restore();
        }
        if (textObj.text) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, textObj.life);
            ctx.font = 'bold 18px Arial';
            ctx.fillStyle = textObj.color || 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(textObj.text, textObj.x, textObj.y);
            ctx.restore();
        }
    }

    // Reset transform before overlays
    ctx.setTransform(1, 0, 0, 1, 0, 0);
}


function drawOffscreenMarkers(ctx, canvas, camera, player, targets) {
    const { sx: playerSx, sy: playerSy } = worldToScreen(player.x, player.y, camera, canvas);

    for (const target of targets) {
        const { sx: targetSx, sy: targetSy } = worldToScreen(target.x, target.y, camera, canvas);

        // Check if on screen
        const padding = 12;
        if (
            targetSx >= -padding &&
            targetSx <= canvas.width + padding &&
            targetSy >= -padding &&
            targetSy <= canvas.height + padding
        ) {
            continue; // Skip if on screen
        }

        // Calculate direction and clamp to edge
        const dx = targetSx - playerSx;
        const dy = targetSy - playerSy;
        const angle = Math.atan2(dy, dx);

        // Place marker at edge of screen in direction of target
        const edgeDist = Math.min(canvas.width, canvas.height) / 2 - (target.size || 12);
        const mx = playerSx + Math.cos(angle) * edgeDist;
        const my = playerSy + Math.sin(angle) * edgeDist;

        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(angle);

        ctx.fillStyle = target.color || '#fff';
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(target.size, 0);
        ctx.lineTo(-target.size * 0.7, target.size * 0.65);
        ctx.lineTo(-target.size * 0.7, -target.size * 0.65);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}


export { drawScene, drawEffects, drawOffscreenMarkers };