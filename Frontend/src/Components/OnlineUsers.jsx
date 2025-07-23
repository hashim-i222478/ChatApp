import React, { useState, useEffect } from 'react';
import '../Style/onlineUsers.css';
import { useWebSocket } from '../Context/WebSocketContext';
import { useNavigate } from 'react-router-dom';
import Header from './header';
import { FaSearch, FaUserFriends, FaCircle, FaComments } from 'react-icons/fa';

// UserItem component for rendering individual user entries
const UserItem = ({ user, myUserId, handleUserClick, profilePic }) => {
  const isSelf = user.userId === myUserId;
  
  return (
    <li
      className={`user-item ${isSelf ? 'self' : ''}`}
      onClick={isSelf ? undefined : () => handleUserClick(user)}
      style={{ cursor: isSelf ? 'not-allowed' : 'pointer' }}
      title={isSelf ? 'This is you' : `Click to chat with ${user.username}`}
    >
      <div className="user-avatar">
        <span className="online-dot"></span>
        {profilePic ? (
          <img src={profilePic.startsWith('/uploads/') ? `http://localhost:8080${profilePic}` : profilePic} alt={user.username} className="avatar-img" />
        ) : (
          <div className="initial-circle">{user.username[0].toUpperCase()}</div>
        )}
      </div>
      <div className="user-details">
        <span className="username">{user.username}</span>
        <span className="userid">ID: {user.userId}</span>
        {isSelf && <span className="you-badge">You</span>}
      </div>
      {!isSelf && (
        <button className="chat-now-btn" onClick={() => handleUserClick(user)}>
          <FaComments /> Chat
        </button>
      )}
    </li>
  );
};

// EmptyState component for when no users are online
const EmptyState = () => (
  <div className="no-users">
    <div className="empty-icon">
      <FaUserFriends />
    </div>
    <p>No users online at the moment.</p>
    <p className="empty-subtitle">Check back later or refresh the page.</p>
  </div>
);

const OnlineUsers = () => {
  const { onlineUsers = [] } = useWebSocket();
  const navigate = useNavigate();
  const myUserId = localStorage.getItem('userId');
  const [profilePics, setProfilePics] = React.useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);

  const handleUserClick = (user) => {
    if (user.userId !== myUserId) {
      navigate(`/private-chat/${user.userId}`, {
        state: { username: user.username, userId: user.userId }
      });
    }
  };

  useEffect(() => {
    // Filter users based on search term
    if (searchTerm.trim() === '') {
      setFilteredUsers(onlineUsers);
    } else {
      const filtered = onlineUsers.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userId.includes(searchTerm)
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, onlineUsers]);

  useEffect(() => {
    const fetchPics = async () => {
      const token = localStorage.getItem('token');
      const pics = {};
      await Promise.all(
        (onlineUsers || []).map(async (user) => {
          try {
            const res = await fetch(`http://localhost:5001/api/users/profile-pic/${user.userId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              if (data.profilePic) pics[user.userId] = data.profilePic;
            }
          } catch {}
        })
      );
      setProfilePics(pics);
    };
    if (onlineUsers && onlineUsers.length > 0) fetchPics();
  }, [onlineUsers]);

  return (
    <div className="online-users-page">
      <Header />
      <div className="online-users-container">
        <div className="online-users-card">
          <div className="card-header">
            <h2 className="online-users-title">
              <FaUserFriends className="title-icon" /> Online Users
            </h2>
            <div className="online-count">
              <FaCircle className="status-dot" />
              <span>{onlineUsers.length} user{onlineUsers.length !== 1 ? 's' : ''} online</span>
            </div>
          </div>
          
          <div className="search-container">
            <div className="search-input-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  className="clear-search" 
                  onClick={() => setSearchTerm('')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          <div className="users-list-container">
            {filteredUsers.length > 0 ? (
              <ul className="online-users-list">
                {filteredUsers.map((user) => (
                  <UserItem
                    key={user.userId}
                    user={user}
                    myUserId={myUserId}
                    handleUserClick={handleUserClick}
                    profilePic={profilePics[user.userId]}
                  />
                ))}
              </ul>
            ) : (
              searchTerm ? (
                <div className="no-results">
                  <p>No users found matching "{searchTerm}"</p>
                  <button onClick={() => setSearchTerm('')}>Clear search</button>
                </div>
              ) : (
                <EmptyState />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnlineUsers;