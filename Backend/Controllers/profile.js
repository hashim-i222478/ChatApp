const User = require('../Models/User');
const bcrypt = require('bcrypt');
const axios = require('axios');

exports.UpdateUserProfile = async (req, res) => {
    try {
      const updates = {};
      const allowedUpdates = ['username', 'email', 'password'];
      allowedUpdates.forEach(field => {
        if (req.body[field]) {
          updates[field] = req.body[field];
        }
      });
  
      // If password is being updated, hash it
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
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
          userId: user._id,
          username: user.username,
          oldUsername: req.user.username,
          email: user.email
        });
      } catch (broadcastErr) {
        console.error('Failed to broadcast profile update:', broadcastErr.message);
      }
  
      res.status(200).json({
        message: 'Profile updated successfully',
        user: {
          username: user.username,
          email: user.email,
          _id: user._id
        }
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
};
    