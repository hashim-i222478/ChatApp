const { DataTypes } = require('sequelize');
const sequelize = require('../../db');

const PendingDelete = sequelize.define('PendingDelete', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  chat_key: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'pending_deletes',
  timestamps: false,
  underscored: true
});

module.exports = PendingDelete;
