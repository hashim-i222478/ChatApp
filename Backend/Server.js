const WebSocket = require('ws');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const userRoutes = require('./Routes/userRoutes');
const chatRoutes = require('./Routes/chatRoutes');
const ChatMessages = require('./Models/ChatMessages');
const wss = require('./wsServer');
const PrivateMessages = require('./Models/PrivateMessages');
const PendingDelete = require('./Models/PendingDelete');

dotenv.config();

mongoose.connect(process.env.MONGOURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

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
        const pendingDocs = await PrivateMessages.find({ participants: parsed.userId });
        for (const doc of pendingDocs) {
          const deliverable = doc.messages.filter(msg => msg.to === parsed.userId);
          for (const msg of deliverable) {
            ws.send(JSON.stringify({
              type: 'private-message',
              fromUserId: msg.from,
              toUserId: msg.to,
              message: msg.message,
              time: msg.time instanceof Date ? msg.time.toISOString() : msg.time
            }));
          }
          // Remove delivered messages
          doc.messages = doc.messages.filter(msg => msg.to !== parsed.userId);
          if (doc.messages.length === 0) {
            await doc.deleteOne();
          } else {
            await doc.save();
          }
        }
        // --- Deliver and delete pending delete-for-everyone events ---
        const pendingDeletes = await PendingDelete.find({ userId: parsed.userId });
        for (const event of pendingDeletes) {
          ws.send(JSON.stringify({
            type: 'delete-message-for-everyone',
            chatKey: event.chatKey,
            timestamps: event.timestamps
          }));
        }
        await PendingDelete.deleteMany({ userId: parsed.userId });
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
        const { toUserId, message: privateMsg } = parsed;
        const [idA, idB] = [sender.userId, toUserId].sort();
        const chatKey = `chat_${idA}_${idB}`;
        const recipient = onlineUsers.get(toUserId);
        const time = new Date().toISOString();
        // Prepare payload for both sender and recipient
        const payload = {
          type: 'private-message',
          fromUserId: sender.userId,
          toUserId,
          fromUsername: sender.username,
          message: privateMsg,
          time,
          chatKey
        };
        if (recipient && recipient.ws && recipient.ws.readyState === WebSocket.OPEN) {
          // Recipient online: deliver instantly
          recipient.ws.send(JSON.stringify(payload));
        }
        // Echo back to sender for their chat window
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
              await PendingDelete.create({ userId, chatKey, timestamps });
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
    
    // Save chat message to the database (push to user's messages array)
    ChatMessages.findOneAndUpdate(
      { userId: user.userId },
      { $push: { messages: { message: message.toString() } } },
      { upsert: true, new: true }
    ).catch(err => console.error('Error saving chat message:', err));
    
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

