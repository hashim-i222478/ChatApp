import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation} from 'react-router-dom';
import Header from './header';
import { AiOutlineMessage, AiOutlineTeam, AiOutlineClockCircle, AiOutlineLock, AiOutlineCopy } from 'react-icons/ai';
import { BsShieldLock, BsFillTrashFill } from 'react-icons/bs';
import '../Style/home.css';

// // Helper to fetch username for a userId
// const fetchUsername = async (userId, token) => {
//   try {
//     const res = await fetch(`http://localhost:8080/api/users/username/${userId}`, {
//       headers: { Authorization: `Bearer ${token}` }
//     });
//     if (!res.ok) throw new Error('Failed to fetch username');
//     const data = await res.json();
//     return data.username || userId;
//   } catch {
//     return userId;
//   }
// };

const Home = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [chatUserId, setChatUserId] = useState('');
  const [animatedWelcome, setAnimatedWelcome] = useState('');
  const [copied, setCopied] = useState(false);
  const location = useLocation();
  const [profilePicUrl, setProfilePicUrl] = useState('');


  useEffect(() => {
    if (!location.search.includes('reloaded=1')) {
      navigate(`${location.pathname}?reloaded=1`, { replace: true });
      window.location.reload();
    }
  }, [location, navigate]);

  useEffect(() => {
    setUserId(localStorage.getItem('userId') || '');
    setUsername(localStorage.getItem('username') || '');

    async function fetchProfilePic() {
      const token = localStorage.getItem('token');
      if (token && userId) {
        try {
          const res = await fetch(`http://localhost:5001/api/users/profile-pic/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setProfilePicUrl(data.profilePic || '');
          }
        } catch (error) {
          console.error('Failed to fetch profile picture:', error);
        }
      }
    }
    fetchProfilePic();
  }, [profilePicUrl, userId]);

  // Typewriter effect for welcome message
  useEffect(() => {
    const fullText = `Welcome, ${username} to RealTalk`;
    setAnimatedWelcome('');
    let i = 0;
    const interval = setInterval(() => {
      setAnimatedWelcome(fullText.slice(0, i + 1));
      i++;
      if (i === fullText.length) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [username]);

  const handleStartChat = () => {
    setIsModalOpen(true);
    setChatUserId('');
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setChatUserId('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (chatUserId.trim()) {
      // Fetch username from backend
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`http://localhost:8080/api/users/username/${chatUserId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        let username = 'User';
        if (res.ok) {
          const data = await res.json();
          username = data.username || 'User';
        }
        navigate(`/private-chat/${chatUserId}`, { state: { username, userId: chatUserId } });
      } catch {
        navigate(`/private-chat/${chatUserId}`, { state: { username: 'User', userId: chatUserId } });
      }
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
          <h1 className="home-title">{animatedWelcome}<span className="typewriter-cursor">|</span></h1>
          <div className="home-profile-pic">
            {profilePicUrl ? (
              <img src={profilePicUrl} alt={`${username}'s profile picture`} className="profile-pic" />
            ) : (
              <div className="profile-pic fallback-pic">
                {username ? username.charAt(0).toUpperCase() : '?'}
              </div>
            )}
          </div>
          <div className="home-user-id-box">
            <span className="home-user-id-label">Your ID:</span>
            <span className="home-user-id-value">{userId}</span>
            <button
              className="copy-id-btn"
              onClick={() => {
                navigator.clipboard.writeText(userId);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              title="Copy ID"
              style={{ marginLeft: '0.5em' }}
            >
              <AiOutlineCopy />
            </button>
            {copied && <span className="copy-feedback">Copied!</span>}
          </div>
          <p className="home-subtitle">Connect, Chat, and Collaborate in Real-Time</p>
          <button className="home-cta" onClick={handleStartChat}>
            <AiOutlineMessage className="cta-icon" /> Start Chatting Now
          </button>
        </div>
        <div className="home-features">
          <div className="feature-card" onClick={handleOnlineUsers}>
            <AiOutlineTeam className="feature-icon" />
            <h3 className="feature-title">Online Users</h3>
            <p className="feature-description">See who's online and start a conversation.</p>
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
            <div className="modal-content-home">
              <h2 className="modal-title">Start a Private Chat</h2>
              <div className="modal-info">
                <p><strong>Private chats are:</strong></p>
                <ul>
                  <li><AiOutlineLock style={{ color: '#2563eb', fontSize: '1.5em' }}/> <strong>End-to-end encrypted</strong> – Only you and your chat partner can read your messages.</li>
                  <li><BsShieldLock style={{ color: '#9333ea', fontSize: '1.5em' }}/> <strong>Secure & Private</strong> – Your conversations are never shared with third parties.</li>
                  <li><AiOutlineMessage style={{ color: '#2563eb', fontSize: '1.5em' }}/> <strong>Persistent</strong> – Messages are saved securely and delivered even if users are offline.</li>
                </ul>
              </div>
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  value={chatUserId}
                  onChange={(e) => setChatUserId(e.target.value)}
                  placeholder="Enter a 9-digit User ID to start the conversation"
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