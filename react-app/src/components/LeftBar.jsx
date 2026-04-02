import './LeftBar.css'
import ToggleableSwitchComponent from './ToggleComponent'

function LeftBar({isLeftBarOpen, setIsLeftBarOpen, nightMode, setNightMode}) {
    return (
        <>
            <div className={`Left-Bar ${isLeftBarOpen ? 'open' : ''} ${nightMode ? 'night-mode' : 'day-mode'}`}>
                <button className={`Left-Bar-Toggle-Button ${nightMode ? 'night-mode' : 'day-mode'}`}
                    type="button"
                    aria-label={isLeftBarOpen ? "Close left bar" : "Open left bar"}
                    onClick={() => setIsLeftBarOpen((current) => !current)}
                >
                    {isLeftBarOpen ? "\u00d7" : "\u2630"}
                </button>
                <div className="Component-Night-Mode-Toggle">
                    <ToggleableSwitchComponent attachFunction={setNightMode} booleanForFunction={nightMode} label="Night Mode" />
                </div>
            </div>
        </>
    )
}

export default LeftBar