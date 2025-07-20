const mongoose = require('mongoose');

const PendingDeleteSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  chatKey: { type: String, required: true },
  timestamps: [String], // array of message times to delete
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PendingDelete', PendingDeleteSchema); 