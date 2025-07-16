import React, { useState } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import '../Style/header.css';
const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('email');
        localStorage.removeItem('userId');
        navigate('/login');
    };

    const navItems = [
        { path: '/', label: 'Home' },
        { path: '/chat', label: 'Global Chats' },
        { path: '/profile', label: 'View Profile' },
        { path: '/update-profile', label: 'Update Profile' },
        { path: '/online-users', label: 'Online Users' },
        { path: '/recent-chats', label: 'Recent Chats' },
    ];

    return (
        <header className="header">
            <div className="header-container">
                <div className="header-row">
                    {/* Logo */}
                    <div className="logo">
                        <h1 className="logo-text">
                            RealTalk
                        </h1>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="nav desktop-nav">
                        {navItems.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`nav-button${location.pathname === item.path ? ' nav-button-active' : ''}`}
                            >
                                {item.label}
                            </button>
                        ))}
                        <button
                            onClick={handleLogout}
                            className="nav-button logout-button"
                        >
                            Logout
                        </button>
                    </nav>

                    {/* Mobile Menu Button */}
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

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="mobile-menu">
                        <nav className="nav mobile-nav">
                            {navItems.map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => {
                                        navigate(item.path);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className={`nav-button${location.pathname === item.path ? ' nav-button-active' : ''}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                            <button
                                onClick={() => {
                                    handleLogout();
                                    setIsMobileMenuOpen(false);
                                }}
                                className="nav-button logout-button"
                            >
                                Logout
                            </button>
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;