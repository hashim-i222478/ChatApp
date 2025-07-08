const ChatMessages = require('../Models/ChatMessages');

//get all chat messages
exports.getAllChatMessages = async (req, res) => {
    try {
        const messages = await ChatMessages.find().sort({ 'messages.timestamp': -1 });
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


