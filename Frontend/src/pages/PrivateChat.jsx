import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../Context/WebSocketContext';
import {
  Header,
  MessageItem,
  EmptyState,
  TypingIndicator,
  ChatHeader,
  DeleteModal,
  MediaPreviewModal,
  PrivateChatAddFriendModal,
  FilePreviewBar,
  NotificationToast,
  ChatInput
} from '../Components';
import '../Style/privateChat.css';
import { friendsStorage } from '../Services/friendsStorage';

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteNotification, setShowDeleteNotification] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [showAddFriendNotification, setShowAddFriendNotification] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendAlias, setFriendAlias] = useState('');

  // Media selection state
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null); // {msg, src}

  const targetUserId = state?.userId || targetUserIdParam;
  const targetUsername = state?.username || 'User';
  const [profilePic, setProfilePic] = useState('');
  const [displayName, setDisplayName] = useState(targetUsername);

  // Use a consistent chatKey for both users
  const chatKey = `chat_${[myUserId, targetUserId].sort().join('_')}`;

  // Utility function to format timestamp for display (now just returns the time as-is since it's already local)
  const formatTimeForDisplay = (localTime) => {
    return localTime; // Already in local time format
  };

  // Fetch profile picture for the target user
  useEffect(() => {
    const fetchProfilePic = async () => {
      try {
        const token = localStorage.getItem('token');
        const picRes = await fetch(`http://localhost:5001/api/users/profile-pic/${targetUserId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (picRes.ok) {
          const picData = await picRes.json();
          setProfilePic(picData.profilePic || '');
        }
      } catch (error) {
        console.log('Error fetching profile picture:', error);
      }
    };
    
    fetchProfilePic();
  }, [targetUserId]);

  // Check if user is a friend
  useEffect(() => {
    const checkFriendStatus = () => {
      const isUserFriend = friendsStorage.isFriend(targetUserId);
      setIsFriend(isUserFriend);
      
      // Update display name based on friend status and alias
      const friends = friendsStorage.getFriends();
      const friend = friends.find(f => f.idofuser === targetUserId);
      if (friend && friend.alias) {
        setDisplayName(friend.alias);
      } else {
        setDisplayName(targetUsername);
      }
    };
    
    checkFriendStatus();
    
    // Listen for friends list updates
    const handleFriendsUpdate = () => {
      checkFriendStatus();
      // Also refresh messages to show updated aliases
      const localMsgs = JSON.parse(localStorage.getItem(chatKey) || '[]');
      const friends = friendsStorage.getFriends();
      
      const formatted = localMsgs.map(msg => {
        if (msg.system) {
          return {
            system: true,
            message: msg.message,
            time: formatTimeForDisplay(msg.time)
          };
        }
        
        // Check if the message sender is a friend with an alias
        let displayUsername = msg.username || (msg.fromUserId === myUserId ? myUsername : targetUsername);
        if (msg.fromUserId !== myUserId) {
          const friend = friends.find(f => f.idofuser === msg.fromUserId);
          if (friend && friend.alias) {
            displayUsername = friend.alias;
          }
        }
        
        return {
          from: msg.fromUserId === myUserId ? 'me' : 'them',
          text: msg.message || '',
          time: formatTimeForDisplay(msg.time),
          username: displayUsername,
          file: msg.file || null,
          fileUrl: msg.fileUrl || null,
          fileType: msg.fileType || null,
          filename: msg.filename || null
        };
      });
      setMessages(formatted);
    };
    
    window.addEventListener('friends-updated', handleFriendsUpdate);
    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        try {
          window.removeEventListener('friends-updated', handleFriendsUpdate);
        } catch (error) {
          console.warn('Error removing friends-updated event listener:', error);
        }
      }
    };
  }, [targetUserId, chatKey, myUserId, myUsername, targetUsername]);

  // Load local messages + fetch from DB if needed
  useEffect(() => {
    const localMsgs = JSON.parse(localStorage.getItem(chatKey) || '[]');
    const friends = friendsStorage.getFriends();
    
    const formatted = localMsgs.map(msg => {
      if (msg.system) {
        return {
          system: true,
          message: msg.message,
          time: formatTimeForDisplay(msg.time)
        };
      }
      
      // Check if the message sender is a friend with an alias
      let displayUsername = msg.username || (msg.fromUserId === myUserId ? myUsername : targetUsername);
      if (msg.fromUserId !== myUserId) {
        const friend = friends.find(f => f.idofuser === msg.fromUserId);
        if (friend && friend.alias) {
          displayUsername = friend.alias;
        }
      }
      
      return {
        from: msg.fromUserId === myUserId ? 'me' : 'them',
        text: msg.message || '',
        time: formatTimeForDisplay(msg.time),
        username: displayUsername,
        file: msg.file || null,
        fileUrl: msg.fileUrl || null,
        fileType: msg.fileType || null,
        filename: msg.filename || null
      };
    });
    setMessages(formatted);
  }, [targetUserId, myUserId, myUsername, targetUsername]);

  useEffect(() => {
    const handleMessageReceived = (e) => {
      if (e.detail.chatKey === chatKey) {
        const localMsgs = JSON.parse(localStorage.getItem(chatKey) || '[]');
        const friends = friendsStorage.getFriends();
        
        const formatted = localMsgs.map(msg => {
          if (msg.system) {
            return {
              system: true,
              message: msg.message,
              time: formatTimeForDisplay(msg.time)
            };
          }
          
          // Check if the message sender is a friend with an alias
          let displayUsername = msg.username || (msg.fromUserId === myUserId ? myUsername : targetUsername);
          if (msg.fromUserId !== myUserId) {
            const friend = friends.find(f => f.idofuser === msg.fromUserId);
            if (friend && friend.alias) {
              displayUsername = friend.alias;
            }
          }
          
          return {
            from: msg.fromUserId === myUserId ? 'me' : 'them',
            text: msg.message || '',
            time: formatTimeForDisplay(msg.time),
            username: displayUsername,
            file: msg.file || null,
            fileUrl: msg.fileUrl || null,
            fileType: msg.fileType || null,
            filename: msg.filename || null
          };
        });
        setMessages(formatted);
      }
    };

    const handleChatsDeleted = (event) => {
      const detail = event.detail;
      if (detail && detail.deletedUserId === targetUserId) {
        // If the current chat is with a deleted user, redirect to recent chats
        console.log(`Chat with deleted user ${targetUserId} detected, redirecting...`);
        navigate('/recent-chats');
      }
    };

    window.addEventListener('message-received', handleMessageReceived);
    window.addEventListener('chats-deleted', handleChatsDeleted);
    
    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        try {
          window.removeEventListener('message-received', handleMessageReceived);
          window.removeEventListener('chats-deleted', handleChatsDeleted);
        } catch (error) {
          console.warn('Error removing message/chat event listeners:', error);
        }
      }
    };
  }, [chatKey, myUserId, myUsername, targetUsername, targetUserId, navigate]);

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
        // Do nothing here. The global WebSocketContext handles saving and event dispatch.
      } else if (message.type === 'typing' && message.fromUserId === targetUserId) {
        setSomeoneTyping(message.username);
      } else if (message.type === 'stop-typing' && message.fromUserId === targetUserId) {
        setSomeoneTyping(null);
      }
    };

    if (ws.current) {
      ws.current.addEventListener('message', handleMessage);
    }
    
    return () => {
      if (ws.current && typeof ws.current.removeEventListener === 'function') {
        try {
          ws.current.removeEventListener('message', handleMessage);
        } catch (error) {
          console.warn('Error removing WebSocket message event listener:', error);
        }
      }
    };
  }, [targetUserId]);

  useEffect(() => {
    const handleProfileUpdate = (e) => {
      // Reload messages from localStorage to get updated usernames
      const localMsgs = JSON.parse(localStorage.getItem(chatKey) || '[]');
      const friends = friendsStorage.getFriends();
      
      const formatted = localMsgs.map(msg => {
        if (msg.system) {
          return {
            system: true,
            message: msg.message,
            time: formatTimeForDisplay(msg.time)
          };
        }
        
        // Check if the message sender is a friend with an alias
        let displayUsername = msg.username || (msg.fromUserId === myUserId ? myUsername : targetUsername);
        if (msg.fromUserId !== myUserId) {
          const friend = friends.find(f => f.idofuser === msg.fromUserId);
          if (friend && friend.alias) {
            displayUsername = friend.alias;
          }
        }
        
        return {
          from: msg.fromUserId === myUserId ? 'me' : 'them',
          text: msg.message,
          time: formatTimeForDisplay(msg.time),
          username: displayUsername
        };
      });
      setMessages(formatted);
    };
    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        try {
          window.removeEventListener('profile-updated', handleProfileUpdate);
        } catch (error) {
          console.warn('Error removing profile-updated event listener:', error);
        }
      }
    };
  }, [chatKey, myUserId, myUsername, targetUsername]);

  useEffect(() => {
    // Clear unread notifications for this chat
    let unread = JSON.parse(localStorage.getItem('unread_private') || '{}');
    if (unread[targetUserId]) {
      delete unread[targetUserId];
      localStorage.setItem('unread_private', JSON.stringify(unread));
      window.dispatchEvent(new CustomEvent('unread-updated'));
    }
  }, [targetUserId]);

  // Utility: Convert file to base64 (for small files)
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() && !selectedFile) return;

    const isUserOnline = onlineUsers.some(u => u.userId === targetUserId);
    let fileData = null;
    let filename = null;
    let fileType = null;
    let fileUrl = null;

    if (selectedFile) {
      filename = selectedFile.name;
      fileType = selectedFile.type;
      if (isUserOnline) {
        // For online users: send as base64 (for small files)
        fileData = await fileToBase64(selectedFile);
      } else {
        // For offline users: upload to backend and get real URL
        try {
          const formData = new FormData();
          formData.append('file', selectedFile);
          const res = await fetch('http://localhost:8080/api/chats/private-messages/upload', {
            method: 'POST',
            headers: { 
              Authorization: `Bearer ${localStorage.getItem('token')}` 
            },
            body: formData
          });
          
          if (res.ok) {
            const uploadResponse = await res.json();
            fileUrl = uploadResponse.url; // Real URL like "/uploads/private-media/123456-image.jpg"
          } else {
            console.error('File upload failed:', res.statusText);
            // Fallback to filename if upload fails
            fileUrl = filename;
          }
        } catch (error) {
          console.error('Error uploading file:', error);
          // Fallback to filename if upload fails
          fileUrl = filename;
        }
      }
    }

    // Send via WebSocket (handles both online and offline delivery)
    ws.current.send(JSON.stringify({
      type: 'private-message',
      toUserId: targetUserId,
      message: input,
      file: fileData, // base64 if online, null if offline
      fileUrl: fileUrl, // null if online, url if offline
      filename,
      fileType
    }));

    setInput('');
    if (selectedFile && filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
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

  const handleEmojiClick = (emoji) => {
    setInput(input + emoji);
    setShowEmojiPicker(false);
  };

  // Handler for toggling selection mode
  const handleToggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedMessages([]); // clear selection when toggling
  };

  // Handler for selecting all messages
  const handleSelectAllMessages = () => {
    const allTimes = messages.map(m => m.time);
    setSelectedMessages(allTimes);
  };

  // Handler for clearing all selections
  const handleClearAllSelections = () => {
    setSelectedMessages([]);
  };

  // Handler for selecting/unselecting a message by timestamp
  const handleSelectMessage = (msg) => {
    // Use the local time format directly since it's stored consistently
    setSelectedMessages((prev) =>
      prev.includes(msg.time)
        ? prev.filter((t) => t !== msg.time)
        : [...prev, msg.time]
    );
  };

  // Determine if all selected messages are sent by me
  const allSelectedByMe = selectedMessages.length > 0 && selectedMessages.every(selectedTime => {
    const localMsgs = JSON.parse(localStorage.getItem(chatKey) || '[]');
    const msg = localMsgs.find(m => m.time === selectedTime);
    return msg && msg.fromUserId === myUserId;
  });

  // Handler for deleting selected messages for me
  const handleDeleteForMe = () => {
    console.log('Delete for Me - selectedMessages:', selectedMessages);
    const msgs = JSON.parse(localStorage.getItem(chatKey) || '[]');
    console.log('Before delete (for me), localStorage:', msgs);
    // Remove messages whose time is in selectedMessages (local time format comparison)
    const updated = msgs.filter(msg => !selectedMessages.includes(msg.time));
    console.log('After delete (for me), localStorage:', updated);
    localStorage.setItem(chatKey, JSON.stringify(updated));
    localStorage.setItem(chatKey, JSON.stringify(updated));
    
    // Update messages state with alias checking
    const friends = friendsStorage.getFriends();
    const formatted = updated.map(msg => {
      if (msg.system) {
        return {
          system: true,
          message: msg.message,
          time: formatTimeForDisplay(msg.time)
        };
      }
      
      // Check if the message sender is a friend with an alias
      let displayUsername = msg.username || (msg.fromUserId === myUserId ? myUsername : targetUsername);
      if (msg.fromUserId !== myUserId) {
        const friend = friends.find(f => f.idofuser === msg.fromUserId);
        if (friend && friend.alias) {
          displayUsername = friend.alias;
        }
      }
      
      return {
        from: msg.fromUserId === myUserId ? 'me' : 'them',
        text: msg.message,
        time: formatTimeForDisplay(msg.time),
        username: displayUsername
      };
    });
    setMessages(formatted);
    setSelectedMessages([]);
    setShowDeleteModal(false);
    handleToggleSelectionMode();
    
    // Show delete notification
    setShowDeleteNotification(true);
    setTimeout(() => setShowDeleteNotification(false), 3000);
  };

  // Handler for deleting selected messages for everyone
  const handleDeleteForEveryone = () => {
    console.log('Delete for Everyone - selectedMessages:', selectedMessages);
    console.log('Delete for Everyone - chatKey:', chatKey);
    ws.current.send(JSON.stringify({
      type: 'delete-message-for-everyone',
      chatKey,
      timestamps: selectedMessages // Send local time format directly
    }));
    setShowDeleteModal(false);
    setSelectedMessages([]);
    handleToggleSelectionMode(); // close selection mode
    
    // Show delete notification
    setShowDeleteNotification(true);
    setTimeout(() => setShowDeleteNotification(false), 3000);
  };

  // --- Step 1: Handle file selection and preview ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    // Preview for images/videos/audio
    if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
  };

  // Handler for media click
  const handleMediaClick = (msg, src) => {
    if (msg.fileType && (msg.fileType.startsWith('image/') || msg.fileType.startsWith('video/') || msg.fileType.startsWith('audio/'))) {
      setMediaPreview({ msg, src });
    }
  };

  // Handler for adding user as friend
  const handleAddFriend = () => {
    setShowAddFriendModal(true);
    setFriendAlias('');
  };

  // Handler for submitting add friend with alias
  const handleAddFriendSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch('http://localhost:8080/api/friends/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          friendUserId: targetUserId,
          alias: friendAlias.trim() || null
        })
      });
      
      if (res.ok) {
        const responseData = await res.json();
        
        // Update both backend and localStorage synchronization
        const token = localStorage.getItem('token');
        if (token) {
          // Fetch fresh data from API to ensure both backend and localStorage are synchronized
          await friendsStorage.fetchAndStoreFriends(token);
        } else {
          // Fallback: Add friend to localStorage directly
          friendsStorage.addFriend(responseData.friend);
        }
        
        setIsFriend(true);
        
        // Show success notification
        setShowAddFriendNotification(true);
        setTimeout(() => setShowAddFriendNotification(false), 3000);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('friends-updated'));
        
        // Close modal
        setShowAddFriendModal(false);
        setFriendAlias('');
      } else {
        const errorData = await res.json();
        console.error('Failed to add friend:', errorData.message);
      }
    } catch (error) {
      console.error('Error adding friend:', error);
    }
  };

  // Handler for closing add friend modal
  const handleCloseAddFriendModal = () => {
    setShowAddFriendModal(false);
    setFriendAlias('');
  };

  return (
    <div className="private-chat-page">
      <Header />
      <div className="private-chat-container">
        <ChatHeader
          displayName={displayName}
          profilePic={profilePic}
          targetUserId={targetUserId}
          onlineUsers={onlineUsers}
          someoneTyping={someoneTyping}
          isFriend={isFriend}
          selectedMessages={selectedMessages}
          selectionMode={selectionMode}
          messages={messages}
          onBack={() => navigate(-1)}
          onAddFriend={handleAddFriend}
          onDeleteSelected={() => setShowDeleteModal(true)}
          onToggleSelectionMode={handleToggleSelectionMode}
          onSelectAll={handleSelectAllMessages}
          onClearSelection={handleClearAllSelections}
        />
        
        <DeleteModal
          isOpen={showDeleteModal}
          selectedMessages={selectedMessages}
          allSelectedByMe={allSelectedByMe}
          onClose={() => setShowDeleteModal(false)}
          onDeleteForMe={handleDeleteForMe}
          onDeleteForEveryone={handleDeleteForEveryone}
        />
        
        <div className={`chat-box ${messages.length === 0 ? 'empty-chat' : ''}`} ref={chatBoxRef}>
          {messages.length === 0 ? <EmptyState /> : messages.map((m, i) => (
            <div key={i} className="message-row">
              {selectionMode && (
                <input
                  type="checkbox"
                  checked={selectedMessages.includes(m.time)}
                  onChange={() => handleSelectMessage(m)}
                  style={{ marginRight: 8 }}
                />
              )}
              <MessageItem msg={m} onMediaClick={handleMediaClick} />
            </div>
          ))}
          {someoneTyping && <TypingIndicator username={someoneTyping} />}
        </div>
        
        <MediaPreviewModal 
          mediaPreview={mediaPreview} 
          onClose={() => setMediaPreview(null)} 
        />

        <PrivateChatAddFriendModal
          isOpen={showAddFriendModal}
          displayName={displayName}
          friendAlias={friendAlias}
          onClose={handleCloseAddFriendModal}
          onSubmit={handleAddFriendSubmit}
          onAliasChange={(e) => setFriendAlias(e.target.value)}
        />
        
        <FilePreviewBar
          selectedFile={selectedFile}
          filePreview={filePreview}
          onRemoveFile={handleRemoveFile}
        />
        
        <NotificationToast
          type="delete"
          message={`Message${selectedMessages.length > 1 ? 's' : ''} deleted successfully`}
          isVisible={showDeleteNotification}
        />
        
        <NotificationToast
          type="add-friend"
          message={`${displayName} added as friend successfully`}
          isVisible={showAddFriendNotification}
        />
        
        <ChatInput
          input={input}
          showEmojiPicker={showEmojiPicker}
          onInputChange={handleInputChange}
          onSend={handleSend}
          onToggleEmojiPicker={() => setShowEmojiPicker(v => !v)}
          onFileClick={handleFileChange}
          onEmojiClick={handleEmojiClick}
        />
      </div>
    </div>
  );
};

export default PrivateChat;
