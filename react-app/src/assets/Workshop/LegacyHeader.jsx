function LegacyHeader({ children }) {
    const logoSrc = new URL('./Images/img_saw.png', import.meta.url).href;

    return (
        <div className="header">
            <div className="namebar">
                <img src={logoSrc} alt="Image of Logo" style={{ float: 'left', height: '120px', width: '120px', objectFit: 'contain' }} />
                <img src={logoSrc} alt="Image of Logo" style={{ float: 'right', height: '120px', width: '120px', objectFit: 'contain' }} />
                <div style={{ color: 'white', fontSize: '30px' }}>
                    <h1>Oasis Woodworks</h1>
                </div>
            </div>
            <div style={{ backgroundColor: 'white', width: '100%', height: '10px' }} />
            {children}
        </div>
    );
}

export default LegacyHeader;
