import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../Style/home.css';
import Header from './header';

const Home = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [copied, setCopied] = useState(false);
    const [newChatId, setNewChatId] = useState('');
    const [newChatError, setNewChatError] = useState('');
    const [newChatLoading, setNewChatLoading] = useState(false);
    const [showNewChatModal, setShowNewChatModal] = useState(false);

    useEffect(() => {   
        const token = localStorage.getItem('token');
        if (!token) {
            if (!sessionStorage.getItem('alertShown')) {
                sessionStorage.setItem('alertShown', 'true');
                alert('You are not logged in. Please log in to access this page.');
            }
            navigate('/login', { replace: true });
        } else {
            setIsCheckingAuth(false);
        }
    }, [navigate]);

    useEffect(() => {
        if (!location.search.includes('reloaded=1')) {
            navigate(`${location.pathname}?reloaded=1`, { replace: true });
            window.location.reload();
        }
    }, [location, navigate]);

    const handleStartNewChat = async (e) => {
        e.preventDefault();
        setNewChatError('');
        setNewChatLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:8080/api/users/getUserById/${newChatId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('User not found');
            const data = await res.json();
            navigate(`/private-chat/${newChatId}`, { state: { username: data.username, userId: newChatId } });
        } catch (err) {
            setNewChatError('User not found. Please check the ID and try again.');
        } finally {
            setNewChatLoading(false);
        }
    };

    if (isCheckingAuth) {
        return null;
    }

    const features = [
        {
            icon: "⚡",
            title: "Real-Time Messaging using WebSockets",
            description: "Instant message delivery with WebSocket technology"
        },
        {
            icon: "🛡️",
            title: "Secure JWT Authentication",
            description: "Your conversations are protected with secure authentication"
        },
        {
            icon: "👤",
            title: "Update Profile Anytime",
            description: "Customize your profile whenever you want"
        },
        {
            icon: "🕒",
            title: "Persistent Chat History",
            description: "Never lose your important conversations"
        },
        {
            icon: "✨",
            title: "Modern UI for a smooth experience",
            description: "Intuitive design that makes chatting effortless"
        }
    ];

    return (
        <>
            <Header />
            <div className="home-background">
                

                {/* Modal for New Conversation */}
                {showNewChatModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(30,41,59,0.25)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 6px 24px rgba(0,0,0,0.18)', padding: '2.5rem 2rem 2rem', minWidth: 340, maxWidth: '90vw', textAlign: 'center', position: 'relative' }}>
                            <button
                                onClick={() => setShowNewChatModal(false)}
                                style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 22, color: '#64748b', cursor: 'pointer' }}
                                aria-label="Close"
                            >
                                ×
                            </button>
                            <h2 style={{ color: '#2563eb', fontWeight: 700, fontSize: '1.5rem', marginBottom: 12 }}>Start New Conversation</h2>
                            <form onSubmit={handleStartNewChat} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <input
                                    type="text"
                                    placeholder="Enter User ID to chat with"
                                    value={newChatId}
                                    onChange={e => setNewChatId(e.target.value)}
                                    style={{ padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid #ccc', fontSize: '1rem', marginBottom: 8 }}
                                    required
                                />
                                <button
                                    type="submit"
                                    style={{ background: 'linear-gradient(90deg, #2563eb 0%, #9333ea 100%)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                    disabled={newChatLoading}
                                >
                                    {newChatLoading ? 'Checking...' : 'Start Chat'}
                                </button>
                                {newChatError && <div style={{ color: '#dc2626', fontWeight: 500, marginTop: 4 }}>{newChatError}</div>}
                            </form>
                            <div style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 10 }}>
                                Enter the ID of the user you want to chat with. If the user exists, you will be taken to a private chat.
                            </div>
                        </div>
                    </div>
                )}

                {/* Hero Section */}
                <div className="hero-section">
                    <div className="hero-overlay"></div>
                    <div className="hero-content">
                        <h1 className="hero-title">
                            Welcome to{' '}
                            <span className="hero-title-gradient">RealTalk</span>
                        </h1>
                        <p className="hero-subtitle">
                            A secure, real-time chat platform where conversations flow seamlessly.
                        </p>
                        
                        <div className="hero-buttons">
                        <button
                        onClick={() => setShowNewChatModal(true)}
                        className="hero-button-primary"
                        style={{
                            background: 'linear-gradient(90deg, #2563eb 0%, #9333ea 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '0.9rem 2.2rem',
                            fontWeight: 700,
                            fontSize: '1.15rem',
                            cursor: 'pointer',
                            boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
                            transition: 'all 0.2s'
                        }}
                    >
                        + Start New Conversation
                    </button>
                            <button 
                                onClick={() => navigate('/online-users')}
                                className="hero-button-secondary"
                            >
                                View Online Users
                            </button>
                            
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="main-content">
                    <div className="content-grid">
                        {/* User Profile Section */}
                        <div className="profile-section">
                            <h2>Your Profile</h2>
                            <div className="profile-card">
                                <div className="profile-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                                    <div className="profile-id-row" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <span className="profile-id-label" style={{ fontWeight: 700, color: '#2563eb', fontSize: '1.15rem', letterSpacing: 0.5 }}>Your ID:</span>
                                        <span className="profile-id-value" style={{ fontWeight: 700, fontSize: '1.35rem', color: '#9333ea', background: '#f3f4f6', borderRadius: 8, padding: '0.25em 0.7em', marginLeft: 8 }}>{userId}</span>
                                        <button
                                            className="copy-id-btn"
                                            style={{ marginLeft: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: 20 }}
                                            title="Copy ID"
                                            onClick={() => {
                                                navigator.clipboard.writeText(userId);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 1500);
                                            }}
                                        >
                                            📋
                                        </button>
                                        {copied && (
                                            <span style={{ marginLeft: 8, color: '#22c55e', fontWeight: 600, fontSize: '1rem', transition: 'opacity 0.2s' }}>Copied!</span>
                                        )}
                                    </div>
                                    <div className="profile-id-note" style={{ color: '#374151', fontSize: '1rem', marginBottom: 8, width: '100%' }}>
                                        <span>Share this ID with others so they can start a chat with you. To start a new conversation, enter the other user's ID.</span>
                                    </div>
                                    <div className="profile-id-warning" style={{ color: '#dc2626', fontWeight: 600, fontSize: '1rem', marginBottom: 8, width: '100%' }}>
                                        <span>⚠️ Please save or remember this ID. It is required to start or receive conversations in RealTalk.</span>
                                    </div>
                                    <div className="profile-avatar" style={{ alignSelf: 'center' }}>
                                        👤
                                    </div>
                                    <div className="profile-info" style={{ alignSelf: 'center', textAlign: 'center' }}>
                                        <h3>{username}</h3>
                                    </div>
                                </div>
                                <div className="profile-tip">
                                    <p className="profile-tip-title">💡 Pro Tip</p>
                                    <p className="profile-tip-text">
                                        You can update your profile anytime to keep your information current.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => navigate('/update-profile')}
                                    className="profile-update-btn"
                                >
                                    Update Profile
                                </button>
                            </div>
                        </div>
                        
                        {/* Features Section */}
                        <div className="features-section">
                            <h2>Platform Features</h2>
                            <div className="features-list">
                                {features.map((feature, index) => (
                                    <div key={index} className="feature-card">
                                        <div className="feature-content">
                                            <div className="feature-icon">
                                                <span style={{ fontSize: '1.5rem' }}>{feature.icon}</span>
                                            </div>
                                            <div className="feature-text">
                                                <h3>{feature.title}</h3>
                                                <p>{feature.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions Section */}
                <div className="quick-actions">
                    <div className="quick-actions-content">
                        <h2>Ready to Connect?</h2>
                        <div className="quick-actions-grid">
                            <button 
                                onClick={() => navigate('/chat')}
                                className="quick-action-card"
                            >
                                <div className="quick-action-icon">💬</div>
                                <h3>Join Global Chat</h3>
                                <p>Connect with everyone in the community</p>
                            </button>
                            
                            <button 
                                onClick={() => navigate('/recent-chats')}
                                className="quick-action-card"
                            >
                                <div className="quick-action-icon">🕒</div>
                                <h3>Recent Chats</h3>
                                <p>Continue your previous conversations</p>
                            </button>
                            
                            <button 
                                onClick={() => navigate('/online-users')}
                                className="quick-action-card"
                            >
                                <div className="quick-action-icon">👥</div>
                                <h3>Online Users</h3>
                                <p>See who's currently online</p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Home;