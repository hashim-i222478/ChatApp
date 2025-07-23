import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './header';
import { FaSearch, FaTrashAlt } from 'react-icons/fa';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
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
        
        // Verify that myUserId is one of the participants in this chat
        if (!ids.includes(myUserId)) continue;
        
        const otherUserId = ids.find(id => id !== myUserId);
        if (!otherUserId) continue;
        if (userIdSet.has(otherUserId)) continue; // Avoid duplicates
        userIdSet.add(otherUserId);
        
        const msgs = JSON.parse(localStorage.getItem(key) || '[]');
        if (msgs.length === 0) continue;
        
        const lastMsg = msgs[msgs.length - 1];
        let lastMessageSender = lastMsg.username || lastMsg.fromUserId || '';
        // Fix: Show media placeholder if last message is media
        let lastMessage = lastMsg.message;
        if (!lastMessage || lastMessage.trim() === '') {
          if (lastMsg.fileType) {
            if (lastMsg.fileType.startsWith('image/')) lastMessage = '📷 Photo';
            else if (lastMsg.fileType.startsWith('video/')) lastMessage = '🎥 Video';
            else if (lastMsg.fileType.startsWith('audio/')) lastMessage = '🎵 Audio';
            else lastMessage = '📎 File';
          } else if (lastMsg.fileUrl || lastMsg.file) {
            lastMessage = '📎 File';
          } else {
            lastMessage = '';
          }
        }
        chats.push({
          userId: otherUserId,
          username: otherUserId, // Placeholder, will fetch real username below
          lastMessage,
          lastMessageTime: getValidDateString(lastMsg.time),
          lastMessageSender,
          unreadCount: unread[otherUserId] || 0
        });
      }
    }
    chats.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
    
    // Debug info
    console.log(`Found ${chats.length} chats for user ID: ${myUserId}`);
    if (chats.length > 0) {
      console.log('Chat participants:', chats.map(c => c.userId));
    }
    
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

  // Handle search input changes
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Function to delete a chat from local storage
  const handleDeleteChat = (chat, e) => {
    e.stopPropagation(); // Prevent triggering chat click
    setChatToDelete(chat);
    setShowConfirmDialog(true);
  };

  // Function to confirm and execute chat deletion
  const confirmDeleteChat = () => {
    if (chatToDelete) {
      // Form the chat key from user IDs
      const chatKey = `chat_${[myUserId, chatToDelete.userId].sort().join('_')}`;
      
      // Remove the chat from localStorage
      localStorage.removeItem(chatKey);
      
      // Also clear any unread messages for this chat
      const unread = JSON.parse(localStorage.getItem('unread_private') || '{}');
      if (unread[chatToDelete.userId]) {
        delete unread[chatToDelete.userId];
        localStorage.setItem('unread_private', JSON.stringify(unread));
      }
      
      // Update the UI by removing the deleted chat
      setRecentChats(prevChats => prevChats.filter(chat => chat.userId !== chatToDelete.userId));
      
      // Show success message briefly
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 3000);
      
      // Close the dialog
      setShowConfirmDialog(false);
      setChatToDelete(null);
    }
  };

  // Function to cancel deletion
  const cancelDeleteChat = () => {
    setShowConfirmDialog(false);
    setChatToDelete(null);
  };

  // Filter chats based on search query
  const filteredChats = searchQuery
    ? recentChats.filter(chat => 
        chat.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recentChats;

  // ChatItem component for rendering individual recent chat entries
  const ChatItem = ({ chat, handleChatClick }) => (
    <li
      className="chat-item"
      onClick={() => handleChatClick(chat)}
      title={`Continue chat with ${chat.username}`}
    >
      <div className="user-avatar">
        {chat.profilePic ? (
          <img 
            src={chat.profilePic.startsWith('/uploads/') 
              ? `http://localhost:8080${chat.profilePic}` 
              : chat.profilePic} 
            alt={chat.username} 
            className="avatar-img" 
            loading="lazy"
          />
        ) : (
          <div className="initial-circle">{chat.username[0] ? chat.username[0].toUpperCase() : '?'}</div>
        )}
      </div>
      <div className="user-details">
        <div className="user-info">
          <span className="username">{chat.username}</span>
          <span className="userid">@{chat.userId}</span>
        </div>
        <div className="last-message-preview">
          {chat.lastMessage ? (
            <>
              <span className="message-text">
                {chat.lastMessageSender ? `${chat.lastMessageSender}: ` : ''}
                {chat.lastMessage.length > 28
                  ? chat.lastMessage.slice(0, 28) + '...'
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
      <div className="chat-actions">
        {chat.unreadCount > 0 && (
          <span className="unread-count" aria-label={`${chat.unreadCount} unread messages`}>
            {chat.unreadCount}
          </span>
        )}
        <button 
          className="delete-chat-btn" 
          onClick={(e) => handleDeleteChat(chat, e)}
          title="Delete this chat"
          aria-label={`Delete chat with ${chat.username}`}
        >
          <FaTrashAlt className="delete-icon" />
        </button>
      </div>
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
      
      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="modal-backdrop">
          <div className="delete-confirm-modal">
            <h3>Delete Chat</h3>
            <p>Are you sure you want to delete your chat with <strong>{chatToDelete?.username}</strong>?</p>
            <p className="warning-text">This action cannot be undone and all messages will be permanently removed.</p>
            
            <div className="modal-actions">
              <button 
                className="cancel-button" 
                onClick={cancelDeleteChat}
              >
                Cancel
              </button>
              <button 
                className="delete-button" 
                onClick={confirmDeleteChat}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Success Message */}
      {deleteSuccess && (
        <div className="success-toast">
          <span className="success-icon">✓</span> Chat deleted successfully
        </div>
      )}
      
      <div className="recent-chats-container">
        <div className="recent-chats-card">
          <h2 className="recent-chats-title">
            <span className="title-icon"></span> Recent Chats
          </h2>
          <p className="recent-chats-subtitle">
            Access all your past private conversations.
            <br />
            Click on a chat to continue the conversation.
            <br />
            <strong><br />Note: </strong>
            If you don't see a chat, it may be deleted.
          </p>

          {/* Search bar */}
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <button 
                className="clear-search" 
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <ul className="recent-chats-list">
            {loading ? (
              <LoadingState />
            ) : recentChats.length === 0 ? (
              <EmptyState />
            ) : filteredChats.length === 0 ? (
              <li className="no-chats">No chats match your search.</li>
            ) : (
              filteredChats.map((chat) => (
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