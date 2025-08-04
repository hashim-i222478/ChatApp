import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from './Logo';
import Navbar from './Navbar';
import MobileMenu from './MobileMenu';
import { AiOutlineBell, AiOutlineUser, AiOutlineLogout } from 'react-icons/ai';
import { friendsStorage } from '../Services/friendsStorage';
import '../Style/header.css';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [unread, setUnread] = useState({});
    const [notifVisible, setNotifVisible] = useState(false);
    const [notifAnimClass, setNotifAnimClass] = useState('');
    const notifTimeoutRef = useRef(null);
    const notifExitTimeoutRef = useRef(null);
    const prevUnreadRef = useRef({});
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarAnimClass, setSidebarAnimClass] = useState('');
    const [usernames, setUsernames] = useState({});
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('You must be logged in to access this page.');
            navigate('/login');
            return;
        }
        const updateUnread = () => {
            const data = JSON.parse(localStorage.getItem('unread_private') || '{}');
            setUnread(data);
        };
        updateUnread();
        window.addEventListener('unread-updated', updateUnread);
        return () => window.removeEventListener('unread-updated', updateUnread);
    }, []);

    useEffect(() => {
        const userIds = Object.keys(unread || {});
        const missingIds = userIds.filter(id => !usernames[id]);
        if (missingIds.length === 0 || !token) return;
        Promise.all(missingIds.map(id => fetchUsername(id, token))).then(results => {
            const newUsernames = { ...usernames };
            missingIds.forEach((id, idx) => {
                newUsernames[id] = results[idx];
            });
            setUsernames(newUsernames);
        });
    }, [unread, token]);

    const fetchUsername = async (userId, token) => {
        try {
            const res = await fetch(`http://localhost:8080/api/users/username/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch username');
            const data = await res.json();
            return data.username || userId;
        } catch {
            return userId;
        }
    };

    const playNotificationSound = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.value = 880;
            g.gain.value = 0.08;
            o.connect(g);
            g.connect(ctx.destination);
            o.start();
            setTimeout(() => { o.stop(); ctx.close(); }, 180);
        } catch (e) {}
    };

    useEffect(() => {
        const prevUnread = prevUnreadRef.current;
        let shouldShow = false;
        for (const userId of Object.keys(unread)) {
            if (!prevUnread[userId] || unread[userId] > prevUnread[userId]) {
                shouldShow = true;
                break;
            }
        }
        if (shouldShow || (Object.keys(unread).length > 0 && !notifVisible)) {
            setNotifVisible(true);
            setNotifAnimClass('header-notification-panel-appear');
            playNotificationSound();
            if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
            if (notifExitTimeoutRef.current) clearTimeout(notifExitTimeoutRef.current);
            notifTimeoutRef.current = setTimeout(() => {
                setNotifAnimClass('header-notification-panel-exit');
                notifExitTimeoutRef.current = setTimeout(() => {
                    setNotifVisible(false);
                }, 500);
            }, 10000);
        } else if (Object.keys(unread).length === 0) {
            setNotifVisible(false);
        }
        prevUnreadRef.current = { ...unread };
        return () => {
            if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
            if (notifExitTimeoutRef.current) clearTimeout(notifExitTimeoutRef.current);
        };
    }, [unread]);

    const handleLogout = () => {
        console.log('Attempting to log out...');
        setIsLoggingOut(true);
        
        // Show loader for 3 seconds before actually logging out
        setTimeout(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('email');
            localStorage.removeItem('userId');
            // Clear friends cache on logout
            friendsStorage.clearFriends();
            console.log('LocalStorage after logout:', {
                token: localStorage.getItem('token'),
                username: localStorage.getItem('username'),
                email: localStorage.getItem('email'),
                userId: localStorage.getItem('userId'),
                friends: localStorage.getItem('friends')
            });
            setIsLoggingOut(false);
            navigate('/login', { replace: true });
            console.log('Redirecting to login page...');
        }, 3000);
    };

    const navItems = [
        { path: '/', icon: 'AiOutlineHome', label: 'Home' },
        { path: '/recent-chats', icon: 'AiOutlineMessage', label: 'Recent Chats' },
        { path: '/friends', icon: 'AiOutlineTeam', label: 'Friends' }
    ];

    const handleOpenSidebar = () => {
        setSidebarOpen(true);
        setSidebarAnimClass('');
    };

    const handleCloseSidebar = () => {
        setSidebarAnimClass('header-notification-sidebar-exit');
        setTimeout(() => setSidebarOpen(false), 300);
    };

    const handleClearNotifications = () => {
        localStorage.removeItem('unread_private');
        setUnread({});
        window.dispatchEvent(new CustomEvent('unread-updated'));
    };

    const unreadCount = Object.values(unread).reduce((a, b) => a + b, 0);

    return (
        <header className="header">
            <div className="header-container">
                <div className="header-row">
                    <Logo />
                    <Navbar navItems={navItems} location={location} navigate={navigate} />
                    <div className="header-actions">
                        <button
                            onClick={handleOpenSidebar}
                            className="header-notification-bell"
                            aria-label="View notifications"
                        >
                            <AiOutlineBell className="notification-icon" />
                            {unreadCount > 0 && <span className="header-notification-badge">{unreadCount}</span>}
                        </button>
                        {/* Move Profile and Logout buttons here, using the same button components/styles as before */}
                        <button
                            className={`nav-button${location.pathname === '/profile' ? ' nav-button-active' : ''}`}
                            onClick={() => navigate('/profile')}
                            title="View Profile"
                        >
                            <span className="nav-icon"><AiOutlineUser /></span>
                        </button>
                        <button
                            className={`nav-button logout-button${location.pathname === '/login' ? ' nav-button-active' : ''}`}
                            onClick={handleLogout}
                            title="Logout"
                            disabled={isLoggingOut}
                        >
                            <span className="nav-icon">
                                {isLoggingOut ? (
                                    <div className="logout-spinner"></div>
                                ) : (
                                    <AiOutlineLogout />
                                )}
                            </span>
                        </button>
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
                </div>
                <MobileMenu
                    navItems={navItems}
                    isOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                    onLogout={handleLogout}
                    location={location}
                    navigate={navigate}
                    isLoggingOut={isLoggingOut}
                />
                {sidebarOpen && (
                    <div className={`header-notification-sidebar ${sidebarAnimClass}`}>
                        <div className="header-notification-sidebar-header">
                            <span className="header-notification-sidebar-title">Private Message Notifications</span>
                            <button className="header-notification-sidebar-close" onClick={handleCloseSidebar} title="Close notifications">×</button>
                        </div>
                        <div className="header-notification-sidebar-list">
                            {Object.keys(unread).length === 0 ? (
                                <div className="header-notification-sidebar-empty">No unread private messages.</div>
                            ) : (
                                Object.keys(unread).map(userId => {
                                    const username = usernames[userId] || userId;
                                    return (
                                        <div key={userId} className="header-notification-sidebar-message">
                                            You have {unread[userId]} unread message{unread[userId] > 1 ? 's' : ''} from <span className="header-notification-sidebar-username">{username} (ID: {userId})</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        {Object.keys(unread).length > 0 && (
                            <button className="header-notification-sidebar-clear" onClick={handleClearNotifications}>Clear All</button>
                        )}
                    </div>
                )}
            </div>
            
            {/* Logout Loader Overlay */}
            {isLoggingOut && (
                <div className="logout-overlay">
                    <div className="logout-loader-container">
                        <div className="logout-loader-spinner"></div>
                        <p className="logout-loader-text">Logging out...</p>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;