function LegacyNavbar({
    searchInput,
    onSearchInputChange,
    onSearchClick,
    suggestions,
    onGoHome,
    onGoProduct,
    onGoFurniture,
    onGoLogin,
    loginLabel = 'Login',
    isLoginDisabled = false,
}) {
    return (
        <div style={{ paddingTop: '10px', paddingBottom: '10px', backgroundColor: 'black', height: '25px' }}>
            <div className="navbar">
                <div className="dropdown">
                    <input
                        list="suggestions"
                        type="text"
                        id="search"
                        placeholder="Search"
                        style={{ width: '164px' }}
                        value={searchInput}
                        onChange={(e) => onSearchInputChange(e.target.value)}
                    />
                    <datalist id="suggestions">
                        {suggestions.slice(0, 9).map((s, i) => <option key={`${s}-${i}`} value={s} />)}
                    </datalist>
                    <button type="button" onClick={() => onSearchClick(searchInput)} style={{ width: '5%', minWidth: '75px' }}>Search</button>

                    <button type="button" onClick={onGoHome} className="button button1">Home Page</button>
                    <button id="ProductPage" type="button" onClick={onGoProduct} className="button button1">Finished Wood</button>
                    <button type="button" onClick={onGoFurniture} className="button button1">Furniture</button>
                    <button id="login" type="button" onClick={onGoLogin} className="button button1" disabled={isLoginDisabled}>{loginLabel}</button>
                </div>
            </div>
        </div>
    );
}

export default LegacyNavbar;
