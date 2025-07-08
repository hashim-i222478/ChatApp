const express = require('express');
const router = express.Router();
const { getAllChatMessages } = require('../Controllers/Chats');
const verifyToken = require('../Middlewares/authMiddleware');

router.get('/getAllChatMessages', verifyToken, getAllChatMessages);

module.exports = router;