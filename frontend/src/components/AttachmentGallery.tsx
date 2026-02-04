import React, { useState } from 'react';
import { api } from '../services/api';
import '../styles/AttachmentGallery.css';

interface Attachment {
  attachment_id: string;
  file_name: string;
  file_size: number;
  file_size_mb: number;
  file_type: string;
  file_url: string;
  uploaded_at: string;
  uploader: {
    id: string;
    name: string;
    role: string;
  };
}

interface AttachmentGalleryProps {
  attachments: Attachment[];
  onDelete?: (attachmentId: string) => void;
  canDelete?: boolean;
}

const AttachmentGallery: React.FC<AttachmentGalleryProps> = ({ 
  attachments, 
  onDelete,
  canDelete = false 
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const getFileIcon = (fileType: string) => {
    if (fileType === 'image') return '🖼️';
    if (fileType === 'video') return '🎥';
    if (fileType === 'document') return '📄';
    return '📎';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async (attachmentId: string) => {
    if (deleteConfirm !== attachmentId) {
      setDeleteConfirm(attachmentId);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      await api.deleteAttachment(attachmentId);
      if (onDelete) {
        onDelete(attachmentId);
      }
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Error al eliminar el archivo');
    }
  };

  const handleDownload = (attachment: Attachment) => {
    window.open(attachment.file_url, '_blank');
  };

  if (attachments.length === 0) {
    return (
      <div className="attachment-gallery-empty">
        <p>📎 No hay archivos adjuntos</p>
      </div>
    );
  }

  const images = attachments.filter(a => a.file_type === 'image');
  const videos = attachments.filter(a => a.file_type === 'video');
  const documents = attachments.filter(a => a.file_type === 'document' || a.file_type === 'other');

  return (
    <div className="attachment-gallery">
      {/* Images */}
      {images.length > 0 && (
        <div className="attachment-section">
          <h4 className="section-title">📷 Imágenes ({images.length})</h4>
          <div className="image-grid">
            {images.map(attachment => (
              <div key={attachment.attachment_id} className="image-item">
                <div 
                  className="image-thumbnail"
                  onClick={() => setSelectedImage(attachment.file_url)}
                >
                  <img src={attachment.file_url} alt={attachment.file_name} />
                  <div className="image-overlay">
                    <span>Ver</span>
                  </div>
                </div>
                <div className="image-info">
                  <span className="image-name">{attachment.file_name}</span>
                  <span className="image-size">{attachment.file_size_mb} MB</span>
                </div>
                {canDelete && (
                  <button
                    className={`delete-btn ${deleteConfirm === attachment.attachment_id ? 'confirm' : ''}`}
                    onClick={() => handleDelete(attachment.attachment_id)}
                  >
                    {deleteConfirm === attachment.attachment_id ? '¿Confirmar?' : '✕'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="attachment-section">
          <h4 className="section-title">🎥 Videos ({videos.length})</h4>
          <div className="file-list">
            {videos.map(attachment => (
              <div key={attachment.attachment_id} className="file-item">
                <div className="file-icon">🎥</div>
                <div className="file-details">
                  <span className="file-name">{attachment.file_name}</span>
                  <span className="file-meta">
                    {attachment.file_size_mb} MB • {formatDate(attachment.uploaded_at)} • {attachment.uploader.name}
                  </span>
                </div>
                <div className="file-actions">
                  <button 
                    className="action-btn download"
                    onClick={() => handleDownload(attachment)}
                  >
                    ⬇️ Descargar
                  </button>
                  {canDelete && (
                    <button
                      className={`action-btn delete ${deleteConfirm === attachment.attachment_id ? 'confirm' : ''}`}
                      onClick={() => handleDelete(attachment.attachment_id)}
                    >
                      {deleteConfirm === attachment.attachment_id ? '¿Confirmar?' : '🗑️'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <div className="attachment-section">
          <h4 className="section-title">📄 Documentos ({documents.length})</h4>
          <div className="file-list">
            {documents.map(attachment => (
              <div key={attachment.attachment_id} className="file-item">
                <div className="file-icon">{getFileIcon(attachment.file_type)}</div>
                <div className="file-details">
                  <span className="file-name">{attachment.file_name}</span>
                  <span className="file-meta">
                    {attachment.file_size_mb} MB • {formatDate(attachment.uploaded_at)} • {attachment.uploader.name}
                  </span>
                </div>
                <div className="file-actions">
                  <button 
                    className="action-btn download"
                    onClick={() => handleDownload(attachment)}
                  >
                    ⬇️ Descargar
                  </button>
                  {canDelete && (
                    <button
                      className={`action-btn delete ${deleteConfirm === attachment.attachment_id ? 'confirm' : ''}`}
                      onClick={() => handleDelete(attachment.attachment_id)}
                    >
                      {deleteConfirm === attachment.attachment_id ? '¿Confirmar?' : '🗑️'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {selectedImage && (
        <div className="image-lightbox" onClick={() => setSelectedImage(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setSelectedImage(null)}>
              ✕
            </button>
            <img src={selectedImage} alt="Preview" />
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentGallery;

