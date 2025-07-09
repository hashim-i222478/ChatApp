import React from 'react';
import Header from './header';
import '../Style/onlineUsers.css';
import { useWebSocket } from '../Context/WebSocketContext';

const OnlineUsers = () => {
  const { onlineUsers = [] } = useWebSocket();

  return (
    <>
      <Header />
      <div className="online-users-wrapper">
        <div className="online-users-card">
          <h2>Online Users</h2>
          <ul className="online-users-list">
            {onlineUsers && onlineUsers.length > 0 ? (
              onlineUsers.map((user, idx) => (
                <li key={idx} className="online-user-item">
                  <span className="online-dot" title="Online"></span>
                  <span className="online-username">{user.username}</span>
                  <span className="online-email">{user.email}</span>
                </li>
              ))
            ) : (
              <li className="no-users">No users online.</li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
};

export default OnlineUsers;
