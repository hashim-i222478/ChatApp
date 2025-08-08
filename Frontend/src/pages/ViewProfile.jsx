import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Components';
import '../Style/viewProfile.css';
import { authAPI } from '../Services/api';

const ViewProfile = () => {
  const [profile, setProfile] = useState(null);
  const [profilePic, setProfilePic] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [deletionMessage, setDeletionMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await authAPI.getProfile();
        setProfile(response.data);
        if (response.data.userId) {
          const token = localStorage.getItem('token');
          try {
            const picRes = await fetch(`http://localhost:5001/api/users/profile-pic/${response.data.userId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (picRes.ok) {
              const picData = await picRes.json();
              if (picData.profilePic) setProfilePic(picData.profilePic);
            }
          } catch {}
        }
      } catch (err) {
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleEditProfile = () => {
    navigate('/update-profile');
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeletionMessage('Deleting your profile, please wait...');
    
    try {
      const token = localStorage.getItem('token');
      console.log('Starting account deletion...');
      
      const response = await fetch('http://localhost:8080/api/users/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Delete response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Delete successful:', result);
        
        // Clean up localStorage for this deleted user in case WebSocket doesn't work
        if (result.deletedUserId) {
          import('../Services/friendsStorage').then(({ friendsStorage }) => {
            friendsStorage.removeFriendByUserId(result.deletedUserId);
          });
        }
        
        // First, stop the loading state
        setDeleteLoading(false);
        
        // Then show success popup
        setDeletionMessage('Your account has been successfully deleted!\nYou will be redirected to the login page shortly.');
        setShowSuccessPopup(true);
        
        // Clear localStorage and redirect after a short delay
        setTimeout(() => {
          localStorage.clear();
          // Dispatch logout event to close WebSocket connection
          window.dispatchEvent(new CustomEvent('user-logged-out'));
          navigate('/login');
        }, 2000);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
        console.error('Delete failed:', errorData);
        setDeleteLoading(false);
        setDeletionMessage(`Failed to delete account: ${errorData.message}`);
        setShowSuccessPopup(true);
        
        // Hide the popup after 3 seconds for errors
        setTimeout(() => {
          setShowSuccessPopup(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setDeleteLoading(false);
      setDeletionMessage('An error occurred while deleting your account. Please check if the server is running and try again.');
      setShowSuccessPopup(true);
      
      // Hide the popup after 3 seconds for errors
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);
    } finally {
      setShowDeleteModal(false);
    }
  };

  const cancelDeleteAccount = () => {
    setShowDeleteModal(false);
  };

  return (
    <div className="view-profile-page">
      <Header />
      <div className="view-profile-container">
        <div className="view-profile-card">
          <div className="profile-pic-section">
            {profilePic ? (
              <img
                src={profilePic.startsWith('/uploads/') ? `http://localhost:8080${profilePic}` : profilePic}
                alt="Profile"
                className="profile-pic-img"
              />
            ) : (
              <div className="profile-pic-placeholder">
                {profile && profile.username ? profile.username[0].toUpperCase() : "?"}
              </div>
            )}
          </div>
          <div className="view-profile-header">
            <h2 className="view-profile-title">
              <span className="title-icon"></span> Your Account Details
            </h2>
            <div className="profile-actions">
              <button className="edit-profile-button" onClick={handleEditProfile}>
                Edit Profile
              </button>
              <button className="delete-profile-button" onClick={handleDeleteAccount}>
                Delete Account
              </button>
            </div>
          </div>

          {loading && <div className="profile-loading">Loading your profile...</div>}
          {error && <div className="profile-error">{error}</div>}

          {profile && !loading && !error && (
            <>
              <div className="profile-info">
                <div className="profile-row">
                  <span className="profile-label">Username</span>
                  <span className="profile-value">{profile.username}</span>
                </div>
                <div className="profile-row">
                  <span className="profile-label">User ID</span>
                  <span className="profile-value">{profile.userId}</span>
                </div>
              </div>

              <div className="profile-section">
                <h3 className="section-title">About this Profile</h3>
                <p className="section-text">
                  This account is uniquely identified by your <strong>User ID</strong>. 
                  Share it with others to connect and chat in real-time on RealTalk.
                </p>
              </div>

              <div className="profile-section">
                <h3 className="section-title">Security Tips</h3>
                <ul className="security-tips">
                  <li>Keep your 4-digit PIN private.</li>
                  <li>Use the "Update Profile" option to change your username anytime.</li>
                  <li>Log out when you're done using the app.</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <div className="modal-header">
              <h3>⚠️ Delete Account</h3>
              <button className="modal-close" onClick={cancelDeleteAccount} disabled={deleteLoading}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p><strong>Are you absolutely sure you want to delete your account?</strong></p>
              <p>This action will permanently:</p>
              <ul className="delete-warning-list">
                <li>Delete your profile and all personal data</li>
                <li>Remove all your friends and friend connections</li>
                <li>Delete all your chat messages and conversation history</li>
                <li>Remove your profile picture and uploaded files</li>
              </ul>
              <p style={{ color: '#dc2626', fontWeight: 'bold', marginTop: '1rem' }}>
                This action cannot be undone!
              </p>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="modal-btn modal-btn-cancel" 
                onClick={cancelDeleteAccount}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="modal-btn modal-btn-delete" 
                onClick={confirmDeleteAccount}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Popup for Deletion */}
      {deleteLoading && (
        <div className="popup-overlay">
          <div className="popup-content loading-popup">
            <div className="loading-spinner"></div>
            <div className="popup-message">
              {deletionMessage}
            </div>
          </div>
        </div>
      )}

      {/* Success/Status Popup */}
      {showSuccessPopup && !deleteLoading && (
        <div className="popup-overlay">
          <div className="popup-content">
            <div className="popup-message">
              {deletionMessage}
            </div>
            {deletionMessage.includes('successfully') && (
              <div className="popup-success-icon">✓</div>
            )}
            {deletionMessage.includes('Failed') || deletionMessage.includes('error') ? (
              <div className="popup-error-icon">✗</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewProfile;