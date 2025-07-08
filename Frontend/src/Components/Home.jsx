import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../Style/home.css';
import Header from './header';

const Home = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!location.search.includes('reloaded=1')) {
            navigate(`${location.pathname}?reloaded=1`, { replace: true });
            window.location.reload();
        }
    }, [location, navigate]);

    return (
        <>
        <Header/>
        <div className="home-container">
            <header className="home-header">
                <h1>Welcome to RealTalk</h1>
                <p className="subtitle">
                    A secure, real-time chat platform where conversations flow seamlessly.
                </p>
                
            </header>

            <section className="features">
                <h2>Features</h2>
                <ul>
                    <li>Real-Time Messaging using WebSockets</li>
                    <li>Secure JWT Authentication</li>
                    <li>Update Profile Anytime</li>
                    <li>Persistent Chat History</li>
                    <li>Modern UI for a smooth experience</li>
                </ul>
            </section>
        </div>
        </>
    );
};

export default Home;