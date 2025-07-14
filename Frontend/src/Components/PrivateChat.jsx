import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../Context/WebSocketContext';
import Header from './header';
import '../Style/privateChat.css';
import axios from 'axios';

// MessageItem component for rendering individual messages
const MessageItem = ({ msg }) => (
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

// EmptyState component for when no messages are present
const EmptyState = () => (
  <div className="system-message">No messages yet. Say hello!</div>
);

// TypingIndicator component for showing typing status
const TypingIndicator = ({ username }) => (
  <div className="typing-indicator">
    <div className="typing-content">{username} is typing...</div>
  </div>
);

const PrivateChat = () => {
  const { state } = useLocation();
  const { userId: targetUserIdParam } = useParams();
  const navigate = useNavigate();
  const { ws, isConnected } = useWebSocket();
  const myUserId = localStorage.getItem('userId');
  const myUsername = localStorage.getItem('username');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const chatBoxRef = useRef(null);
  const typingTimeout = useRef(null);
  const [someoneTyping, setSomeoneTyping] = useState(null);

  // Get target user info from state or params
  const targetUserId = state?.userId || targetUserIdParam;
  const targetUsername = state?.username || 'User';

  // Fetch private chat history on mount or when targetUserId changes
  useEffect(() => {
    if (!targetUserId) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:8080/api/chats/private-messages/${targetUserId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch private messages');
        return res.json();
      })
      .then(history => {
        if (!Array.isArray(history)) {
          setMessages([]);
          return;
        }
        const formatted = history.map(msg => ({
          from: msg.from === myUserId ? 'me' : 'them',
          text: msg.message,
          time: new Date(msg.time).toLocaleTimeString([], { hour12: false }),
          username: msg.from === myUserId ? myUsername : targetUsername
        }));
        setMessages(formatted);
      })
      .catch(err => {
        setMessages([]);
        console.error(err);
      });
  }, [targetUserId, myUserId, myUsername, targetUsername]);

  // Scroll to bottom on new messages or when typing indicator appears
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, someoneTyping]);

  // Listen for private messages and always send identify on mount
  useEffect(() => {
    if (!ws.current) return;

    const sendIdentify = () => {
      if (ws.current && ws.current.readyState === 1) {
        ws.current.send(
          JSON.stringify({
            type: 'identify',
            username: myUsername,
            userId: myUserId
          })
        );
      }
    };

    if (ws.current.readyState === 1) {
      sendIdentify();
    } else {
      const handleOpen = () => {
        sendIdentify();
        ws.current.removeEventListener('open', handleOpen);
      };
      ws.current.addEventListener('open', handleOpen);
    }

    const handleMessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (
          message.type === 'typing' &&
          message.fromUserId === targetUserId &&
          message.fromUserId !== myUserId
        ) {
          setSomeoneTyping(message.username || targetUsername);
          return;
        } else if (
          message.type === 'stop-typing' &&
          message.fromUserId === targetUserId &&
          message.fromUserId !== myUserId
        ) {
          setSomeoneTyping(null);
          return;
        } else if (message.type === 'private-message') {
          if (message.fromUserId === targetUserId && message.toUserId === myUserId) {
            setMessages((prev) => [
              ...prev,
              {
                from: 'them',
                text: message.message,
                time: message.time,
                username: targetUsername
              }
            ]);
          }
          if (message.toUserId === targetUserId && message.fromUserId === myUserId) {
            setMessages((prev) => [
              ...prev,
              {
                from: 'me',
                text: message.message,
                time: message.time,
                username: myUsername
              }
            ]);
          }
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    ws.current.addEventListener('message', handleMessage);
    return () => {
      ws.current.removeEventListener('message', handleMessage);
      ws.current.removeEventListener('open', sendIdentify);
    };
  }, [ws, targetUserId, myUserId, myUsername, targetUsername]);

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim() && ws.current && isConnected) {
      ws.current.send(
        JSON.stringify({
          type: 'private-message',
          toUserId: targetUserId,
          message: input
        })  
      );      
      axios.post(
        `http://localhost:8080/api/chats/private-messages/send`,
        {
          to: targetUserId,
          message: input
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      )
      .then(res => {
        console.log(res);
      })
      .catch(err => {
        console.error(err);
      });
      setInput('');
    }
  };

  function handleInputChange(e) {
    setInput(e.target.value);
    if (ws.current && isConnected && myUserId && targetUserId && myUsername) {
      ws.current.send(
        JSON.stringify({
          type: 'typing',
          fromUserId: myUserId,
          toUserId: targetUserId,
          username: myUsername
        })
      );
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
      typingTimeout.current = setTimeout(() => {
        ws.current.send(
          JSON.stringify({
            type: 'stop-typing',
            fromUserId: myUserId,
            toUserId: targetUserId,
            username: myUsername
          })
        );
      }, 1200);
    }
  }

  if (!targetUserId) {
    return (
      <div className="error-container">
        <div className="error-message">No user selected for private chat.</div>
      </div>
    );
  }

  return (
    <div className="private-chat-page">
      <Header />
      <div className="private-chat-container">
        <div className="chat-header">

          <h1 className="chat-title">
            Chat with <span className="chat-title-gradient">{targetUsername}</span>
          </h1>
          <button className="back-button" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
        <div className="chat-box" ref={chatBoxRef}>
          {messages.length === 0 && <EmptyState />}
          {messages.map((msg, idx) => (
            <MessageItem key={idx} msg={msg} />
          ))}
          {someoneTyping && <TypingIndicator username={someoneTyping} />}
        </div>
        <div className="chat-input-container">
          <input
            type="text"
            placeholder="Type a private message..."
            value={input}
            onChange={handleInputChange}
            className="chat-input"
            onKeyDown={e => { if (e.key === 'Enter') handleSend(e); }}
          />
          <button
            type="submit"
            onClick={handleSend}
            
            className="chat-send-button"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivateChat;