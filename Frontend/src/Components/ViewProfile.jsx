import React, { useEffect, useState } from 'react';
import Header from './header';
import '../Style/viewProfile.css';
import { authAPI } from '../Services/api';

const ViewProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

  // For security, we do not fetch the real password. Use a placeholder.
  const passwordPlaceholder = '********';

  return (
    <>
      <Header />
      <div className="view-profile-wrapper">
        <div className="view-profile-card">
          <h2>Your Profile</h2>
          {loading && <div className="profile-loading">Loading...</div>}
          {error && <div className="profile-error">{error}</div>}
          {profile && !loading && !error && (
            <>
              <div className="profile-row">
                <span className="profile-label">Username:</span>
                <span className="profile-value">{profile.username}</span>
              </div>
              <div className="profile-row">
                <span className="profile-label">Email:</span>
                <span className="profile-value">{profile.email}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ViewProfile;
