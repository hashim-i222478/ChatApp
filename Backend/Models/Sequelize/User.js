const { DataTypes } = require('sequelize');
const sequelize = require('../../db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  username: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  pin: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  profile_pic: {
    type: DataTypes.STRING(512),
    defaultValue: ''
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: false, // Disable automatic timestamps since we have custom created_at/updated_at
  underscored: true  // Use snake_case for column names
});

module.exports = User;
