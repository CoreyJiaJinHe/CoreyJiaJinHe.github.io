import { useEffect, useRef, useState } from 'react';
import ToggleableSwitchComponent from './components/ToggleComponent'


function FrameGame1() {
    const canvasRef = useRef(null);
    const playerRef = useRef({ x: 400, y: 300, halfSize: 20, speed: 200 });
    const playerStatsRef = useRef({ alive: true, hp: 10, maxHP: 10, atk: 5, def: 2 });
    const [playerStatsView, setPlayerStatsView] = useState(playerStatsRef.current);
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

        const currentIndex = sorted.findIndex(
            (enemy) => enemy.id === targetEnemyIdRef.current
        );

        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % sorted.length;
        setTargetEnemyId(sorted[nextIndex].id);
    }
    function setTargetEnemyId(nextValue) {
        targetEnemyIdRef.current = nextValue;
        setTargetEnemyIdView(nextValue);
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

            if (e.key === 'Tab') {
                e.preventDefault();
                if (!tabPressedRef.current) {
                    cycleTargetClosestToFarthest();
                    tabPressedRef.current = true;
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
                enemy.hp = 0;
                enemy.alive = false;
                if (targetEnemyIdRef.current === enemy.id) {
                    setTargetEnemyId(null);
                }
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

            updatePlayerMovement(dt, canvas);
            updateCombat(dt);
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

    return (
        <>
            <div className="Frame-Game-1-UI-Row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px' }}>

                <ToggleableSwitchComponent
                    attachFunction={setMouseSeekMode}
                    onToggle={() => {
                        setMouseSeekMode((current) => !current)
                    }}
                    label="Mouse Seek: "
                />
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
                    <div>
                        TARGET: {targetEnemyIdView ? 'LOCKED' : 'NONE'}
                    </div>
                </div>

            </div>
            <canvas ref={canvasRef} style={{ border: "1px solid #000000", display: "block", width: "100%", height: "100%" }} />

        </>
    );
}

export default FrameGame1;