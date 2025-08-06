import React from 'react';
import { FaTimes } from 'react-icons/fa';

const MediaPreviewModal = ({ mediaPreview, onClose }) => {
  if (!mediaPreview) return null;

  return (
    <div className="media-modal-overlay" onClick={onClose}>
      <div className="media-modal-content" onClick={e => e.stopPropagation()}>
        <button className="media-modal-close" onClick={onClose}>
          <FaTimes />
        </button>
        
        {mediaPreview.msg.fileType.startsWith('image/') && (
          <img 
            src={mediaPreview.src} 
            alt={mediaPreview.msg.filename || 'preview'} 
            className="media-modal-image" 
            loading="lazy"
          />
        )}
        
        {mediaPreview.msg.fileType.startsWith('video/') && (
          <video 
            src={mediaPreview.src} 
            controls 
            autoPlay 
            className="media-modal-video" 
          />
        )}
        
        {mediaPreview.msg.fileType.startsWith('audio/') && (
          <audio 
            src={mediaPreview.src} 
            controls 
            autoPlay 
            className="media-modal-audio" 
          />
        )}
      </div>
    </div>
  );
};

export default MediaPreviewModal;
