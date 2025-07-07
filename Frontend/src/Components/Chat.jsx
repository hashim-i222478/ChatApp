import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../Services/api';
import '../Style/chat.css';

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [username, setUsername] = useState('');
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const navigate = useNavigate();
    const ws = useRef(null);
    const chatBoxRef = useRef(null);

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
    
    // Connect to WebSocket after getting user data
    useEffect(() => {
        if (isLoading || !username) return;
        
        ws.current = new WebSocket('ws://localhost:8081'); // Make sure port matches your WS server

        ws.current.onmessage = (event) => {
            const message = JSON.parse(event.data);
            setMessages((prevMessages) => [...prevMessages, message]);
        };

        ws.current.onopen = () => {
            console.log('Connected to server');
            // When connected, send a message to identify the user
            ws.current.send(JSON.stringify({
                type: 'identify',
                username: username
            }));
        };
        ws.current.onclose = () => console.log('Disconnected from server');
        ws.current.onerror = (error) => console.error('WebSocket error:', error);

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [username, isLoading]);
    
    // Auto-scroll to bottom when new messages are added
    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages]);

    function handleSubmit(e) {
        e.preventDefault();
        if (input.trim() && ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(input);
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
        <div className="chat-container">
            <div className="chat-header">
                <h1 className="chat-title">Chat App</h1>
                <div className="user-info">
                    <span>Welcome, {username}!</span>
                    <button onClick={handleLogout} className="logout-button">Logout</button>
                </div>
            </div>

            <div className="chat-box" id="messages" ref={chatBoxRef}>
                {messages.map((msg, index) => {
                    if (msg.type === 'assign-username') {
                        return <div key={index} className="system-message">Your username: {msg.username}</div>;
                    }
                    if (msg.type === 'chat-message') {
                        return (
                            <div key={index} className={`chat-message ${msg.username === username ? 'self' : 'other'}`}>
                                <span className="username">{msg.username}</span>
                                <span className="time">[{msg.time}]</span>:
                                <span className="text"> {msg.message}</span>
                            </div>
                        );
                    }
                    return null;
                })}
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
    );
};

export default Chat;
