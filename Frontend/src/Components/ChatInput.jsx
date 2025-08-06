import React from 'react';
import { FaPaperPlane, FaSmile, FaPaperclip } from 'react-icons/fa';

const emojiList = ['😀', '😂', '😍', '😎', '😭', '👍', '🎉', '❤️', '🔥', '🙏'];

const ChatInput = ({ 
  input, 
  showEmojiPicker, 
  onInputChange, 
  onSend, 
  onToggleEmojiPicker, 
  onFileClick, 
  onEmojiClick 
}) => {
  return (
    <div className="chat-input-container">
      <input
        type="text"
        placeholder="Type your message..."
        value={input}
        onChange={onInputChange}
        className="chat-input"
        onKeyDown={e => { if (e.key === 'Enter') onSend(e); }}
        style={{ flex: 1 }}
      />
      {/* Hidden file input and trigger button */}
      <input
        type="file"
        id="media-file-input"
        style={{ display: 'none' }}
        onChange={onFileClick}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
      />
      <button
        type="button"
        className="emoji-button"
        onClick={onToggleEmojiPicker}
        aria-label="Add emoji"
        title="Add emoji"
      >
        <FaSmile />
      </button>
      <button
        type="button"
        className="Media-send-button"
        title="Attach media"
        onClick={() => document.getElementById('media-file-input').click()}
      >
        <FaPaperclip />
      </button>
      <button
        onClick={onSend}
        className="chat-send-button"
        title="Send message"
      >
        <FaPaperPlane />
      </button>
      {showEmojiPicker && (
        <div className="emoji-picker-bar">
          {emojiList.map(emoji => (
            <button
              key={emoji}
              style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => onEmojiClick(emoji)}
              tabIndex={0}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatInput;
