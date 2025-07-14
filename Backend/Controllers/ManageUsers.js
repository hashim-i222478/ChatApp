const User = require('../Models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const wss = require('../wsServer');

// Helper to generate a random 9-digit userId
function generateUserId() {
  return Math.floor(100000000 + Math.random() * 900000000).toString();
}

// Signup controller
exports.signup = async (req, res) => {
  try {
    const { username, pin } = req.body;
    if (!username || !pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ message: 'Username and 4-digit PIN are required.' });
    }
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    // Generate unique userId
    let userId;
    let userIdExists = true;
    while (userIdExists) {
      userId = generateUserId();
      userIdExists = await User.findOne({ userId });
    }
    // Hash pin
    const hashedPin = await bcrypt.hash(pin, 10);
    // Create user
    const user = new User({ userId, username, pin: hashedPin });
    await user.save();
    res.status(201).json({ message: 'User registered successfully', userId });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Login controller
exports.login = async (req, res) => {
  try {
    const { userId, pin } = req.body;
    if (!userId || !pin) {
      return res.status(400).json({ message: 'userId and PIN are required.' });
    }
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(400).json({ message: 'Invalid userId or PIN' });
    }
    const validPin = await bcrypt.compare(pin, user.pin);
    if (!validPin) {
      return res.status(400).json({ message: 'Invalid userId or PIN' });
    }
    // Create and assign token
    const token = jwt.sign(
      { userId: user.userId, username: user.username, _id: user._id },
      process.env.SECRET,
      { expiresIn: '3h' }
    );
    
    res.status(200).json({ message: 'Login Success!', token, username: user.username, userId: user.userId });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getuser = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user._id });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    } else {
      res.status(200).json({
        userId: user.userId,
        username: user.username
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.GetUserId = async (req, res) => {

  try{

    const user = await User.findOne({ _id: req.user._id });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({
      userId: user.userId
    });


  } catch(err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }

};

//fetch username from userId from url

exports.fetchUsername = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
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
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({
      userId: user.userId,
      username: user.username
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};