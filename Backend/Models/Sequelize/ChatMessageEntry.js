const { DataTypes } = require('sequelize');
const sequelize = require('../../db');

const ChatMessageEntry = sequelize.define('ChatMessageEntry', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  chat_message_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'chat_message_entries',
  timestamps: false,
  underscored: true
});

module.exports = ChatMessageEntry; 