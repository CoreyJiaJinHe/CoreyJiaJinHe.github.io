import { useRef, useEffect, useState } from 'react';

function FrameGameShopOverlay({ shopUpgradeCallbacks, materialsView, handleShopClose, upgradeCountsRef, upgradeCostRef, pacingProfileRef }) {

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
        shopUpgradeCallbacks(type, cost)

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

    }

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
                <div>MATERIALS: {materialsView}</div>
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                    <button style={fancyButtonsStyle} onClick={() => helper("range", upgradeCostRef.current)}>+20 Range ({upgradeCostView})</button>
                    <button style={fancyButtonsStyle} onClick={() => helper("atk", upgradeCostRef.current)}>+1 ATK ({upgradeCostView})</button>
                    <button style={fancyButtonsStyle} onClick={() => helper("def", upgradeCostRef.current)}>+1 DEF ({upgradeCostView})</button>
                    <button style={fancyButtonsStyle} onClick={() => helper("hp", upgradeCostRef.current)}>+2 Max HP ({upgradeCostView})</button>
                    <button style={fancyButtonsStyle} onClick={() => helper("speed", upgradeCostRef.current)}>+20 Speed ({upgradeCostView})</button>
                    <button style={fancyButtonsStyle} onClick={() => helper("heal", 5)}>Heal for 5 (5)</button>
                </div>
            </div>
        </>
    )
}


export default FrameGameShopOverlay;