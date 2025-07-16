import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../Services/api';
import '../Style/signup.css';

// Modal component for registration success
const SuccessModal = ({ newUserId, copied, onCopy, onClose }) => (
  <div className="modal-backdrop">
    <div className="modal">
      <h3 className="modal-title">Registration Successful!</h3>
      <p className="modal-subtitle">Your User ID is:</p>
      <div className="userid-copy-row">
        <span className="userid-value">{newUserId}</span>
        <button className="copy-btn" onClick={onCopy}>Copy</button>
      </div>
      <p className="modal-note">Please save this User ID. You will need it to log in.</p>
      <button className="modal-button" onClick={onClose}>Go to Login</button>
    </div>
    {copied && <div className="copied-message">User ID copied!</div>}
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
  const navigate = useNavigate();
  
  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/chat');
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
      const response = await authAPI.register(dataToSend);
      setNewUserId(response.data.userId);
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