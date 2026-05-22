import { worldToScreen } from '../../utils/MathUtils.js';

let effectIdCounter = 0;

function nextEffectId(prefix = 'fx') {
    effectIdCounter += 1;
    return `${prefix}-${Date.now()}-${effectIdCounter}`;
}


export function createEffectsSystem({
    refs,
}

) {
    const {
        damageTextsRef,
        shakeRef,
        cameraRef,
        canvasRef
    } = refs;

    const triggerEffects = (x, y, text, color = "white", isPlayer = false) => {
        const id = nextEffectId('hit');
        damageTextsRef.current.push({ id, x, y, text, color, life: 1.0 });

        if (isPlayer) {
            shakeRef.current = 10; // Set shake intensity
        }
    };

    const updateEffects = (deltaTime) => {
        const dt = Number.isFinite(deltaTime) && deltaTime > 0 ? deltaTime : (1 / 60);

        // 1. Decay Shake
        if (shakeRef.current > 0) {
            // Equivalent to multiplying by 0.9 each 60fps frame.
            shakeRef.current *= Math.pow(0.9, dt * 60);
            if (shakeRef.current < 0.1) shakeRef.current = 0;
        }

        // 2. Decay Damage Text
        damageTextsRef.current = damageTextsRef.current.filter(item => {
            // Equivalent to subtracting 0.02 each 60fps frame.
            item.life -= 1.2 * dt;
            return item.life > 0;
        });
    };

    
    function triggerExplosionEffect(worldX, worldY, explosionRadius = 60) {
        shakeRef.current = Math.max(shakeRef.current, 16);
        const { sx, sy } = worldToScreen(worldX, worldY, cameraRef.current, canvasRef.current);
        damageTextsRef.current.push({
            id: nextEffectId('explosion'),
            x: sx,
            y: sy,
            text: '',
            color: '#ffb347',
            life: 0.7,
            explosionRadius,
        });
    }

    return {
        triggerEffects,
        updateEffects,
        triggerExplosionEffect
    }
}