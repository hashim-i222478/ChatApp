import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import '../Style/forceLogoutModal.css';

const ForceLogoutModal = ({ isVisible, message, onConfirm }) => {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (!isVisible) {
      setCountdown(10);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onConfirm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, onConfirm]);

  if (!isVisible) return null;

  return (
    <div className="force-logout-overlay">
      <div className="force-logout-modal">
        <div className="force-logout-header">
          <div className="force-logout-icon-container">
            <FaExclamationTriangle className="warning-icon" />
          </div>
          <h3>Session Expired</h3>
          <p className="force-logout-subtitle">Multiple login detected</p>
        </div>
        <div className="force-logout-body">
          <p className="force-logout-message">
            {message || 'You have been logged out because you logged in from another device/tab'}
          </p>
          <div className="force-logout-info">
            <p>Your chat history has been saved.</p>
          </div>
          <div className="force-logout-countdown">
            <p className="countdown-text">
              Redirecting to login in <strong>{countdown}</strong> second{countdown !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="force-logout-footer">
          <button 
            className="logout-confirm-btn"
            onClick={onConfirm}
          >
            Login Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForceLogoutModal;
