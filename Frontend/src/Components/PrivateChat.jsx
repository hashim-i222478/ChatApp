import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../Context/WebSocketContext';
import Header from './header';
import '../Style/privateChat.css';
import axios from 'axios';
import { FaTrash } from 'react-icons/fa';

const MessageItem = ({ msg }) => {
  if (msg.system) {
    // Render a centered or styled system message
    return (
      <div className="system-message">
        <span>{msg.message}</span>
        <span className="message-time">[{msg.time}]</span>
      </div>
    );
  }
  return (
    <div className={`message-container ${msg.from === 'me' ? 'message-self' : 'message-other'}`}>
      <div className="message-bubble">
        <div className="message-header">
          <span className="message-username">{msg.username}</span>
          <span className="message-time">[{msg.time}]</span>
        </div>
        <p className="message-text">{msg.text}</p>
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="system-message">No messages yet. Say hello!</div>
);

const TypingIndicator = ({ username }) => (
  <div className="typing-indicator">
    <div className="typing-content">{username} is typing...</div>
  </div>
);

const emojiList = ['😀', '😂', '😍', '😎', '😭', '👍', '🎉', '❤️', '🔥', '🙏'];

const PrivateChat = () => {
  const { state } = useLocation();
  const { userId: targetUserIdParam } = useParams();
  const navigate = useNavigate();
  const { ws, isConnected, onlineUsers } = useWebSocket();
  const myUserId = localStorage.getItem('userId');
  const myUsername = localStorage.getItem('username');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const chatBoxRef = useRef(null);
  const typingTimeout = useRef(null);
  const [someoneTyping, setSomeoneTyping] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const targetUserId = state?.userId || targetUserIdParam;
  const targetUsername = state?.username || 'User';

  // Use a consistent chatKey for both users
  const chatKey = `chat_${[myUserId, targetUserId].sort().join('_')}`;

  // Load local messages + fetch from DB if needed
  useEffect(() => {
    const localMsgs = JSON.parse(localStorage.getItem(chatKey) || '[]');
    const formatted = localMsgs.map(msg => {
      if (msg.system) {
        return {
          system: true,
          message: msg.message,
          time: isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString()
        };
      }
      return {
        from: msg.fromUserId === myUserId ? 'me' : 'them',
        text: msg.message,
        time: isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString(),
        username: msg.username || (msg.fromUserId === myUserId ? myUsername : targetUsername)
      };
    });
    setMessages(formatted);
  }, [targetUserId]);

  useEffect(() => {
    const handleMessageReceived = (e) => {
      if (e.detail.chatKey === chatKey) {
        const localMsgs = JSON.parse(localStorage.getItem(chatKey) || '[]');
        const formatted = localMsgs.map(msg => {
          if (msg.system) {
            return {
              system: true,
              message: msg.message,
              time: isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString()
            };
          }
          return {
            from: msg.fromUserId === myUserId ? 'me' : 'them',
            text: msg.message,
            time: isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString(),
            username: msg.username || (msg.fromUserId === myUserId ? myUsername : targetUsername)
          };
        });
        setMessages(formatted);
      }
    };
    window.addEventListener('message-received', handleMessageReceived);
    return () => window.removeEventListener('message-received', handleMessageReceived);
  }, [chatKey, myUserId, myUsername, targetUsername]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, someoneTyping]);

  useEffect(() => {
    if (!ws.current) return;

    const identify = () => {
      ws.current.send(JSON.stringify({
        type: 'identify',
        userId: myUserId,
        username: myUsername
      }));
    };

    if (ws.current.readyState === 1) {
      identify();
    } else {
      ws.current.addEventListener('open', identify);
    }

    const handleMessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'private-message' && message.fromUserId === targetUserId) {
        // Do nothing here. The global WebSocketContext handles saving and event dispatch.
      } else if (message.type === 'typing' && message.fromUserId === targetUserId) {
        setSomeoneTyping(message.username);
      } else if (message.type === 'stop-typing' && message.fromUserId === targetUserId) {
        setSomeoneTyping(null);
      }
    };

    ws.current.addEventListener('message', handleMessage);
    return () => {
      ws.current.removeEventListener('message', handleMessage);
    };
  }, [targetUserId]);

  useEffect(() => {
    const handleProfileUpdate = (e) => {
      // Reload messages from localStorage to get updated usernames
      const localMsgs = JSON.parse(localStorage.getItem(chatKey) || '[]');
      const formatted = localMsgs.map(msg => {
        if (msg.system) {
          return {
            system: true,
            message: msg.message,
            time: isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString()
          };
        }
        return {
          from: msg.fromUserId === myUserId ? 'me' : 'them',
          text: msg.message,
          time: isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString(),
          username: msg.username || (msg.fromUserId === myUserId ? myUsername : targetUsername)
        };
      });
      setMessages(formatted);
    };
    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, [chatKey, myUserId, myUsername, targetUsername]);

  useEffect(() => {
    // Clear unread notifications for this chat
    let unread = JSON.parse(localStorage.getItem('unread_private') || '{}');
    if (unread[targetUserId]) {
      delete unread[targetUserId];
      localStorage.setItem('unread_private', JSON.stringify(unread));
      window.dispatchEvent(new CustomEvent('unread-updated'));
    }
  }, [targetUserId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const isUserOnline = onlineUsers.some(u => u.userId === targetUserId);
    if (isUserOnline) {
      console.log('User is online, sending message via WebSocket:', targetUserId);
    }
    else {
      console.log('User is offline, will store in DB:', targetUserId);
    }
    // Always send via WebSocket
    ws.current.send(JSON.stringify({
      type: 'private-message',
      toUserId: targetUserId,
      message: input
    }));

    // Do NOT add the message to localStorage or UI here; let WebSocketContext handle it
    setInput('');

    // If user is offline, store in DB via HTTP
    if (!isUserOnline) {
      await axios.post('http://localhost:8080/api/chats/private-messages/send', {
        to: targetUserId,
        message: input
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (ws.current && isConnected) {
      ws.current.send(JSON.stringify({
        type: 'typing',
        fromUserId: myUserId,
        toUserId: targetUserId,
        username: myUsername
      }));

      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        ws.current.send(JSON.stringify({
          type: 'stop-typing',
          fromUserId: myUserId,
          toUserId: targetUserId,
          username: myUsername
        }));
      }, 1000);
    }
  };

  const handleEmojiClick = (emoji) => {
    setInput(input + emoji);
    setShowEmojiPicker(false);
  };

  // Handler for toggling selection mode
  const handleToggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedMessages([]); // clear selection when toggling
  };

  // Handler for selecting/unselecting a message by timestamp
  const handleSelectMessage = (msg) => {
    //console.log('selecting message: ', msg, 'with time: ', msg.time);
    setSelectedMessages((prev) =>
      prev.includes(msg.time)
        ? prev.filter((t) => t !== msg.time)
        : [...prev, msg.time]
        //console.log('Selected messages:', [...prev, msg.time])
    );
    
  };

  // Determine if all selected messages are sent by me
  const allSelectedByMe = selectedMessages.length > 0 && selectedMessages.every(selTime => {
    const msg = messages.find(m => m.time === selTime);
    return msg && msg.from === 'me';
  });

  // Handler for deleting selected messages for me
  const handleDeleteForMe = () => {
    console.log('Delete for Me - selectedMessages:', selectedMessages);
    const msgs = JSON.parse(localStorage.getItem(chatKey) || '[]');
    console.log('Before delete (for me), localStorage:', msgs);
    // Remove messages whose time is in selectedMessages
    const updated = msgs.filter(msg => !selectedMessages.includes(isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString()));
    console.log('After delete (for me), localStorage:', updated);
    localStorage.setItem(chatKey, JSON.stringify(updated));
    // Update messages state
    const formatted = updated.map(msg => {
      if (msg.system) {
        return {
          system: true,
          message: msg.message,
          time: isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString()
        };
      }
      return {
        from: msg.fromUserId === myUserId ? 'me' : 'them',
        text: msg.message,
        time: isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString(),
        username: msg.username || (msg.fromUserId === myUserId ? myUsername : targetUsername)
      };
    });
    setMessages(formatted);
    setSelectedMessages([]);
    setShowDeleteModal(false);
  };

  // Handler for deleting selected messages for everyone
  const handleDeleteForEveryone = () => {
    console.log('Delete for Everyone - selectedMessages:', selectedMessages);
    console.log('Delete for Everyone - chatKey:', chatKey);
    ws.current.send(JSON.stringify({
      type: 'delete-message-for-everyone',
      chatKey,
      timestamps: selectedMessages
    }));
    setShowDeleteModal(false);
    //setSelectedMessages([]);
  };

  return (
    <div className="private-chat-page">
      <Header />
      <div className="private-chat-container">
        <div className="chat-header">
          <h1 className="chat-title">Chat with <span>{targetUsername}</span></h1>
          <div className="chat-header-actions">
          {selectedMessages.length > 0 && (
              <button className="delete-selected-btn" title="Delete selected messages" onClick={() => setShowDeleteModal(true)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 8V14" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M10 8V14" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M14 8V14" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M3 5H17" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M8 5V4C8 3.44772 8.44772 3 9 3H11C11.5523 3 12 3.44772 12 4V5" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                  <rect x="4" y="5" width="12" height="11" rx="2" stroke="#dc2626" strokeWidth="2"/>
                </svg>
              </button>
            )}
            <button className="select-messages-btn" onClick={handleToggleSelectionMode}>
              {selectionMode ? 'Cancel Selection' : 'Select Messages'}
            </button>
            <button className="back-button2" onClick={() => navigate(-1)}> ← Back</button>
            
          </div>
        </div>
        {/* Delete modal */}
        {showDeleteModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Delete Message{selectedMessages.length > 1 ? 's' : ''}</h3>
              <button className="modal-btn" onClick={handleDeleteForMe}>Delete for Me</button>
              {allSelectedByMe && (
                <button className="modal-btn" onClick={handleDeleteForEveryone}>Delete for Everyone</button>
              )}
              <button className="modal-btn" onClick={() => setShowDeleteModal(false)}>Cancel</button>
            </div>
          </div>
        )}
        <div className="chat-box" ref={chatBoxRef}>
          {messages.length === 0 ? <EmptyState /> : messages.map((m, i) => (
            <div key={i} className="message-row">
              {selectionMode && (
                <input
                  type="checkbox"
                  checked={selectedMessages.includes(m.time)}
                  onChange={() => handleSelectMessage(m)}
                  style={{ marginRight: 8 }}
                />
              )}
              <MessageItem msg={m} />
            </div>
          ))}
          {someoneTyping && <TypingIndicator username={someoneTyping} />}
        </div>
        <div className="chat-input-container" style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={handleInputChange}
            className="chat-input"
            onKeyDown={e => { if (e.key === 'Enter') handleSend(e); }}
          />
          <button
            type="button"
            className="emoji-button"
            onClick={() => setShowEmojiPicker(v => !v)}
            aria-label="Add emoji"
          >
            <img src={require('../Style/image.png')} alt="emoji" style={{ width: 28, height: 28, display: 'block' }} />
          </button>
          {showEmojiPicker && (
            <div className="emoji-picker-bar">
              {emojiList.map(emoji => (
                <button
                  key={emoji}
                  style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => handleEmojiClick(emoji)}
                  tabIndex={0}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <button onClick={handleSend} className="chat-send-button" >➤</button>
        </div>
      </div>
    </div>
  );
};

export default PrivateChat;
