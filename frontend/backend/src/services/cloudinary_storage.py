"""
Servicio de Almacenamiento en Cloudinary
Green House Project - Sistema de Soporte
"""

import os
import cloudinary
import cloudinary.uploader
import cloudinary.api
from datetime import datetime
from werkzeug.utils import secure_filename
import uuid

class CloudinaryStorageService:
    """Servicio para gestionar almacenamiento de archivos en Cloudinary"""
    
    # Configuración
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS = {
        'image': {'png', 'jpg', 'jpeg', 'gif', 'webp', 'heic'},
        'video': {'mp4', 'mov', 'avi', 'webm', 'mkv'},
        'document': {'pdf', 'doc', 'docx', 'txt'}
    }
    
    def __init__(self):
        """Initialize Cloudinary storage service"""
        self._configure_cloudinary()
    
    def _configure_cloudinary(self):
        """Configure Cloudinary with environment variables"""
        cloudinary.config(
            cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME', 'dx25wtuzh'),
            api_key=os.getenv('CLOUDINARY_API_KEY', '638696834116625'),
            api_secret=os.getenv('CLOUDINARY_API_SECRET', 'bwXSxb8F8Uq_y65e_qePZc5hM40'),
            secure=True
        )
        print("✓ Cloudinary configured successfully")
    
    def validate_file(self, file, filename):
        """
        Validate file before upload
        Returns: (is_valid, error_message)
        """
        # Check if file exists
        if not file or not filename:
            return False, "No file provided"
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > self.MAX_FILE_SIZE:
            max_mb = self.MAX_FILE_SIZE / (1024 * 1024)
            return False, f"File too large. Maximum size is {max_mb}MB"
        
        if file_size == 0:
            return False, "File is empty"
        
        # Check extension
        extension = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        all_allowed = set()
        for exts in self.ALLOWED_EXTENSIONS.values():
            all_allowed.update(exts)
        
        if extension not in all_allowed:
            return False, f"File type not allowed. Allowed: {', '.join(all_allowed)}"
        
        return True, None
    
    def get_resource_type(self, filename):
        """Determine Cloudinary resource type from filename"""
        extension = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        
        if extension in self.ALLOWED_EXTENSIONS['image']:
            return 'image'
        elif extension in self.ALLOWED_EXTENSIONS['video']:
            return 'video'
        else:
            return 'raw'  # For documents and other files
    
    def generate_public_id(self, original_filename, ticket_id):
        """Generate unique public ID for Cloudinary"""
        extension = original_filename.rsplit('.', 1)[-1].lower() if '.' in original_filename else ''
        unique_id = str(uuid.uuid4())[:8]
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        
        # Format: soporte-ghp/ticket_id/timestamp_uniqueid
        return f"soporte-ghp/{ticket_id}/{timestamp}_{unique_id}"
    
    def save_file(self, file, original_filename, ticket_id):
        """
        Save file to Cloudinary
        Returns: (storage_path, file_size, error)
        """
        try:
            # Validate file
            is_valid, error = self.validate_file(file, original_filename)
            if not is_valid:
                return None, None, error
            
            # Get file size before upload
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)
            
            # Determine resource type
            resource_type = self.get_resource_type(original_filename)
            
            # Generate public ID
            public_id = self.generate_public_id(original_filename, ticket_id)
            
            # Upload to Cloudinary
            upload_options = {
                'public_id': public_id,
                'resource_type': resource_type,
                'folder': '',  # Already included in public_id
                'overwrite': True,
                'unique_filename': False,
                'use_filename': False
            }
            
            # For raw files (documents), we need to include the extension
            if resource_type == 'raw':
                extension = original_filename.rsplit('.', 1)[-1].lower()
                upload_options['format'] = extension
            
            result = cloudinary.uploader.upload(file, **upload_options)
            
            # Return the secure URL as storage path
            storage_path = result['secure_url']
            
            print(f"✓ File uploaded to Cloudinary: {storage_path}")
            
            return storage_path, file_size, None
            
        except Exception as e:
            print(f"✗ Error uploading to Cloudinary: {e}")
            return None, None, f"Error saving file: {str(e)}"
    
    def delete_file(self, storage_path):
        """Delete file from Cloudinary"""
        try:
            # Extract public_id from URL
            # URL format: https://res.cloudinary.com/cloud_name/resource_type/upload/v123/public_id.ext
            if 'cloudinary.com' in storage_path:
                # Parse the URL to get public_id
                parts = storage_path.split('/upload/')
                if len(parts) > 1:
                    # Remove version and extension
                    path_part = parts[1]
                    # Remove version (v123456789/)
                    if path_part.startswith('v'):
                        path_part = '/'.join(path_part.split('/')[1:])
                    # Remove extension
                    public_id = path_part.rsplit('.', 1)[0]
                    
                    # Determine resource type from URL
                    if '/image/' in storage_path:
                        resource_type = 'image'
                    elif '/video/' in storage_path:
                        resource_type = 'video'
                    else:
                        resource_type = 'raw'
                    
                    result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
                    
                    if result.get('result') == 'ok':
                        print(f"✓ File deleted from Cloudinary: {public_id}")
                        return True, None
                    else:
                        return False, f"Cloudinary delete failed: {result}"
            
            return False, "Invalid Cloudinary URL"
            
        except Exception as e:
            print(f"✗ Error deleting from Cloudinary: {e}")
            return False, f"Error deleting file: {str(e)}"
    
    def get_file_path(self, storage_path):
        """
        For Cloudinary, the storage_path IS the URL
        This method is kept for compatibility with existing code
        """
        return storage_path
    
    def get_file_url(self, storage_path, base_url=None):
        """
        For Cloudinary, the storage_path IS the URL
        base_url is ignored since Cloudinary provides full URLs
        """
        return storage_path
    
    def get_mime_type(self, filename):
        """Determine MIME type from filename"""
        extension = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        
        mime_types = {
            # Images
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'heic': 'image/heic',
            # Videos
            'mp4': 'video/mp4',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
            'webm': 'video/webm',
            'mkv': 'video/x-matroska',
            # Documents
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'txt': 'text/plain'
        }
        
        return mime_types.get(extension, 'application/octet-stream')


# Singleton instance
cloudinary_storage = CloudinaryStorageService()
