const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Hashim123',
  database: 'chatapp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // acquireTimeout: 60000,  // Remove invalid options for mysql2
  // timeout: 60000,         // Remove invalid options for mysql2
  // reconnect: true         // Remove invalid options for mysql2
});

module.exports = pool;

