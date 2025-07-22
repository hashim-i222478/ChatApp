import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './header';
import '../Style/viewProfile.css';
import { authAPI } from '../Services/api';

const ViewProfile = () => {
  const [profile, setProfile] = useState(null);
  const [profilePic, setProfilePic] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  return (
    <div className="view-profile-page">
      <Header />
      <div className="view-profile-container">
        <div className="view-profile-card">
           <div className="profile-pic-section">
             {profilePic ? (
               <img src={profilePic} alt="Profile" className="profile-pic-img" />
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
            <button className="edit-profile-button" onClick={handleEditProfile}>
              Edit Profile
            </button>
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
    </div>
  );
};

export default ViewProfile;