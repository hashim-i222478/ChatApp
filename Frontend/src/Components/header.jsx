import React, { useState } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from './Logo';
import Navbar from './Navbar';
import MobileMenu from './MobileMenu';
import '../Style/header.css';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
    };

    const navItems = [
        { path: '/', icon: 'AiOutlineHome', label: 'Home' },
        { path: '/recent-chats', icon: 'AiOutlineClockCircle', label: 'Recent Chats' },
        { path: '/chat', icon: 'AiOutlineGlobal', label: 'Global Chats' },
        { path: '/profile', icon: 'AiOutlineUser', label: 'View Profile' },
        { path: '/online-users', icon: 'AiOutlineTeam', label: 'Online Users' },
    ];

    return (
        <header className="header">
            <div className="header-container">
                <div className="header-row">
                    <Logo />
                    <Navbar navItems={navItems} location={location} navigate={navigate} />
                    <div className="mobile-menu-button-container">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="mobile-menu-button"
                        >
                            <svg className="mobile-menu-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {isMobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>
                <MobileMenu
                    navItems={navItems}
                    isOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                    onLogout={handleLogout}
                    location={location}
                    navigate={navigate}
                />
            </div>
        </header>
    );
};

export default Header;