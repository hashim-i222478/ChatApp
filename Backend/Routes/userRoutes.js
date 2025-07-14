const express = require('express');
const router = express.Router();
const { signup, login, getuser, GetUserId, fetchUsername, getUserById} = require('../Controllers/ManageUsers');
const verifyToken = require('../Middlewares/authMiddleware');

// Public routes
router.post('/register', signup);
router.post('/login', login);

// Protected routes
router.get('/profile', verifyToken, getuser);
router.get('/userId', verifyToken, GetUserId);
router.get('/username/:userId',verifyToken, fetchUsername);
router.get('/getUserById/:userId', verifyToken, getUserById);

module.exports = router;
