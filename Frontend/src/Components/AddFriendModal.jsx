import React from 'react';
import { AiOutlineUserAdd, AiOutlineTeam, AiOutlineMessage } from 'react-icons/ai';

const AddFriendModal = ({ 
  isOpen, 
  onClose, 
  friendUserId, 
  setFriendUserId, 
  friendAlias, 
  setFriendAlias, 
  onSubmit 
}) => {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content-home">
        <h2 className="modal-title">Add a Friend</h2>
        <div className="modal-info">
          <p><strong>Adding friends allows you to:</strong></p>
          <ul>
            <li>
              <AiOutlineUserAdd style={{ color: '#10b981', fontSize: '1.5em' }} /> 
              <strong>Quick Access</strong> – Easily find and chat with your friends.
            </li>
            <li>
              <AiOutlineTeam style={{ color: '#3b82f6', fontSize: '1.5em' }} /> 
              <strong>Stay Connected</strong> – Keep track of your favorite contacts.
            </li>
            <li>
              <AiOutlineMessage style={{ color: '#8b5cf6', fontSize: '1.5em' }} /> 
              <strong>Organize Chats</strong> – Manage your conversations more efficiently.
            </li>
          </ul>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={friendUserId}
            onChange={(e) => setFriendUserId(e.target.value)}
            placeholder="Enter a 9-digit User ID to add as friend"
            className="modal-input"
            autoFocus
            required
          />
          <input
            type="text"
            value={friendAlias}
            onChange={(e) => setFriendAlias(e.target.value)}
            placeholder="Enter a nickname (optional)"
            className="modal-input"
            style={{ marginTop: '1rem' }}
            maxLength={50}
          />
          <div className="modal-buttons">
            <button type="submit" className="modal-submit">Add Friend</button>
            <button type="button" className="modal-cancel" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFriendModal;
