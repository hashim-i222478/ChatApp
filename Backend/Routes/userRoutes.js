const express = require('express');
const router = express.Router();
const { signup, login, getuser, UpdateUserProfile } = require('../Controllers/ManageUsers');
const verifyToken = require('../Middlewares/authMiddleware');

// Public routes
router.post('/register', signup);
router.post('/login', login);

router.get('/profile', verifyToken, getuser);
router.put('/update', verifyToken, UpdateUserProfile);

module.exports = router;
