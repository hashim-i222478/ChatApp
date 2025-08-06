import React from 'react';
import { FaExclamationTriangle, FaTimes, FaUserAlt, FaUserSecret } from 'react-icons/fa';

const DeleteModal = ({ 
  isOpen, 
  selectedMessages, 
  allSelectedByMe, 
  onClose, 
  onDeleteForMe, 
  onDeleteForEveryone 
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3><FaExclamationTriangle className="modal-icon" /> Delete Message{selectedMessages.length > 1 ? 's' : ''}</h3>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to delete {selectedMessages.length} message{selectedMessages.length > 1 ? 's' : ''}?</p>
        </div>
        <div className="modal-footer">
          <button className="modal-btn cancel" onClick={onClose}>
            <FaTimes /> Cancel
          </button>
          <button className="modal-btn delete-for-me" onClick={onDeleteForMe}>
            <FaUserAlt /> Delete for Me
          </button>
          {allSelectedByMe && (
            <button className="modal-btn delete-for-everyone" onClick={onDeleteForEveryone}>
              <FaUserSecret /> Delete for Everyone
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
