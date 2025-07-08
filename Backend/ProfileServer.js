const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const { UpdateUserProfile } = require('./Controllers/profile');
const verifyToken = require('./Middlewares/authMiddleware');

dotenv.config();

mongoose.connect(process.env.MONGOURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('ProfileServer: Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

const app = express();
app.use(cors());
app.use(express.json());

// Only the update profile route
app.put('/api/users/update', verifyToken, UpdateUserProfile);

const PORT = process.env.PROFILE_PORT || 5001;
app.listen(PORT, () => {
  console.log(`Profile update server running on port ${PORT}`);
}); 