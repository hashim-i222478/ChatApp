const WebSocket = require('ws');
// const mongoose = require('mongoose'); 
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const userRoutes = require('./Routes/userRoutes');
const chatRoutes = require('./Routes/chatRoutes');

const wss = require('./wsServer');
// const PrivateMessages = require('./Models/PrivateMessages');
// const PendingDelete = require('./Models/PendingDelete'); 
const path = require('path');
// Sequelize models
const sequelize = require('./db');
const { 
  PrivateConversation, 
  PrivateMessage, 
  PendingDelete, 
  PendingDeleteTimestamp 
} = require('./Models');
const { Op } = require('sequelize');

dotenv.config();


sequelize.authenticate()
  .then(() => console.log('Connected to MySQL database'))
  .catch((err) => console.error('MySQL connection error:', err));

const clients = new Map(); // Map ws -> { userId, username }
const onlineUsers = new Map(); // userId -> { username, ws }

function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour12: false });
}

function broadcastOnlineUsers() {
  const users = Array.from(onlineUsers.entries()).map(([userId, { username }]) => ({
    userId,
    username
  }));
  const message = {
    type: 'online-users',
    users
  }; 
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  ws.on('message', async (message) => {
    try {
      // Try to parse message as JSON for the identify message or private message
      const parsed = JSON.parse(message.toString());
      
      if (parsed.type === 'identify') {
        // Remove old user if ws is already mapped
        const oldUser = clients.get(ws);
        if (oldUser && oldUser.userId !== parsed.userId) {
          onlineUsers.delete(oldUser.userId);
        }
        clients.set(ws, { userId: parsed.userId, username: parsed.username });
        onlineUsers.set(parsed.userId, { username: parsed.username, ws });
        broadcastOnlineUsers();

        if (!oldUser) {
          // First time identification
          console.log(`${parsed.username} identified`);
          // Send welcome message to the user
          const welcomeMsg = {
            type: 'chat-message',
            username: 'System',
            time: getCurrentTime(),
            message: `Welcome to the chat, ${parsed.username}!`
          };
          ws.send(JSON.stringify(welcomeMsg));

          // Broadcast user joined message
          const joinMsg = {
            type: 'chat-message',
            username: 'System',
            time: getCurrentTime(),
            message: `${parsed.username} has joined the chat.`
          };
          broadcastMessage(joinMsg, ws); // Don't send to the user who just joined
        } else if (oldUser.username !== parsed.username) {
          // Username changed (profile update)
          console.log(`User re-identified: ${oldUser.username} -> ${parsed.username}`);
          // Send profile updated message to the user
          const updatedMsg = {
            type: 'chat-message',
            username: 'System',
            time: getCurrentTime(),
            message: `Your profile has been updated, ${parsed.username}!`
          };
          ws.send(JSON.stringify(updatedMsg));
          // Broadcast to others that this user updated their profile
          const broadcastMsg = {
            type: 'chat-message',
            username: 'System',
            time: getCurrentTime(),
            message: `${oldUser.username} has updated their profile to ${parsed.username}!`
          };
          broadcastMessage(broadcastMsg, ws); // Exclude the user who updated
        }
        // --- Deliver and delete pending messages for this user ---
        // Find all conversations where this user is a participant
        const conversations = await PrivateConversation.findAll({
          where: {
            [Op.or]: [
              { participant1: parsed.userId },
              { participant2: parsed.userId }
            ]
          }
        });
        for (const conv of conversations) {
          // Find all messages in this conversation where to = parsed.userId
          const deliverable = await PrivateMessage.findAll({
            where: {
              conversation_id: conv.id,
              receiver_id: parsed.userId
            }
          });
          for (const msg of deliverable) {
            ws.send(JSON.stringify({
              type: 'private-message',
              fromUserId: msg.sender_id,
              toUserId: msg.receiver_id,
              message: msg.message,
              time: msg.time instanceof Date ? msg.time.toISOString() : msg.time,
              fileUrl: msg.file_url || null,
              fileType: msg.file_type || null,
              filename: msg.filename || null
            }));
          }
          // Delete delivered messages
          await PrivateMessage.destroy({
            where: {
              conversation_id: conv.id,
              receiver_id: parsed.userId
            }
          });
        }
        // --- Deliver and delete pending delete-for-everyone events ---
        const pendingDeletes = await PendingDelete.findAll({ where: { user_id: parsed.userId } });
        for (const event of pendingDeletes) {
          // Get all timestamps for this pending delete
          const timestamps = await PendingDeleteTimestamp.findAll({ where: { pending_delete_id: event.id } });
          ws.send(JSON.stringify({
            type: 'delete-message-for-everyone',
            chatKey: event.chat_key,
            timestamps: timestamps.map(t => t.message_timestamp)
          }));
        }
        await PendingDelete.destroy({ where: { user_id: parsed.userId } });
        return;
      }

      if (parsed.type === 'typing' || parsed.type === 'stop-typing') {
        if (parsed.toUserId) {
          const recipient = onlineUsers.get(parsed.toUserId);
          if (recipient && recipient.ws && recipient.ws.readyState === WebSocket.OPEN) {
            recipient.ws.send(JSON.stringify({
              type: parsed.type,
              fromUserId: parsed.fromUserId,
              username: parsed.username
            }));
          }
        } else {
          wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: parsed.type,
                username: parsed.username
              }));
            }
          });
        }
        return;
      }

      // Handle private message
      if (parsed.type === 'private-message') {
        // Find sender info
        const sender = clients.get(ws);
        if (!sender) return;
        const { toUserId, message: privateMsg, file, fileUrl, filename, fileType } = parsed;
        // Find or create conversation
        let [conversation] = await PrivateConversation.findOrCreate({
          where: {
            [Op.or]: [
              { participant1: sender.userId, participant2: toUserId },
              { participant1: toUserId, participant2: sender.userId }
            ]
          },
          defaults: {
            participant1: sender.userId,
            participant2: toUserId
          }
        });
        const time = new Date().toISOString();
        const recipient = onlineUsers.get(toUserId);
        // Prepare payload for both sender and recipient
        const payload = {
          type: 'private-message',
          fromUserId: sender.userId,
          toUserId,
          fromUsername: sender.username,
          message: privateMsg,
          time,
          chatKey: `chat_${[sender.userId, toUserId].sort().join('_')}`,
          file: file || null,
          fileUrl: fileUrl || null,
          filename: filename || null,
          fileType: fileType || null
        };
        
        if (recipient && recipient.ws && recipient.ws.readyState === WebSocket.OPEN) {
          // Recipient online: deliver instantly, do NOT store in DB
          recipient.ws.send(JSON.stringify(payload));
        } else {
          // Recipient offline: store in DB for later delivery, do NOT deliver now
          await PrivateMessage.create({
            conversation_id: conversation.id,
            sender_id: sender.userId,
            receiver_id: toUserId,
            message: privateMsg,
            time,
            file_url: fileUrl || null,
            file_type: fileType || null,
            filename: filename || null
          });
        }
        // Always send echo to sender (this is their own message)
        ws.send(JSON.stringify(payload));
        return;
      }

      // Handle delete-message-for-everyone event
      if (parsed.type === 'delete-message-for-everyone') {
        console.log('Server received delete-message-for-everyone:', parsed);
        const { chatKey, timestamps } = parsed;
        // chatKey is already in the correct format (chat_<idA>_<idB>)
        const match = chatKey.match(/^chat_(.+)_(.+)$/);
        if (match) {
          const [_, idA, idB] = match;
          [idA, idB].forEach(async userId => {
            const user = onlineUsers.get(userId);
            if (user && user.ws && user.ws.readyState === WebSocket.OPEN) {
              console.log('Relaying delete-message-for-everyone to user:', userId);
              user.ws.send(JSON.stringify({
                type: 'delete-message-for-everyone',
                chatKey,
                timestamps
              }));
            } else {
              console.log('User offline, storing pending delete for:', userId);
              // Create PendingDelete and PendingDeleteTimestamp entries
              const pendingDelete = await PendingDelete.create({ user_id: userId, chat_key: chatKey });
              for (const ts of timestamps) {
                await PendingDeleteTimestamp.create({ pending_delete_id: pendingDelete.id, message_timestamp: ts });
              }
            }
          });
        }
        return;
      }
    } catch (e) {
      // Not a JSON message, treat as regular chat message
    }
    // Handle regular chat message
    const user = clients.get(ws) || { userId: 'Unknown', username: 'Unknown' };
    const time = getCurrentTime();
    const chatMsg = {
      type: 'chat-message',
      userId: user.userId,
      username: user.username,
      time,
      message: message.toString()
    };
    console.log(`Received: ${user.username} [${time}]: ${message}`);
    
    // TODO: Update ChatMessages to use Sequelize
    // Save chat message to the database (push to user's messages array)
    // ChatMessages.findOneAndUpdate(
    //   { userId: user.userId },
    //   { $push: { messages: { message: message.toString() } } },
    //   { upsert: true, new: true }
    // ).catch(err => console.error('Error saving chat message:', err));
    
    // Broadcast the message to all connected clients
    broadcastMessage(chatMsg);
  });

  ws.on('close', () => {
    const user = clients.get(ws);
    if (user) {
      console.log(`${user.username} disconnected`);
      
      // Broadcast user left message
      const leftMsg = {
        type: 'chat-message',
        username: 'System',
        time: getCurrentTime(),
        message: `${user.username} has left the chat.`
      };
      clients.delete(ws);
      onlineUsers.delete(user.userId);
      broadcastOnlineUsers();
      broadcastMessage(leftMsg);
    }
  });
});

// Helper function to broadcast messages to all clients
function broadcastMessage(message, excludeWs = null) {
  wss.clients.forEach(function each(client) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/private-media', express.static(path.join(__dirname, 'uploads/private-media')));
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.get('/', (req, res) => {
  res.send('Welcome to the Chat Server');
});

app.post('/api/internal/broadcastProfileUpdate', (req, res) => {
  const { userId, username, oldUsername } = req.body;
  const profileUpdateMsg = {
    type: 'profile-update',
    userId,
    username,
    oldUsername
  };
  console.log('Broadcasting profile update:', profileUpdateMsg);
  broadcastMessage(profileUpdateMsg);
  res.status(200).json({ message: 'Broadcasted' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

