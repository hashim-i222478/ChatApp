import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../Services/api';
import '../Style/login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    userId: '',
    pin: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    if (!location.search.includes('reloaded=1')) {
      navigate(`${location.pathname}?reloaded=1`, { replace: true });
      window.location.reload();
    }
  }, [location, navigate]);

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

    try {
      const response = await authAPI.login(formData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', response.data.username);
      localStorage.setItem('userId', response.data.userId);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h2 className="login-title">
              <span className="title-icon"></span> Welcome Back to RealTalk
            </h2>
            <p className="login-subtitle">Enter your credentials to continue</p>
          </div>
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="userId" className="form-label">User ID</label>
              <input
                type="text"
                id="userId"
                name="userId"
                value={formData.userId}
                onChange={handleChange}
                required
                pattern="\d{9}"
                placeholder="Enter your 9-digit User ID"
                maxLength={9}
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
                placeholder="Enter your 4-digit PIN"
                maxLength={4}
                className="form-input"
              />
            </div>
            
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </form>
          
          <div className="login-footer">
            <p className="login-redirect">
              New to RealTalk? <Link to="/signup">Create an Account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;