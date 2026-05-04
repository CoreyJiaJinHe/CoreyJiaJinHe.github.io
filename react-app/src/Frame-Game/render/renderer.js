import {worldToScreen} from '../utils/MathUtils.js';

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
    //console.log('mainTurretAngle', mainTurretAngle, 'secondaryTurretAngles', secondaryTurretAngles);
    //console.log('turrets:', turrets);
    const mainLength = turrets[0]?.length ?? 26;
    const mainWidth = turrets[0]?.width ?? 10;
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
    } else if (weaponType === 'EXPLOSIVE') {
        drawTurret(mainTurretAngle, { ...turrets[0], isMain: true, tipColor: '#e22' });
    } else {
        drawTurret(mainTurretAngle, { ...turrets[0], isMain: true });
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
    const range = playerStats.range;
    ctx.strokeStyle = 'rgba(154, 209, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, range, 0, Math.PI * 2);
    ctx.stroke();

    // --- ENEMIES ---
    for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const { sx: enemySx, sy: enemySy } = worldToScreen(enemy.x, enemy.y, camera, canvas);
        ctx.fillStyle = '#d64545';
        ctx.fillRect(
            enemySx - enemy.halfSize,
            enemySy - enemy.halfSize,
            enemy.halfSize * 2,
            enemy.halfSize * 2
        );
        const barWidth = enemy.halfSize * 2;
        const barHeight = 6;
        const barX = enemySx - enemy.halfSize;
        const barY = enemySy - enemy.halfSize - 12;
        const healthRatio = enemy.hp / enemy.maxHp;
        ctx.fillStyle = '#222222';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);
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