function FrameGamePlayerStatOverlay({ playerStatsView, materialsView, killsView }) {



    return (
        <>
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
            <div>MATERIALS: {materialsView}</div>
            <div>KILLS: {killsView}</div>
        </>


    )
}

export default FrameGamePlayerStatOverlay;