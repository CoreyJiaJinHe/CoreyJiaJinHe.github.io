import { useRef, useState ,useEffect } from 'react';


function FrameGameKeybindsOverlay({handleKeybindsClose, keybinds }) {
    const [waitingforKey, setWaitingforKey] = useState(null);  // null | 'shop' | 'cycleTarget' | 'fire'
    const waitingforKeyRef = useRef(waitingforKey)

    useEffect(() => {
        waitingforKeyRef.current = waitingforKey;
    }, [waitingforKey]);

    function storeKeybinds() {
        //Store keybinds for future sessions in local storage.
        try{
            localStorage.setItem('keybinds', JSON.stringify(keybinds.current));
            localStorage.setItem('keybinds_saved_at', Date.now().toString());

        } catch (e) {
            console.error('Failed to store keybinds:', e);
        }
    }


    useEffect(() => {
            const handleKeybindChange =(e) =>{
                e.preventDefault();
                e.stopPropagation();
    
    
                keybinds.current[waitingforKeyRef.current] = e.key;
                setWaitingforKey(null);
                storeKeybinds();
            }
            if (waitingforKey != null){
                window.addEventListener('keydown', handleKeybindChange);
            }
            else{
                window.removeEventListener('keydown', handleKeybindChange);
            }
        }, [waitingforKey]);
    

    function getKeyDisplayName(key) {
        if (key === " ") return "SPACE";
        if (key === "ArrowUp") return "↑";
        if (key === "ArrowDown") return "↓";
        if (key === "ArrowLeft") return "←";
        if (key === "ArrowRight") return "→";
        // Add more mappings as needed
        return key.length === 1 ? key.toUpperCase() : key;
    }

    return (
        <>
            <div className="Frame-Overlay">
                <button
                    type="button"
                    className="Frame-Overlay-Close-Button"
                    aria-label="Close overlay"
                    onClick={() => { handleKeybindsClose(); setWaitingforKey(null); }}
                >
                    ×
                </button>
                <p>Rebind Keybinds</p>
                <div style={{ flexDirection: 'column', display: 'flex' }}>
                    <div style={{ flexDirection: 'row', display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button style={{ minWidth: '100px' }} onClick={() => setWaitingforKey('shop')}>Shop</button>
                        <p>{waitingforKey === 'shop' ? "Waiting for key..." : getKeyDisplayName(keybinds.current.shop)}</p>
                    </div>
                    <div style={{ flexDirection: 'row', display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button style={{ minWidth: '100px' }} onClick={() => setWaitingforKey('cycleTarget')}>Cycle Target</button>
                        <p>{waitingforKey === 'cycleTarget' ? "Waiting for key..." : getKeyDisplayName(keybinds.current.cycleTarget)}</p>
                    </div>
                    <div style={{ flexDirection: 'row', display: 'flex', alignItems: 'center', gap: '20px' }}>

                        <button style={{ minWidth: '100px' }} onClick={() => setWaitingforKey('fire')}>Fire</button>
                        <p>{waitingforKey === 'fire' ? "Waiting for key..." : getKeyDisplayName(keybinds.current.fire)}</p>
                    </div>
                </div>
            </div>
        </>

    )

}


export default FrameGameKeybindsOverlay;