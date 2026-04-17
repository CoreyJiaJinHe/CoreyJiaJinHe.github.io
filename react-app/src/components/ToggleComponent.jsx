import React from "react";
import "./ToggleComponent.css";


function ToggleableSwitchComponent({attachFunction, booleanForFunction, label}){

return (
<>
<div className="Component-Toggle-Container">
<label className="Component-Toggle">
    <span className="Component-Toggle-Text">{label}</span>
    <span className="Component-Toggle-Switch">
        <input
            type="checkbox"
            role="switch"
            aria-label={`${label} Toggle`}
            checked={booleanForFunction}
            onChange={(e) => attachFunction(e.target.checked)}
        />
        <span className="Component-Toggle-Slider" aria-hidden="true" />
    </span>
</label>
</div>
</>
)






}

export default ToggleableSwitchComponent;