const User = require('../Models/User');
const bcrypt = require('bcrypt');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

exports.UpdateUserProfile = async (req, res) => {
    try {
      console.log('Update profile request received');
      console.log('Request body:', req.body);
      console.log('File upload:', req.file);
      
      const updates = {};
      const allowedUpdates = ['username', 'pin', 'profilePic'];
      
      // Handle text-based updates
      allowedUpdates.forEach(field => {
        if (req.body[field]) {
          updates[field] = req.body[field];
        }
      });
      
      // Handle profile picture file upload
      if (req.file) {
        console.log('Processing uploaded file:', req.file.filename);
        
        // Get current user to find the previous profile picture
        const currentUser = await User.findById(req.user._id);
        
        if (currentUser && currentUser.profilePic) {
          // Extract filename from path
          const prevPicPath = currentUser.profilePic;
          if (prevPicPath && prevPicPath.startsWith('/uploads/')) {
            const filename = prevPicPath.split('/').pop();
            const fullPath = path.join(__dirname, '..', 'uploads', filename);
            
            // Delete the previous profile picture
            try {
              if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log(`Deleted previous profile picture: ${fullPath}`);
              }
            } catch (deleteErr) {
              console.error('Error deleting previous profile picture:', deleteErr);
              // Continue even if delete fails
            }
          }
        }
        
        updates.profilePic = `/uploads/${req.file.filename}`;
      } else {
        console.log('No file was uploaded');
      }
  
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