const { DataTypes } = require('sequelize');
const sequelize = require('../../db');

const PendingDeleteTimestamp = sequelize.define('PendingDeleteTimestamp', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  pending_delete_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  message_timestamp: {
    type: DataTypes.STRING(100),
    allowNull: false
  }
}, {
  tableName: 'pending_delete_timestamps',
  timestamps: false,
  underscored: true
});

module.exports = PendingDeleteTimestamp;
