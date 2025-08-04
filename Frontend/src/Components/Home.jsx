import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation} from 'react-router-dom';
import Header from './header';
import AddFriendModal from './AddFriendModal';
import { AiOutlineMessage, AiOutlineTeam, AiOutlineClockCircle, AiOutlineLock, AiOutlineCopy, AiOutlineUserAdd } from 'react-icons/ai';
import { BsShieldLock, BsFillTrashFill } from 'react-icons/bs';
import { friendsStorage } from '../Services/friendsStorage';
import '../Style/home.css';

const Home = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [chatUserId, setChatUserId] = useState('');
  const [friendUserId, setFriendUserId] = useState('');
  const [friendAlias, setFriendAlias] = useState('');
  const [animatedWelcome, setAnimatedWelcome] = useState('');
  const [copied, setCopied] = useState(false);
  const [popup, setPopup] = useState({ show: false, message: '', type: '' });
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
  }, []);

  useEffect(() => {
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
    if (userId) {
      fetchProfilePic();
    }
  }, [userId]);

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

  const handleAddFriend = () => {
    setIsFriendsModalOpen(true);
    setFriendUserId('');
    setFriendAlias('');
  };
  const handleCloseFriendsModal = () => {
    setIsFriendsModalOpen(false);
    setFriendUserId('');
    setFriendAlias('');
  };

  const showPopup = (message, type = 'success') => {
    setPopup({ show: true, message, type });
    setTimeout(() => {
      setPopup({ show: false, message: '', type: '' });
    }, 3000);
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

  const handleFriendSubmit = async (e) => {
    e.preventDefault();
    if (friendUserId.trim()) {
      const token = localStorage.getItem('token');
      
      // Check if already a friend using localStorage
      if (friendsStorage.isFriend(friendUserId.trim())) {
        showPopup('User is already in your friends list', 'error');
        handleCloseFriendsModal();
        return;
      }

      try {
        const res = await fetch('http://localhost:8080/api/friends/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ 
            friendUserId: friendUserId.trim(),
            alias: friendAlias.trim() || null
          })
        });
        
        if (res.ok) {
          const responseData = await res.json();
          // Add friend to localStorage
          friendsStorage.addFriend(responseData.friend);
          showPopup(`Friend added successfully${friendAlias.trim() ? ` as "${friendAlias.trim()}"` : ''}!`, 'success');
        } else {
          const errorData = await res.json();
          showPopup(errorData.message || 'Failed to add friend', 'error');
        }
      } catch (error) {
        showPopup('Error adding friend', 'error');
      }
      handleCloseFriendsModal();
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
              <img src={profilePicUrl.startsWith('/uploads/') ? `http://localhost:8080${profilePicUrl}` : profilePicUrl} alt={`${username}'s profile picture`} className="profile-pic" />
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
          <div className="home-cta-container">
            <button className="home-cta" onClick={handleStartChat}>
              <AiOutlineMessage className="cta-icon" /> Start Chatting Now
            </button>
            <button className="home-cta home-cta-friend" onClick={handleAddFriend}>
              <AiOutlineUserAdd className="cta-icon" /> Add Friend
            </button>
          </div>
        </div>
        {/* <div className="home-features">
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
        </div> */}

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

        <AddFriendModal
          isOpen={isFriendsModalOpen}
          onClose={handleCloseFriendsModal}
          friendUserId={friendUserId}
          setFriendUserId={setFriendUserId}
          friendAlias={friendAlias}
          setFriendAlias={setFriendAlias}
          onSubmit={handleFriendSubmit}
        />
      </div>

      {/* Custom Popup */}
      {popup.show && (
        <div className="popup-overlay">
          <div className={`popup-content ${popup.type}`}>
            <div className="popup-message">{popup.message}</div>
            <button 
              className="popup-close" 
              onClick={() => setPopup({ show: false, message: '', type: '' })}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;