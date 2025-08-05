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
          const otherUserId = message.fromUserId === myUserId ? message.toUserId : message.fromUserId;
          const chatKey = `chat_${[myUserId, otherUserId].sort().join('_')}`;
          const current = JSON.parse(localStorage.getItem(chatKey) || '[]');
          const localTime = message.time; // Already in local time format from server
          const exists = current.some(m => m.fromUserId === message.fromUserId && m.message === message.message && m.time === localTime);
          if (!exists) {
            current.push({
              fromUserId: message.fromUserId,
              username: message.fromUsername,
              message: message.message,
              time: localTime, // Store local time format consistently
              file: message.file,
              fileUrl: message.fileUrl,
              fileType: message.fileType,
              filename: message.filename
            });
            localStorage.setItem(chatKey, JSON.stringify(current));
            window.dispatchEvent(new CustomEvent('message-received', { detail: { chatKey } }));
          }
          // --- Notification logic ---
          const currentPath = window.location.pathname;
          const expectedPath = `/private-chat/${otherUserId}`;
          if (currentPath !== expectedPath) {
            let unread = JSON.parse(localStorage.getItem('unread_private') || '{}');
            unread[otherUserId] = (unread[otherUserId] || 0) + 1;
            localStorage.setItem('unread_private', JSON.stringify(unread));
            window.dispatchEvent(new CustomEvent('unread-updated'));
          }
        }
        if (message.type === 'delete-message-for-everyone') {
          console.log('Delete message for everyone:', message);
          const { chatKey, timestamps } = message;
          // chatKey is already in the correct format (chat_<idA>_<idB>)
          const msgs = JSON.parse(localStorage.getItem(chatKey) || '[]');
          // timestamps are already in local time format, compare directly
          const updated = msgs.filter(msg => !timestamps.includes(msg.time));
          localStorage.setItem(chatKey, JSON.stringify(updated));
          // --- Fix: Update unread count for this chat ---
          let unread = JSON.parse(localStorage.getItem('unread_private') || '{}');
          // Extract the other userId from the chatKey
          const myUserId = localStorage.getItem('userId');
          const match = chatKey.match(/^chat_(.+)_(.+)$/);
          let otherUserId = null;
          if (match) {
            const [_, idA, idB] = match;
            otherUserId = idA === myUserId ? idB : idA;
          }
          if (otherUserId && unread[otherUserId]) {
            // Recalculate unread count: count only messages from 'them' that are still present
            const remainingUnread = updated.filter(msg => msg.fromUserId === otherUserId).length;
            if (remainingUnread === 0) {
              delete unread[otherUserId];
            } else {
              unread[otherUserId] = remainingUnread;
            }
            localStorage.setItem('unread_private', JSON.stringify(unread));
            window.dispatchEvent(new CustomEvent('unread-updated'));
          }
          window.dispatchEvent(new CustomEvent('message-received', { detail: { chatKey } }));
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