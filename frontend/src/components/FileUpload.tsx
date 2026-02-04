import React, { useState, useRef } from 'react';
import { api } from '../services/api';
import '../styles/FileUpload.css';

interface FileUploadProps {
  ticketId: string;
  onUploadComplete: () => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ ticketId, onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    // Validate files
    const validFiles = files.filter(file => {
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        alert(`${file.name} es demasiado grande. Máximo 50MB`);
        return false;
      }
      return true;
    });

    // Initialize uploading state
    const newUploadingFiles: UploadingFile[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading'
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Upload each file
    for (let i = 0; i < validFiles.length; i++) {
      await uploadFile(validFiles[i], uploadingFiles.length + i);
    }
  };

  const uploadFile = async (file: File, index: number) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ticket_id', ticketId);

    try {
      await api.uploadAttachment(formData, (progressEvent) => {
        const progress = progressEvent.total
          ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
          : 0;
        
        setUploadingFiles(prev => {
          const updated = [...prev];
          if (updated[index]) {
            updated[index].progress = progress;
          }
          return updated;
        });
      });

      // Mark as success
      setUploadingFiles(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index].status = 'success';
          updated[index].progress = 100;
        }
        return updated;
      });

      // Remove from list after 2 seconds
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter((_, i) => i !== index));
        onUploadComplete();
      }, 2000);

    } catch (error: any) {
      console.error('Error uploading file:', error);
      setUploadingFiles(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index].status = 'error';
          updated[index].error = error.response?.data?.error || 'Error al subir archivo';
        }
        return updated;
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type === 'application/pdf') return '📄';
    return '📎';
  };

  return (
    <div className="file-upload-container">
      <div
        className={`file-upload-dropzone ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        />
        
        <div className="dropzone-content">
          <div className="dropzone-icon">📤</div>
          <p className="dropzone-text">
            Arrastra archivos aquí o <span className="dropzone-link">haz click para seleccionar</span>
          </p>
          <p className="dropzone-hint">
            Imágenes, videos o documentos (máx. 50MB)
          </p>
        </div>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="uploading-files-list">
          {uploadingFiles.map((item, index) => (
            <div key={index} className={`uploading-file-item ${item.status}`}>
              <div className="file-info">
                <span className="file-icon">{getFileIcon(item.file)}</span>
                <div className="file-details">
                  <span className="file-name">{item.file.name}</span>
                  <span className="file-size">{formatFileSize(item.file.size)}</span>
                </div>
              </div>
              
              <div className="file-status">
                {item.status === 'uploading' && (
                  <>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <span className="progress-text">{item.progress}%</span>
                  </>
                )}
                {item.status === 'success' && (
                  <span className="status-icon success">✓</span>
                )}
                {item.status === 'error' && (
                  <div className="error-message">
                    <span className="status-icon error">✗</span>
                    <span className="error-text">{item.error}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;

