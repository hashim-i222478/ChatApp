const WebSocket = require('ws');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const userRoutes = require('./Routes/userRoutes');


dotenv.config();

mongoose.connect(process.env.MONGOURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

// Create WebSocket server on port 8081
const wss = new WebSocket.Server({ port: 8081 });

const clients = new Map(); // Map ws -> username

function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour12: false });
}

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  ws.on('message', (message) => {
    try {
      // Try to parse message as JSON for the identify message
      const parsed = JSON.parse(message.toString());
      
      if (parsed.type === 'identify') {
        // Set username from authenticated user
        clients.set(ws, parsed.username);
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

