import React, { useState, useEffect } from 'react';
import '../Style/updateProfile.css';
import { authAPI } from '../Services/api';
import Header from './header';
import { useNavigate } from 'react-router-dom';

const UpdateProfile = () => {
  const [form, setForm] = useState({ username: '', pin: '', confirmPin: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await authAPI.getProfile();
        setForm({ username: response.data.username, pin: '', confirmPin: '' });
      } catch (err) {
        setError('Failed to fetch user info.');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (form.pin || form.confirmPin) {
      if (form.pin !== form.confirmPin) {
        setError('🔐 PINs do not match.');
        setLoading(false);
        return;
      }
      if (form.pin && !/^\d{4}$/.test(form.pin)) {
        setError('PIN must be exactly 4 digits.');
        setLoading(false);
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      const updateData = { username: form.username };
      if (form.pin) updateData.pin = form.pin;

      const res = await fetch('http://localhost:5001/api/users/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');

      setMessage('Profile updated successfully!');
      localStorage.setItem('username', form.username);
      setForm({ ...form, pin: '', confirmPin: '' });

      
    } catch (err) {
      setError(` ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <div className="update-profile-wrapper">
        <div className="update-profile-card">
         
          <h2>Update Your Profile</h2>
          
          <p className="info-text">
            You can update your username and PIN here. If you don't want to change your PIN,
            just leave the PIN fields blank.
          </p>

          {loading && <p className="status loading">Processing...</p>}
          {message && <p className="status success">{message}</p>}
          {error && <p className="status error">{error}</p>}

          <form onSubmit={handleSubmit} className="update-profile-form">
            <label>
              New Username:
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                placeholder="Enter your new username"
              />
            </label>

            <label>
              New 4-digit PIN:
              <input
                type="password"
                name="pin"
                value={form.pin}
                onChange={handleChange}
                pattern="\d{4}"
                maxLength={4}
                placeholder="Leave blank to keep current PIN"
              />
            </label>

            <label>
              Confirm New PIN:
              <input
                type="password"
                name="confirmPin"
                value={form.confirmPin}
                onChange={handleChange}
                pattern="\d{4}"
                maxLength={4}
                placeholder="Repeat new PIN"
              />
            </label>

            <button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </form>

          <div className="security-reminder">
            🔒 <strong>Reminder:</strong> Keep your 4-digit PIN secure and do not share it with anyone.
          </div>
        </div>
      </div>
    </>
  );
};

export default UpdateProfile;
