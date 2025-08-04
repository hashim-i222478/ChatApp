import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../Context/WebSocketContext';
import Header from './header';
import '../Style/privateChat.css';
import axios from 'axios';
import { FaTrash, FaPaperPlane, FaSmile, FaPaperclip, FaArrowLeft, FaCheckSquare, 
         FaTimes, FaUserAlt, FaExclamationTriangle, FaUserSecret, FaFileAlt,
         FaFilePdf, FaFileWord, FaFileExcel, FaFileImage, FaFileAudio, FaFileVideo, FaRegCheckSquare, FaUserPlus  } from 'react-icons/fa';
import { set } from 'mongoose';
import { friendsStorage } from '../Services/friendsStorage';

const MessageItem = ({ msg, onMediaClick }) => {
  if (msg.system) {
    // Render a centered or styled system message
    return (
      <div className="system-message">
        <span>{msg.message}</span>
        <span className="message-time">[{msg.time}]</span>
      </div>
    );
  }

  // --- Step 5: Media rendering logic ---
  // Determine media source (base64 or URL)
  let mediaSrc = null;
  if (msg.file) {
    mediaSrc = msg.file;
  } else if (msg.fileUrl) {
    mediaSrc = msg.fileUrl.startsWith('http') ? msg.fileUrl : `http://localhost:8080${msg.fileUrl}`;
  }

  // Render media based on fileType
  let mediaElement = null;
  if (mediaSrc && msg.fileType) {
    if (msg.fileType.startsWith('image/')) {
      mediaElement = (
        <div style={{ cursor: 'pointer', display: 'inline-block' }} onClick={() => onMediaClick && onMediaClick(msg, mediaSrc)}>
          <img src={mediaSrc} alt={msg.filename || 'image'} style={{ maxWidth: 180, maxHeight: 180, borderRadius: 8, marginTop: 8 }} />
        </div>
      );
    } else if (msg.fileType.startsWith('video/')) {
      mediaElement = (
        <div style={{ cursor: 'pointer', display: 'inline-block' }} onClick={() => onMediaClick && onMediaClick(msg, mediaSrc)}>
          <video src={mediaSrc} controls style={{ maxWidth: 220, maxHeight: 180, borderRadius: 8, marginTop: 8 }} />
        </div>
      );
    } else if (msg.fileType.startsWith('audio/')) {
      mediaElement = (
        <div style={{ cursor: 'pointer', display: 'inline-block' }} onClick={() => onMediaClick && onMediaClick(msg, mediaSrc)}>
          <audio src={mediaSrc} controls style={{ maxWidth: 220, marginTop: 8 }} />
        </div>
      );
    } else {
      // Select appropriate file icon based on file type
      let FileIcon = FaFileAlt; // default icon
      if (msg.fileType) {
        if (msg.fileType.includes('pdf')) FileIcon = FaFilePdf;
        else if (msg.fileType.includes('word') || msg.fileType.includes('doc')) FileIcon = FaFileWord;
        else if (msg.fileType.includes('excel') || msg.fileType.includes('sheet') || msg.fileType.includes('xls')) FileIcon = FaFileExcel;
        else if (msg.fileType.includes('image')) FileIcon = FaFileImage;
        else if (msg.fileType.includes('audio')) FileIcon = FaFileAudio;
        else if (msg.fileType.includes('video')) FileIcon = FaFileVideo;
      }
      
      mediaElement = (
        <a 
          href={mediaSrc} 
          download={msg.filename} 
          target="_blank" 
          rel="noopener noreferrer" 
          className={`file-link ${msg.from === 'me' ? 'file-link-self' : ''}`}
        >
          <FileIcon style={{ marginRight: 8, fontSize: '1.2em' }} />
          <span className="file-name">{msg.filename || 'Download file'}</span>
        </a>
      );
    }
  }

  return (
    <div className={`message-container ${msg.from === 'me' ? 'message-self' : 'message-other'}`}>
      <div className="message-bubble">
        <div className="message-header">
          <span className="message-username">{msg.username}</span>
          <span className="message-time">[{msg.time}]</span>
        </div>
        {/* Show text if present */}
        {msg.text && msg.text.trim() !== '' && <p className="message-text">{msg.text}</p>}
        {/* Show media if present */}
        {mediaElement}
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="system-message">No messages yet. Say hello!</div>
);

const TypingIndicator = ({ username }) => (
  <div className="typing-indicator">
    <div className="typing-content">{username} is typing...</div>
  </div>
);

const emojiList = ['😀', '😂', '😍', '😎', '😭', '👍', '🎉', '❤️', '🔥', '🙏'];

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

  // --- Step 1: Media selection state ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const targetUserId = state?.userId || targetUserIdParam;
  const targetUsername = state?.username || 'User';
  const [profilePic, setProfilePic] = useState('');
  const [displayName, setDisplayName] = useState(targetUsername);

  // Use a consistent chatKey for both users
  const chatKey = `chat_${[myUserId, targetUserId].sort().join('_')}`;

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
            time: isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString()
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
          time: isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString(),
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
    return () => window.removeEventListener('friends-updated', handleFriendsUpdate);
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
          time: isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString()
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
        time: isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString(),
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
              time: isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString()
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
            time: isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString(),
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
    window.addEventListener('message-received', handleMessageReceived);
    return () => window.removeEventListener('message-received', handleMessageReceived);
  }, [chatKey, myUserId, myUsername, targetUsername]);

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

    ws.current.addEventListener('message', handleMessage);
    return () => {
      ws.current.removeEventListener('message', handleMessage);
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
            time: isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString()
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
          time: isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString(),
          username: displayUsername
        };
      });
      setMessages(formatted);
    };
    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
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
        // For demo: send as base64 (for small files)
        fileData = await fileToBase64(selectedFile);
      } else {
        // Placeholder: upload to backend (to be implemented in backend step)
        // Here, just simulate upload and set fileUrl to filename
        // In real code, use FormData and axios/fetch to upload
        // Example:
        // const formData = new FormData();
        // formData.append('file', selectedFile);
        // const res = await axios.post('http://localhost:8080/api/chats/private-messages/upload', formData, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        // fileUrl = res.data.url;
        fileUrl = filename; // Placeholder
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

  // Handler for selecting/unselecting a message by timestamp
  const handleSelectMessage = (msg) => {
    //console.log('selecting message: ', msg, 'with time: ', msg.time);
    setSelectedMessages((prev) =>
      prev.includes(msg.time)
        ? prev.filter((t) => t !== msg.time)
        : [...prev, msg.time]
        //console.log('Selected messages:', [...prev, msg.time])
    );
    
  };

  // Determine if all selected messages are sent by me
  const allSelectedByMe = selectedMessages.length > 0 && selectedMessages.every(selTime => {
    const msg = messages.find(m => m.time === selTime);
    return msg && msg.from === 'me';
  });

  // Handler for deleting selected messages for me
  const handleDeleteForMe = () => {
    console.log('Delete for Me - selectedMessages:', selectedMessages);
    const msgs = JSON.parse(localStorage.getItem(chatKey) || '[]');
    console.log('Before delete (for me), localStorage:', msgs);
    // Remove messages whose time is in selectedMessages
    const updated = msgs.filter(msg => !selectedMessages.includes(isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString()));
    console.log('After delete (for me), localStorage:', updated);
    localStorage.setItem(chatKey, JSON.stringify(updated));
    
    // Update messages state with alias checking
    const friends = friendsStorage.getFriends();
    const formatted = updated.map(msg => {
      if (msg.system) {
        return {
          system: true,
          message: msg.message,
          time: isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString()
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
        time: isNaN(Date.parse(msg.time)) ? msg.time : new Date(msg.time).toLocaleTimeString(),
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
      timestamps: selectedMessages
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

  const [mediaPreview, setMediaPreview] = useState(null); // {msg, src}

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
        
        // Refresh friends list from API to get complete data including profile pictures
        const token = localStorage.getItem('token');
        if (token) {
          await friendsStorage.fetchAndStoreFriends(token);
        } else {
          // Fallback: Add friend to localStorage if no token
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
        <div className="chat-header">
          <div className="chat-header-left">
            <button className="back-button2" onClick={() => navigate(-1)} title="Go back">
              <FaArrowLeft />
            </button>
            <div className="user-avatar-wrapper">
              <div className="user-avatar">
                {profilePic ? (
                  <img 
                    src={profilePic.startsWith('/uploads/') 
                      ? `http://localhost:8080${profilePic}` 
                      : profilePic} 
                    alt={displayName} 
                    className="avatar-img" 
                    loading="lazy"
                  />
                ) : (
                  <div className="initial-circle">{displayName[0] ? displayName[0].toUpperCase() : '?'}</div>
                )}
                {onlineUsers.some(u => u.userId === targetUserId) && (
                  <span className="online-status-indicator"></span>
                )}
              </div>
            </div>
            <div className="user-details">
              <h1 className={`chat-title ${isFriend ? 'friend-name' : 'non-friend-name'}`}>
                <span>{displayName}</span>
              </h1>
              {someoneTyping ? (
                <div className="typing-status">{someoneTyping} is typing...</div>
              ) : (
                <div className="user-status">
                  {onlineUsers.some(u => u.userId === targetUserId) ? 'Online' : 'Offline'}
                </div>
              )}
            </div>
          </div>
          <div className="chat-header-actions">
            {!isFriend && (
              <button 
                className="add-friend-btn" 
                onClick={handleAddFriend}
                title="Add as friend"
              >
                <FaUserPlus />
                <span className="button-text">Add Friend</span>
              </button>
            )}
            {selectedMessages.length > 0 && (
              <button className="delete-selected-btn" title="Delete selected messages" onClick={() => setShowDeleteModal(true)}>
                <FaTrash />
                <span className="button-text">{selectedMessages.length}</span>
              </button>
            )}
            <button 
              className={`select-messages-btn ${selectionMode ? 'active' : ''}`} 
              onClick={handleToggleSelectionMode}
              title={selectionMode ? "Cancel selection" : "Select messages"}
            >
              {selectionMode ? <><FaTimes /><span className="button-text">Cancel</span></> : <><FaRegCheckSquare /><span className="button-text">Select Messages</span></>}
            </button>
          </div>
        </div>
        {/* Delete modal */}
        {showDeleteModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3><FaExclamationTriangle className="modal-icon" /> Delete Message{selectedMessages.length > 1 ? 's' : ''}</h3>
                <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete {selectedMessages.length} message{selectedMessages.length > 1 ? 's' : ''}?</p>
              </div>
              <div className="modal-footer">
                <button className="modal-btn cancel" onClick={() => setShowDeleteModal(false)}>
                  <FaTimes /> Cancel
                </button>
                <button className="modal-btn delete-for-me" onClick={handleDeleteForMe}>
                  <FaUserAlt /> Delete for Me
                </button>
                {allSelectedByMe && (
                  <button className="modal-btn delete-for-everyone" onClick={handleDeleteForEveryone}>
                    <FaUserSecret /> Delete for Everyone
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="chat-box" ref={chatBoxRef}>
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
        {/* Media Preview Modal */}
        {mediaPreview && (
          <div className="media-modal-overlay" onClick={() => setMediaPreview(null)}>
            <div className="media-modal-content" onClick={e => e.stopPropagation()}>
              <button className="media-modal-close" onClick={() => setMediaPreview(null)}>
                <FaTimes />
              </button>
              
              {mediaPreview.msg.fileType.startsWith('image/') && (
                <img 
                  src={mediaPreview.src} 
                  alt={mediaPreview.msg.filename || 'preview'} 
                  className="media-modal-image" 
                  loading="lazy"
                />
              )}
              
              {mediaPreview.msg.fileType.startsWith('video/') && (
                <video 
                  src={mediaPreview.src} 
                  controls 
                  autoPlay 
                  className="media-modal-video" 
                />
              )}
              
              {mediaPreview.msg.fileType.startsWith('audio/') && (
                <audio 
                  src={mediaPreview.src} 
                  controls 
                  autoPlay 
                  className="media-modal-audio" 
                />
              )}
              
            </div>
          </div>
        )}

        {/* Add Friend Modal */}
        {showAddFriendModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Add {displayName} as Friend</h3>
                <button className="modal-close" onClick={handleCloseAddFriendModal}>
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleAddFriendSubmit}>
                <div className="modal-body">
                  <p>Would you like to add an alias (nickname) for <strong>{displayName}</strong>?</p>
                  <p className="modal-subtitle">You can leave this blank to use their username.</p>
                  <input
                    type="text"
                    value={friendAlias}
                    onChange={(e) => setFriendAlias(e.target.value)}
                    placeholder={`Enter alias for ${displayName} (optional)`}
                    className="modal-input"
                    autoFocus
                    maxLength={50}
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="modal-btn cancel" onClick={handleCloseAddFriendModal}>
                    <FaTimes /> Cancel
                  </button>
                  <button type="submit" className="modal-btn add-friend">
                    <FaUserPlus /> Add Friend
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* --- Step 1: File preview UI --- */}
        {selectedFile && (
          <div className="media-preview-bar" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, background: '#f3f4f6', borderRadius: 8, padding: 8 }}>
            {/* Preview for images/videos/audio */}
            {filePreview && selectedFile.type.startsWith('image/') && (
              <img src={filePreview} alt="preview" style={{ maxWidth: 80, maxHeight: 80, borderRadius: 8 }} />
            )}
            {filePreview && selectedFile.type.startsWith('video/') && (
              <video src={filePreview} controls style={{ maxWidth: 120, maxHeight: 80, borderRadius: 8 }} />
            )}
            {filePreview && selectedFile.type.startsWith('audio/') && (
              <audio src={filePreview} controls style={{ maxWidth: 120 }} />
            )}
            {/* For other files, show icon and filename */}
            {!filePreview && (
              <span style={{ fontWeight: 500, color: '#374151' }}>
                <FaPaperclip style={{ marginRight: 6 }} />
                {selectedFile.name}
              </span>
            )}
            {/* File info */}
            <span style={{ fontSize: '0.85rem', color: '#6b7280', marginLeft: 8 }}>
              {selectedFile.type || 'Unknown type'} | {(selectedFile.size / 1024).toFixed(1)} KB
            </span>
            <button onClick={handleRemoveFile} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18 }} title="Remove file">
              <FaTimes />
            </button>
          </div>
        )}
        {/* Delete Notification */}
        {showDeleteNotification && (
          <div className="delete-notification">
            <FaTrash className="notification-icon" />
            <span>Message{selectedMessages.length > 1 ? 's' : ''} deleted successfully</span>
          </div>
        )}
        
        {/* Add Friend Notification */}
        {showAddFriendNotification && (
          <div className="add-friend-notification">
            <FaUserPlus className="notification-icon" />
            <span>{displayName} added as friend successfully</span>
          </div>
        )}
        
        <div className="chat-input-container">
          <input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={handleInputChange}
            className="chat-input"
            onKeyDown={e => { if (e.key === 'Enter') handleSend(e); }}
            style={{ flex: 1 }}
          />
          {/* --- Step 1: Hidden file input and trigger button --- */}
          <input
            type="file"
            id="media-file-input"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
          <button
            type="button"
            className="emoji-button"
            onClick={() => setShowEmojiPicker(v => !v)}
            aria-label="Add emoji"
            title="Add emoji"
          >
            <FaSmile />
          </button>
          <button
            type="button"
            className="Media-send-button"
            title="Attach media"
            onClick={() => document.getElementById('media-file-input').click()}
          >
            <FaPaperclip />
          </button>
          <button
            onClick={handleSend}
            className="chat-send-button"
            title="Send message"
          >
            <FaPaperPlane />
          </button>
          {showEmojiPicker && (
            <div className="emoji-picker-bar">
              {emojiList.map(emoji => (
                <button
                  key={emoji}
                  style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => handleEmojiClick(emoji)}
                  tabIndex={0}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivateChat;
