import { useEffect, useMemo, useState } from 'react';
import './mycssv2.css';
import { checkLegacySessionOnLoad } from './LegacySessionContext';
import LegacyNavbar from './LegacyNavbar';
import LegacyPageLayout from './LegacyPageLayout';

const BACKEND_BASE_URL = 'http://localhost/FinalsAssignment';

const WOOD_OPTIONS = ['Cedar', 'Fir', 'Pine', 'Redwood', 'Ash', 'Birch', 'Cherry', 'Mahogany'];

const LOCAL_PROPERTIES = {
    img1: ['Cedar', 'Resists decay and insects', 'Lightweight'],
    img2: ['Fir', 'Cheap', 'Widely Available'],
    img3: ['Pine', 'Durable', 'Easy to Finish'],
    img4: ['Redwood', 'Moisture Resistant', 'Soft', 'Easy to work with'],
    img5: ['Ash', 'Durable', 'Hard', 'Strong'],
    img6: ['Birch', 'Cheap', 'Durable'],
    img7: ['Cherry', 'Dries quickly', 'Easy to process'],
    img8: ['Mahogany', 'Beautiful', 'Fine texture'],
};

const LOCAL_SIZES = {
    Cedar: ['One-by-Two', 'One-by-Three', 'One-by-Four', 'One-by-Six', 'Two-by-Four', 'Two-by-Six', 'Two-by-Eight', 'Two-by-Ten'],
    Fir: ['One-by-Two', 'One-by-Three', 'One-by-Four', 'One-by-Six', 'Two-by-Four', 'Two-by-Six', 'Two-by-Eight'],
    Pine: ['One-by-Two', 'One-by-Three', 'One-by-Four', 'One-by-Six', 'Two-by-Four', 'Two-by-Six'],
    Redwood: ['One-by-Two', 'One-by-Three', 'One-by-Four', 'Two-by-Four'],
    Ash: ['One-by-Two', 'One-by-Three', 'One-by-Four', 'One-by-Six', 'Two-by-Four', 'Two-by-Six', 'Two-by-Eight'],
    Birch: ['One-by-Two', 'One-by-Three', 'One-by-Four', 'Two-by-Four'],
    Cherry: ['One-by-Two', 'One-by-Three', 'One-by-Four', 'Two-by-Four', 'Two-by-Eight', 'Two-by-Ten'],
    Mahogany: ['Two-by-Four'],
};

const LOCAL_LENGTHS = {
    Cedar: ['4 Feet', '6 Feet', '8 Feet', '10 Feet', '12 Feet', '16 Feet', '18 Feet'],
    Fir: ['4 Feet', '6 Feet', '8 Feet', '10 Feet', '12 Feet', '16 Feet', '18 Feet'],
    Pine: ['4 Feet', '6 Feet', '8 Feet'],
    Redwood: ['4 Feet', '6 Feet', '8 Feet'],
    Ash: ['4 Feet', '6 Feet', '8 Feet'],
    Birch: ['4 Feet', '6 Feet', '8 Feet', '10 Feet', '12 Feet', '16 Feet', '18 Feet'],
    Cherry: ['8 Feet', '10 Feet', '12 Feet', '16 Feet'],
    Mahogany: ['8 Feet'],
};

const WOOD_PRICE = {
    Cedar: 10,
    Fir: 20,
    Pine: 20,
    Redwood: 30,
    Ash: 80,
    Birch: 30,
    Cherry: 50,
    Mahogany: 100,
};

const SIZE_PRICE = {
    'One-by-Two': 1,
    'One-by-Three': 1.1,
    'One-by-Four': 1.2,
    'One-by-Six': 1.5,
    'Two-by-Four': 2,
    'Two-by-Six': 2.2,
    'Two-by-Eight': 2.3,
    'Two-by-Ten': 2.4,
};

const LENGTH_PRICE = {
    '4 Feet': 1,
    '6 Feet': 1.3,
    '8 Feet': 1.5,
    '10 Feet': 2,
    '12 Feet': 2.2,
    '14 Feet': 2.4,
    '16 Feet': 2.6,
    '18 Feet': 2.8,
};

