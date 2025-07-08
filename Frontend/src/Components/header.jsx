import React from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import '../Style/header.css';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('email');
        navigate('/login');
        
    };

    return(
        <header className="header">
            <h1>RealTalk</h1>
            <nav className="navbar">
                <button onClick={() => navigate('/')} className={`nav-btn${location.pathname === '/' ? ' active' : ''}`}>Home</button>
                <button onClick={() => navigate('/chat')} className={`nav-btn${location.pathname === '/chat' ? ' active' : ''}`}>Chats</button>
                <button onClick={() => navigate('/profile')} className={`nav-btn${location.pathname === '/profile' ? ' active' : ''}`}>View Profile</button>
                <button onClick={() => navigate('/update-profile')} className={`nav-btn${location.pathname === '/update-profile' ? ' active' : ''}`}>Update Profile</button>
                <button onClick={() => navigate('/online-users')} className={`nav-btn${location.pathname === '/online-users' ? ' active' : ''}`}>Online Users</button>
                <button onClick={handleLogout} className="nav-btn">Logout</button>
            </nav>
        </header>
    );
};

export default Header;