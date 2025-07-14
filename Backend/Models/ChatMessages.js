const mongoose = require('mongoose');

const chatMessagesSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    messages: [
        {
            message: { type: String, required: true },
            timestamp: { type: Date, default: Date.now }
        }
    ]
});

module.exports = mongoose.model('ChatMessages', chatMessagesSchema);