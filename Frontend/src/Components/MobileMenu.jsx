import { AiOutlineHome, AiOutlineMessage, AiOutlineGlobal, AiOutlineUser, AiOutlineEdit, AiOutlineTeam, AiOutlineLogout, AiOutlineClose, AiOutlineUserAdd } from 'react-icons/ai';

const MobileMenu = ({ navItems, isOpen, onClose, onLogout, location, navigate, isLoggingOut }) => {
    const IconComponent = {
        'AiOutlineHome': AiOutlineHome,
        'AiOutlineMessage': AiOutlineMessage,
        'AiOutlineUserAdd': AiOutlineUserAdd,
        'AiOutlineGlobal': AiOutlineGlobal,
        'AiOutlineUser': AiOutlineUser,
        'AiOutlineEdit': AiOutlineEdit,
        'AiOutlineTeam': AiOutlineTeam,
    };

    if (!isOpen) return null;

    return (
        <div className="mobile-menu-overlay">
            <button
                className="mobile-menu-close-btn"
                onClick={onClose}
                title="Close menu"
                style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', cursor: 'pointer', zIndex: 10 }}
            >
                <AiOutlineClose style={{ fontSize: '2rem', color: '#374151' }} />
            </button>
            <div className="mobile-menu">
                <nav className="nav mobile-nav">
                    {navItems.map((item) => {
                        const Icon = IconComponent[item.icon];
                        return (
                            <button
                                key={item.path}
                                onClick={() => {
                                    navigate(item.path);
                                    onClose();
                                }}
                                className={`nav-button${location.pathname === item.path ? ' nav-button-active' : ''}`}
                            >
                                <Icon className="nav-icon" />
                            </button>
                        );
                    })}
                    <button
                        onClick={() => {
                            onLogout();
                            onClose();
                        }}
                        className="nav-button logout-button"
                        disabled={isLoggingOut}
                    >
                        {isLoggingOut ? (
                            <div className="logout-spinner"></div>
                        ) : (
                            <AiOutlineLogout className="nav-icon" />
                        )}
                    </button>
                </nav>
            </div>
        </div>
    );
};

export default MobileMenu;