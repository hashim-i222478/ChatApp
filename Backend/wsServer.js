const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8081 });
module.exports = wss; 