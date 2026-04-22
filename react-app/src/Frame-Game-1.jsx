import { useEffect, useRef, useState } from 'react';
import ToggleableSwitchComponent from './components/ToggleComponent'


function FrameGame1() {
    const canvasRef = useRef(null);
    const playerRef = useRef({ x: 400, y: 300, halfSize: 20, speed: 200 });
    const playerStatsRef = useRef({
        alive: true,
        hp: 10,
        maxHP: 10,
        atk: 5,
        def: 2,
        range: 220,
    });
    const [playerStatsView, setPlayerStatsView] = useState(playerStatsRef.current);

    

    const materialsRef = useRef(0);
    const [materialsView, setMaterialsView] = useState(0);
    const advancedDropsRef = useRef([]);

    const targetEnemyIdRef = useRef(null);
    const [targetEnemyIdView, setTargetEnemyIdView] = useState(null);
    const tabPressedRef = useRef(false);
    const enemiesRef = useRef([]);

    function createEnemy(canvasWidth, canvasHeight, player) {
        const halfSize = 18;
        let x = 0;
        let y = 0;
        let attempts = 0;

        do {
            x = randomBetween(halfSize, canvasWidth - halfSize);
            y = randomBetween(halfSize, canvasHeight - halfSize);
            attempts += 1;
        } while (
            Math.hypot(x - player.x, y - player.y) < 140 &&
            attempts < 50
        );

        return {
            id: crypto.randomUUID(),
            x,
            y,
            halfSize,
            hp: 10,
            maxHp: 10,
            atk: 1,
            def: 2,
            alive: true,
            damagePlayerCooldown: 0,
            takeDamageCooldown: 0,
        };
    }



    function randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }


    const keysRef = useRef(new Set());
    const mouseSeekModeRef = useRef(false);
    const mouseRef = useRef({ x: 0, y: 0, inside: false });

    function setMouseSeekMode(nextValue) {
        mouseSeekModeRef.current =
            typeof nextValue === 'function'
                ? nextValue(mouseSeekModeRef.current)
                : nextValue;
    }
    function getAliveEnemiesSortedByDistance() {
        const p = playerRef.current;
        return enemiesRef.current
            .filter((enemy) => enemy.alive)
            .sort((a, b) => {
                const da = (a.x - p.x) ** 2 + (a.y - p.y) ** 2;
                const db = (b.x - p.x) ** 2 + (b.y - p.y) ** 2;
                return da - db; // closest first
            });
    }

    function cycleTargetClosestToFarthest() {
        const sorted = getAliveEnemiesSortedByDistance();

        if (sorted.length === 0) {
            setTargetEnemyId(null);
            return;
        }
        const closestId = sorted[0].id;
        const currentId = targetEnemyIdRef.current;
        const currentIndex = sorted.findIndex((enemy) => enemy.id === currentId);

        // If no target or target is not closest, snap to closest first.
        if (currentIndex === -1 || currentId !== closestId) {
            setTargetEnemyId(closestId);
            return;
        }

        // Already on closest: now cycle forward.
        const nextIndex = (currentIndex + 1) % sorted.length;
        setTargetEnemyId(sorted[nextIndex].id);
    }

    function setTargetEnemyId(nextValue) {
        targetEnemyIdRef.current = nextValue;
        setTargetEnemyIdView(nextValue);
    }

    function onEnemyKilled(enemy) {
        enemy.hp = 0;
        enemy.alive = false;

        // Basic material: auto-loot
        grantMaterials(1);

        // Advanced drop: rare physical pickup
        maybeSpawnAdvancedDrop(enemy.x, enemy.y);

        if (enemy.id === targetEnemyIdRef.current) {
            setTargetEnemyId(null);
        }
    }
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

    const turretRef = useRef({
        angle: 0,
        turnSpeed: Math.PI * 1.4,
        length: 26,
        width: 10,
        alignTolerance: 0.12,
        fireCooldown: 0,
        fireInterval: 0.35,
    });

    const projectilesRef = useRef([]);
    const fireRequestRef = useRef(false);
    function normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }

    function getTargetEnemy() {
        return enemiesRef.current.find(
            (enemy) => enemy.alive && enemy.id === targetEnemyIdRef.current
        ) ?? null;
    }

    function getTargetAngle() {
        const target = getTargetEnemy();
        const p = playerRef.current;

        if (!target) {
            return null;
        }

        return Math.atan2(target.y - p.y, target.x - p.x);
    }

    function getTurretMuzzlePosition() {
        const p = playerRef.current;
        const turret = turretRef.current;
        const muzzleDistance = p.halfSize + turret.length;

        return {
            x: p.x + Math.cos(turret.angle) * muzzleDistance,
            y: p.y + Math.sin(turret.angle) * muzzleDistance,
        };
    }
    function getDistanceFromMuzzleToTarget(target) {
        const muzzle = getTurretMuzzlePosition();
        const dx = target.x - muzzle.x;
        const dy = target.y - muzzle.y;
        return Math.hypot(dx, dy);
    }

    function spawnProjectileTowardTarget() {
        const target = getTargetEnemy();
        if (!target) {
            return;
        }

        const muzzle = getTurretMuzzlePosition();
        const dx = target.x - muzzle.x;
        const dy = target.y - muzzle.y;
        const distance = Math.hypot(dx, dy);

        const maxRange = playerStatsRef.current.range;

        if (distance <= 0.001 || distance > maxRange) {
            return false;
        }

        const speed = 420;
        const dirX = dx / distance;
        const dirY = dy / distance;

        projectilesRef.current.push({
            id: crypto.randomUUID(),
            x: muzzle.x,
            y: muzzle.y,
            radius: 5,
            vx: dirX * speed,
            vy: dirY * speed,
            damage: Math.max(1, playerStatsRef.current.atk),
            alive: true,
            maxDistance: maxRange,
            traveled: 0,
        });
        return true;
    }

    function updateTurret(dt) {
        const turret = turretRef.current;
        const targetAngle = getTargetAngle();

        turret.fireCooldown = Math.max(0, turret.fireCooldown - dt);

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

        const remainingDelta = Math.abs(normalizeAngle(targetAngle - turret.angle));
        const isAligned = remainingDelta <= turret.alignTolerance;

        if (fireRequestRef.current && isAligned && turret.fireCooldown <= 0) {
        const fired = spawnProjectileTowardTarget();
        fireRequestRef.current = false;

        if (fired) {
            turret.fireCooldown = turret.fireInterval;
        }
    }
    }

    function updateProjectiles(dt, canvas) {
        for (const projectile of projectilesRef.current) {
            if (!projectile.alive) {
                continue;
            }

            projectile.x += projectile.vx * dt;
            projectile.y += projectile.vy * dt;

            const stepDistance = Math.hypot(projectile.vx * dt, projectile.vy * dt);
            projectile.traveled += stepDistance;

            if (projectile.traveled >= projectile.maxDistance) {
                projectile.alive = false;
                continue;
            }

            if (
                projectile.x < -20 ||
                projectile.x > canvas.width + 20 ||
                projectile.y < -20 ||
                projectile.y > canvas.height + 20
            ) {
                projectile.alive = false;
                continue;
            }

            for (const enemy of enemiesRef.current) {
                if (!enemy.alive) {
                    continue;
                }

                const hit =
                    Math.abs(projectile.x - enemy.x) < projectile.radius + enemy.halfSize &&
                    Math.abs(projectile.y - enemy.y) < projectile.radius + enemy.halfSize;

                if (!hit) {
                    continue;
                }

                enemy.hp -= Math.max(1, projectile.damage - enemy.def);
                projectile.alive = false;

                if (enemy.hp <= 0) {
                    onEnemyKilled(enemy);
                }
                break;
            }
        }

        projectilesRef.current = projectilesRef.current.filter(
            (projectile) => projectile.alive
        );
    }

    function setupCanvas(canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const observer = new ResizeObserver(() => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        });
        observer.observe(canvas);

        return () => observer.disconnect();

    }

    function setupInput(canvas, handlers) {
        const onMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current.x = e.clientX - rect.left;
            mouseRef.current.y = e.clientY - rect.top;
            mouseRef.current.inside = true;
        };

        const onMouseLeave = () => {
            mouseRef.current.inside = false;
        };

        const onKeyDown = (e) => {
            keysRef.current.add(e.key);
            if (e.key === 'b') {
                e.preventDefault();
                setShopOpenSync((current) => !current);
            }

            if (e.key === 'Tab') {
                e.preventDefault();
                if (!tabPressedRef.current) {
                    cycleTargetClosestToFarthest();
                    tabPressedRef.current = true;
                }
            }
            if (e.key === ' ') {
                e.preventDefault();
                if (!e.repeat) {
                    fireRequestRef.current = true;
                }
            }
        };

        const onKeyUp = (e) => {
            keysRef.current.delete(e.key);
            if (e.key === 'Tab') {
                tabPressedRef.current = false;
            }
        };

        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseleave', onMouseLeave);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        return () => {
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('mouseleave', onMouseLeave);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }


    function updatePlayerMovement(dt, canvas) {
        const p = playerRef.current;
        const playerStats = playerStatsRef.current;

        if (!playerStats.alive) {
            return;
        }

        if (mouseSeekModeRef.current && mouseRef.current.inside) {
            const dx = mouseRef.current.x - p.x;
            const dy = mouseRef.current.y - p.y;
            const distance = Math.hypot(dx, dy);

            if (distance > 2) {
                const dirX = dx / distance;
                const dirY = dy / distance;
                p.x += dirX * p.speed * dt;
                p.y += dirY * p.speed * dt;
            }
        } else {
            const keys = keysRef.current;
            if (keys.has('w') || keys.has('W') || keys.has('ArrowUp')) p.y -= p.speed * dt;
            if (keys.has('s') || keys.has('S') || keys.has('ArrowDown')) p.y += p.speed * dt;
            if (keys.has('a') || keys.has('A') || keys.has('ArrowLeft')) p.x -= p.speed * dt;
            if (keys.has('d') || keys.has('D') || keys.has('ArrowRight')) p.x += p.speed * dt;
        }

        p.x = Math.max(p.halfSize, Math.min(canvas.width - p.halfSize, p.x));
        p.y = Math.max(p.halfSize, Math.min(canvas.height - p.halfSize, p.y));
    }

    function updateCombat(dt) {
        const p = playerRef.current;
        const playerStats = playerStatsRef.current;

        const targetAlive = enemiesRef.current.some(
            (enemy) => enemy.alive && enemy.id === targetEnemyIdRef.current
        );
        if (!targetAlive) {
            const sorted = getAliveEnemiesSortedByDistance();
            setTargetEnemyId(sorted.length ? sorted[0].id : null);
        }

        for (const enemy of enemiesRef.current) {
            if (!enemy.alive) continue;

            enemy.damagePlayerCooldown = Math.max(0, enemy.damagePlayerCooldown - dt);
            enemy.takeDamageCooldown = Math.max(0, enemy.takeDamageCooldown - dt);

            if (!squaresOverlap(p, enemy)) continue;
            if (!playerStats.alive) continue;

            if (enemy.takeDamageCooldown <= 0) {
                const damageToEnemy = Math.max(1, playerStats.atk - enemy.def);
                enemy.hp -= damageToEnemy;
                enemy.takeDamageCooldown = 0.25;
            }

            if (enemy.damagePlayerCooldown <= 0) {
                const damageToPlayer = Math.max(1, enemy.atk - playerStats.def);
                playerStats.hp = Math.max(0, playerStats.hp - damageToPlayer);
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
    }

    function drawScene(ctx, canvas) {
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const p = playerRef.current;
        ctx.fillStyle = '#4a9eff';
        ctx.fillRect(
            p.x - p.halfSize,
            p.y - p.halfSize,
            p.halfSize * 2,
            p.halfSize * 2
        );

        const turret = turretRef.current;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(turret.angle);

        ctx.strokeStyle = '#9ad1ff';
        ctx.lineWidth = turret.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(p.halfSize + turret.length, 0);
        ctx.stroke();

        ctx.restore();
        
        for (const projectile of projectilesRef.current) {
            ctx.fillStyle = '#ffd54a';
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        const range = playerStatsRef.current.range;

        ctx.strokeStyle = 'rgba(154, 209, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, range, 0, Math.PI * 2);
        ctx.stroke();

        for (const enemy of enemiesRef.current) {
            if (!enemy.alive) continue;

            ctx.fillStyle = '#d64545';
            ctx.fillRect(
                enemy.x - enemy.halfSize,
                enemy.y - enemy.halfSize,
                enemy.halfSize * 2,
                enemy.halfSize * 2
            );

            const barWidth = enemy.halfSize * 2;
            const barHeight = 6;
            const barX = enemy.x - enemy.halfSize;
            const barY = enemy.y - enemy.halfSize - 12;
            const healthRatio = enemy.hp / enemy.maxHp;

            ctx.fillStyle = '#222222';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);

            if (enemy.id === targetEnemyIdRef.current) {
                const pad = 4;
                ctx.strokeStyle = '#ff3b3b';
                ctx.lineWidth = 3;
                ctx.strokeRect(
                    enemy.x - enemy.halfSize - pad,
                    enemy.y - enemy.halfSize - pad,
                    enemy.halfSize * 2 + pad * 2,
                    enemy.halfSize * 2 + pad * 2
                );
            }
        }

        for (const drop of advancedDropsRef.current) {
            ctx.fillStyle = '#c084fc';
            ctx.beginPath();
            ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#6b21a8';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const cleanupCanvas = setupCanvas(canvas);

        const p = playerRef.current;
        enemiesRef.current = Array.from({ length: 5 }, () =>
            createEnemy(canvas.width, canvas.height, p)
        );
        const firstSorted = getAliveEnemiesSortedByDistance();
        setTargetEnemyId(firstSorted.length ? firstSorted[0].id : null);

        const cleanupInput = setupInput(canvas);

        let animFrameId;
        let lastTime = 0;

        function loop(timestamp) {
            const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
            lastTime = timestamp;
            
            if (!shopOpenRef.current) {
                updateAdvancedDrops();
                updatePlayerMovement(dt, canvas);
                updateTurret(dt);
                updateCombat(dt);
                updateProjectiles(dt, canvas);
            }
            drawScene(ctx, canvas);

            animFrameId = requestAnimationFrame(loop);
        }

        animFrameId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(animFrameId);
            cleanupInput();
            cleanupCanvas();
        };
    }, []);

    function squaresOverlap(a, b) {
        return (
            Math.abs(a.x - b.x) < a.halfSize + b.halfSize &&
            Math.abs(a.y - b.y) < a.halfSize + b.halfSize
        );
    }

    const [shopOpen, setShopOpen] = useState(false);
    const shopOpenRef = useRef(false);


    function setShopOpenSync(nextValue) {
        shopOpenRef.current =
            typeof nextValue === 'function'
                ? nextValue(shopOpenRef.current)
                : nextValue;
        setShopOpen(shopOpenRef.current);
    }

    function spendMaterials(cost) {
        if (materialsRef.current < cost) {
            return false;
        }

        materialsRef.current -= cost;
        setMaterialsView(materialsRef.current);
        return true;
    }

    function buyRangeUpgrade() {
        const cost = 5;
        if (!spendMaterials(cost)) {
            return;
        }

        playerStatsRef.current.range += 20;
        setPlayerStatsView({ ...playerStatsRef.current });
    }

    function buyAttackUpgrade() {
        const cost = 5;
        if (!spendMaterials(cost)) {
            return;
        }

        playerStatsRef.current.atk += 1;
        setPlayerStatsView({ ...playerStatsRef.current });
    }

    function buyDefenseUpgrade() {
        const cost = 5;
        if (!spendMaterials(cost)) {
            return;
        }

        playerStatsRef.current.def += 1;
        setPlayerStatsView({ ...playerStatsRef.current });
    }

    function buyMaxHpUpgrade() {
        const cost = 5;
        if (!spendMaterials(cost)) {
            return;
        }

        playerStatsRef.current.maxHP += 2;
        playerStatsRef.current.hp += 2;
        setPlayerStatsView({ ...playerStatsRef.current });
    }

    function buySpeedUpgrade() {
        const cost = 5;
        if (!spendMaterials(cost)) {
            return;
        }

        playerRef.current.speed += 20;
    }















    return (
        <>
            <div className="Frame-Game-1-UI-Row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                    <ToggleableSwitchComponent
                        attachFunction={setMouseSeekMode}
                        onToggle={() => {
                            setMouseSeekMode((current) => !current)
                        }}
                        label="Mouse Seek: "
                    />
                    <button onClick={() => setShopOpenSync((current) => !current)}>
                        {shopOpen ? 'Close Shop' : 'Open Shop'}
                    </button>
                </div>
                <div className="Frame-Game-1-Stat" style={{ marginRight: '0px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>HP:</span>
                        <div style={{
                            width: '120px',
                            height: '12px',
                            backgroundColor: '#444',
                            borderRadius: '4px',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                width: `${(playerStatsView.hp / playerStatsView.maxHP) * 100}%`,
                                height: '100%',
                                backgroundColor: `hsl(${(playerStatsView.hp / playerStatsView.maxHP) * 120}, 80%, 45%)`,
                                borderRadius: '4px',
                                transition: 'width 0.1s, background-color 0.3s',
                            }} />
                        </div>
                        <span>{playerStatsView.hp} / {playerStatsView.maxHP}</span>
                    </div>
                    <div>ATK: {playerStatsView.atk}</div>
                    <div>DEF: {playerStatsView.def}</div>
                    <div>RANGE: {Math.round(playerStatsView.range)}</div>
                    <div>
                        TARGET: {targetEnemyIdView ? 'LOCKED' : 'NONE'}
                    </div>
                    <div>MATERIALS: {materialsView}</div>
                </div>

            </div>
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: 'min(65vh, 560px)',
                }}
                >
                <canvas
                    ref={canvasRef}
                    style={{
                    border: "1px solid #000000",
                    display: "block",
                    width: "100%",
                    height: "100%",
                    }}
                />

                {shopOpen && (
                    <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(20, 20, 20, 0.92)',
                        color: '#ffffff',
                        border: '2px solid #888',
                        borderRadius: '12px',
                        padding: '16px',
                        zIndex: 10,
                        boxSizing: 'border-box',
                    }}
                    >
                    <button
                    type="button"
                    className="Frame-Close-Button"
                    aria-label="Close popup frame"
                    onClick={() => setShopOpenSync(false)}
                    >
                    ×
                    </button>
                    <h3>Shop</h3>
                    <div>MATERIALS: {materialsView}</div>

                    <button onClick={buyRangeUpgrade}>+20 Range (5)</button>
                    <button onClick={buyAttackUpgrade}>+1 ATK (5)</button>
                    <button onClick={buyDefenseUpgrade}>+1 DEF (5)</button>
                    <button onClick={buyMaxHpUpgrade}>+2 Max HP (5)</button>
                    <button onClick={buySpeedUpgrade}>+20 Speed (5)</button>
                </div>
            )}</div>
        </>
    );
}

export default FrameGame1;