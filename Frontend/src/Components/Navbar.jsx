import React from "react";
import { AiOutlineHome, AiOutlineClockCircle, AiOutlineGlobal, AiOutlineUser, AiOutlineEdit, AiOutlineTeam, AiOutlineLogout } from 'react-icons/ai';

const Navbar = ({ navItems, location, navigate }) => {
    const IconComponent = {
        'AiOutlineHome': AiOutlineHome,
        'AiOutlineClockCircle': AiOutlineClockCircle,
        'AiOutlineGlobal': AiOutlineGlobal,
        'AiOutlineUser': AiOutlineUser,
        'AiOutlineEdit': AiOutlineEdit,
        'AiOutlineTeam': AiOutlineTeam,
    };

    // Add a logout function here
    const handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
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
            <button
                onClick={handleLogout}
                className="nav-button logout-button"
            >
                <AiOutlineLogout className="nav-icon" />
            </button>
        </nav>
    );
};

export default Navbar;