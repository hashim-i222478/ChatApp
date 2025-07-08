import React, { useEffect, useState } from 'react';
import Header from './header';
import '../Style/onlineUsers.css';
import { useWebSocket } from '../Context/WebSocketContext';

const OnlineUsers = () => {
  const { onlineUsers } = useWebSocket(); // Assume this provides [{ username, email }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Simulate loading delay for effect
    setTimeout(() => setLoading(false), 400);
  }, []);

  return (
    <>
      <Header />
      <div className="online-users-wrapper">
        <div className="online-users-card">
          <h2>Online Users</h2>
          {loading && <div className="online-users-loading">Loading...</div>}
          {error && <div className="online-users-error">{error}</div>}
          {!loading && !error && (
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
          )}
        </div>
      </div>
    </>
  );
};

export default OnlineUsers;
