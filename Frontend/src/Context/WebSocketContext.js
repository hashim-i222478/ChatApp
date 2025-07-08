import React, { createContext, useContext, useRef, useEffect, useState } from 'react';

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ username, children }) => {
  const ws = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!username) return;

    ws.current = new WebSocket('ws://localhost:8081');

    ws.current.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connection established');
      alert('WebSocket connection established');
      ws.current.send(JSON.stringify({ type: 'identify', username }));
    };

    ws.current.onclose = () => setIsConnected(false);
    ws.current.onerror = () => setIsConnected(false);

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [username]);

  return (
    <WebSocketContext.Provider value={{ ws: ws.current, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}; 