import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, AddFriendModal } from '../Components';
import { AiOutlineUserAdd, AiOutlineMessage, AiOutlineEdit, AiOutlineDelete } from 'react-icons/ai';
import { friendsStorage } from '../Services/friendsStorage';
import { useWebSocket } from '../Context/WebSocketContext';
import '../Style/friendsList.css';

const FriendsList = () => {
  const navigate = useNavigate();
  const { onlineUsers } = useWebSocket();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFriend, setEditingFriend] = useState(null);
  const [newAlias, setNewAlias] = useState('');
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendUserId, setFriendUserId] = useState('');
  const [friendAlias, setFriendAlias] = useState('');
  const [popup, setPopup] = useState({ show: false, message: '', type: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState(null);

  // Helper function to check if a friend is online
  const isFriendOnline = (friendUserId) => {
    return onlineUsers && onlineUsers.some(user => user.userId === friendUserId);
  };

  // Get online friends count
  const onlineFriendsCount = friends.filter(friend => isFriendOnline(friend.idofuser)).length;

  const showPopup = (message, type = 'success') => {
    setPopup({ show: true, message, type });
    setTimeout(() => {
      setPopup({ show: false, message: '', type: '' });
    }, 3000);
  };

  useEffect(() => {
    const loadFriends = async () => {
      try {
        // Always use localStorage data for faster loading
        const cachedFriends = friendsStorage.getFriends();
        setFriends(cachedFriends);
        console.log('Loaded friends from localStorage:', cachedFriends);
      } catch (error) {
        console.error('Error loading friends:', error);
        // If localStorage fails, set empty array
        setFriends([]);
      } finally {
        setLoading(false);
      }
    };

    loadFriends();

    // Listen for friends updates from other components
    const handleFriendsUpdate = () => {
      console.log('Friends updated event received, refreshing friends list...');
      loadFriends();
    };

    // Listen for account deletion events
    const handleAccountDeleted = (event) => {
      const { deletedUserId, updatedFriends } = event.detail;
      console.log(`Account ${deletedUserId} was deleted, updating friends list...`);
      setFriends(updatedFriends);
    };

    window.addEventListener('friends-updated', handleFriendsUpdate);
    window.addEventListener('friend-account-deleted', handleAccountDeleted);

    // Cleanup event listeners on component unmount
    return () => {
      window.removeEventListener('friends-updated', handleFriendsUpdate);
      window.removeEventListener('friend-account-deleted', handleAccountDeleted);
    };
  }, []);

  const handleChatWithFriend = (friendUserId, friendUsername) => {
    navigate(`/private-chat/${friendUserId}`, { 
      state: { username: friendUsername, userId: friendUserId } 
    });
  };

  const handleRemoveFriend = async (friendUserId, friendUsername) => {
    setFriendToDelete({ userId: friendUserId, username: friendUsername });
    setShowDeleteConfirm(true);
  };

  const confirmDeleteFriend = async () => {
    if (!friendToDelete) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:8080/api/friends/remove/${friendToDelete.userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        // Update both backend and localStorage synchronization
        friendsStorage.removeFriend(friendToDelete.userId);
        // Update local state
        setFriends(prev => prev.filter(friend => friend.idofuser !== friendToDelete.userId));
        showPopup(`${friendToDelete.username} removed from friends successfully!`, 'success');
        console.log('Friend removed successfully - updated both backend and localStorage');
      } else {
        showPopup('Failed to remove friend', 'error');
        console.error('Failed to remove friend');
      }
    } catch (error) {
      showPopup('Error removing friend', 'error');
      console.error('Error removing friend:', error);
    } finally {
      setShowDeleteConfirm(false);
      setFriendToDelete(null);
    }
  };

  const cancelDeleteFriend = () => {
    setShowDeleteConfirm(false);
    setFriendToDelete(null);
  };

  const handleEditAlias = (friend) => {
    setEditingFriend(friend);
    setNewAlias(friend.alias || '');
    setShowEditModal(true);
  };

  const handleSaveAlias = async () => {
    if (!editingFriend) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:8080/api/friends/alias/${editingFriend.idofuser}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ alias: newAlias.trim() || null })
      });

      if (res.ok) {
        // Update both backend and localStorage synchronization
        friendsStorage.updateFriendAlias(editingFriend.idofuser, newAlias.trim() || null);
        
        // Update local state
        setFriends(prev => prev.map(friend => 
          friend.idofuser === editingFriend.idofuser 
            ? { ...friend, alias: newAlias.trim() || null }
            : friend
        ));
        
        // Close modal
        setShowEditModal(false);
        setEditingFriend(null);
        setNewAlias('');
        
        console.log('Friend alias updated successfully - updated both backend and localStorage');
      } else {
        console.error('Failed to update friend alias');
      }
    } catch (error) {
      console.error('Error updating friend alias:', error);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingFriend(null);
    setNewAlias('');
  };

  const handleAddFriend = () => {
    setShowAddFriendModal(true);
    setFriendUserId('');
    setFriendAlias('');
  };

  const handleCloseAddFriendModal = () => {
    setShowAddFriendModal(false);
    setFriendUserId('');
    setFriendAlias('');
  };

  const handleAddFriendSubmit = async (e) => {
    e.preventDefault();
    if (friendUserId.trim()) {
      const token = localStorage.getItem('token');
      
      // Check if already a friend using localStorage
      if (friendsStorage.isFriend(friendUserId.trim())) {
        showPopup('User is already in your friends list', 'error');
        handleCloseAddFriendModal();
        return;
      }

      try {
        const res = await fetch('http://localhost:8080/api/friends/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ 
            friendUserId: friendUserId.trim(),
            alias: friendAlias.trim() || null
          })
        });
        
        if (res.ok) {
          const responseData = await res.json();
          
          // Update both backend and localStorage: fetch fresh data to ensure synchronization
          if (token) {
            await friendsStorage.fetchAndStoreFriends(token);
            const refreshedFriends = friendsStorage.getFriends();
            setFriends(refreshedFriends);
          } else {
            // Fallback: Add friend to localStorage if no token
            friendsStorage.addFriend(responseData.friend);
            setFriends(prev => [...prev, responseData.friend]);
          }
          
          console.log(`Friend added successfully${friendAlias.trim() ? ` as "${friendAlias.trim()}"` : ''}!`);
          showPopup(`Friend added successfully${friendAlias.trim() ? ` as "${friendAlias.trim()}"` : ''}!`, 'success');
        } else {
          const errorData = await res.json();
          showPopup(errorData.message || 'Failed to add friend', 'error');
        }
      } catch (error) {
        console.error('Error adding friend:', error);
        showPopup('Error adding friend', 'error');
      }
      handleCloseAddFriendModal();
    }
  };

  if (loading) {
    return (
      <div className="friends-page">
        <Header />
        <div className="friends-container">
          <div className="friends-hero">
            <div className="friends-loading">
              <div className="friends-loading-spinner"></div>
              <h2>Loading friends...</h2>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="friends-page">
      <Header />
      <div className="friends-container">
        <div className="friends-hero">
          <h2 className="friends-title">My Friends</h2>
          <p className="friends-subtitle">Welcome to your Friends hub, connect and chat today! <br />
            Here you can manage your friends list, chat with them, and keep track of your connections
          </p>
    
          
          <div className="friends-stats">
            <div className="stat-card">
              <div className="stat-number">{friends.length}</div>
              <div className="stat-label">Total Friends</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{onlineFriendsCount}</div>
              <div className="stat-label">Online Now</div>
            </div>
          </div>

          <div className="friends-actions">
            <button 
              className="friends-add-btn" 
              onClick={handleAddFriend}
            >
              <AiOutlineUserAdd className="btn-icon" />
              Add New Friend
            </button>
          </div>
          
          {friends.length === 0 ? (
            <div className="friends-empty-state">
              <AiOutlineUserAdd className="friends-empty-icon" />
              <p className="friends-empty-text">No friends added yet.</p>
              <p className="friends-empty-subtext">Start building your network by adding friends above!</p>
            </div>
          ) : (
            <div className="friends-grid">
              {friends.map((friend) => (
                <div key={friend.id} className="friend-card">
                  <div className="friend-info">
                    <div className="friend-avatar-container">
                      {friend.profile_pic ? (
                        <img 
                          src={friend.profile_pic.startsWith('/uploads/') ? `http://localhost:8080${friend.profile_pic}` : friend.profile_pic}
                          alt={friend.alias || friend.username}
                          className="friend-avatar"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      {!friend.profile_pic ? (
                        <div className="friend-avatar-fallback">
                          {(friend.alias || friend.username).charAt(0).toUpperCase()}
                        </div>
                      ) : (
                        <div className="friend-avatar-fallback" style={{ display: 'none' }}>
                          {(friend.alias || friend.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                      {isFriendOnline(friend.idofuser) && (
                        <div className="online-status-indicator"></div>
                      )}
                    </div>
                    <div className="friend-details">
                      <h3 className="friend-name">
                        {friend.alias ? (
                          <>
                            <span className="friend-alias">{friend.alias}</span>
                            <span className="friend-username-sub">({friend.username})</span>
                          </>
                        ) : (
                          <span className="friend-username-only">{friend.username}</span>
                        )}
                      </h3>
                      <p className="friend-id">
                        ID: {friend.idofuser}
                      </p>
                    </div>
                  </div>
                  
                  <div className="friend-actions">
                    <button
                      onClick={() => handleChatWithFriend(friend.idofuser, friend.alias || friend.username)}
                      className="friend-action-btn friend-chat-btn"
                      title="Start Chat"
                    >
                      <AiOutlineMessage />
                    </button>
                    <button
                      onClick={() => handleEditAlias(friend)}
                      className="friend-action-btn friend-edit-btn"
                      title="Edit Alias"
                    >
                      <AiOutlineEdit />
                    </button>
                    <button
                      onClick={() => handleRemoveFriend(friend.idofuser, friend.alias || friend.username)}
                      className="friend-action-btn friend-remove-btn"
                      title="Remove Friend"
                    >
                      <AiOutlineDelete />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Alias Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Alias for {editingFriend?.username}</h3>
              <button className="modal-close" onClick={handleCloseEditModal}>
                ×
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveAlias(); }}>
              <div className="modal-body">
                <p>Enter a new nickname for <strong>{editingFriend?.username}</strong>:</p>
                <input
                  type="text"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  placeholder={`Enter nickname for ${editingFriend?.username} (leave empty to remove nickname)`}
                  className="modal-input"
                  autoFocus
                  maxLength={50}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn modal-btn-cancel" onClick={handleCloseEditModal}>
                  Cancel
                </button>
                <button type="submit" className="modal-btn modal-btn-save">
                  Save Alias
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AddFriendModal
        isOpen={showAddFriendModal}
        onClose={handleCloseAddFriendModal}
        friendUserId={friendUserId}
        setFriendUserId={setFriendUserId}
        friendAlias={friendAlias}
        setFriendAlias={setFriendAlias}
        onSubmit={handleAddFriendSubmit}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button className="modal-close" onClick={cancelDeleteFriend}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to remove <strong>{friendToDelete?.username}</strong> from your friends list?</p>
              <p style={{ color: '#dc2626', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="modal-btn modal-btn-cancel" onClick={cancelDeleteFriend}>
                Cancel
              </button>
              <button type="button" className="modal-btn modal-btn-delete" onClick={confirmDeleteFriend}>
                Remove Friend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Popup */}
      {popup.show && (
        <div className="popup-overlay">
          <div className={`popup-content ${popup.type}`}>
            <div className="popup-message">{popup.message}</div>
            <button 
              className="popup-close" 
              onClick={() => setPopup({ show: false, message: '', type: '' })}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendsList;
