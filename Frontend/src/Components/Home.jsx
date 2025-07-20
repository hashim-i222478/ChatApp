import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './header';
import { AiOutlineMessage, AiOutlineTeam, AiOutlineClockCircle, AiOutlineLock } from 'react-icons/ai';
import '../Style/home.css';

// Helper to fetch username for a userId
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

const Home = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userId, setUserId] = useState('');

  const handleStartChat = () => setIsModalOpen(true);
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setUserId('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userId.trim()) {
      navigate(`/private-chat/${userId}`);
      handleCloseModal();
    }
  };

  const handleOnlineUsers = () => navigate('/online-users');
  const handleRecentChats = () => navigate('/recent-chats');

  return (
    <div className="home-page">
      <Header />
      <div className="home-container">
        <div className="home-hero">
          <h1 className="home-title">Welcome to RealTalk</h1>
          <p className="home-subtitle">Connect, Chat, and Collaborate in Real-Time</p>
          <button className="home-cta" onClick={handleStartChat}>
            <AiOutlineMessage className="cta-icon" /> Start Chatting Now
          </button>
        </div>
        <div className="home-features">
          <div className="feature-card" onClick={handleOnlineUsers}>
            <AiOutlineTeam className="feature-icon" />
            <h3 className="feature-title">Online Users</h3>
            <p className="feature-description">See who’s online and start a conversation.</p>
          </div>
          <div className="feature-card" onClick={handleRecentChats}>
            <AiOutlineClockCircle className="feature-icon" />
            <h3 className="feature-title">Recent Chats</h3>
            <p className="feature-description">Pick up where you left off with ease.</p>
          </div>
          <div className="feature-card">
            <AiOutlineLock className="feature-icon" />
            <h3 className="feature-title">Secure Messaging</h3>
            <p className="feature-description">Your conversations are private and protected.</p>
          </div>
        </div>

        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2 className="modal-title">Start a Private Chat</h2>
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter User ID"
                  className="modal-input"
                  autoFocus
                />
                <div className="modal-buttons">
                  <button type="submit" className="modal-submit">Join Chat</button>
                  <button type="button" className="modal-cancel" onClick={handleCloseModal}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;