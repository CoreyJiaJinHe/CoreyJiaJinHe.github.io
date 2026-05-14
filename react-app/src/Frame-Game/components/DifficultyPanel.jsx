

function FrameGameDifficultyPanel({liveDifficulty, scaledEnemiesEnabled, pacingProfile, bossConfigRef, bossesDefeatedView}) {

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div>MAX ACTIVE: {liveDifficulty.maxActive}</div>
                <div>SPAWN RATE: {liveDifficulty.spawnInterval.toFixed(2)}s</div>
                <div>SCALED: {scaledEnemiesEnabled ? 'ON' : 'OFF'}</div>
                <div>PROFILE: {pacingProfile.toUpperCase()}</div>
                <div>KILLS/BOSS: {bossConfigRef.current.killsPerBoss}</div>
                <div>BOSSES DEFEATED: {bossesDefeatedView}</div>
            </div>
        </>
    )
}
export default FrameGameDifficultyPanel;