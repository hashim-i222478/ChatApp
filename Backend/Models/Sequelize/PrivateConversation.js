const { DataTypes } = require('sequelize');
const sequelize = require('../../db');

const PrivateConversation = sequelize.define('PrivateConversation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  participant1: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  participant2: {
    type: DataTypes.STRING(50),
    allowNull: false
  }
}, {
  tableName: 'private_conversations',
  timestamps: false,
  underscored: true
});

module.exports = PrivateConversation;
