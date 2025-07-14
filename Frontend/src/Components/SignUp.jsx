import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../Services/api';
import '../Style/auth.css';

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
      // Remove confirmPin before sending to API
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
    <div className="auth-container">
      <div className="auth-form-container">
        <h2>Sign Up for Chat App</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Choose a username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="pin">4-digit PIN</label>
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
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPin">Confirm PIN</label>
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
            />
          </div>
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>
        <p className="auth-redirect">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Registration Successful!</h3>
            <p>Your User ID is:</p>
            <div className="userid-copy-row">
              <span className="userid-value">{newUserId}</span>
              <button className="copy-btn" onClick={handleCopy}>Copy</button>
            </div>
            <p style={{ fontSize: '0.95em', color: '#888' }}>Please save this User ID. You will need it to log in.</p>
            <button className="auth-button" onClick={handleCloseModal} style={{ marginTop: 16 }}>Go to Login</button>
          </div>
          {copied && (
            <div className="copied-modal">
              User ID copied!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SignUp;
