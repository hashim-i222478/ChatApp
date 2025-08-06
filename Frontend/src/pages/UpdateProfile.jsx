import React, { useState, useEffect } from 'react';
import '../Style/updateProfile.css';
import { authAPI } from '../Services/api';
import { Header } from '../Components';
import { useNavigate } from 'react-router-dom';

const UpdateProfile = () => {
  const [form, setForm] = useState({ username: '', pin: '', confirmPin: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [showSizeModal, setShowSizeModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await authAPI.getProfile();
        setForm({ username: response.data.username, pin: '', confirmPin: '' });
        if (response.data.userId) {
          const token = localStorage.getItem('token');
          try {
            const picRes = await fetch(`http://localhost:5001/api/users/profile-pic/${response.data.userId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (picRes.ok) {
              const picData = await picRes.json();
              if (picData.profilePic) setPreviewUrl(picData.profilePic);
            }
          } catch {}
        }
      } catch (err) {
        setError('Failed to fetch user info.');
      }      finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (1MB = 1048576 bytes)
      if (file.size > 1048576) {
        setShowSizeModal(true);
        e.target.value = null; // Reset file input
        return;
      }
      
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
      setError('');
    }
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
      
      // Create FormData for multipart/form-data request (for file upload)
      const formData = new FormData();
      formData.append('username', form.username);
      if (form.pin) formData.append('pin', form.pin);
      
      // Only append file if a new profile picture was selected
      if (profilePicture) {
        formData.append('profilePic', profilePicture);
      }
      
      const res = await fetch('http://localhost:5001/api/users/update', {
        method: 'PUT',
        headers: {
          // Don't set Content-Type here, it will be set automatically with boundary for multipart/form-data
          'Authorization': `Bearer ${token}`
        },
        body: formData
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
      {showSizeModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">Image Too Large</h3>
            <p className="modal-note">Profile picture must be less than 1MB.<br/>Please choose a smaller image.</p>
            <button className="modal-button" onClick={() => setShowSizeModal(false)}>OK</button>
          </div>
        </div>
      )}
      <Header />

      <div className="update-profile-wrapper">
        <div className="update-profile-card">
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>
         
          <h2>Update Your Profile</h2>
          
          <p className="info-text">
            You can update your username and PIN here. If you don't want to change your PIN,
            just leave the PIN fields blank.
          </p>

          {loading && <p className="status loading">Processing{profilePicture ? ' and uploading image' : ''}...</p>}
          {message && <p className="status success">{message}</p>}
          {error && <p className="status error">{error}</p>}

          <form onSubmit={handleSubmit} className="update-profile-form">
            <div className="profile-picture-section">
              <label className="profile-picture-label">Profile Picture:</label>
              <div className="profile-picture-container">
                <div className="profile-picture-preview">
                  {previewUrl ? (
                    <img 
                      src={previewUrl.startsWith('data:') 
                        ? previewUrl 
                        : previewUrl.startsWith('/uploads/') 
                          ? `http://localhost:5001${previewUrl}` 
                          : previewUrl} 
                      alt="Profile Preview" 
                      className="profile-preview-image" 
                    />
                  ) : (
                    <div className="profile-picture-placeholder">
                      <span>No image selected</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="profile-picture-input"
                  id="profile-picture-input"
                />
                <label htmlFor="profile-picture-input" className="profile-picture-button">
                  Choose Image
                </label>
                <p className="profile-picture-note">Max size: 1MB. JPG/PNG only.</p>
              </div>
            </div>

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

            <label className="full-width">
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

            <button type="submit" disabled={loading} className="full-width">
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
