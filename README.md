
# 🟢 RealTalk - Real-Time Chat Application

**RealTalk** is a secure, real-time chat application built with **React**, **Node.js**, **WebSockets**, and **MongoDB**. It supports private messaging, user authentication, local and persistent message storage, live online user tracking, and advanced features like typing indicators and message deletion.

---

## 🚀 Features

* 🔐 **Secure Authentication** with JWT
* 💬 **Private Messaging** using WebSocket
* 💾 **LocalStorage for Online Users** to prevent DB writes
* 🌐 **Offline Message Storage** in MongoDB
* 📡 **Typing Indicators**
* 👀 **Online Users List**
* 🧠 **Previous Conversations** loaded on chat open
* 🧾 **Start Chat by User ID**
* 🗑️ **Delete Messages** for self or everyone
* 🔔 **Real-Time Notifications** for new messages
* 🧍 **View & Update Profile**
* 💻 **Responsive UI with Modern Design**

---

## 🧑‍💻 Tech Stack

### Frontend:

* React
* React Router
* Context API (for WebSocket state)
* LocalStorage

### Backend:

* Node.js
* Express.js
* WebSocket (ws)
* MongoDB + Mongoose
* JWT Authentication

---

## 📦 Installation

### Prerequisites:

* Node.js & npm
* MongoDB

### Clone the repo:

```bash
git clone https://github.com/hashim-i222478/ChatApp.git
cd realtalk-chat-app
```

### Backend Setup:

```bash
cd Backend
npm install
# Add your .env file with:
# MONGOURL=your-mongodb-url
# JWT_SECRET=your-secret
node server.js
```

### Frontend Setup:

```bash
cd Frontend
npm install
npm start
```

---

## 📝 Folder Structure

```
/Frontend
  /Components
    Header.jsx
    Chat.jsx
    PrivateChats.jsx
    ...
  /Style
  /Services
  /Context
  App.js
  index.js

/Backend
  /Controllers
  /Middlewares
  /Models
  /Routes
  server.js
  wsServer.js
  ProfileServer.js
```

---

## 🔐 Authentication

* Users are identified by a **9-digit numeric ID** and a **4-digit PIN**
* JWT is used to protect routes and socket connections

---

## 💡 How Message Delivery Works

* If recipient is **online**:

  * Message is delivered instantly via WebSocket
  * Stored in their **localStorage**
* If recipient is **offline**:

  * Message is saved in **MongoDB**
  * Delivered & transferred to localStorage upon next login

---

## 🗑️ Message Deletion

* **Delete for me**: Removes the message from current user's localStorage
* **Delete for everyone**: Broadcasts deletion and removes message from both users' localStorage

---

## 🔔 Notifications

* Real-time notification appears if:

  * The user is online but **not on the chat page**
  * The message is received from any other user

---

## 🙋‍♂️ Contributing

Pull requests are welcome! Please submit issues or suggestions to improve functionality or design.