import React from "react";
import "./ToggleComponent.css";


function ToggleableSwitchComponent({attachFunction, booleanForFunction, label}){

return (
<>
<div className="component-toggle-container">
<label className="component-toggle">
    <span className="component-toggle-text">{label}</span>
    <span className="component-toggle-switch">
        <input
            type="checkbox"
            role="switch"
            aria-label={`${label} Toggle`}
            checked={booleanForFunction}
            onChange={(e) => attachFunction(e.target.checked)}
        />
        <span className="component-toggle-slider" aria-hidden="true" />
    </span>
</label>
</div>
</>
)






}

export default ToggleableSwitchComponent;