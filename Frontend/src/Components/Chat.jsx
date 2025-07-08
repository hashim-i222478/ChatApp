import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../Services/api';
import '../Style/chat.css';
import UpdateProfile from './UpdateProfile';
import { useWebSocket } from '../Context/WebSocketContext';
import Header from './header';

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [username, setUsername] = useState('');
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [historyCount, setHistoryCount] = useState(0);
    
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

    // Always send identify message with current username when ws, isConnected, or username changes
    useEffect(() => {
        if (ws && isConnected && username) {
            ws.send(JSON.stringify({ type: 'identify', username }));
        }
    }, [ws, isConnected, username]);
    
    // Fetch chat history only when Show Chat History is clicked for the first time
    const handleShowHistory = async () => {
        if (!historyLoaded) {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('http://localhost:8080/api/chats/getAllChatMessages', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                let allMessages = [];
                data.forEach(user => {
                    user.messages.forEach(msg => {
                        allMessages.push({
                            username: user.username,
                            message: msg.message,
                            time: new Date(msg.timestamp).toLocaleTimeString([], { hour12: false }),
                            type: 'chat-message'
                        });
                    });
                });
                allMessages.sort((a, b) => new Date(a.time) - new Date(b.time));
                setMessages(allMessages);
                setHistoryCount(allMessages.length);
                setHistoryLoaded(true);
            } catch (err) {
                console.error('Failed to fetch chat history:', err);
            }
        }
        setShowHistory(h => !h);
    };
    
    // Listen for WebSocket messages
    useEffect(() => {
        if (!ws) return;
        const handleMessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'profile-update') {
                // Log for debugging
                console.log('Received profile-update event:', message);
                setMessages((prevMessages) =>
                    prevMessages.map(msg =>
                        msg.username &&
                        message.oldUsername &&
                        msg.username.trim().toLowerCase() === message.oldUsername.trim().toLowerCase()
                            ? { ...msg, username: message.username }
                            : msg
                    )
                );
                // If the current user updated their own profile, update the username state
                if (
                    username &&
                    message.oldUsername &&
                    username.trim().toLowerCase() === message.oldUsername.trim().toLowerCase()
                ) {
                    setUsername(message.username);
                    // Wait for state update, then send identify
                    setTimeout(() => {
                        if (ws && ws.readyState === 1) {
                            console.log('Sending identify after profile update:', message.username);
                            ws.send(JSON.stringify({ type: 'identify', username: message.username }));
                        } else {
                            // Retry if not ready
                            let retryCount = 0;
                            const retryIdentify = () => {
                                if (ws && ws.readyState === 1) {
                                    console.log('Retrying identify after profile update:', message.username);
                                    ws.send(JSON.stringify({ type: 'identify', username: message.username }));
                                } else if (retryCount < 5) {
                                    retryCount++;
                                    setTimeout(retryIdentify, 500);
                                }
                            };
                            retryIdentify();
                        }
                    }, 100);
                }
            } else {
                setMessages((prevMessages) => [...prevMessages, message]);
            }
        };
        ws.onmessage = handleMessage;
        return () => {
            ws.onmessage = null;
        };
    }, [ws, username]);
    
    // Auto-scroll to bottom when new messages are added
    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages]);

    function handleSubmit(e) {
        e.preventDefault();
        if (input.trim() && ws && isConnected) {
            ws.send(input);
            setInput('');
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        navigate('/login');
    };

    if (isLoading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <>
            <Header />
            <div className="chat-container">
                <div className="chat-header">
                    <h1 className="chat-title">Welcome, {username}!</h1>
                    <div className="user-info">
                        
                        
                        <button onClick={handleShowHistory} className="history-button">
                            {showHistory ? 'Hide Chat History' : 'Show Chat History'}
                        </button>
                    </div>
                </div>

                <div className="chat-box" id="messages" ref={chatBoxRef}>
                    {messages
                        .slice(showHistory ? 0 : historyCount)
                        .map((msg, index) => (
                            <div
                                key={index + (showHistory ? 0 : historyCount)}
                                className={`chat-message ${msg.username && username && msg.username.trim().toLowerCase() === username.trim().toLowerCase() ? 'self' : 'other'}`}
                            >
                                {/* System messages (profile updates, joins, etc.) are shown as normal chat-messages */}
                                <span className="username">{msg.username}</span>
                                <span className="time">[{msg.time}]</span>:
                                <span className="text"> {msg.message}</span>
                            </div>
                        ))}
                </div>

                <form className="chat-form" onSubmit={handleSubmit}>
                    <input
                        className="chat-input"
                        type="text"
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button className="chat-button" type="submit">Send</button>
                </form>
            </div>
        </>
    );
};

export default Chat;