function ProductPage({ onNavigate }) {
    const lumberSizesSrc = new URL('./Images/img_lumbersizes.png', import.meta.url).href;

    const [backendAvailable, setBackendAvailable] = useState(false);
    const [loginLabel, setLoginLabel] = useState('Login');
    const [selectedWood, setSelectedWood] = useState('Cedar');
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedLength, setSelectedLength] = useState('');
    const [selectedImageId, setSelectedImageId] = useState('img1');
    const [propertiesTitle, setPropertiesTitle] = useState('Properties');
    const [propertiesList, setPropertiesList] = useState([]);
    const [quantity, setQuantity] = useState('');
    const [quantityStatus, setQuantityStatus] = useState('');
    const [calculatedCost, setCalculatedCost] = useState(0);
    const [cartItems, setCartItems] = useState([]);
    const [showCart, setShowCart] = useState(false);
    const [sizes, setSizes] = useState([]);
    const [lengths, setLengths] = useState([]);

    useEffect(() => {
        const { user, expired } = checkLegacySessionOnLoad();
        if (user?.username) {
            setLoginLabel(`Welcome,${user.username}`);
        } else if (expired) {
            setLoginLabel('Login');
        } else {
            setLoginLabel('Login');
        }

        fetch(`${BACKEND_BASE_URL}/products.php?input=test`, { method: 'GET' })
            .then((response) => setBackendAvailable(response.ok))
            .catch(() => setBackendAvailable(false));
    }, []);

    useEffect(() => {
        getSizesAndLengths(selectedWood);
    }, [selectedWood, backendAvailable]);

    useEffect(() => {
        getProperties(selectedImageId);
    }, [selectedImageId, backendAvailable]);

    useEffect(() => {
        calculatePrice();
    }, [selectedWood, selectedSize, selectedLength, quantity, backendAvailable]);

    async function getProperties(imgId) {
        if (backendAvailable) {
            try {
                const response = await fetch(`${BACKEND_BASE_URL}/GetProperties.php?imgid=${encodeURIComponent(imgId)}`, { method: 'GET' });
                if (response.ok) {
                    const text = (await response.text()).trim();
                    const parsed = text.split(',').map((x) => x.trim()).filter(Boolean);
                    if (parsed.length > 0) {
                        setPropertiesTitle(`${parsed[0]} Properties:`);
                        setPropertiesList(parsed.slice(1));
                        return;
                    }
                }
            } catch {
                // Use local fallback when backend call fails.
            }
        }

        const local = LOCAL_PROPERTIES[imgId] || ['Unknown'];
        setPropertiesTitle(`${local[0]} Properties:`);
        setPropertiesList(local.slice(1));
    }

    async function getSizesAndLengths(woodType) {
        let nextSizes = LOCAL_SIZES[woodType] || [];
        let nextLengths = LOCAL_LENGTHS[woodType] || [];

        if (backendAvailable) {
            try {
                const [sizeResponse, lengthResponse] = await Promise.all([
                    fetch(`${BACKEND_BASE_URL}/GetSize.php?woodtype=${encodeURIComponent(woodType)}`, { method: 'GET' }),
                    fetch(`${BACKEND_BASE_URL}/GetLength.php?woodtype=${encodeURIComponent(woodType)}`, { method: 'GET' }),
                ]);

                if (sizeResponse.ok) {
                    const backendSizes = JSON.parse(await sizeResponse.text());
                    if (Array.isArray(backendSizes) && backendSizes.length) {
                        nextSizes = backendSizes;
                    }
                }

                if (lengthResponse.ok) {
                    const backendLengths = JSON.parse(await lengthResponse.text());
                    if (Array.isArray(backendLengths) && backendLengths.length) {
                        nextLengths = backendLengths;
                    }
                }
            } catch {
                // Keep local fallback values.
            }
        }

        setSizes(nextSizes);
        setLengths(nextLengths);
        setSelectedSize(nextSizes[0] || '');
        setSelectedLength(nextLengths[0] || '');
    }

    async function calculatePrice() {
        const quant = Number(quantity);
        if (!Number.isFinite(quant) || quant < 1) {
            setQuantityStatus(quantity === '' ? '' : 'Invalid input!');
            setCalculatedCost(0);
            return;
        }

        if (quant > 30) {
            setQuantityStatus('Too much!');
            setCalculatedCost(0);
            return;
        }

        setQuantityStatus('');

        if (!selectedSize || !selectedLength) {
            setCalculatedCost(0);
            return;
        }

        if (backendAvailable) {
            try {
                const data = `${selectedWood},${selectedSize},${selectedLength},${quant}`;
                const response = await fetch(`${BACKEND_BASE_URL}/calculatePrice.php?data=${encodeURIComponent(data)}`, { method: 'GET' });
                if (response.ok) {
                    const backendCost = parseFloat((await response.text()).trim());
                    setCalculatedCost(Number.isFinite(backendCost) ? backendCost : 0);
                    return;
                }
            } catch {
                // Use local fallback when backend call fails.
            }
        }

        const localCost = (WOOD_PRICE[selectedWood] || 0) * (SIZE_PRICE[selectedSize] || 0) * (LENGTH_PRICE[selectedLength] || 0) * quant;
        setCalculatedCost(localCost);
    }

    function addToCart() {
        const quant = Number(quantity);
        if (!Number.isFinite(quant) || quant < 1 || quant > 30 || calculatedCost <= 0) {
            return;
        }

        const item = `${selectedLength} ${selectedSize} ${selectedWood} Plank x${quant} $ ${calculatedCost.toFixed(2)}`;
        setCartItems((prev) => [...prev, item]);
    }

    function clearCart() {
        setCartItems([]);
    }

    const isAddDisabled = quantityStatus !== '' || !quantity || calculatedCost <= 0;

    const woodImages = useMemo(() => ([
        { id: 'img1', src: new URL('./Images/img_cedar.png', import.meta.url).href, alt: 'Image of Cedar' },
        { id: 'img2', src: new URL('./Images/img_fir.png', import.meta.url).href, alt: 'Image of Fir' },
        { id: 'img3', src: new URL('./Images/img_pine.png', import.meta.url).href, alt: 'Image of Pine' },
        { id: 'img4', src: new URL('./Images/img_redwood.png', import.meta.url).href, alt: 'Image of Redwood' },
        { id: 'img5', src: new URL('./Images/img_ash.png', import.meta.url).href, alt: 'Image of Ash' },
        { id: 'img6', src: new URL('./Images/img_birch.png', import.meta.url).href, alt: 'Image of Birch' },
        { id: 'img7', src: new URL('./Images/img_cherry.png', import.meta.url).href, alt: 'Image of Cherry' },
        { id: 'img8', src: new URL('./Images/img_mahogany.png', import.meta.url).href, alt: 'Image of Mahogany' },
    ]), []);

    return (
        <LegacyPageLayout
            navbar={(
                <LegacyNavbar
                    backendAvailable={backendAvailable}
                    backendBaseUrl={BACKEND_BASE_URL}
                    onGoHome={() => {
                        window.location.href = 'HomePage.html';
                    }}
                    onGoProduct={() => { if (onNavigate) {
                            onNavigate('product');
                            return;
                        } }}
                    onGoFurniture={() => { window.location.href = 'ErrorPage.html'; }}
                    onGoLogin={() => { 
                        if (onNavigate) {
                            onNavigate('login');
                            return;
                        }
                    }}
                    loginLabel={loginLabel}
                />
            )}
            contentStyle={{ height: '100%', minHeight: '1000px' }}
        >
            <div id="cartdiv" style={{ visibility: showCart ? 'visible' : 'hidden', position: 'fixed', marginLeft: '80%', border: '2px solid black', zIndex: 5, height: '500px', width: '200px', float: 'right', backgroundColor: 'white', padding: '10px' }}>
                <div style={{ border: '1px solid black', textAlign: 'center' }}><h2>Cart</h2></div>
                <div style={{ border: '1px solid black', display: 'block', height: '410px', overflowY: 'scroll' }}>
                    <ul id="cart">
                        {cartItems.map((item, idx) => <li key={`${item}-${idx}`}>{item}</li>)}
                    </ul>
                </div>
                <div style={{ marginLeft: 'auto', marginRight: 'auto', width: '155px', position: 'relative' }}>
                    <button id="clear" type="button" onClick={clearCart}>Clear Cart</button>
                    <button id="purchase" type="button">Checkout</button>
                </div>
            </div>
                <div style={{ marginLeft: '20px', marginRight: '20px' }}>
                    <h1>Finished Wood</h1>
                    <p><b>What type of wood would you like?</b></p>
                    <p style={{ fontSize: '20px' }}>In order below: Cedar, Fir, Pine, Redwood, Ash, Birch, Cherry, Mahogany.</p>

                    <div style={{ height: '200px', marginBottom: '50px' }}>
                        <div className="imgcont">
                            {woodImages.map((img, idx) => (
                                <img
                                    key={img.id}
                                    id={img.id}
                                    className="imgstack"
                                    src={img.src}
                                    alt={img.alt}
                                    style={{ left: `${idx * 100}px`, zIndex: selectedImageId === img.id ? 2 : 1, border: selectedImageId === img.id ? '2px solid black' : '0px solid black' }}
                                    onClick={() => setSelectedImageId(img.id)}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="imgcont2">
                        <img src={lumberSizesSrc} alt="Picture of Lumber Sizes" style={{ objectFit: 'fit' }} />
                    </div>

                    <div style={{ height: '100px' }}>
                        <h2 id="DProperties">{propertiesTitle}</h2>
                        <ul id="Properties">
                            {propertiesList.map((prop, idx) => <li key={`${prop}-${idx}`}>{prop}</li>)}
                        </ul>
                    </div>

                    <select id="Type" name="Types of Wood" value={selectedWood} onChange={(e) => setSelectedWood(e.target.value)}>
                        {WOOD_OPTIONS.map((wood) => <option key={wood}>{wood}</option>)}
                    </select>

                    <h3 id="DSizes">Available Sizes</h3>
                    <select id="Sizes" name="Available Sizes" value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
                        {sizes.map((size) => <option key={size}>{size}</option>)}
                    </select>

                    <h3 id="DLengths">Available Length</h3>
                    <select id="Lengths" name="Available Length" value={selectedLength} onChange={(e) => setSelectedLength(e.target.value)}>
                        {lengths.map((length) => <option key={length}>{length}</option>)}
                    </select>

                    <p><b>Quantity</b></p>
                    <p>Input quantity below.</p>
                    <label>Quantity: </label>
                    <input type="number" id="Quantity" name="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="0" max="99" />
                    <label id="qStatus"> {quantityStatus}</label>
                    <br /><br />
                    <label id="dCost"><b>Price: </b></label>
                    <label id="cost">$ {calculatedCost.toFixed(2)}</label>
                    <br /><br />

                    <div>
                        <button id="addtocart" type="button" onClick={addToCart} disabled={isAddDisabled}>Add to Cart</button>
                        <button id="viewcart" type="button" onClick={() => setShowCart((prev) => !prev)}>View Cart</button>
                    </div>

                    <br /><br /><br /><br /><br />
                    <div style={{ border: '1px solid black', marginTop: '20px', paddingLeft: '20px' }}>
                        <p>Not a carpenter? Not interested in making your own furniture? Then head on over to our <a style={{ color: 'blue' }} href="ErrorPage.html">furniture</a> section for our pre-built furniture!</p>
                    </div>
                    <br /><br /><br />
                </div>
        </LegacyPageLayout>
    );
}

export default ProductPage;
