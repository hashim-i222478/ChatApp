import React, { createContext, useContext, useRef, useEffect, useState } from 'react';

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ username, children }) => {
  const ws = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!username) return;

    ws.current = new WebSocket('ws://localhost:8081');

    ws.current.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connection established');
      ws.current.send(
        JSON.stringify({
          type: 'identify',
          username,
          userId: localStorage.getItem('userId')
        })
      );
    };

    ws.current.onclose = () => setIsConnected(false);
    ws.current.onerror = () => setIsConnected(false);

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'online-users') {
          setOnlineUsers(message.users);
        }
        if (message.type === 'private-message') {
          const myUserId = localStorage.getItem('userId');
          if (message.toUserId === myUserId) {
            const chatKey = `chat_${message.fromUserId}`;
            const current = JSON.parse(localStorage.getItem(chatKey) || '[]');
            const exists = current.some(m => m.fromUserId === message.fromUserId && m.message === message.message && m.time === message.time);
            if (!exists) {
              current.push({
                fromUserId: message.fromUserId,
                message: message.message,
                time: message.time ? new Date(message.time).toLocaleTimeString() : ''
              });
              localStorage.setItem(chatKey, JSON.stringify(current));
              window.dispatchEvent(new CustomEvent('message-received', { detail: { chatKey } }));
            }
          }
        }
        if (message.type === 'profile-update') {
          // Update all localStorage chat histories for this userId
          for (let key in localStorage) {
            if (key.startsWith('chat_')) {
              const msgs = JSON.parse(localStorage.getItem(key) || '[]');
              let updated = false;
              msgs.forEach(msg => {
                if (msg.fromUserId === message.userId) {
                  msg.username = message.username;
                  updated = true;
                }
              });
              if (updated) {
                localStorage.setItem(key, JSON.stringify(msgs));
              }
            }
          }
          // Dispatch a custom event so chat components can re-render
          window.dispatchEvent(new CustomEvent('profile-updated', { detail: { userId: message.userId } }));
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [username]);

  return (
    <WebSocketContext.Provider value={{ ws, isConnected, onlineUsers }}>
      {children}
    </WebSocketContext.Provider>
  );
}; 