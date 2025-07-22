import React from 'react';
import '../Style/onlineUsers.css';
import { useWebSocket } from '../Context/WebSocketContext';
import { useNavigate } from 'react-router-dom';
import Header from './header';

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
          <img src={profilePic} alt={user.username} className="avatar-img" />
        ) : (
          <div className="initial-circle">{user.username[0].toUpperCase()}</div>
        )}
      </div>
      <div className="user-details">
        <span className="username">{user.username}</span>
        <span className="userid">ID: {user.userId}</span>
        {isSelf && <span className="you-badge">You</span>}
      </div>
    </li>
  );
};

// EmptyState component for when no users are online
const EmptyState = () => (
  <li className="no-users">No users online.</li>
);

const OnlineUsers = () => {
  const { onlineUsers = [] } = useWebSocket();
  const navigate = useNavigate();
  const myUserId = localStorage.getItem('userId');
  const [profilePics, setProfilePics] = React.useState({});

  const handleUserClick = (user) => {
    if (user.userId !== myUserId) {
      navigate(`/private-chat/${user.userId}`, {
        state: { username: user.username, userId: user.userId }
      });
    }
  };

  React.useEffect(() => {
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
          <h2 className="online-users-title">
            <span className="title-icon">👥</span> Online Users
          </h2>
          <p className="online-users-subtitle">
            Click on a user to start a private chat.
          </p>
          <ul className="online-users-list">
            {onlineUsers && onlineUsers.length > 0 ? (
              onlineUsers.map((user) => (
                <UserItem
                  key={user.userId}
                  user={user}
                  myUserId={myUserId}
                  handleUserClick={handleUserClick}
                  profilePic={profilePics[user.userId]}
                />
              ))
            ) : (
              <EmptyState />
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OnlineUsers;