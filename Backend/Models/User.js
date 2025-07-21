const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  pin: {
    type: String, // hashed pin
    required: true
  },
  profilePic: {
    type: String, // URL or base64 string
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);