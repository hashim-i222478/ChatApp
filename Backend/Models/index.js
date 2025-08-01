const User = require('./Sequelize/User');
const PrivateConversation = require('./Sequelize/PrivateConversation');
const PrivateMessage = require('./Sequelize/PrivateMessage');
const PendingDelete = require('./Sequelize/PendingDelete');
const PendingDeleteTimestamp = require('./Sequelize/PendingDeleteTimestamp');
const ChatMessage = require('./Sequelize/ChatMessage');
const ChatMessageEntry = require('./Sequelize/ChatMessageEntry');

// Private conversation associations
PrivateConversation.hasMany(PrivateMessage, { 
  foreignKey: 'conversation_id',
  onDelete: 'CASCADE'
});
PrivateMessage.belongsTo(PrivateConversation, { 
  foreignKey: 'conversation_id' 
});

// Pending delete associations
PendingDelete.hasMany(PendingDeleteTimestamp, { 
  foreignKey: 'pending_delete_id',
  onDelete: 'CASCADE'
});
PendingDeleteTimestamp.belongsTo(PendingDelete, { 
  foreignKey: 'pending_delete_id' 
});

// Chat message associations
ChatMessage.hasMany(ChatMessageEntry, { 
  foreignKey: 'chat_message_id',
  onDelete: 'CASCADE'
});
ChatMessageEntry.belongsTo(ChatMessage, { 
  foreignKey: 'chat_message_id' 
});

module.exports = {
  User,
  PrivateConversation,
  PrivateMessage,
  PendingDelete,
  PendingDeleteTimestamp,
  ChatMessage,
  ChatMessageEntry
}; 