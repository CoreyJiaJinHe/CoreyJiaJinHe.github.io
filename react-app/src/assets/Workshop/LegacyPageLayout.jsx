import LegacyHeader from './LegacyHeader';
import LegacyFooter from './LegacyFooter';

function LegacyPageLayout({ navbar, contentStyle, children }) {
    return (
        <div style={{ backgroundColor: 'black' }}>
            <LegacyHeader>{navbar}</LegacyHeader>
            <div className="content" style={contentStyle}>
                {children}
            </div>
            <LegacyFooter />
        </div>
    );
}

export default LegacyPageLayout;
