import { useRef, useEffect, useState } from 'react';


function FrameGameWeaponUpgradeOverlay({handleWeaponUpgradeClose,weaponTypeKeys, WEAPON_CONFIGS, selectAdvancedWeaponUpgrade}) {



    return (
        <>
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
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <button
                    type="button"
                    className="Frame-Close-Button"
                    aria-label="Close popup frame"
                    onClick={() => handleWeaponUpgradeClose(false)}
                >
                    ×
                </button>
                <h3>Weapon Upgrades</h3>
                <p>Upgrade your weapons to increase your combat effectiveness. Select one. This is permanent.</p>
                <div
                    style={{
                        overflowY: 'auto',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: 16,
                        alignContent: 'start',
                        padding: '8px 0',
                        maxHeight: '60vh',
                        justifyItems: 'center',
                    }}
                >
                    {weaponTypeKeys.map((key) => {
                        const configs = WEAPON_CONFIGS[key];
                        const main = configs[0];
                        return (
                            <button
                                key={key}
                                style={{
                                    width: 160,
                                    height: 100,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderRadius: 8,
                                    border: '1px solid #888',
                                    background: '#222',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: 15,
                                    padding: 0,
                                    boxSizing: 'border-box',
                                    transition: 'border 0.15s',
                                }}
                                onClick={() => selectAdvancedWeaponUpgrade(key)}
                            >
                                <b style={{ marginBottom: 4 }}>{key.replace(/_/g, ' ')}</b>
                                <div style={{ fontSize: 13, marginBottom: 4, textAlign: 'center' }}>
                                    {key === 'SWORD' ? (
                                        <>
                                            DMG: {main.damage} | SWING: {main.swingDuration}s<br />
                                            ARC: {Math.round((main.arcSpan / Math.PI) * 100)}% pi
                                        </>
                                    ) : key === 'FLAIL' ? (
                                        <>
                                            DMG: {main.damage} | SPIN: {main.spinSpeed?.toFixed(2)}<br />
                                            ORBIT: {main.orbitRadius} | BALL: {main.ballRadius}
                                        </>
                                    ) : (
                                        <>
                                            DMG: {main.damage} | CD: {main.cooldown}s<br />
                                            SPD: {main.projectileSpeed}{main.explosionRadius ? ` | AoE: ${main.explosionRadius}` : ''}
                                        </>
                                    )}
                                </div>
                                {configs.length > 1 && <div style={{ fontSize: 11, color: '#aaa' }}>+{configs.length - 1} secondary</div>}
                            </button>
                        );
                    })}
                </div>
            </div>

        </>


    )











}

export default FrameGameWeaponUpgradeOverlay;