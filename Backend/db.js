const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('chatapp', 'root', 'Hashim123', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false 
});

module.exports = sequelize;

