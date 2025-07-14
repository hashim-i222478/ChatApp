import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './header';
import '../Style/recentChats.css';

// ChatItem component for rendering individual recent chat entries
const ChatItem = ({ chat, handleChatClick }) => (
  <li
    className="chat-item"
    onClick={() => handleChatClick(chat)}
    title={`Continue chat with ${chat.username}`}
  >
    <div className="user-avatar">
      <div className="initial-circle">{chat.username[0].toUpperCase()}</div>
    </div>
    <div className="user-details">
      <span className="username">{chat.username}</span>
      <span className="userid">ID: {chat.userId}</span>
      <div className="last-message-preview">
        {chat.lastMessage ? (
          <>
            <span className="message-text">
              {chat.lastMessage.length > 32
                ? chat.lastMessage.slice(0, 32) + '...'
                : chat.lastMessage}
            </span>
            <span className="message-time">
              {chat.lastMessageTime && new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </>
        ) : (
          <span className="no-message">No messages yet.</span>
        )}
      </div>
    </div>
    {chat.unreadCount > 0 && (
      <span className="unread-count">{chat.unreadCount}</span>
    )}
  </li>
);

// EmptyState component for when no chats are available
const EmptyState = () => (
  <li className="no-chats">No recent chats.</li>
);

// LoadingState component for loading state
const LoadingState = () => (
  <li className="loading-chats">Loading...</li>
);

const RecentChats = () => {
  const [recentChats, setRecentChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const myUserId = localStorage.getItem('userId');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecentChats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:8080/api/chats/recent-private-chats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setRecentChats(data);
      } catch (err) {
        setRecentChats([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRecentChats();
  }, [myUserId]);

  const handleChatClick = (chat) => {
    navigate(`/private-chat/${chat.userId}`, {
      state: { username: chat.username, userId: chat.userId }
    });
  };

  return (
    <div className="recent-chats-page">
      <Header />
      <div className="recent-chats-container">
        <div className="recent-chats-card">
          <h2 className="recent-chats-title">
            <span className="title-icon">🕒</span> Recent Chats
          </h2>
          <p className="recent-chats-subtitle">
            Access all your past private conversations.
          </p>
          <ul className="recent-chats-list">
            {loading ? (
              <LoadingState />
            ) : recentChats.length === 0 ? (
              <EmptyState />
            ) : (
              recentChats.map((chat) => (
                <ChatItem
                  key={chat.userId}
                  chat={chat}
                  handleChatClick={handleChatClick}
                />
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RecentChats;