import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './Components/Login';
import SignUp from './Components/SignUp';
import Chat from './Components/Chat';
import UpdateProfile from './Components/UpdateProfile';
import ViewProfile from './Components/ViewProfile';
import Home from './Components/Home';
import OnlineUsers from './Components/OnlineUsers';
import PrivateChat from './Components/PrivateChat';
import RecentChats from './Components/RecentChats';
import { WebSocketProvider } from './Context/WebSocketContext';

function App() {
  // Check if user is authenticated
  const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
  };

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    return isAuthenticated() ? children : <Navigate to="/login" />;
  };

  const username = localStorage.getItem('username');

  return (
    <WebSocketProvider username={username}>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route 
              path="/chat" 
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/update-profile" 
              element={
                <ProtectedRoute>
                  <UpdateProfile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ViewProfile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/online-users" 
              element={
                <ProtectedRoute>
                  <OnlineUsers />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/private-chat/:userId" 
              element={
                <ProtectedRoute>
                  <PrivateChat />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/recent-chats" 
              element={
                <ProtectedRoute>
                  <RecentChats />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </WebSocketProvider>
  );
}

export default App;
