import React from 'react';
import { FaFileAlt, FaFilePdf, FaFileWord, FaFileExcel, FaFileImage, FaFileAudio, FaFileVideo } from 'react-icons/fa';

const MessageItem = ({ msg, onMediaClick }) => {
  if (msg.system) {
    // Render a centered or styled system message
    return (
      <div className="system-message">
        <span>{msg.message}</span>
        <span className="message-time">[{msg.time}]</span>
      </div>
    );
  }

  // --- Media rendering logic ---
  // Determine media source (base64 or URL)
  let mediaSrc = null;
  if (msg.file) {
    mediaSrc = msg.file;
  } else if (msg.fileUrl) {
    mediaSrc = msg.fileUrl.startsWith('http') ? msg.fileUrl : `http://localhost:8080${msg.fileUrl}`;
  }

  // Render media based on fileType
  let mediaElement = null;
  if (mediaSrc && msg.fileType) {
    if (msg.fileType.startsWith('image/')) {
      mediaElement = (
        <div style={{ cursor: 'pointer', display: 'inline-block' }} onClick={() => onMediaClick && onMediaClick(msg, mediaSrc)}>
          <img src={mediaSrc} alt={msg.filename || 'image'} style={{ maxWidth: 180, maxHeight: 180, borderRadius: 8, marginTop: 8 }} />
        </div>
      );
    } else if (msg.fileType.startsWith('video/')) {
      mediaElement = (
        <div style={{ cursor: 'pointer', display: 'inline-block' }} onClick={() => onMediaClick && onMediaClick(msg, mediaSrc)}>
          <video src={mediaSrc} controls style={{ maxWidth: 220, maxHeight: 180, borderRadius: 8, marginTop: 8 }} />
        </div>
      );
    } else if (msg.fileType.startsWith('audio/')) {
      mediaElement = (
        <div style={{ cursor: 'pointer', display: 'inline-block' }} onClick={() => onMediaClick && onMediaClick(msg, mediaSrc)}>
          <audio src={mediaSrc} controls style={{ maxWidth: 220, marginTop: 8 }} />
        </div>
      );
    } else {
      // Select appropriate file icon based on file type
      let FileIcon = FaFileAlt; // default icon
      if (msg.fileType) {
        if (msg.fileType.includes('pdf')) FileIcon = FaFilePdf;
        else if (msg.fileType.includes('word') || msg.fileType.includes('doc')) FileIcon = FaFileWord;
        else if (msg.fileType.includes('excel') || msg.fileType.includes('sheet') || msg.fileType.includes('xls')) FileIcon = FaFileExcel;
        else if (msg.fileType.includes('image')) FileIcon = FaFileImage;
        else if (msg.fileType.includes('audio')) FileIcon = FaFileAudio;
        else if (msg.fileType.includes('video')) FileIcon = FaFileVideo;
      }
      
      mediaElement = (
        <a 
          href={mediaSrc} 
          download={msg.filename} 
          target="_blank" 
          rel="noopener noreferrer" 
          className={`file-link ${msg.from === 'me' ? 'file-link-self' : ''}`}
        >
          <FileIcon style={{ marginRight: 8, fontSize: '1.2em' }} />
          <span className="file-name">{msg.filename || 'Download file'}</span>
        </a>
      );
    }
  }

  return (
    <div className={`message-container ${msg.from === 'me' ? 'message-self' : 'message-other'}`}>
      <div className="message-bubble">
        <div className="message-header">
          <span className="message-username">{msg.username}</span>
          <span className="message-time">[{msg.time}]</span>
        </div>
        {/* Show text if present */}
        {msg.text && msg.text.trim() !== '' && <p className="message-text">{msg.text}</p>}
        {/* Show media if present */}
        {mediaElement}
      </div>
    </div>
  );
};

export default MessageItem;
