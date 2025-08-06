import React from 'react';
import { FaTimes, FaUserPlus } from 'react-icons/fa';

const PrivateChatAddFriendModal = ({ 
  isOpen, 
  displayName, 
  friendAlias, 
  onClose, 
  onSubmit, 
  onAliasChange 
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add {displayName} as Friend</h3>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            <p>Would you like to add an alias (nickname) for <strong>{displayName}</strong>?</p>
            <p className="modal-subtitle">You can leave this blank to use their username.</p>
            <input
              type="text"
              value={friendAlias}
              onChange={onAliasChange}
              placeholder={`Enter alias for ${displayName} (optional)`}
              className="modal-input"
              autoFocus
              maxLength={50}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="modal-btn cancel" onClick={onClose}>
              <FaTimes /> Cancel
            </button>
            <button type="submit" className="modal-btn add-friend">
              <FaUserPlus /> Add Friend
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PrivateChatAddFriendModal;
