const { DataTypes } = require('sequelize');
const sequelize = require('../../db');

const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  }
}, {
  tableName: 'chat_messages',
  timestamps: false,
  underscored: true
});

module.exports = ChatMessage; 