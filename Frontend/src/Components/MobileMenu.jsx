import React from "react";
import { AiOutlineHome, AiOutlineMessage, AiOutlineGlobal, AiOutlineUser, AiOutlineEdit, AiOutlineTeam, AiOutlineLogout } from 'react-icons/ai';

const MobileMenu = ({ navItems, isOpen, onClose, onLogout, location, navigate }) => {
    const IconComponent = {
        'AiOutlineHome': AiOutlineHome,
        'AiOutlineMessage': AiOutlineMessage,
        'AiOutlineGlobal': AiOutlineGlobal,
        'AiOutlineUser': AiOutlineUser,
        'AiOutlineEdit': AiOutlineEdit,
        'AiOutlineTeam': AiOutlineTeam,
    };

    if (!isOpen) return null;

    return (
        <div className="mobile-menu-overlay">
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
                    >
                        <AiOutlineLogout className="nav-icon" />
                    </button>
                </nav>
            </div>
        </div>
    );
};

export default MobileMenu;