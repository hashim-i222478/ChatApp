import { AiOutlineHome, AiOutlineMessage, AiOutlineGlobal, AiOutlineUser, AiOutlineEdit, AiOutlineTeam, AiOutlineLogout, AiOutlineUserAdd } from 'react-icons/ai';

const Navbar = ({ navItems, location, navigate }) => {
    const IconComponent = {
        'AiOutlineHome': AiOutlineHome,
        'AiOutlineMessage': AiOutlineMessage,
        'AiOutlineUserAdd': AiOutlineUserAdd,
        'AiOutlineGlobal': AiOutlineGlobal,
        'AiOutlineUser': AiOutlineUser,
        'AiOutlineEdit': AiOutlineEdit,
        'AiOutlineTeam': AiOutlineTeam,
    };

    // Add a logout function here
    const handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        // Dispatch logout event to close WebSocket connection
        window.dispatchEvent(new CustomEvent('user-logged-out'));
        window.location.href = '/login';
    };

    return (
        <nav className="nav desktop-nav">
            {navItems.map((item) => {
                const Icon = IconComponent[item.icon];
                return (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={`nav-button${location.pathname === item.path ? ' nav-button-active' : ''}`}
                    >
                        {Icon && <Icon className="nav-icon" />}
                    </button>
                );
            })}
            
        </nav>
    );
};

export default Navbar;