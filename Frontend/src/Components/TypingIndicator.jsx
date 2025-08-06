import React from 'react';

const TypingIndicator = ({ username }) => (
  <div className="typing-indicator">
    <div className="typing-content">{username} is typing...</div>
  </div>
);

export default TypingIndicator;
