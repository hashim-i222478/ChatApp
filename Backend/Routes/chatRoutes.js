const express = require('express');
const router = express.Router();
const { getAllChatMessages, getPrivateChatHistory, sendPrivateMessage, deletePrivateMessage, getRecentPrivateChats } = require('../Controllers/Chats');
const verifyToken = require('../Middlewares/authMiddleware');

// Private chat
router.get('/private-messages/:userId', verifyToken, getPrivateChatHistory);
router.post('/private-messages/send', verifyToken, sendPrivateMessage);
router.delete('/private-messages/:userId/:messageId', verifyToken, deletePrivateMessage);
router.get('/getAllChatMessages', verifyToken, getAllChatMessages);
router.get('/recent-private-chats', verifyToken, getRecentPrivateChats);

module.exports = router;