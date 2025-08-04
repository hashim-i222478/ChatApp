
# 🟢 RealTalk - Real-Time Chat Application

**RealTalk** is a secure, real-time chat application built with **React**, **Node.js**, **WebSockets**, and **MySQL**. It features private messaging, user authentication, friends system, local and persistent message storage, live online user tracking, and advanced features like typing indicators, message deletion, and profile management.

---

## 🚀 Features

### 🔐 Authentication & Security
* **Secure Authentication** with JWT
* **9-digit numeric User ID** and **4-digit PIN** login system
* **Protected Routes** with token-based authentication

### 💬 Messaging & Communication
* **Real-Time Private Messaging** using WebSocket
* **File & Media Sharing** with support for images and documents
* **Typing Indicators** for real-time conversation feedback
* **Message History** - Previous conversations loaded automatically
* **Message Deletion** - Delete for yourself or for everyone
* **Real-Time Notifications** for new messages when not on chat page

### 👥 Friends & Social Features
* **Friends System** - Add, remove, and manage friends
* **Friend Aliases** - Set custom nicknames for friends
* **Add Friends from Conversations** - Convert chat participants to friends
* **Friend Search** - Find users by username to add as friends
* **Online Status** - See which friends are currently online

### 🎨 User Experience
* **Recent Chats** - Quick access to recent conversations
* **Start Chat by User ID** - Direct messaging capability
* **User Profiles** - View and update profile information
* **Profile Picture Upload** - Custom profile pictures
* **Responsive UI** with modern, clean design
* **Smart Message Storage** - LocalStorage for online users, Database for offline storage

---

## 🧑‍💻 Tech Stack

### Frontend:
* **React 19** with functional components and hooks
* **React Router 7** for navigation
* **Context API** for WebSocket state management
* **React Icons** for UI icons
* **Axios** for HTTP requests
* **LocalStorage** for client-side data persistence

### Backend:
* **Node.js** with Express.js framework
* **WebSocket (ws)** for real-time communication
* **MySQL** database with raw SQL queries
* **JWT** for authentication
* **Multer** for file uploads
* **Bcrypt** for password hashing
* **CORS** for cross-origin requests

### Database:
* **MySQL** with multiple tables:
  - `users` - User accounts and profiles
  - `friends` - Friends relationships with aliases
  - `private_conversations` - Chat conversations
  - `private_messages` - Message history with file support

---

## 📦 Installation

### Prerequisites:
* **Node.js** (v14 or higher) & npm
* **MySQL** (v8.0 or higher)
* **Git**

### Clone the Repository:
```bash
git clone https://github.com/hashim-i222478/ChatApp.git
cd ChatApp
```

### Database Setup:
1. **Create MySQL Database:**
   ```sql
   CREATE DATABASE chatapp;
   USE chatapp;
   ```

2. **Run the SQL Scripts:**
   ```bash
   # Execute the SQL files in DataBase/ folder in this order:
   # 1. User.sql
   # 2. Friends.sql  
   # 3. PrivateMessages.sql
   # 4. ChatMessages.sql (if using group chat features)
   ```

### Backend Setup:
```bash
cd Backend
npm install

# Create .env file with your configuration:
# JWT_SECRET=your-jwt-secret-key
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your-mysql-password
# DB_NAME=chatapp

# Start the main server (handles WebSocket + API)
node Server.js

# Start the profile server (handles profile updates)
node ProfileServer.js
```

### Frontend Setup:
```bash
cd Frontend
npm install
npm start
```

### Access the Application:
* **Frontend:** http://localhost:3000
* **Main Backend API:** http://localhost:8080
* **Profile API:** http://localhost:8081

---

## 📝 Folder Structure

