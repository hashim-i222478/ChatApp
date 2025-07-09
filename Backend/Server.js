const WebSocket = require('ws');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const userRoutes = require('./Routes/userRoutes');
const chatRoutes = require('./Routes/chatRoutes');
const ChatMessages = require('./Models/ChatMessages');
const wss = require('./wsServer');

dotenv.config();

mongoose.connect(process.env.MONGOURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

const clients = new Map(); // Map ws -> username
const onlineUsers = new Map(); // username -> { email, ws }

function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour12: false });
}

function broadcastOnlineUsers() {
  const users = Array.from(onlineUsers.entries()).map(([username, { email }]) => ({
    username,
    email
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
  
  ws.on('message', (message) => {
    try {
      // Try to parse message as JSON for the identify message
      const parsed = JSON.parse(message.toString());
      
      if (parsed.type === 'identify') {
        const oldUsername = clients.get(ws);
        if (oldUsername && oldUsername !== parsed.username) {
          // Remove old username from onlineUsers on username change
          onlineUsers.delete(oldUsername);
        }
        clients.set(ws, parsed.username);
        onlineUsers.set(parsed.username, { email: parsed.email || '', ws });
        broadcastOnlineUsers();

        if (!oldUsername) {
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
        } else if (oldUsername !== parsed.username) {
          // Username changed (profile update)
          console.log(`User re-identified: ${oldUsername} -> ${parsed.username}`);
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
            message: `${oldUsername} has updated their profile to ${parsed.username}!`
          };
          broadcastMessage(broadcastMsg, ws); // Exclude the user who updated
        }
        return;
      }
    } catch (e) {
      // Not a JSON message, treat as regular chat message
    }
    // Handle regular chat message
    const user = clients.get(ws) || 'Unknown';
    const time = getCurrentTime();
    const chatMsg = {
      type: 'chat-message',
      username: user,
      time,
      message: message.toString()
    };
    console.log(`Received: ${user} [${time}]: ${message}`);
    
    // Save chat message to the database (push to user's messages array)
    ChatMessages.findOneAndUpdate(
      { username: user },
      { $push: { messages: { message: message.toString() } } },
      { upsert: true, new: true }
    ).catch(err => console.error('Error saving chat message:', err));
    
    // Broadcast the message to all connected clients
    broadcastMessage(chatMsg);
  });

  ws.on('close', () => {
    const username = clients.get(ws);
    if (username) {
      console.log(`${username} disconnected`);
      
      // Broadcast user left message
      const leftMsg = {
        type: 'chat-message',
        username: 'System',
        time: getCurrentTime(),
        message: `${username} has left the chat.`
      };
      clients.delete(ws);
      onlineUsers.delete(username);
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
  const { userId, username, oldUsername, email } = req.body;
  const profileUpdateMsg = {
    type: 'profile-update',
    userId,
    username,
    oldUsername,
    email
  };
  console.log('Broadcasting profile update:', profileUpdateMsg);
  broadcastMessage(profileUpdateMsg);
  res.status(200).json({ message: 'Broadcasted' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

