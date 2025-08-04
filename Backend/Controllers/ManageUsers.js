
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Helper to generate a random 9-digit userId
function generateUserId() {
  return Math.floor(100000000 + Math.random() * 900000000).toString();
}

// // Signup controller
// exports.signup = async (req, res) => {
//   try {
//     const { username, pin } = req.body; // profilePic removed
//     if (!username || !pin || !/^[0-9]{4}$/.test(pin)) {
//       return res.status(400).json({ message: 'Username and 4-digit PIN are required.' });
//     }
//     // Check if username already exists
//     const existingUser = await User.findOne({ username });
//     if (existingUser) {
//       return res.status(400).json({ message: 'Username already exists' });
//     }
//     // Generate unique userId
//     let userId;
//     let userIdExists = true;
//     while (userIdExists) {
//       userId = generateUserId();
//       userIdExists = await User.findOne({ userId });
//     }
//     // Hash pin
//     const hashedPin = await bcrypt.hash(pin, 10);
//     // Create user (profilePic will be set later via upload endpoint)
//     const user = new User({ userId, username, pin: hashedPin });
//     await user.save();
//     res.status(201).json({ message: 'User registered successfully', userId });
//   } catch (err) {
//     console.error('Signup error:', err);
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// };
// Signup controller
exports.signup = async (req, res) => {
  try {
    const { username, pin } = req.body; // profilePic removed
    if (!username || !pin || !/^[0-9]{4}$/.test(pin)) {
      return res.status(400).json({ message: 'Username and 4-digit PIN are required.' });
    }
    
    // Check if username already exists
    const [existingUser] = await pool.execute(
      `SELECT * FROM users WHERE username = ?`,
      [username]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Generate unique userId
    let userId;
    let userIdExists = true;
    while (userIdExists) {
      userId = generateUserId();
      const [userCheck] = await pool.execute(
        `SELECT * FROM users WHERE user_id = ?`,
        [userId]
      );
      userIdExists = userCheck.length > 0;
    }
    
    // Hash pin
    const hashedPin = await bcrypt.hash(pin, 10);
    
    // Create user using raw SQL
    await pool.execute(
      `INSERT INTO users (user_id, username, pin) VALUES (?, ?, ?)`,
      [userId, username, hashedPin]
    );
    
    res.status(201).json({ message: 'User registered successfully', userId });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
// // Profile picture upload controller
// exports.uploadProfilePic = async (req, res) => {
//   try {
//     const userId = req.body.userId; // or get from auth if protected
//     if (!req.file) {
//       return res.status(400).json({ message: 'No file uploaded' });
//     }
    
//     // Find user to get previous profile picture
//     const user = await User.findOne({ userId });
//     if (user && user.profilePic) {
//       // Delete previous profile picture
//       const prevPicPath = user.profilePic;
//       if (prevPicPath && prevPicPath.startsWith('/uploads/')) {
//         const filename = prevPicPath.split('/').pop();
//         const fullPath = path.join(__dirname, '..', 'uploads', filename);
        
//         try {
//           if (fs.existsSync(fullPath)) {
//             fs.unlinkSync(fullPath);
//             console.log(`Deleted previous profile picture: ${fullPath}`);
//           }
//         } catch (deleteErr) {
//           console.error('Error deleting previous profile picture:', deleteErr);
//           // Continue even if delete fails
//         }
//       }
//     }
    
//     const profilePicUrl = `/uploads/${req.file.filename}`;
//     await User.findOneAndUpdate({ userId }, { profilePic: profilePicUrl });
//     res.status(200).json({ message: 'Profile picture uploaded', profilePic: profilePicUrl });
//   } catch (err) {
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// };

// Profile picture upload controller
exports.uploadProfilePic = async (req, res) => {
  try {
    const userId = req.body.userId; // or get from auth if protected
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Find user to get previous profile picture
    const [userResult] = await pool.execute(
      `SELECT * FROM users WHERE user_id = ?`,
      [userId]
    );
    const user = userResult[0];
    
    if (user && user.profile_pic) {
      // Delete previous profile picture
      const prevPicPath = user.profile_pic;
      if (prevPicPath && prevPicPath.startsWith('/uploads/')) {
        const filename = prevPicPath.split('/').pop();
        const fullPath = path.join(__dirname, '..', 'uploads', filename);
        
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
    
    const profilePicUrl = `/uploads/${req.file.filename}`;
    await pool.execute(
      `UPDATE users SET profile_pic = ? WHERE user_id = ?`,
      [profilePicUrl, userId]
    );
    res.status(200).json({ message: 'Profile picture uploaded', profilePic: profilePicUrl });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// // Login controller
// exports.login = async (req, res) => {
//   try {
//     const { userId, pin } = req.body;
//     if (!userId || !pin) {
//       return res.status(400).json({ message: 'userId and PIN are required.' });
//     }
//     const user = await User.findOne({ userId });
//     if (!user) {
//       return res.status(400).json({ message: 'Invalid userId or PIN' });
//     }
//     const validPin = await bcrypt.compare(pin, user.pin);
//     if (!validPin) {
//       return res.status(400).json({ message: 'Invalid userId or PIN' });
//     }
//     // Create and assign token
//     const token = jwt.sign(
//       { userId: user.userId, username: user.username, _id: user._id },
//       process.env.SECRET,
//       { expiresIn: '3h' }
//     );
    
//     res.status(200).json({ message: 'Login Success!', token, username: user.username, userId: user.userId });
//   } catch (err) {
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// };
 
// Login controller
exports.login = async (req, res) => {
  try {
    const { userId, pin } = req.body;
    if (!userId || !pin) {
      return res.status(400).json({ message: 'userId and PIN are required.' });
    }
    
    const [userResult] = await pool.execute(
      `SELECT * FROM users WHERE user_id = ?`,
      [userId]
    );
    const user = userResult[0];
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid userId or PIN' });
    }
    
    const validPin = await bcrypt.compare(pin, user.pin);
    if (!validPin) {
      return res.status(400).json({ message: 'Invalid userId or PIN' });
    }
    
    // Create and assign token
    const token = jwt.sign(
      { userId: user.user_id, username: user.username, id: user.id },
      process.env.SECRET,
      { expiresIn: '3h' }
    );
    
    res.status(200).json({ 
      message: 'Login Success!', 
      token, 
      username: user.username, 
      userId: user.user_id 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// exports.getuser = async (req, res) => {
//   try {
//     const user = await User.findOne({ _id: req.user._id });
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     } else {
//       res.status(200).json({
//         userId: user.userId,
//         username: user.username
//       });
//     }
//   } catch (err) {
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// };

//get User
exports.getuser = async (req, res) => {
  try {
    const [userResult] = await pool.execute(
      `SELECT * FROM users WHERE id = ?`,
      [req.user.id]
    );
    const user = userResult[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    } else {
      res.status(200).json({
        userId: user.user_id,
        username: user.username
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


// exports.GetUserId = async (req, res) => {

//   try{

//     const user = await User.findOne({ _id: req.user._id });
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }
//     res.status(200).json({
//       userId: user.userId
//     });


//   } catch(err) {
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }

// };

// //fetch username from userId from url

// exports.fetchUsername = async (req, res) => {
//   try {
//     const user = await User.findOne({ userId: req.params.userId });
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }
//     res.status(200).json({ username: user.username });
//   } catch (err) {
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// };

// //get a user by its userId
// exports.getUserById = async (req, res) => {
//   try {
//     const user = await User.findOne({ userId: req.params.userId });
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }
//     res.status(200).json({
//       userId: user.userId,
//       username: user.username
//     });
//   } catch (err) {
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// };

exports.GetUserId = async (req, res) => {
  try {
    const [userResult] = await pool.execute(
      `SELECT * FROM users WHERE id = ?`,
      [req.user.id]
    );
    const user = userResult[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({
      userId: user.user_id
    });
  } catch(err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

//fetch username from userId from url
exports.fetchUsername = async (req, res) => {
  try {
    const [userResult] = await pool.execute(
      `SELECT * FROM users WHERE user_id = ?`,
      [req.params.userId]
    );
    const user = userResult[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ username: user.username });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

//get a user by its userId
exports.getUserById = async (req, res) => {
  try {
    const [userResult] = await pool.execute(
      `SELECT * FROM users WHERE user_id = ?`,
      [req.params.userId]
    );
    const user = userResult[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({
      userId: user.user_id,
      username: user.username
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};