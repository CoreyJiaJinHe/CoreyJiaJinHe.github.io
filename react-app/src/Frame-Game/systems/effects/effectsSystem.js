import { worldToScreen } from '../../utils/MathUtils.js';



export function createEffectsSystem({
    refs,
    callbacks = {},
}

) {
    const {
        damageTextsRef,
        shakeRef,
        cameraRef,
        canvasRef
    } = refs;

    const {
    } = callbacks;

    const triggerEffects = (x, y, text, color = "white", isPlayer = false) => {
        const id = Date.now();
        damageTextsRef.current.push({ id, x, y, text, color, life: 1.0 });

        if (isPlayer) {
            shakeRef.current = 10; // Set shake intensity
        }
    };
    
    const updateEffects = (deltaTime) => {
        // 1. Decay Shake
        if (shakeRef.current > 0) {
            shakeRef.current *= 0.9; // Smoothly reduce shake
            if (shakeRef.current < 0.1) shakeRef.current = 0;
        }

        // 2. Decay Damage Text
        damageTextsRef.current = damageTextsRef.current.filter(item => {
            item.life -= 0.02; // Reduce opacity over time
            return item.life > 0;
        });
    };

    
    function triggerExplosionEffect(worldX, worldY, explosionRadius = 60) {
        shakeRef.current = Math.max(shakeRef.current, 16);
        const { sx, sy } = worldToScreen(worldX, worldY, cameraRef.current, canvasRef.current);
        damageTextsRef.current.push({
            id: `explosion-${Date.now()}`,
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