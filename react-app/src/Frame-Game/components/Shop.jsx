import { useEffect, useState } from 'react';
import { WEAPON_CONFIGS, MAX_SWORD_ARC_SPAN } from '../configs/weaponConfigs.js';
import { formatNumber, radiansToDegrees } from '../utils/MathUtils.js';


function FrameGameShopOverlay({ shopUpgradeCallbacks, materialsView, playerStatsView, mainTurretTurnSpeed, handleShopClose, upgradeCountsRef, upgradeCostRef, pacingProfileRef, activeWeaponType }) {

    function canSpendMaterials(cost) {
        if (materialsView < cost) {
            return false;
        }
        return true;
    }

    function helper(type, cost) {
        //console.log(`Type: ${type}, Cost: ${cost}`)
        if (!canSpendMaterials(cost)) {
            return;
        }
        const purchased = shopUpgradeCallbacks(type, cost);
        if (!purchased) {
            return;
        }

        incrementCount()
        upgradeCosts()
    }

    function incrementCount() {
        upgradeCountsRef.current += 1;
    }

    useEffect(
        () => {
            upgradeCosts();
        }, [])

    const [upgradeCostView, setUpgradeCostView] = useState(upgradeCostRef.current);

    function upgradeCosts() {
        if (pacingProfileRef.current == "p1") {
            upgradeCostRef.current = 3;
        }
        else {
            if (upgradeCountsRef.current < 5) {
                upgradeCostRef.current = 5;
            }
            else {
                upgradeCostRef.current = 5 + (upgradeCountsRef.current - 4) * 2;
            }
        }
        setUpgradeCostView(upgradeCostRef.current);
    }

    const fancyButtonsStyle = {
        width: 120,
        height: 80,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        whiteSpace: 'normal',
        textAlign: 'center',
        alignItems: 'center',
        borderRadius: 8,
        border: '1px solid #888',
        background: '#222',
        color: '#fff',
        cursor: 'pointer',
        fontSize: 13,
        boxSizing: 'border-box',
        transition: 'border 0.15s',

    }

    function getShopOptions() {
        const swordBaseArc = WEAPON_CONFIGS.SWORD?.[0]?.arcSpan ?? (Math.PI * 0.95);
        const swordCurrentArc = swordBaseArc + (playerStatsView?.swordArcSpanBonus ?? 0);
        const swordArcCapped = swordCurrentArc >= MAX_SWORD_ARC_SPAN - 0.0001;
        const autoClosestTargetingPurchased = !!playerStatsView?.autoClosestTargetingEnabled;

        // Row 1: Base stats
        const baseStats = [
            { type: 'range', label: '+20 Range', cost: upgradeCostView },
            { type: 'atk', label: '+1 ATK', cost: upgradeCostView },
            { type: 'def', label: '+1 DEF', cost: upgradeCostView },
            { type: 'maxHP', label: '+2 Max HP', cost: upgradeCostView },
            { type: 'speed', label: '+20 Speed', cost: upgradeCostView },
        ];

        // Row 2: Utility upgrades
        const utilityUpgrades = [
            { type: 'heal', label: 'Heal for 10', cost: 5 },
            {
                type: 'autoClosestTargeting',
                label: autoClosestTargetingPurchased ? 'Auto Closest Targeting (OWNED)' : 'Auto Closest Targeting',
                cost: 200,
                disabled: autoClosestTargetingPurchased,
            },
        ];

        // Row 3+: Weapon and weapon-related upgrades
        const weaponUpgrades = [
            { type: 'weaponTurnSpeed', label: '+10 deg/s Turn Speed', cost: upgradeCostView },
            { type: 'weaponDamage', label: '+1 Weapon Damage', cost: upgradeCostView },
        ];

        const isMeleeWeapon = activeWeaponType === 'SWORD' || activeWeaponType === 'FLAIL';
        if (!isMeleeWeapon) {
            weaponUpgrades.push(
                { type: 'projectileSpeed', label: 'Increase Projectile Speed', cost: upgradeCostView },
                { type: 'weaponCooldown', label: 'Reduce Main Cooldown', cost: upgradeCostView }
            );
        }

        if (activeWeaponType === 'DOUBLE' || activeWeaponType === 'TRIPLE') {
            const maxSecondaryTurrets = activeWeaponType === 'TRIPLE' ? 2 : 1;
            const nextUpgradeIndex = ((playerStatsView?.secondaryCooldownUpgradeIndex ?? 0) % maxSecondaryTurrets) + 1;
            weaponUpgrades.push({ type: 'secondaryWeaponCooldown', label: `Reduce Secondary ${nextUpgradeIndex} Cooldown`, cost: upgradeCostView });
        }

        if (activeWeaponType === 'EXPLOSIVE') {
            weaponUpgrades.push({ type: 'explosionRadius', label: 'Increase Explosion Radius', cost: upgradeCostView });
        }

        if (activeWeaponType === 'SWORD') {
            weaponUpgrades.push(
                { type: 'swordSwingSpeed', label: 'Increase Swing Speed', cost: upgradeCostView },
                { type: 'swordLength', label: 'Increase Sword Length', cost: upgradeCostView },
                {
                    type: 'swordArcSize',
                    label: swordArcCapped ? 'Sword Arc Width (MAX)' : 'Increase Sword Arc',
                    cost: upgradeCostView,
                    disabled: swordArcCapped,
                }
            );
        }

        if (activeWeaponType === 'FLAIL') {
            weaponUpgrades.push(
                { type: 'flailSize', label: 'Increase Orbit / Ball / Length', cost: upgradeCostView },
                { type: 'flailSpinSpeed', label: 'Increase Spin Speed', cost: upgradeCostView }
            );
        }

        if (activeWeaponType === 'BURST') {
            weaponUpgrades.push({ type: 'burstProjectileCount', label: '+1 Projectile Count', cost: upgradeCostView });
        }

        return [...baseStats, ...utilityUpgrades, ...weaponUpgrades];
    }

    const shopOptions = getShopOptions();

    const activeConfig = WEAPON_CONFIGS[activeWeaponType]?.[0] ?? {};
    const secondaryConfigs = WEAPON_CONFIGS[activeWeaponType]?.slice(1) ?? [];
    const isMeleeWeapon = activeWeaponType === 'SWORD' || activeWeaponType === 'FLAIL';

    const projectileSpeed = (activeConfig.projectileSpeed ?? 0) + (playerStatsView.weaponProjectileSpeedBonus ?? 0);
    const burstPenalty = activeWeaponType === 'BURST' ? (playerStatsView.burstCooldownPenalty ?? 0) : 0;
    const mainCooldown = Math.max(
        0.08,
        (activeConfig.cooldown ?? 0) + burstPenalty - (playerStatsView.weaponCooldownReduction ?? 0)
    );

    const swordBaseArc = WEAPON_CONFIGS.SWORD?.[0]?.arcSpan ?? (Math.PI * 0.95);
    const swordArcSpan = Math.min(MAX_SWORD_ARC_SPAN, swordBaseArc + (playerStatsView.swordArcSpanBonus ?? 0));
    const swordSwingDuration = Math.max(
        0.06,
        (WEAPON_CONFIGS.SWORD?.[0]?.swingDuration ?? 0.16) - (playerStatsView.swordSwingDurationReduction ?? 0)
    );
    const swordReach = (WEAPON_CONFIGS.SWORD?.[0]?.outerRadiusOffset ?? 52) + (playerStatsView.swordLengthBonus ?? 0);

    const flailLength = (WEAPON_CONFIGS.FLAIL?.[0]?.length ?? 40) + (playerStatsView.flailLengthBonus ?? 0);
    const flailOrbit = (WEAPON_CONFIGS.FLAIL?.[0]?.orbitRadius ?? 28) + (playerStatsView.flailOrbitRadiusBonus ?? 0);
    const flailBall = (WEAPON_CONFIGS.FLAIL?.[0]?.ballRadius ?? 10) + (playerStatsView.flailBallRadiusBonus ?? 0);
    const flailSpinSpeed = (WEAPON_CONFIGS.FLAIL?.[0]?.spinSpeed ?? (Math.PI * 2.2)) + (playerStatsView.flailSpinSpeedBonus ?? 0);

    const burstCount = (WEAPON_CONFIGS.BURST?.[0]?.burstCount ?? 3) + (playerStatsView.burstProjectileCountBonus ?? 0);
    const explosionRadius = (WEAPON_CONFIGS.EXPLOSIVE?.[0]?.explosionRadius ?? 60) + (playerStatsView.explosiveRadiusBonus ?? 0);

    const secondaryReductions = playerStatsView.secondaryTurretCooldownReductions ?? [0, 0];

    return (
        <>
            <div className="Frame-Overlay"
                style={{

                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                }}
            >
                <button
                    type="button"
                    className="Frame-Overlay-Close-Button"
                    aria-label="Close overlay"
                    onClick={() => handleShopClose(false)}
                >
                    ×
                </button>
                <h3>Shop</h3>
                <div style={{ display: 'flex', flexDirection: 'row', gap: 16 }}>
                    <div>MATERIALS: {materialsView}</div>
                    <div style={{ marginLeft: 'auto' }}>ACTIVE WEAPON: {activeWeaponType}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: 20, flex: 1 }}>
                    {/* Left Column: Upgrade Buttons (Larger) */}
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Row 1: Base Stats */}
                        <div style={{ display: 'flex', flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                            {shopOptions.slice(0, 5).map((option) => (
                                <button
                                    key={option.type}
                                    style={fancyButtonsStyle}
                                    disabled={option.disabled}
                                    onClick={() => helper(option.type, option.cost)}
                                >
                                    {option.label} ({option.cost})
                                </button>
                            ))}
                        </div>

                        {/* Row 2: Utilities */}
                        <div style={{ display: 'flex', flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                            {shopOptions.slice(5, 7).map((option) => (
                                <button
                                    key={option.type}
                                    style={fancyButtonsStyle}
                                    disabled={option.disabled}
                                    onClick={() => helper(option.type, option.cost)}
                                >
                                    {option.label} ({option.cost})
                                </button>
                            ))}
                        </div>

                        {/* Rows 3+: Weapon-Specific */}
                        <div style={{ display: 'flex', flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                            {shopOptions.slice(7).map((option) => (
                                <button
                                    key={option.type}
                                    style={fancyButtonsStyle}
                                    disabled={option.disabled}
                                    onClick={() => helper(option.type, option.cost)}
                                >
                                    {option.label} ({option.cost})
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Build Stats (Smaller) */}
                    <div style={{ flex: 1, maxWidth: 250 }}>
                        <div
                            style={{
                                background: '#171717',
                                border: '1px solid #3f3f46',
                                borderRadius: 8,
                                padding: 8,
                                display: 'grid',
                                gap: 4,
                                fontSize: 14
                            }}
                        >
                            <div style={{ fontWeight: 700, color: '#e5e7eb' }}>Current Build Stats</div>
                            <div>ATK: {playerStatsView.atk} | Weapon DMG Bonus: {playerStatsView.weaponDamage}</div>
                            <div>DEF: {playerStatsView.def} | Range: {playerStatsView.range}</div>
                            <div>HP: {playerStatsView.hp} / {playerStatsView.maxHP}</div>
                            <div>Main Turn Speed: {formatNumber(radiansToDegrees(mainTurretTurnSpeed), 1)} deg/s</div>
                            <div>Secondary Turn Speed: {formatNumber(radiansToDegrees(playerStatsView.secondaryTurretTurnSpeed ?? 0), 1)} deg/s</div>
                            {!isMeleeWeapon && (
                                <>
                                    <div>Projectile Speed: {formatNumber(projectileSpeed, 0)}</div>
                                    <div>Main Fire Cooldown: {formatNumber(mainCooldown, 2)}s</div>
                                </>
                            )}
                            {(activeWeaponType === 'DOUBLE' || activeWeaponType === 'TRIPLE') && secondaryConfigs.map((cfg, index) => {
                                const reduction = secondaryReductions[index] ?? 0;
                                const effectiveCooldown = Math.max(
                                    0.08,
                                    (cfg.cooldown ?? 0) - (playerStatsView.weaponCooldownReduction ?? 0) - reduction
                                );
                                return (
                                    <div key={`sec-stat-${index}`}>
                                        Secondary {index + 1} Cooldown: {formatNumber(effectiveCooldown, 2)}s
                                    </div>
                                );
                            })}
                            {activeWeaponType === 'BURST' && (
                                <div>Burst Projectile Count: {burstCount}</div>
                            )}
                            {activeWeaponType === 'EXPLOSIVE' && (
                                <div>Explosion Radius: {formatNumber(explosionRadius, 0)}</div>
                            )}
                            {activeWeaponType === 'SWORD' && (
                                <>
                                    <div>Sword Arc: {formatNumber(radiansToDegrees(swordArcSpan), 1)} deg</div>
                                    <div>Sword Swing Duration: {formatNumber(swordSwingDuration, 2)}s</div>
                                    <div>Sword Reach Offset: {formatNumber(swordReach, 0)}</div>
                                </>
                            )}
                            {activeWeaponType === 'FLAIL' && (
                                <>
                                    <div>Flail Length: {formatNumber(flailLength, 0)}</div>
                                    <div>Flail Orbit Radius: {formatNumber(flailOrbit, 0)}</div>
                                    <div>Flail Ball Radius: {formatNumber(flailBall, 0)}</div>
                                    <div>Flail Spin Speed: {formatNumber(radiansToDegrees(flailSpinSpeed), 1)} deg/s</div>
                                </>
                            )}
                            <div>Auto Closest Targeting: {playerStatsView.autoClosestTargetingEnabled ? 'ON' : 'OFF'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}


export default FrameGameShopOverlay;