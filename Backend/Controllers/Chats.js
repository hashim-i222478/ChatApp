const PrivateConversation = require('../Models/Sequelize/PrivateConversation');
const PrivateMessage = require('../Models/Sequelize/PrivateMessage');
const User = require('../Models/Sequelize/User');
const { ChatMessage, ChatMessageEntry } = require('../Models');
const { Op } = require('sequelize');

//get all chat messages
exports.getAllChatMessages = async (req, res) => {
    try {
        // Get all chat messages using Sequelize
        const chatMessages = await ChatMessage.findAll({
            include: [{
                model: ChatMessageEntry,
                order: [['timestamp', 'DESC']]
            }],
            order: [['id', 'DESC']]
        });
        
        res.status(200).json(chatMessages);
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get private chat history between two users
exports.getPrivateChatHistory = async (req, res) => {
    try {
        const myUserId = req.user.userId; // from auth middleware
        const otherUserId = req.params.userId;

        // Find the conversation between these two users
        const conversation = await PrivateConversation.findOne({
            where: {
                [Op.or]: [
                    { participant1: myUserId, participant2: otherUserId },
                    { participant1: otherUserId, participant2: myUserId }
                ]
            }
        });

        if (!conversation) {
            return res.status(200).json([]); // No messages yet
        }

        // Get all messages for this conversation, sorted by time
        const messages = await PrivateMessage.findAll({
            where: { conversation_id: conversation.id },
            order: [['time', 'ASC']] // oldest first
        });

        // Transform to match expected format
        const formattedMessages = messages.map(msg => ({
            from: msg.sender_id,
            to: msg.receiver_id,
            message: msg.message,
            time: msg.time,
            fileUrl: msg.file_url,
            fileType: msg.file_type,
            filename: msg.filename
        }));

        res.status(200).json(formattedMessages);
        console.log("Get private chat history Controller");
        console.log(formattedMessages);
    } catch (error) {
        console.error('Error fetching private chat history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Send/save a new private message
exports.sendPrivateMessage = async (req, res) => {
    try {
        const from = req.user.userId; // from auth middleware
        const { to, message, fileUrl, fileType, filename } = req.body;

        if (!to || (!message && !fileUrl)) {
            return res.status(400).json({ message: 'Recipient and message or file are required.' });
        }

        // Find or create the conversation
        let [conversation, created] = await PrivateConversation.findOrCreate({
            where: {
                [Op.or]: [
                    { participant1: from, participant2: to },
                    { participant1: to, participant2: from }
                ]
            },
            defaults: {
                participant1: from,
                participant2: to
            }
        });

        // Create the new message
        const newMessage = await PrivateMessage.create({
            conversation_id: conversation.id,
            sender_id: from,
            receiver_id: to,
            message: message || null,
            time: new Date(),
            file_url: fileUrl || null,
            file_type: fileType || null,
            filename: filename || null
        });

        // Return formatted message
        const formattedMessage = {
            from: newMessage.sender_id,
            to: newMessage.receiver_id,
            message: newMessage.message,
            time: newMessage.time,
            fileUrl: newMessage.file_url,
            fileType: newMessage.file_type,
            filename: newMessage.filename
        };

        res.status(201).json(formattedMessage);
        console.log("Send private message Controller");
        console.log(conversation);
        console.log(formattedMessage);
    } catch (error) {
        console.error('Error sending private message:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Delete a private message //only take userId 
//delete all messages of that userId
exports.deletePrivateMessage = async (req, res) => {
    try {
        const myUserId = req.user.userId; // from auth middleware
        const otherUserId = req.params.userId;

        // Find the conversation between these two users
        const conversation = await PrivateConversation.findOne({
            where: {
                [Op.or]: [
                    { participant1: myUserId, participant2: otherUserId },
                    { participant1: otherUserId, participant2: myUserId }
                ]
            }
        });

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found.' });
        }

        // Delete all messages from the other user in this conversation
        await PrivateMessage.destroy({
            where: {
                conversation_id: conversation.id,
                sender_id: otherUserId
            }
        });

        console.log("Delete private message Controller");
        res.status(200).json({ message: 'Messages deleted successfully.' });
    } catch (error) {
        console.error('Error deleting private message:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get all recent private chats for a user
exports.getRecentPrivateChats = async (req, res) => {
    try {
        const myUserId = req.user.userId; // from auth middleware

        // Find all conversations where the user is a participant
        const conversations = await PrivateConversation.findAll({
            where: {
                [Op.or]: [
                    { participant1: myUserId },
                    { participant2: myUserId }
                ]
            }
        });

        // For each conversation, find the other participant and the last message
        const recentChats = await Promise.all(conversations.map(async (conv) => {
            // Get the other participant's userId
            const otherUserId = conv.participant1 === myUserId ? conv.participant2 : conv.participant1;

            // Get the other user's username
            const otherUser = await User.findOne({ where: { user_id: otherUserId } });
            const username = otherUser ? otherUser.username : 'Unknown';

            // Get the last message
            const lastMessage = await PrivateMessage.findOne({
                where: { conversation_id: conv.id },
                order: [['time', 'DESC']]
            });

            return {
                userId: otherUserId,
                username,
                lastMessage: lastMessage ? lastMessage.message : '',
                lastMessageTime: lastMessage ? lastMessage.time : null
            };
        }));

        // Sort by last message time, newest first
        recentChats.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

        res.status(200).json(recentChats);
    } catch (error) {
        console.error('Error fetching recent private chats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Upload private media file
exports.uploadPrivateMediaFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }
        // Return the file URL/path
        const fileUrl = `/uploads/private-media/${req.file.filename}`;
        res.status(201).json({ url: fileUrl, filename: req.file.originalname, fileType: req.file.mimetype });
    } catch (error) {
        console.error('Error uploading private media file:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

