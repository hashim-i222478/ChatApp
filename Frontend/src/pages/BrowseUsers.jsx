import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Components';
import { AiOutlineUserAdd, AiOutlineMessage, AiOutlineSearch, AiOutlineArrowLeft } from 'react-icons/ai';
import { friendsStorage } from '../Services/friendsStorage';
import '../Style/browseUsers.css';

const BrowseUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOption, setFilterOption] = useState('all'); // 'all' or 'non-friends'
  const [popup, setPopup] = useState({ show: false, message: '', type: '' });
  const [addingFriend, setAddingFriend] = useState(null); // Track which user is being added
  const myUserId = localStorage.getItem('userId');

  const showPopup = (message, type = 'success') => {
    setPopup({ show: true, message, type });
    setTimeout(() => {
      setPopup({ show: false, message: '', type: '' });
    }, 3000);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8080/api/users/all', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const allUsers = await response.json();
          // Filter out the current user and get their profile pics
          const otherUsers = allUsers.filter(user => user.user_id !== myUserId);
          
          // Fetch profile pictures for each user
          const usersWithPics = await Promise.all(
            otherUsers.map(async (user) => {
              try {
                const picRes = await fetch(`http://localhost:5001/api/users/profile-pic/${user.user_id}`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                if (picRes.ok) {
                  const picData = await picRes.json();
                  user.profile_pic = picData.profilePic || null;
                }
              } catch {
                user.profile_pic = null;
              }
              return user;
            })
          );

          setUsers(usersWithPics);
        } else {
          throw new Error('Failed to fetch users');
        }
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [myUserId]);

  const handleAddFriend = async (user) => {
    const token = localStorage.getItem('token');
    
    // Check if already a friend
    if (friendsStorage.isFriend(user.user_id)) {
      showPopup('User is already in your friends list', 'error');
      return;
    }

    setAddingFriend(user.user_id);
    
    try {
      const response = await fetch('http://localhost:8080/api/friends/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          friendUserId: user.user_id,
          alias: null
        })
      });
      
      if (response.ok) {
        // Update localStorage with fresh data
        await friendsStorage.fetchAndStoreFriends(token);
        showPopup(`${user.username} added to your friends list!`, 'success');
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('friends-updated'));
      } else {
        const errorData = await response.json();
        showPopup(errorData.message || 'Failed to add friend', 'error');
      }
    } catch (error) {
      console.error('Error adding friend:', error);
      showPopup('Error adding friend', 'error');
    } finally {
      setAddingFriend(null);
    }
  };

  const handleStartChat = (user) => {
    navigate(`/private-chat/${user.user_id}`, {
      state: { username: user.username, userId: user.user_id }
    });
  };

  const handleBackToFriends = () => {
    navigate('/friends');
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Filter users based on search query and filter option
  const filteredUsers = users.filter(user => {
    // First apply search filter
    const matchesSearch = searchQuery
      ? user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.user_id.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    // Then apply friend filter
    const matchesFilter = filterOption === 'all' 
      ? true 
      : !friendsStorage.isFriend(user.user_id);

    return matchesSearch && matchesFilter;
  });

  const isUserFriend = (userId) => {
    return friendsStorage.isFriend(userId);
  };

  if (loading) {
    return (
      <div className="user-discovery-page">
        <Header />
        <div className="user-discovery-container">
          <div className="user-discovery-hero">
            <div className="user-discovery-loading">
              <div className="user-discovery-loading-spinner"></div>
              <h2>Loading users...</h2>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-discovery-page">
        <Header />
        <div className="user-discovery-container">
          <div className="user-discovery-hero">
            <div className="user-discovery-error">
              <h2>Error</h2>
              <p>{error}</p>
              <button 
                className="error-retry-btn"
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-discovery-page">
      <Header />
      <div className="user-discovery-container">
        <div className="user-discovery-hero">
          {/* Header with Back Button and Title */}
          <div className="user-discovery-header">
            <button 
              className="user-discovery-back-btn"
              onClick={handleBackToFriends}
              title="Back to Friends"
            >
              <AiOutlineArrowLeft />
              <span>Back to Friends</span>
            </button>
            <h2 className="user-discovery-title">Browse Users</h2>
          </div>

          <p className="user-discovery-subtitle">
            Discover and connect with other users on RealTalk! <br />
            Find new friends and start conversations.
          </p>

          {/* Search bar */}
          <div className="user-search-container">
            <AiOutlineSearch className="user-search-icon" />
            <input
              type="text"
              className="user-search-input"
              placeholder="Search by username or ID..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <button 
                className="user-search-clear" 
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Filter buttons */}
          <div className="user-discovery-filters">
            <button
              className={`user-filter-btn ${filterOption === 'all' ? 'active' : ''}`}
              onClick={() => setFilterOption('all')}
            >
              Show All Users
            </button>
            <button
              className={`user-filter-btn ${filterOption === 'non-friends' ? 'active' : ''}`}
              onClick={() => setFilterOption('non-friends')}
            >
              Show Non-Friends Only
            </button>
          </div>

          <div className="user-discovery-stats">
            <div className="discovery-stat-card">
              <div className="discovery-stat-number">{users.length}</div>
              <div className="discovery-stat-label">Total Users</div>
            </div>
            <div className="discovery-stat-card">
              <div className="discovery-stat-number">{filteredUsers.length}</div>
              <div className="discovery-stat-label">
                {filterOption === 'all' ? 'Showing' : 'Non-Friends'}
              </div>
            </div>
            <div className="discovery-stat-card">
              <div className="discovery-stat-number">
                {users.filter(user => friendsStorage.isFriend(user.user_id)).length}
              </div>
              <div className="discovery-stat-label">Friends</div>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="user-discovery-empty-state">
              <AiOutlineSearch className="user-discovery-empty-icon" />
              <p className="user-discovery-empty-text">
                {searchQuery 
                  ? 'No users found matching your search.' 
                  : filterOption === 'non-friends'
                  ? 'No non-friend users found.'
                  : 'No other users found.'}
              </p>
              {(searchQuery || filterOption === 'non-friends') && (
                <p className="user-discovery-empty-subtext">
                  {searchQuery 
                    ? 'Try adjusting your search terms.'
                    : 'All users in the system are already your friends!'}
                </p>
              )}
            </div>
          ) : (
            <div className="user-discovery-grid">
              {filteredUsers.map((user) => (
                <div key={user.id} className="user-profile-card">
                  <div className="user-profile-info">
                    <div className="user-profile-avatar-container">
                      {user.profile_pic ? (
                        <img 
                          src={user.profile_pic.startsWith('/uploads/') 
                            ? `http://localhost:8080${user.profile_pic}` 
                            : user.profile_pic}
                          alt={user.username}
                          className="user-profile-avatar"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      {!user.profile_pic ? (
                        <div className="user-profile-avatar-fallback">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      ) : (
                        <div className="user-profile-avatar-fallback" style={{ display: 'none' }}>
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="user-profile-details">
                      <h3 className="user-profile-name">{user.username}</h3>
                      <p className="user-profile-id">ID: {user.user_id}</p>
                      {isUserFriend(user.user_id) && (
                        <span className="user-profile-friend-badge">Friend</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="user-profile-actions">
                    <button
                      onClick={() => handleStartChat(user)}
                      className="user-profile-action-btn user-profile-chat-btn"
                      title="Start Chat"
                    >
                      <AiOutlineMessage />
                    </button>
                    {!isUserFriend(user.user_id) ? (
                      <button
                        onClick={() => handleAddFriend(user)}
                        className="user-profile-action-btn user-profile-add-btn"
                        title="Add Friend"
                        disabled={addingFriend === user.user_id}
                      >
                        {addingFriend === user.user_id ? (
                          <div className="user-profile-mini-spinner"></div>
                        ) : (
                          <AiOutlineUserAdd />
                        )}
                      </button>
                    ) : (
                      <button
                        className="user-profile-action-btn user-profile-added-btn"
                        title="Already a friend"
                        disabled
                      >
                        <AiOutlineUserAdd />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Custom Popup */}
      {popup.show && (
        <div className="user-discovery-popup-overlay">
          <div className={`user-discovery-popup-content ${popup.type}`}>
            <div className="user-discovery-popup-message">{popup.message}</div>
            <button 
              className="user-discovery-popup-close" 
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

export default BrowseUsers;
