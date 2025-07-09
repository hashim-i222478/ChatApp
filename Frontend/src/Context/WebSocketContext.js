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
      ws.current.send(JSON.stringify({ type: 'identify', username, email: localStorage.getItem('email') || '' }));
    };

    ws.current.onclose = () => setIsConnected(false);
    ws.current.onerror = () => setIsConnected(false);

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'online-users') {
          setOnlineUsers(message.users);
        }
        // You can handle other message types here as needed
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [username]);

  return (
    <WebSocketContext.Provider value={{ ws: ws.current, isConnected, onlineUsers }}>
      {children}
    </WebSocketContext.Provider>
  );
}; 