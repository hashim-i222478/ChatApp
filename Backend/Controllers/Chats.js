const ChatMessages = require('../Models/ChatMessages');
const PrivateMessages =  require('../Models/PrivateMessages');
const User = require('../Models/User');

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

// Get private chat history between two users
exports.getPrivateChatHistory = async (req, res) => {
    try {
        const myUserId = req.user.userId; // from auth middleware
        const otherUserId = req.params.userId;

        // Find the conversation document for these two users (order doesn't matter)
        const conversation = await PrivateMessages.findOne({
            participants: { $all: [myUserId, otherUserId] }
        });

        if (!conversation) {
            return res.status(200).json([]); // No messages yet
        }

        // Return sorted messages (oldest first)
        const sortedMessages = conversation.messages.sort((a, b) => new Date(a.time) - new Date(b.time));
        res.status(200).json(sortedMessages);
        console.log("Get private chat history Controller");
        console.log(sortedMessages);
    } catch (error) {
        console.error('Error fetching private chat history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Send/save a new private message
exports.sendPrivateMessage = async (req, res) => {
    try {
        const from = req.user.userId; // from auth middleware
        const { to, message } = req.body;

        if (!to || !message) {
            return res.status(400).json({ message: 'Recipient and message are required.' });
        }

        // Find or create the conversation document
        let conversation = await PrivateMessages.findOne({
            participants: { $all: [from, to] }
        });

        const newMessage = {
            from,
            to,
            message,
            time: new Date()
        };

        if (conversation) {
            conversation.messages.push(newMessage);
            await conversation.save();
        } else {
            conversation = new PrivateMessages({
                participants: [from, to],
                messages: [newMessage]
            });
            await conversation.save();
        }

        res.status(201).json(newMessage);
        console.log("Send private message Controller");
        console.log(conversation);
        console.log(newMessage);
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

        // Find the conversation document for these two users
        const conversation = await PrivateMessages.findOne({
            participants: { $all: [myUserId, otherUserId] }
        });

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found.' });
        }

        // Filter out messages from the other user
        conversation.messages = conversation.messages.filter(msg => msg.from !== otherUserId);

        // Save the updated conversation
        await conversation.save();
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
    const conversations = await PrivateMessages.find({
      participants: myUserId
    });

    // For each conversation, find the other participant and the last message
    const recentChats = await Promise.all(conversations.map(async (conv) => {
      // Get the other participant's userId
      const otherUserId = conv.participants.find(id => id !== myUserId);

      // Get the other user's username
      const otherUser = await User.findOne({ userId: otherUserId });
      const username = otherUser ? otherUser.username : 'Unknown';

      // Get the last message
      const lastMsgObj = conv.messages[conv.messages.length - 1];
      return {
        userId: otherUserId,
        username,
        lastMessage: lastMsgObj ? lastMsgObj.message : '',
        lastMessageTime: lastMsgObj ? lastMsgObj.time : null
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

