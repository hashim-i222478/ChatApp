import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './header';
import '../Style/recentChats.css';

// Helper to safely parse date strings
function getValidDateString(time) {
  if (!time) return '';
  const d = new Date(time);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

// Helper to fetch usernames and profile pics for a list of chats
const fetchUsernames = async (chatsToUpdate, setChats) => {
  const token = localStorage.getItem('token');
  const updatedChats = await Promise.all(
    chatsToUpdate.map(async (chat) => {
      try {
        const res = await fetch(`http://localhost:8080/api/users/username/${chat.userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        let username = chat.userId;
        if (res.ok) {
          const data = await res.json();
          username = data.username || chat.userId;
        }
        // Fetch profile pic
        let profilePic = '';
        try {
          const picRes = await fetch(`http://localhost:5001/api/users/profile-pic/${chat.userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (picRes.ok) {
            const picData = await picRes.json();
            profilePic = picData.profilePic || '';
          }
        } catch {}
        return { ...chat, username, profilePic };
      } catch {
        return chat;
      }
    })
  );
  setChats(updatedChats);
};

const RecentChats = () => {
  const [recentChats, setRecentChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const myUserId = localStorage.getItem('userId');
  const navigate = useNavigate();

  // Helper to build and update recent chats, then fetch usernames
  const buildAndSetRecentChats = (setChats) => {
    setLoading(true);
    const unread = JSON.parse(localStorage.getItem('unread_private') || '{}');
    const chats = [];
    const userIdSet = new Set();
    for (let key in localStorage) {
      if (key.startsWith('chat_')) {
        const ids = key.replace('chat_', '').split('_');
        const otherUserId = ids.find(id => id !== myUserId);
        if (!otherUserId) continue;
        if (userIdSet.has(otherUserId)) continue; // Avoid duplicates
        userIdSet.add(otherUserId);
        const msgs = JSON.parse(localStorage.getItem(key) || '[]');
        if (msgs.length === 0) continue;
        const lastMsg = msgs[msgs.length - 1];
        let lastMessageSender = lastMsg.username || lastMsg.fromUserId || '';
        chats.push({
          userId: otherUserId,
          username: otherUserId, // Placeholder, will fetch real username below
          lastMessage: lastMsg.message || '',
          lastMessageTime: getValidDateString(lastMsg.time),
          lastMessageSender,
          unreadCount: unread[otherUserId] || 0
        });
      }
    }
    chats.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
    fetchUsernames(chats, setChats);
    setLoading(false);
  };

  useEffect(() => {
    buildAndSetRecentChats(setRecentChats);

    const handleMessageReceived = () => {
      buildAndSetRecentChats(setRecentChats);
    };
    const handleUnreadUpdated = () => {
      buildAndSetRecentChats(setRecentChats);
    };

    window.addEventListener('message-received', handleMessageReceived);
    window.addEventListener('unread-updated', handleUnreadUpdated);

    return () => {
      window.removeEventListener('message-received', handleMessageReceived);
      window.removeEventListener('unread-updated', handleUnreadUpdated);
    };
  }, [myUserId]);

  const handleChatClick = (chat) => {
    navigate(`/private-chat/${chat.userId}`, {
      state: { username: chat.username, userId: chat.userId }
    });
  };

  // ChatItem component for rendering individual recent chat entries
  const ChatItem = ({ chat, handleChatClick }) => (
    <li
      className="chat-item"
      onClick={() => handleChatClick(chat)}
      title={`Continue chat with ${chat.username}`}
    >
      <div className="user-avatar">
        {chat.profilePic ? (
          <img src={chat.profilePic} alt={chat.username} className="avatar-img" />
        ) : (
          <div className="initial-circle">{chat.username[0] ? chat.username[0].toUpperCase() : '?'}</div>
        )}
      </div>
      <div className="user-details">
        <span className="username">{chat.username}</span>
        <span className="userid">ID: {chat.userId}</span>
        <div className="last-message-preview">
          {chat.lastMessage ? (
            <>
              <span className="message-text">
                {chat.lastMessageSender ? `${chat.lastMessageSender}: ` : ''}
                {chat.lastMessage.length > 32
                  ? chat.lastMessage.slice(0, 32) + '...'
                  : chat.lastMessage}
              </span>
              <span className="message-time">
                {chat.lastMessageTime
                  ? new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : ''}
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

  return (
    <div className="recent-chats-page">
      <Header />
      <div className="recent-chats-container">
        <div className="recent-chats-card">
          <h2 className="recent-chats-title">
            <span className="title-icon"></span> Recent Chats
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