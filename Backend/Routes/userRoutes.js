const express = require('express');
const router = express.Router();
const { signup, login, getuser } = require('../Controllers/ManageUsers');
const verifyToken = require('../Middlewares/authMiddleware');

// Public routes
router.post('/register', signup);
router.post('/login', login);

router.get('/profile', verifyToken, getuser);

module.exports = router;
