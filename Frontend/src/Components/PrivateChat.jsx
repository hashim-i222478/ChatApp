import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../Context/WebSocketContext';
import Header from './header';
import '../Style/privateChat.css';
import axios from 'axios';

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

  const targetUserId = state?.userId || targetUserIdParam;
  const targetUsername = state?.username || 'User';

  const chatKey = `chat_${targetUserId}`;

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
        const msgObj = {
          from: 'them',
          text: message.message,
          time: message.time,
          username: targetUsername
        };
        setMessages(prev => [...prev, msgObj]);

        // Save to localStorage
        const current = JSON.parse(localStorage.getItem(chatKey) || '[]');
        current.push({
          fromUserId: message.fromUserId,
          message: message.message,
          time: message.time
        });
        localStorage.setItem(chatKey, JSON.stringify(current));
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

    // Save to localStorage with ISO time
    const time = new Date().toISOString();
    const msgObj = {
      fromUserId: myUserId,
      message: input,
      time
    };
    const current = JSON.parse(localStorage.getItem(chatKey) || '[]');
    current.push(msgObj);
    localStorage.setItem(chatKey, JSON.stringify(current));

    setMessages(prev => [...prev, { from: 'me', text: input, time: new Date(time).toLocaleTimeString(), username: myUsername }]);
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

  return (
    <div className="private-chat-page">
      <Header />
      <div className="private-chat-container">
        <div className="chat-header">
          <h1 className="chat-title">Chat with <span>{targetUsername}</span></h1>
          <button className="back-button" onClick={() => navigate(-1)}>Back</button>
        </div>
        <div className="chat-box" ref={chatBoxRef}>
          {messages.length === 0 ? <EmptyState /> : messages.map((m, i) => <MessageItem key={i} msg={m} />)}
          {someoneTyping && <TypingIndicator username={someoneTyping} />}
        </div>
        <div className="chat-input-container">
          <input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={handleInputChange}
            className="chat-input"
            onKeyDown={e => { if (e.key === 'Enter') handleSend(e); }}
          />
          <button onClick={handleSend} className="chat-send-button">Send</button>
        </div>
      </div>
    </div>
  );
};

export default PrivateChat;
