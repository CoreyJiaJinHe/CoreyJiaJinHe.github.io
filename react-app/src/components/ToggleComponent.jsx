import React from "react";
import "./ToggleComponent.css";


function ToggleableSwitchComponent({setNightMode, nightMode}){

return (
<>
<div className="component-toggle-container">
<label className="component-toggle">
    <span className="component-toggle-text">Night Mode</span>
    <span className="component-toggle-switch">
        <input
            type="checkbox"
            role="switch"
            aria-label="Night Mode Toggle"
            checked={nightMode}
            onChange={(e) => setNightMode(e.target.checked)}
        />
        <span className="component-toggle-slider" aria-hidden="true" />
    </span>
</label>
</div>
</>
)






}

export default ToggleableSwitchComponent;