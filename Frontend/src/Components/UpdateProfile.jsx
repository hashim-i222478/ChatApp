import React, { useState, useEffect } from 'react';
import '../Style/updateProfile.css';
import { authAPI } from '../Services/api';

const UpdateProfile = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Fetch current user info on mount
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await authAPI.getProfile();
        setForm({ username: response.data.username, email: response.data.email, password: '' });
      } catch (err) {
        setError('Failed to fetch user info');
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
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5001/api/users/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      setMessage('Profile updated successfully!');
      setForm({ ...form, password: '' });
      // Update localStorage with new username and email
      localStorage.setItem('username', form.username);
      localStorage.setItem('email', form.email);
      // Redirect to chat page after update
      window.location.href = '/chat';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="update-profile-wrapper">
      <div className="update-profile-card">
        <h2>Update Profile</h2>
        {loading && <p>Loading...</p>}
        {message && <p className="success-msg">{message}</p>}
        {error && <p className="error-msg">{error}</p>}
        <form onSubmit={handleSubmit} className="update-profile-form">
          <label>
            Username:
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Email:
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            New Password:
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Leave blank to keep current password"
            />
          </label>
          <button type="submit" disabled={loading}>Update</button>
        </form>
      </div>
    </div>
  );
};

export default UpdateProfile;
