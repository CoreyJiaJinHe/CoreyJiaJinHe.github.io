import { useState } from 'react';
import { LEGACY_PRODUCT_NAMES } from './legacyProductNames';

function LegacyNavbar({
    backendAvailable = false,
    backendBaseUrl = '',
    onGoHome,
    onGoProduct,
    onGoFurniture,
    onGoLogin,
    loginLabel = 'Login',
    isLoginDisabled = false,
}) {
    const [searchInput, setSearchInput] = useState('');
    const [suggestions, setSuggestions] = useState([]);

    async function getSuggestions(inputValue) {
        const input = inputValue || '';
        setSearchInput(input);
        if (input.trim() === '') {
            setSuggestions([]);
            return;
        }

        if (backendAvailable && backendBaseUrl) {
            try {
                const response = await fetch(`${backendBaseUrl}/products.php?input=${encodeURIComponent(input)}`, { method: 'GET' });
                if (response.ok) {
                    const text = (await response.text()).trim();
                    if (!text || text === 'No valid products') {
                        setSuggestions(['No valid products']);
                    } else {
                        setSuggestions(text.split(','));
                    }
                    return;
                }
            } catch {
                // Use local fallback when backend call fails.
            }
        }

        const pattern = new RegExp(input, 'i');
        const local = LEGACY_PRODUCT_NAMES.filter((name) => pattern.test(name));
        setSuggestions(local.length ? local : ['No valid products']);
    }

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
                        onChange={(e) => getSuggestions(e.target.value)}
                    />
                    <datalist id="suggestions">
                        {suggestions.slice(0, 9).map((s, i) => <option key={`${s}-${i}`} value={s} />)}
                    </datalist>
                    <button type="button" onClick={() => getSuggestions(searchInput)} style={{ width: '5%', minWidth: '75px' }}>Search</button>

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
