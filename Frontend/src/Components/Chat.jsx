import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../Services/api';
import { useWebSocket } from '../Context/WebSocketContext';
import '../Style/chat.css';
import Header from './header';

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [username, setUsername] = useState('');
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [someoneTyping, setSomeoneTyping] = useState(null);
    const typingTimeout = useRef(null);
    
    const navigate = useNavigate();
    const chatBoxRef = useRef(null);
    const { ws, isConnected } = useWebSocket();

    // Fetch user data from the server
    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            try {
                const response = await authAPI.getProfile();
                setUserData(response.data);
                setUsername(response.data.username);
            } catch (error) {
                console.error('Failed to fetch user data:', error);
                localStorage.removeItem('token');
                navigate('/login');
            } finally {
                setIsLoading(false);
            }
        };
        fetchUserData();
    }, [navigate]);

    // Fetch global chat history on mount
    useEffect(() => {
        const fetchChatHistory = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('http://localhost:8080/api/chats/getAllChatMessages', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();

                // Helper to fetch username for a userId
                const fetchUsername = async (userId) => {
                    const userRes = await fetch(`http://localhost:8080/api/users/username/${userId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const userData = await userRes.json();
                    return userData.username;
                };

                let allMessages = [];
                for (const user of data) {
                    if (!user.userId) {
                        console.warn('User object missing userId:', user);
                        continue; // Skip this user
                    }
                    const uname = await fetchUsername(user.userId);
                    user.messages.forEach(msg => {
                        allMessages.push({
                            username: uname,
                            message: msg.message,
                            time: new Date(msg.timestamp).toLocaleTimeString([], { hour12: false }),
                            timestamp: msg.timestamp,
                            type: 'chat-message',
                            from: uname.trim().toLowerCase() === username.trim().toLowerCase() ? 'me' : 'other'
                        });
                    });
                }
                allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                setMessages(allMessages);
            } catch (err) {
                console.error('Failed to fetch chat history:', err);
            }
        };
        fetchChatHistory();
    }, []);

    // Always send identify message with current username when ws, isConnected, or username changes
    useEffect(() => {
        if (ws.current && isConnected && username) {
            ws.current.send(JSON.stringify({ type: 'identify', username }));
        }
    }, [ws, isConnected, username]);
    
    // Listen for WebSocket messages
    useEffect(() => {
        if (!ws.current) return;
        const handleMessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'profile-update') {
                console.log('Received profile-update event:', message);
                setMessages((prevMessages) => {
                    // Update usernames in previous messages
                    const updatedMessages = prevMessages.map(msg =>
                        msg.username &&
                        message.oldUsername &&
                        msg.username.trim().toLowerCase() === message.oldUsername.trim().toLowerCase()
                            ? { ...msg, username: message.username }
                            : msg
                    );
                    // Add the system message
                    return [
                        ...updatedMessages,
                        {
                            username: 'System',
                            message: `${message.oldUsername} has changed their name to ${message.username}.`,
                            time: new Date().toLocaleTimeString([], { hour12: false }),
                            from: 'system'
                        }
                    ];
                });
                if (
                    username &&
                    message.oldUsername &&
                    username.trim().toLowerCase() === message.oldUsername.trim().toLowerCase()
                ) {
                    setUsername(message.username);
                    setTimeout(() => {
                        if (ws.current && ws.current.readyState === 1) {
                            console.log('Sending identify after profile update:', message.username);
                            ws.current.send(JSON.stringify({ type: 'identify', username: message.username }));
                        } else {
                            let retryCount = 0;
                            const retryIdentify = () => {
                                if (ws.current && ws.current.readyState === 1) {
                                    console.log('Retrying identify after profile update:', message.username);
                                    ws.current.send(JSON.stringify({ type: 'identify', username: message.username }));
                                } else if (retryCount < 5) {
                                    retryCount++;
                                    setTimeout(retryIdentify, 500);
                                }
                            };
                            retryIdentify();
                        }
                    }, 100);
                }
            } else if (message.type === 'typing') {
                if (message.username !== username) setSomeoneTyping(message.username);
                return;
            } else if (message.type === 'stop-typing') {
                setSomeoneTyping(null);
                return;
            } else {
                setMessages((prevMessages) => [
                    ...prevMessages,
                    {
                        ...message,
                        from:
                            message.username &&
                            username &&
                            message.username.trim().toLowerCase() === username.trim().toLowerCase()
                                ? 'me'
                                : 'other'
                    }
                ]);
            }
        };
        ws.current.addEventListener('message', handleMessage);
        return () => {
            ws.current.removeEventListener('message', handleMessage);
        };
    }, [ws, username]);
    
    // Auto-scroll to bottom when new messages are added
    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages, someoneTyping]);

    function handleSubmit(e) {
        e.preventDefault();
        if (input.trim() && ws.current && isConnected) {
            ws.current.send(input);
            setInput('');
        }
    }

    function handleInputchange(e) {
        setInput(e.target.value);
        if (ws.current && isConnected && username) {
            ws.current.send(JSON.stringify({ type: 'typing', username }));
            if (typingTimeout.current) {
                clearTimeout(typingTimeout.current);
            }
            typingTimeout.current = setTimeout(() => {
                ws.current.send(JSON.stringify({ type: 'stop-typing', username }));
            }, 1200);
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        navigate('/login');
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-text">Loading...</div>
            </div>
        );
    }

    return (
        <div className="chat-page">
            <Header />
            <div className="chat-container">
                <div className="chat-header">
                    <h1 className="chat-title">
                        Welcome, <span className="chat-title-gradient">{username}</span> to RealTalk!
                    </h1>
                    <p className="chat-description">
                        Connect with the world in real-time. Your conversations, your community.
                    </p>
                </div>

                <div className="chat-box" ref={chatBoxRef}>
                    {messages.map((msg, index) => {
                        // Skip empty messages or messages with no text
                        if (!msg || (typeof msg.message === 'string' && msg.message.trim() === '')) {
                            return null;
                        }
                        if (!msg.username || msg.username === 'System') {
                            return (
                                <div key={index} className="system-message">
                                    <div className="system-message-content">
                                        {msg.time && <span className="system-message-time">[{msg.time}] </span>}
                                        {msg.message}
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div
                                key={index}
                                className={`message-container ${msg.from === 'me' ? 'message-self' : 'message-other'}`}
                            >
                                <div className="message-bubble">
                                    <div className="message-header">
                                        <span className="message-username">{msg.username}</span>
                                        <span className="message-time">[{msg.time}]</span>
                                    </div>
                                    <p className="message-text">{msg.message}</p>
                                </div>
                            </div>
                        );
                    })}
                    {someoneTyping && (
                        <div className="typing-indicator">
                            <div className="typing-content">{someoneTyping} is typing...</div>
                        </div>
                    )}
                </div>

                <div className="chat-input-container">
                    <input
                        type="text"
                        placeholder="Type a message..."
                        value={input}
                        onChange={handleInputchange}
                        className="chat-input"
                    />
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        className="chat-send-button"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chat;