```
/Frontend
  /src
    /Components          # React components
      Header.jsx         # Navigation header
      Home.jsx          # Main dashboard
      Login.jsx         # User authentication
      SignUp.jsx        # User registration
      PrivateChat.jsx   # Private messaging interface
      RecentChats.jsx   # Chat history
      FriendsList.jsx   # Friends management
      UpdateProfile.jsx # Profile editing
      ViewProfile.jsx   # Profile viewing
    /Context            # React Context providers
      WebSocketContext.js
    /Services           # API and utility services
      api.js           # HTTP API calls
      friendsStorage.js # Friends local storage
    /Style             # CSS stylesheets
    App.js             # Main app component
    index.js           # React entry point

/Backend
  /Controllers         # Business logic
    ManageUsers.js     # User authentication & management
    Chats.js          # Private messaging
    friends.js        # Friends system
    profile.js        # Profile management
  /Routes             # API routes
    userRoutes.js     # User-related endpoints
    chatRoutes.js     # Chat-related endpoints  
    friendsRoutes.js  # Friends-related endpoints
  /Middlewares        # Express middlewares
    authMiddleware.js # JWT authentication
  /DataBase           # SQL schema files
  /uploads            # File upload storage
  Server.js           # Main server + WebSocket
  ProfileServer.js    # Profile management server
  wsServer.js         # WebSocket server setup
  db.js              # MySQL connection pool

/DataBase             # SQL scripts for database setup
  User.sql
  Friends.sql
  PrivateMessages.sql
  ChatMessages.sql
```

---

## 🔐 Authentication System

* **User Registration:** Users create accounts with unique usernames and 4-digit PINs
* **Unique User IDs:** System generates secure 9-digit numeric IDs for each user
* **JWT Protection:** All API routes and WebSocket connections are protected with JWT tokens
* **Session Management:** 3-hour token expiration with automatic logout on expiry

---

## � Messaging Architecture

### Real-Time Communication:
* **WebSocket Connection:** Persistent connection for instant message delivery
* **Online Users Tracking:** Real-time list of connected users
* **Message Broadcasting:** Instant delivery to online recipients

### Message Storage Strategy:
* **Online Recipients:** Messages stored in browser's `localStorage` for instant access
* **Offline Recipients:** Messages saved to MySQL database for later delivery
* **Message Synchronization:** Database messages transferred to `localStorage` on user login
* **Conversation History:** Complete chat history preserved across sessions

### File Sharing:
* **Media Upload:** Support for images, documents, and other file types
* **File Storage:** Server-side file storage with secure URL generation
* **File Types:** Automatic file type detection and appropriate handling

---

## 👥 Friends System

### Friend Management:
* **Add Friends:** Search users by username and send friend requests
* **Friend Aliases:** Set custom nicknames for friends for easier identification
* **Friend from Chat:** Convert any chat participant into a friend directly from conversation
* **Remove Friends:** Clean friend removal with database and local storage sync

### Friend Storage:
* **Dual Storage:** Friends stored in both MySQL database and browser's `localStorage`
* **Fast Access:** Local storage provides instant friend list access
* **Sync on Login:** Database friends synchronized to local storage on user authentication
* **Real-time Updates:** Friend list updates reflect immediately across all components

---

## 🗑️ Message Management

### Message Deletion Options:
* **Delete for Me:** Removes message from current user's `localStorage` only
* **Delete for Everyone:** Broadcasts deletion command to remove from all participants' storage
* **Conversation Clearing:** Option to clear entire conversation history

### Data Persistence:
* **Local Priority:** `localStorage` used as primary storage for active conversations
* **Database Backup:** Offline messages and conversation history stored in MySQL
* **Smart Loading:** Previous conversations loaded automatically when chat is opened

---

## 🔔 Notification System

### Real-Time Alerts:
* **Message Notifications:** Pop-up alerts for new messages when user is not on chat page
* **Online Status:** Visual indicators for friend online/offline status
* **Typing Indicators:** Real-time typing status in active conversations
* **Unread Counters:** Badge counts for unread messages in recent chats

---

## 🎨 User Interface Features

### Profile Management:
* **Profile Pictures:** Upload and update custom profile pictures
* **Username Updates:** Change display names with real-time synchronization
* **Profile Viewing:** Dedicated profile pages for viewing user information

