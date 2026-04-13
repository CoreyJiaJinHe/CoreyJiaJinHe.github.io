import { useMemo } from 'react';
import './mycssv2.css';
function HomePage({ onNavigate }) {
    const woodImages = useMemo(() => ({
        cedar: new URL('./Images/img_cedar.png', import.meta.url).href,
        fir: new URL('./Images/img_fir.png', import.meta.url).href,
        pine: new URL('./Images/img_pine.png', import.meta.url).href,
        redwood: new URL('./Images/img_redwood.png', import.meta.url).href,
        ash: new URL('./Images/img_ash.png', import.meta.url).href,
        birch: new URL('./Images/img_birch.png', import.meta.url).href,
        cherry: new URL('./Images/img_cherry.png', import.meta.url).href,
        mahogany: new URL('./Images/img_mahogany.png', import.meta.url).href,
    }), []);

    return (
        <>
                <div className="content">
                    <div style={{ color: 'black', fontSize: '20px', marginLeft: '5px', marginRight: '5px' }}>
                        <p> We at Beaver's Woodshop pride ourselves as one of the best woodworkers in the country! We sell many different wooden products, from processed wood to pre-fabricated furniture and even assembled furniture. Each hand-made by our best carpenters.
                            <br></br>
                            Purchase now from our online store, or come in person and pick what wood suits you best!</p>
                    </div>
                </div>
                    <div className="content2">
                        <div style={{ marginLeft: '20px', marginRight: '20px', fontSize: '20px' }}>
                            <h2>Types of Wood sold </h2>
                            <dl style={{ marginLeft: '40px' }}>
                                <dt> Cedar <img src={woodImages.cedar} alt="Image of Cedar Wood" style={{ height: '60px', width: '4%', objectFit: 'fill', float: 'right' }}></img></dt>
                                <dd> Cedar is prized for its natural resistance to decay and insect damage, which makes it ideal for outdoor projects. This wood is often used for shingles, shakes, posts, poles, outdoor furniture, interior paneling, house siding, decks, and saunas. Also, cedar is lightweight and this makes it an excellent choice for fishing net floats and canoes.</dd>
                                <dt> Fir <img src={woodImages.fir} alt="Image of Fir Wood" style={{ height: '60px', width: '4%', objectFit: 'fill', float: 'right' }}></img></dt>
                                <dd>Fir is chosen often due to it's relatively cheap price in the wood industry and it's availability. It is often used as construction and building products: lumber, plywood, doors, studding, roof trusses, floor and ceiling joists, window frames, laminated beams, and general millwork. Nonetheless, it makes a wonderful wood for furniture and fine cabinetry.</dd>
                                <dt> Pine <img src={woodImages.pine} alt="Image of Pine Wood" style={{ height: '60px', width: '4%', objectFit: 'fill', float: 'right' }}></img></dt>
                                <dd>Pine is a very stiff wood. This makes it durable and strong when used in furniture. It's not quite as strong as oak, but it does still offer durability. It is light in color, usually with a creamy white look, though the specific shade can vary. It's light color makes pine easy to stain any color you want, or you could apply a clear coat to protect the wood to let it's natural white color take center stage.</dd>
                                <dt> Redwood<img src={woodImages.redwood} alt="Image of Redwood Wood" style={{ height: '60px', width: '4%', objectFit: 'fill', float: 'right' }}></img> </dt>
                                <dd>Redwood is a wood that is very resistant to moisture. Thus making it a great choice for outdoor furniture. It is relatively soft and easy to work with. It has a slight reddish hue. You can use stains and paint on redwood, but it is such a nice color that many woodworkers use a water repellant with mildewcide for outdoor furniture.</dd>
                                <dt> Ash <img src={woodImages.ash} alt="Image of Ash Wood" style={{ height: '60px', width: '4%', objectFit: 'fill', float: 'right' }}></img></dt>
                                <dd>Ash is a relatiely rare wood. It is not often used within the shop though one is sure to have come in contact with the wood at some times. It is the traditional material for the handles of various tools because of it's hardness, stability, durability (indoors) and strength. It's strength is comparable to that as sugar maple. It is known for it's staining potential and ability to mimic oak. It has greak shock resistance and solid workability.
                                </dd>
                                <dt> Birch <img src={woodImages.birch} alt="Image of Birch Wood" style={{ height: '60px', width: '4%', objectFit: 'fill', float: 'right' }}></img></dt>
                                <dd>Birch is an abundant material in North America. Though it isn't a superior furniture-grade hardwood, it is a good one. It is both durable and attactive, it takes stain well and it's affordable. Birch is workable, it doesn't nick or gouge easily. It has a close grain that allows for even stains. Birch lumber has a handsome appearance. Because of its fine texture and straight grain, it machines well and routs beautifully.Though hard, birch is easy to sand, and it turns like a dream. Birch plywood is available in a wide range of grades.</dd>
                                <dt> Cherry <img src={woodImages.cherry} alt="Image of Cherry Wood" style={{ height: '60px', width: '4%', objectFit: 'fill', float: 'right' }}></img> </dt>
                                <dd>Cherry is a hardwood that is slightly more difficult to work with. However, it is considered a softer hardwood. It's appearance has a warmer reddish tone that can complement a lighter interior. It is easy to machine, nails and glues well, and when sanded and stained, it produces an excellent smooth finish. It dries fairly quickly with moderately high shrinkage but is dimensionally stable after kiln drying.</dd>
                                <dt> Mahogany <img src={woodImages.mahogany} alt="Image of Mahogany Wood" style={{ height: '60px', width: '4%', objectFit: 'fill', float: 'right' }}></img></dt>
                                <dd>Mahogany is a fan favourite for many generations of woodworkers. Genuine mahogany consists of two closely related species. Cuban mahogany and Honduran mahogany. Mahogany is loved for it's beauty, workability and stability. The Cuban mahogany provides a denser wood with tight growth rings, fine texture and a deep reddish brown color. While the Honduran mahogany varies greatly in density, color and figure, depending on where it's grown.</dd>
                            </dl>
                            <p style={{ marginLeft: '20px' }}>
                                Please proceed to{' '}
                                <a
                                    href="#"
                                    style={{ textDecoration: 'underline', color: 'blue' }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (onNavigate) {
                                            onNavigate('product');
                                        }
                                    }}
                                >
                                    Processed Wood
                                </a>{' '}
                                to order.
                            </p>

                        </div>
                    </div>
        </>
    )
}
export default HomePage;

