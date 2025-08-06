import React from 'react';
import { FaTimes, FaPaperclip, FaImage, FaVideo, FaMusic, FaFile } from 'react-icons/fa';
import '../Style/FilePreviewBar.css';

const FilePreviewBar = ({ selectedFile, filePreview, onRemoveFile }) => {
  if (!selectedFile) return null;

  const getFileIcon = () => {
    if (selectedFile.type.startsWith('image/')) return <FaImage />;
    if (selectedFile.type.startsWith('video/')) return <FaVideo />;
    if (selectedFile.type.startsWith('audio/')) return <FaMusic />;
    return <FaFile />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="file-preview-bar">
      <div className="file-preview-content">
        {/* Preview for images/videos/audio */}
        {filePreview && selectedFile.type.startsWith('image/') && (
          <div className="file-preview-media">
            <img src={filePreview} alt="preview" className="file-preview-image" />
          </div>
        )}
        {filePreview && selectedFile.type.startsWith('video/') && (
          <div className="file-preview-media">
            <video src={filePreview} controls className="file-preview-video" />
          </div>
        )}
        {filePreview && selectedFile.type.startsWith('audio/') && (
          <div className="file-preview-media">
            <audio src={filePreview} controls className="file-preview-audio" />
          </div>
        )}
        
        {/* File info section */}
        <div className="file-info">
          <div className="file-name">
            <span className="file-icon">{getFileIcon()}</span>
            <span className="file-name-text">{selectedFile.name}</span>
          </div>
          <div className="file-details">
            <span className="file-type">{selectedFile.type || 'Unknown type'}</span>
            <span className="file-separator">•</span>
            <span className="file-size">{formatFileSize(selectedFile.size)}</span>
          </div>
        </div>
      </div>
      
      <button onClick={onRemoveFile} className="file-remove-btn" title="Remove file">
        <FaTimes />
      </button>
    </div>
  );
};

export default FilePreviewBar;
