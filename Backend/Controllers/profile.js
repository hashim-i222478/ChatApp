const User = require('../Models/User');
const bcrypt = require('bcrypt');
const axios = require('axios');

exports.UpdateUserProfile = async (req, res) => {
    try {
      const updates = {};
      const allowedUpdates = ['username', 'pin', 'profilePic'];
      allowedUpdates.forEach(field => {
        if (req.body[field]) {
          updates[field] = req.body[field];
        }
      });
  
      // If pin is being updated, hash it
      if (updates.pin) {
        updates.pin = await bcrypt.hash(updates.pin, 10);
      }
  
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updates },
        { new: true, runValidators: true }
      );
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Notify main server to broadcast profile update
      try {
        await axios.post('http://localhost:8080/api/internal/broadcastProfileUpdate', {
          userId: user.userId,
          username: user.username,
          oldUsername: req.user.username
        });
      } catch (broadcastErr) {
        console.error('Failed to broadcast profile update:', broadcastErr.message);
      }
  
      res.status(200).json({
        message: 'Profile updated successfully',
        user: {
          userId: user.userId,
          username: user.username,
          profilePic: user.profilePic
        }
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// In your controller (e.g., ManageUsers.js or profile.js)
exports.getProfilePic = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ profilePic: user.profilePic || '' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// In your routes (e.g., userRoutes.js)
