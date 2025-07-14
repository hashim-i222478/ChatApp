import React, { useEffect, useState } from 'react';
import Header from './header';
import '../Style/viewProfile.css';
import { authAPI } from '../Services/api';

const ViewProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await authAPI.getProfile();
        setProfile(response.data);
      } catch (err) {
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  return (
    <div className="view-profile-page">
      <Header />
      <div className="view-profile-container">
        <div className="view-profile-card">
          <h2 className="view-profile-title">
            <span className="title-icon">👤</span> Your Account Details
          </h2>

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
                <h3 className="section-title">💡 About this Profile</h3>
                <p className="section-text">
                  This account is uniquely identified by your <strong>User ID</strong>. 
                  Share it with others to connect and chat in real-time on RealTalk.
                </p>
              </div>

              <div className="profile-section">
                <h3 className="section-title">🔒 Security Tips</h3>
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