### Responsive Design:
* **Mobile Friendly:** Optimized for mobile and tablet devices
* **Modern UI:** Clean, intuitive interface with React Icons
* **Dark/Light Compatible:** Flexible styling system
* **Interactive Elements:** Smooth animations and hover effects

---

## 🚦 Getting Started

### Quick Start Guide:
1. **Register:** Create account with username and 4-digit PIN
2. **Login:** Use your generated 9-digit User ID and PIN
3. **Add Friends:** Search for users and build your friend network
4. **Start Chatting:** Begin conversations with friends or any user by ID
5. **Manage Profile:** Upload pictures and customize your profile

### Usage Tips:
* **Friend Aliases:** Use custom nicknames to easily identify friends
* **File Sharing:** Drag and drop files directly into chat conversations
* **Quick Access:** Use Recent Chats for fast access to ongoing conversations
* **Notifications:** Keep the app open in background for real-time message alerts
---

## 🌐 WebSocket Events

### Client to Server
- `authenticate` - WebSocket authentication with JWT
- `private-message` - Send private message
- `typing-start` - Start typing indicator
- `typing-stop` - Stop typing indicator
- `delete-message` - Delete message for everyone

### Server to Client
- `private-message` - Receive private message
- `online-users` - Updated online users list
- `typing-start` - User started typing
- `typing-stop` - User stopped typing
- `message-deleted` - Message deleted notification
- `profile-updated` - User profile updated

---

## 🔍 Troubleshooting

### Common Issues:
1. **WebSocket Connection Failed**
   - Check if Server.js is running on port 8080
   - Verify JWT token is valid and not expired

2. **Database Connection Error**
   - Ensure MySQL server is running
   - Check database credentials in .env file
   - Verify database 'chatapp' exists

3. **File Upload Issues**
   - Check uploads directory permissions
   - Ensure multer middleware is configured correctly
   - Verify file size limits

4. **Friends Not Loading**
   - Clear browser's localStorage
   - Check friends API endpoint connectivity
   - Verify authentication token

---

## 🚀 Future Enhancements

### Planned Features:
- [ ] **Group Chat** - Multi-user conversations
- [ ] **Message Reactions** - Emoji reactions to messages
- [ ] **Voice Messages** - Audio message support
- [ ] **Message Search** - Search through chat history
- [ ] **Theme Customization** - Dark/light mode toggle
- [ ] **Push Notifications** - Browser push notifications
- [ ] **Message Encryption** - End-to-end encryption
- [ ] **Video Calling** - WebRTC video calls

### Technical Improvements:
- [ ] **Redis Integration** - Improved caching and session management
- [ ] **Database Migrations** - Automated database schema updates
- [ ] **API Rate Limiting** - Prevent API abuse
- [ ] **Error Logging** - Comprehensive error tracking
- [ ] **Performance Optimization** - Query optimization and caching
- [ ] **Docker Support** - Containerized deployment
- [ ] **Unit Testing** - Comprehensive test coverage

---

## 🤝 Contributing

We welcome contributions to RealTalk! Here's how you can help:

### Development Setup:
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Contribution Guidelines:
- Follow the existing code style and conventions
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation if needed
- Ensure no breaking changes to existing functionality

### Areas for Contribution:
- 🐛 **Bug Fixes** - Help identify and fix issues
- ✨ **New Features** - Implement planned enhancements
- 📚 **Documentation** - Improve README and code documentation
- 🎨 **UI/UX** - Enhance user interface and experience
- ⚡ **Performance** - Optimize database queries and frontend performance

---

## 📧 Contact & Support

- **Repository:** [GitHub - ChatApp](https://github.com/hashim-i222478/ChatApp)
- **Issues:** [Report Issues](https://github.com/hashim-i222478/ChatApp/issues)
- **Developer:** [@hashim-i222478](https://github.com/hashim-i222478)

For questions, suggestions, or support, please open an issue on GitHub.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ using React, Node.js, and MySQL**
