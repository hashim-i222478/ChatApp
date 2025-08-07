import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../Services/api';
import '../Style/signup.css';

// Modal component for registration success
const SuccessModal = ({ newUserId, copied, onCopy, onClose }) => (
  <div className="success-modal-backdrop">
    <div className="success-modal">
      <div className="success-modal-header">
        <div className="success-icon">
          <svg className="success-check-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle className="success-check-circle" cx="12" cy="12" r="10" />
            <path className="success-check-path" d="M8 12l2 2 4-4" />
          </svg>
        </div>
        <h3 className="success-modal-title">Registration Successful!</h3>
        <p className="success-modal-subtitle">Welcome to RealTalk! Your account has been created.</p>
      </div>
      
      <div className="success-modal-body">
        <div className="userid-section">
          <p className="userid-label">Your User ID:</p>
          <div className="userid-copy-container">
            <div className="userid-display">
              <span className="userid-value">{newUserId}</span>
            </div>
            <button className="userid-copy-btn" onClick={onCopy} title="Copy User ID">
              <svg className="copy-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <rect className="copy-icon-rect" x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path className="copy-icon-path" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        
        <div className="success-modal-note">
          <div className="note-icon">
            <svg className="info-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle className="info-icon-circle" cx="12" cy="12" r="10" />
              <path className="info-icon-path" d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <p>Please save this User ID securely. You will need it to log into your account.</p>
        </div>
      </div>
      
      <div className="success-modal-footer">
        <button className="success-modal-button" onClick={onClose}>
          Continue to Login
          <svg className="arrow-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path className="arrow-icon-path" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
    {copied && (
      <div className="success-copy-notification">
        <svg className="notification-check-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle className="notification-check-circle" cx="12" cy="12" r="10" />
          <path className="notification-check-path" d="M8 12l2 2 4-4" />
        </svg>
        User ID copied to clipboard!
      </div>
    )}
  </div>
);

const SignUp = () => {
  const [formData, setFormData] = useState({
    username: '',
    pin: '',
    confirmPin: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [copied, setCopied] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const navigate = useNavigate();
  
  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/');
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Profile picture must be less than 5MB.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        return;
      }
      setProfilePic(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate PIN match
    if (formData.pin !== formData.confirmPin) {
      setError('PINs do not match');
      setLoading(false);
      return;
    }
    // Validate PIN is 4 digits
    if (!/^\d{4}$/.test(formData.pin)) {
      setError('PIN must be exactly 4 digits');
      setLoading(false);
      return;
    }

    try {
      const { confirmPin, ...dataToSend } = formData;
      // Remove profilePic from registration request
      const response = await authAPI.register(dataToSend);
      const userId = response.data.userId;
      // If a profile picture is selected, upload it
      if (profilePic) {
        const formDataPic = new FormData();
        formDataPic.append('profilePic', profilePic);
        formDataPic.append('userId', userId);
        await fetch('http://localhost:8080/api/users/upload-profile-pic', {
          method: 'POST',
          body: formDataPic
        });
      }
      setNewUserId(userId);
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(newUserId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    navigate('/login');
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-card">
          <div className="signup-header">
            <h2 className="signup-title">
              <span className="title-icon"></span> Join RealTalk
            </h2>
            <p className="signup-subtitle">Create your account to get started</p>
          </div>
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit} className="signup-form">
            <div className="form-group">
              <div className="profile-picture-section">
              <label className="profile-picture-label">Profile Picture:</label>
              <div className="profile-picture-container">
                <div className="profile-picture-preview">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Profile Preview" className="profile-preview-image" />
                  ) : (
                    <div className="profile-picture-placeholder">
                      <span>No image selected</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePicChange}
                  className="profile-picture-input"
                  id="profile-picture-input"
                />
                <label htmlFor="profile-picture-input" className="profile-picture-button">
                  Choose Image
                </label>
                
                <span className="profile-picture-note">Optional: Upload a profile picture</span>
              </div>
            </div>
              <label htmlFor="username" className="form-label">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Choose a username"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="pin" className="form-label">4-digit PIN</label>
              <input
                type="password"
                id="pin"
                name="pin"
                value={formData.pin}
                onChange={handleChange}
                required
                pattern="\d{4}"
                placeholder="Create a 4-digit PIN"
                maxLength={4}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPin" className="form-label">Confirm PIN</label>
              <input
                type="password"
                id="confirmPin"
                name="confirmPin"
                value={formData.confirmPin}
                onChange={handleChange}
                required
                pattern="\d{4}"
                placeholder="Confirm your 4-digit PIN"
                maxLength={4}
                className="form-input"
              />
            </div>
            
            <button type="submit" className="signup-button" disabled={loading}>
              {loading ? 'Signing up...' : 'Sign Up'}
            </button>
          </form>
          
          <div className="signup-footer">
            <p className="signup-redirect">
              Already have an account? <Link to="/login">Login</Link>
            </p>
          </div>
        </div>
      </div>
      {showModal && (
        <SuccessModal
          newUserId={newUserId}
          copied={copied}
          onCopy={handleCopy}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default SignUp;