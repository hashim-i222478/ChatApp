const WebSocket = require('ws');
// const mongoose = require('mongoose'); 
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const userRoutes = require('./Routes/userRoutes');
const chatRoutes = require('./Routes/chatRoutes');
const friendsRoutes = require('./Routes/friendsRoutes');

const wss = require('./wsServer');
const path = require('path');
// MySQL connection
const pool = require('./db');

dotenv.config();

// Test MySQL connection
async function testDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database');
    connection.release();
  } catch (err) {
    console.error('MySQL connection error:', err);
    process.exit(1);
  }
}

// Test connection on startup
testDatabaseConnection();

const clients = new Map(); // Map ws -> { userId, username }
const onlineUsers = new Map(); // userId -> { username, ws }

function getCurrentTime() {
  const now = new Date();
  return now.toISOString();
}

function getMySQLDateTime() {
  const now = new Date();
  // Store local time in database for consistency with display format
  return now.toLocaleString('sv-SE').replace(' ', ' '); // Returns YYYY-MM-DD HH:mm:ss in local time
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
        try {
          // Use JOIN to get all pending messages for this user in one query
          const [deliverable] = await pool.execute(
            `SELECT pm.*, pc.participant1, pc.participant2 
             FROM private_messages pm
             JOIN private_conversations pc ON pm.conversation_id = pc.id
             WHERE (pc.participant1 = ? OR pc.participant2 = ?) 
             AND pm.receiver_id = ?`,
            [parsed.userId, parsed.userId, parsed.userId]
          );

          for (const msg of deliverable) {
            // Convert MySQL datetime to ISO string for consistent client handling
            let timeISO;
            if (msg.time instanceof Date) {
              timeISO = msg.time.toISOString();
            } else if (typeof msg.time === 'string') {
              // Handle MySQL datetime string format: "YYYY-MM-DD HH:mm:ss" (stored as UTC)
              // Add 'Z' to indicate UTC and parse correctly
              timeISO = new Date(msg.time + 'Z').toISOString();
            } else {
              timeISO = new Date().toISOString(); // fallback
            }
            
            ws.send(JSON.stringify({
              type: 'private-message',
              fromUserId: msg.sender_id,
              toUserId: msg.receiver_id,
              message: msg.message,
              time: new Date(timeISO).toLocaleTimeString(), // Send local time format for consistency
              fileUrl: msg.file_url || null,
              fileType: msg.file_type || null,
              filename: msg.filename || null
            }));
          }

          // Delete delivered messages using JOIN
          await pool.execute(
            `DELETE pm FROM private_messages pm
             JOIN private_conversations pc ON pm.conversation_id = pc.id
             WHERE (pc.participant1 = ? OR pc.participant2 = ?) 
             AND pm.receiver_id = ?`,
            [parsed.userId, parsed.userId, parsed.userId]
          );

          // --- Deliver and delete pending delete-for-everyone events ---
          // Use JOIN to get pending deletes with their timestamps in one query
          const [pendingDeletesWithTimestamps] = await pool.execute(
            `SELECT pd.id, pd.chat_key, 
                    GROUP_CONCAT(pdt.message_timestamp) as timestamps
             FROM pending_deletes pd
             LEFT JOIN pending_delete_timestamps pdt ON pd.id = pdt.pending_delete_id
             WHERE pd.user_id = ?
             GROUP BY pd.id, pd.chat_key`,
            [parsed.userId]
          );

          for (const event of pendingDeletesWithTimestamps) {
            ws.send(JSON.stringify({
              type: 'delete-message-for-everyone',
              chatKey: event.chat_key,
              timestamps: event.timestamps ? event.timestamps.split(',') : [] // These are already in local time format
            }));
          }

          // Delete all pending deletes for this user (CASCADE will handle timestamps)
          await pool.execute(
            `DELETE FROM pending_deletes WHERE user_id = ?`,
            [parsed.userId]
          );
        } catch (error) {
          console.error('Error handling pending messages:', error);
        }
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
        
        try {
          // Find or create conversation
          let [existingConv] = await pool.execute(
            `SELECT * FROM private_conversations 
             WHERE (participant1 = ? AND participant2 = ?) 
                OR (participant1 = ? AND participant2 = ?)`,
            [sender.userId, toUserId, toUserId, sender.userId]
          );

          let conversation;
          if (existingConv.length > 0) {
            conversation = existingConv[0];
          } else {
            // Create new conversation
            const [result] = await pool.execute(
              `INSERT INTO private_conversations (participant1, participant2) VALUES (?, ?)`,
              [sender.userId, toUserId]
            );
            conversation = { id: result.insertId };
          }

          const currentTime = new Date();
          const timeISO = currentTime.toISOString();
          // Store local time in database for consistency with display format
          const time = currentTime.toLocaleString('sv-SE').replace(' ', ' '); // YYYY-MM-DD HH:mm:ss in local time
          const recipient = onlineUsers.get(toUserId);
          
          // Prepare payload for both sender and recipient
          const payload = {
            type: 'private-message',
            fromUserId: sender.userId,
            toUserId,
            fromUsername: sender.username,
            message: privateMsg,
            time: new Date(timeISO).toLocaleTimeString(), // Send local time format for consistency
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
            // Recipient offline: store in DB for later delivery
            await pool.execute(
              `INSERT INTO private_messages (conversation_id, sender_id, receiver_id, message, time, file_url, file_type, filename) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [conversation.id, sender.userId, toUserId, privateMsg, time, fileUrl || null, fileType || null, filename || null]
            );
          }
          
          // Always send echo to sender (this is their own message)
          ws.send(JSON.stringify(payload));
        } catch (error) {
          console.error('Error handling private message:', error);
        }
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
          
          try {
            for (const userId of [idA, idB]) {
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
                const [result] = await pool.execute(
                  `INSERT INTO pending_deletes (user_id, chat_key) VALUES (?, ?)`,
                  [userId, chatKey]
                );
                
                const pendingDeleteId = result.insertId;
                for (const ts of timestamps) {
                  await pool.execute(
                    `INSERT INTO pending_delete_timestamps (pending_delete_id, message_timestamp) VALUES (?, ?)`,
                    [pendingDeleteId, ts]
                  );
                }
              }
            }
          } catch (error) {
            console.error('Error handling delete message for everyone:', error);
          }
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
    
    // Save chat message to the database
    try {
      // Find or create a chat_messages record for this user
      let [existingChatMessage] = await pool.execute(
        `SELECT * FROM chat_messages WHERE user_id = ?`,
        [user.userId]
      );

      let chatMessageId;
      if (existingChatMessage.length > 0) {
        chatMessageId = existingChatMessage[0].id;
        // Update username in case it changed
        await pool.execute(
          `UPDATE chat_messages SET username = ? WHERE id = ?`,
          [user.username, chatMessageId]
        );
      } else {
        // Create new chat_messages record
        const [result] = await pool.execute(
          `INSERT INTO chat_messages (user_id, username) VALUES (?, ?)`,
          [user.userId, user.username]
        );
        chatMessageId = result.insertId;
      }

      // Insert the message entry
      await pool.execute(
        `INSERT INTO chat_message_entries (chat_message_id, message, time) VALUES (?, ?, ?)`,
        [chatMessageId, message.toString(), new Date()]
      );
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
    
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
app.use('/api/friends', friendsRoutes);
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

