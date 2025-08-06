import React from 'react';
import { FaTrash, FaUserPlus } from 'react-icons/fa';

const NotificationToast = ({ type, message, isVisible }) => {
  if (!isVisible) return null;

  const getToastClass = () => {
    switch (type) {
      case 'delete':
        return 'delete-notification';
      case 'add-friend':
        return 'add-friend-notification';
      default:
        return 'notification-toast';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'delete':
        return <FaTrash className="notification-icon" />;
      case 'add-friend':
        return <FaUserPlus className="notification-icon" />;
      default:
        return null;
    }
  };

  return (
    <div className={getToastClass()}>
      {getIcon()}
      <span>{message}</span>
    </div>
  );
};

export default NotificationToast;
