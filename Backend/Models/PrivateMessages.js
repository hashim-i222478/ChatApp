const mongoose = require('mongoose');

const PrivateMessageSchema = new mongoose.Schema({
  participants: [String], // [userId1, userId2]
  messages: [
    {
      from: String,
      to: String,
      message: String,
      time: { type: Date, default: Date.now },
      fileUrl: String,
      fileType: String,
      filename: String
    }
  ]
});

module.exports = mongoose.model('PrivateMessage', PrivateMessageSchema);