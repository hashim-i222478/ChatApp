const { DataTypes } = require('sequelize');
const sequelize = require('../../db');

const PrivateMessage = sequelize.define('PrivateMessage', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  conversation_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  sender_id: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  receiver_id: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT
  },
  time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  file_url: {
    type: DataTypes.STRING(255)
  },
  file_type: {
    type: DataTypes.STRING(50)
  },
  filename: {
    type: DataTypes.STRING(255)
  }
}, {
  tableName: 'private_messages',
  timestamps: false,
  underscored: true
});

module.exports = PrivateMessage;
