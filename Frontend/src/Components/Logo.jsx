import React from 'react';
import { useNavigate } from 'react-router-dom';
import logoImage from '../Style/Logo.png';

const Logo = () => {
    const navigate = useNavigate();
    
    return (
        <div className="logo-container" onClick={() => navigate('/')}>
            <img src={logoImage} alt="RealTalk Logo" className="app-logo" />
            <span className="app-name">RealTalk</span>
        </div>
    );
};

export default Logo;