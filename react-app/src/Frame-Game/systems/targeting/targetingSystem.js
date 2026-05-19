


export function createTargetingSystem({
    refs,
    callbacks = {},
}) {

    const {
        playerRef, enemiesRef, targetEnemyIdRef, playerStatsRef

    } = refs;

    const {
        setTargetEnemyId
    } = callbacks;


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

    function cycleTargetReverseClosestToFarthest() {
        const sorted = getAliveEnemiesSortedByDistance();

        if (sorted.length === 0) {
            setTargetEnemyId(null);
            return;
        }

        const closestId = sorted[0].id;
        const currentId = targetEnemyIdRef.current;
        const currentIndex = sorted.findIndex((enemy) => enemy.id === currentId);

        // Re-anchor to closest if current target is missing or no longer closest.
        if (currentIndex === -1 || currentId !== closestId) {
            setTargetEnemyId(closestId);
            return;
        }

        // Reverse cycle from closest: closest -> farthest -> ...
        const prevIndex = (currentIndex - 1 + sorted.length) % sorted.length;
        setTargetEnemyId(sorted[prevIndex].id);
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

    function ensureValidTarget(){
        const sorted = getAliveEnemiesSortedByDistance();
        if (sorted.length === 0) {
            setTargetEnemyId(null);
            return;
        }

        if (playerStatsRef.current?.autoClosestTargetingEnabled) {
            const closestId = sorted[0].id;
            if (targetEnemyIdRef.current !== closestId) {
                setTargetEnemyId(closestId);
            }
            return;
        }

        const closestId = sorted[0].id;
        const currentId = targetEnemyIdRef.current;
        const currentIndex = sorted.findIndex((enemy) => enemy.id === currentId);

        // If no target             or target is not closest, snap to closest first. 
        // (I don't want it to automatically snap)
        if (currentIndex === -1 ) { //|| currentId !== closestId
            setTargetEnemyId(closestId);
            return;
        }
    }

    return {
        getAliveEnemiesSortedByDistance,
        cycleTargetReverseClosestToFarthest,
        cycleTargetClosestToFarthest,
        ensureValidTarget,
    }
}