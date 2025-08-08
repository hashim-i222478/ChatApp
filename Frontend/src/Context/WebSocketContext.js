import React, { createContext, useContext, useRef, useEffect, useState } from 'react';
import ForceLogoutModal from '../Components/ForceLogoutModal';

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  const ws = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [forceLogoutModal, setForceLogoutModal] = useState({ isVisible: false, message: '' });
  const [currentUsername, setCurrentUsername] = useState(localStorage.getItem('username'));

  // Listen for login events and localStorage changes
  useEffect(() => {
    const handleLoginStateChange = () => {
      const newUsername = localStorage.getItem('username');
      setCurrentUsername(newUsername);
    };

    const handleLogoutEvent = () => {
      console.log('WebSocket: Handling logout event');
      console.log('WebSocket: Current WebSocket state:', ws.current ? 'connected' : 'null');
      
      setCurrentUsername(null);
      setIsConnected(false);
      setOnlineUsers([]);
      
      if (ws.current) {
        console.log('WebSocket: Closing WebSocket connection');
        ws.current.close();
        ws.current = null;
        console.log('WebSocket: Connection closed and set to null');
      } else {
        console.log('WebSocket: No active connection to close');
      }
    };

    // Safely add event listeners
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('user-logged-in', handleLoginStateChange);
      window.addEventListener('user-logged-out', handleLogoutEvent);
      window.addEventListener('storage', handleLoginStateChange);
    }

    return () => {
      // Safely remove event listeners
      if (typeof window !== 'undefined' && window.removeEventListener) {
        try {
          window.removeEventListener('user-logged-in', handleLoginStateChange);
          window.removeEventListener('user-logged-out', handleLogoutEvent);
          window.removeEventListener('storage', handleLoginStateChange);
        } catch (error) {
          console.warn('Error removing event listeners:', error);
        }
      }
    };
  }, []);

  useEffect(() => {
    console.log('WebSocket useEffect triggered, currentUsername:', currentUsername);
    
    if (!currentUsername) {
      console.log('WebSocket: No username, cleaning up any existing connection');
      if (ws.current) {
        console.log('WebSocket: Closing connection due to no username');
        ws.current.close();
        ws.current = null;
        setIsConnected(false);
        setOnlineUsers([]);
      }
      return;
    }

    console.log('WebSocket: Creating new connection for user:', currentUsername);
    ws.current = new WebSocket('ws://localhost:8081');

    ws.current.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connection established');
      ws.current.send(
        JSON.stringify({
          type: 'identify',
          username: currentUsername,
          userId: localStorage.getItem('userId')
        })
      );
    };

    ws.current.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
    };
    
    ws.current.onerror = () => {
      console.log('WebSocket connection error');
      setIsConnected(false);
    };

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
        
        // Handle account deletion notification
        if (message.type === 'account-deleted') {
          console.log('User account deleted:', message);
          const { deletedUserId } = message;
          
          // Import friendsStorage dynamically to avoid circular dependency
          import('../Services/friendsStorage').then(({ friendsStorage }) => {
            // Remove the deleted user from friends list
            friendsStorage.removeFriendByUserId(deletedUserId);
            
            // Remove all chats with the deleted user
            friendsStorage.removeChatsWithDeletedUser(deletedUserId);
          });
        }
        
        if (message.type === 'friend-profile-update') {
          // Import friendsStorage dynamically to avoid circular dependency
          import('../Services/friendsStorage').then(({ friendsStorage }) => {
            // Update friend profile in localStorage
            friendsStorage.updateFriendProfile(message.userId, message.username);
          });
          
          // Dispatch event for friends list components to refresh
          window.dispatchEvent(new CustomEvent('friend-profile-updated', { 
            detail: { userId: message.userId, username: message.username } 
          }));
        }
        
        if (message.type === 'profile-update') {
          // Import friendsStorage dynamically to avoid circular dependency
          import('../Services/friendsStorage').then(({ friendsStorage }) => {
            // Update friend profile in localStorage
            friendsStorage.updateFriendProfile(message.userId, message.username);
          });
          
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
        
        if (message.type === 'force-logout') {
          // Show modal and handle forced logout
          setForceLogoutModal({
            isVisible: true,
            message: message.message || 'You have been logged out because you logged in from another device/tab'
          });
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    return () => {
      console.log('WebSocket: Cleaning up WebSocket connection');
      if (ws.current) {
        try {
          ws.current.close();
          console.log('WebSocket: Connection closed in cleanup');
        } catch (error) {
          console.warn('Error closing WebSocket:', error);
        }
      }
    };
  }, [currentUsername]);

  const handleForceLogoutConfirm = () => {
    // Preserve chat data and only clear authentication-related data
    const itemsToPreserve = {};
    
    // Preserve all chat data
    for (let key in localStorage) {
      if (key.startsWith('chat_')) {
        itemsToPreserve[key] = localStorage.getItem(key);
      }
    }
    
    // Clear all localStorage
    localStorage.clear();
    
    // Restore preserved data
    for (let key in itemsToPreserve) {
      localStorage.setItem(key, itemsToPreserve[key]);
    }
    
    // Dispatch logout event to ensure WebSocket disconnection
    window.dispatchEvent(new CustomEvent('user-logged-out'));
    
    // Hide modal
    setForceLogoutModal({ isVisible: false, message: '' });
    
    // Redirect to login page
    window.location.href = '/login';
  };

  return (
    <WebSocketContext.Provider value={{ ws, isConnected, onlineUsers }}>
      {children}
      <ForceLogoutModal
        isVisible={forceLogoutModal.isVisible}
        message={forceLogoutModal.message}
        onConfirm={handleForceLogoutConfirm}
      />
    </WebSocketContext.Provider>
  );
}; 