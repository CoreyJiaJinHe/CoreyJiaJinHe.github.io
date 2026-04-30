import {useRef, useEffect, useState }from 'react';

function FrameGameShop({shopUpgradeCallbacks, materialsView, setShopOpenSync, upgradeCountsRef, upgradeCostRef, pacingProfileRef}) {

    function canSpendMaterials(cost) {
        if (materialsView < cost) {
            return false;
        }
        return true;
    }

    function helper(type, cost){
        //console.log(`Type: ${type}, Cost: ${cost}`)
        if (!canSpendMaterials(cost)) {
            return;
        }
        shopUpgradeCallbacks(type, cost)

        incrementCount()
        upgradeCosts()
    }

    function incrementCount(){
        upgradeCountsRef.current += 1;
    }

    useEffect(
        () => {
            upgradeCosts();
        },[])
    
    const [upgradeCostView, setUpgradeCostView] = useState(upgradeCostRef.current);

    function upgradeCosts(){
        if (pacingProfileRef.current == "p1") {
                upgradeCostRef.current = 3;
        }
        else{
            if(upgradeCountsRef.current < 5){
                upgradeCostRef.current = 5;
            }
            else{
                upgradeCostRef.current = 5 + (upgradeCountsRef.current - 4) * 2;
            }
        }
        setUpgradeCostView(upgradeCostRef.current);
    }

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
                }} 
            >
                <button
                    type="button"
                    className="Frame-Close-Button"
                    aria-label="Close popup frame"
                    onClick={() => setShopOpenSync(false)}
                >
                    ×
                </button>
                <h3>Shop</h3>
                <div>MATERIALS: {materialsView}</div>

                <button onClick={()=>helper("range", upgradeCostRef.current)}>+20 Range ({upgradeCostView})</button>
                <button onClick={()=>helper("atk", upgradeCostRef.current)}>+1 ATK ({upgradeCostView})</button>
                <button onClick={()=>helper("def", upgradeCostRef.current)}>+1 DEF ({upgradeCostView})</button>
                <button onClick={()=>helper("hp", upgradeCostRef.current)}>+2 Max HP ({upgradeCostView})</button>
                <button onClick={()=>helper("speed", upgradeCostRef.current)}>+20 Speed ({upgradeCostView})</button>
                <button onClick={()=>helper("heal", 5)}>Heal for 5 (5)</button>
            </div>
        </>
    )
}


export default FrameGameShop;