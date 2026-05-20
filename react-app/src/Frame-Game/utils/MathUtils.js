function squareOverlapsCircle(square, circle) {
    const closestX = Math.max(
        square.x - square.halfSize,
        Math.min(circle.x, square.x + square.halfSize)
    );
    const closestY = Math.max(
        square.y - square.halfSize,
        Math.min(circle.y, square.y + square.halfSize)
    );

    const dx = circle.x - closestX;
    const dy = circle.y - closestY;

    return dx * dx + dy * dy <= circle.radius * circle.radius;
}


function squaresOverlap(a, b) {
    //Check collission between entity a and entity b. 
    return (
        Math.abs(a.x - b.x) <= a.halfSize + b.halfSize &&
        Math.abs(a.y - b.y) <= a.halfSize + b.halfSize
    );
}
function calculateDistance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}



function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function normalize2D(x, y) {
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len };
}

function worldToScreen(wx, wy, camera, canvas) {
        return {
            sx: wx - camera.x + canvas.width / 2,
            sy: wy - camera.y + canvas.height / 2,
        };
    }

function distanceSqToPlayer(x, y, playerX, playerY) {
    const dx = x - playerX;
    const dy = y - playerY;
    return dx * dx + dy * dy;
}

function isOnScreen(sx, sy, canvas, padding = 12) {
    return (
        sx >= -padding &&
        sx <= canvas.width + padding &&
        sy >= -padding &&
        sy <= canvas.height + padding
    );
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function clampToWorld(x, y, b) {
  return {
    x: Math.max(b.minX, Math.min(b.maxX, x)),
    y: Math.max(b.minY, Math.min(b.maxY, y)),
  };
}

function clampPointToWorld(x, y, bounds, halfSize = 0) {
    if (!bounds) return { x, y };
    const minX = bounds.minX + halfSize;
    const maxX = bounds.maxX - halfSize;
    const minY = bounds.minY + halfSize;
    const maxY = bounds.maxY - halfSize;

    return {
        x: clamp(x, minX, maxX),
        y: clamp(y, minY, maxY),
    };
}

function clampCameraToWorld(camX, camY, canvas, b) {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  return {
    x: Math.max(b.minX + halfW, Math.min(b.maxX - halfW, camX)),
    y: Math.max(b.minY + halfH, Math.min(b.maxY - halfH, camY)),
  };
}

    function formatNumber(value, digits = 2) {
        const factor = Math.pow(10, digits);
        return (Math.round(value * factor) / factor).toString();
    }

    function radiansToDegrees(value) {
        return value * (180 / Math.PI);
    }

function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
}

export { 
    squareOverlapsCircle,
    squaresOverlap,
    calculateDistance,
    randomBetween,
    normalize2D,
    distanceSqToPlayer,
    worldToScreen,
    isOnScreen,
    clampToWorld,
    clampPointToWorld,
    clampCameraToWorld,
    formatNumber,
    radiansToDegrees,
    normalizeAngle,
};
