"""
Rutas de Attachments (Archivos Adjuntos)
Green House Project - Sistema de Soporte
Usando Cloudinary para almacenamiento persistente
"""

from flask import Blueprint, request, jsonify, redirect, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from models import Attachment, Ticket, User, FileType
from services.cloudinary_storage import cloudinary_storage
import uuid
from datetime import datetime

attachments_bp = Blueprint('attachments', __name__)


@attachments_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_attachment():
    """Upload file attachment to a ticket (stored in Cloudinary)"""
    try:
        current_user_id = get_jwt_identity()
        user = g.db.query(User).filter_by(user_id=current_user_id).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get ticket_id from form data
        ticket_id = request.form.get('ticket_id')
        if not ticket_id:
            return jsonify({'error': 'ticket_id is required'}), 400
        
        # Verify ticket exists
        ticket = g.db.query(Ticket).filter_by(ticket_id=ticket_id).first()
        if not ticket:
            return jsonify({'error': 'Ticket not found'}), 404
        
        # Check if user has access to this ticket
        if user.role.value == 'client' and ticket.client_id != user.user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        # Get file from request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        original_filename = secure_filename(file.filename)
        
        # Save file using Cloudinary storage service
        cloudinary_url, file_size, error = cloudinary_storage.save_file(
            file, original_filename, ticket_id
        )
        
        if error:
            return jsonify({'error': error}), 400
        
        # Get MIME type
        mime_type = cloudinary_storage.get_mime_type(original_filename)
        
        # Determine file type enum
        file_type_enum = Attachment.determine_file_type(mime_type)
        
        # Create attachment record
        attachment_id = f"ATT-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        # The file_url is now the Cloudinary URL directly
        attachment = Attachment(
            attachment_id=attachment_id,
            ticket_id=ticket_id,
            uploaded_by=user.user_id,
            file_type=file_type_enum,
            file_name=original_filename,
            file_size=file_size,
            file_url=cloudinary_url,  # Direct Cloudinary URL
            mime_type=mime_type
        )
        
        g.db.add(attachment)
        
        # Update ticket's updated_at
        ticket.updated_at = datetime.utcnow()
        
        g.db.commit()
        
        return jsonify({
            'message': 'File uploaded successfully',
            'attachment': attachment.to_dict(include_uploader=True)
        }), 201
        
    except Exception as e:
        g.db.rollback()
        print(f"Error uploading attachment: {e}")
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500


@attachments_bp.route('/ticket/<ticket_id>', methods=['GET'])
@jwt_required()
def get_ticket_attachments(ticket_id):
    """Get all attachments for a ticket"""
    try:
        current_user_id = get_jwt_identity()
        user = g.db.query(User).filter_by(user_id=current_user_id).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Verify ticket exists
        ticket = g.db.query(Ticket).filter_by(ticket_id=ticket_id).first()
        if not ticket:
            return jsonify({'error': 'Ticket not found'}), 404
        
        # Check access
        if user.role.value == 'client' and ticket.client_id != user.user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        # Get attachments
        attachments = g.db.query(Attachment).filter_by(ticket_id=ticket_id).order_by(
            Attachment.uploaded_at.desc()
        ).all()
        
        return jsonify({
            'attachments': [att.to_dict(include_uploader=True) for att in attachments],
            'total': len(attachments)
        }), 200
        
    except Exception as e:
        print(f"Error getting attachments: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@attachments_bp.route('/view/<path:storage_path>', methods=['GET'])
def view_attachment(storage_path):
    """
    View an attachment file
    For Cloudinary URLs, redirect to the Cloudinary URL
    For legacy local files, return error (files no longer exist)
    """
    try:
        # Check if this is a Cloudinary URL stored in the path
        # or if we need to look up the attachment
        
        # First, try to find the attachment by the storage path
        attachment = g.db.query(Attachment).filter(
            Attachment.file_url.contains(storage_path)
        ).first()
        
        if attachment and 'cloudinary.com' in attachment.file_url:
            # Redirect to Cloudinary URL
            return redirect(attachment.file_url)
        
        # Legacy local file - no longer available
        return jsonify({
            'error': 'File not found',
            'message': 'This file was stored locally and is no longer available. Please re-upload the file.'
        }), 404
        
    except Exception as e:
        print(f"Error viewing attachment: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@attachments_bp.route('/download/<path:storage_path>', methods=['GET'])
@jwt_required()
def download_attachment(storage_path):
    """
    Download an attachment file
    For Cloudinary URLs, redirect to the Cloudinary URL with download flag
    """
    try:
        current_user_id = get_jwt_identity()
        user = g.db.query(User).filter_by(user_id=current_user_id).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Find attachment by storage path
        attachment = g.db.query(Attachment).filter(
            Attachment.file_url.contains(storage_path)
        ).first()
        
        if not attachment:
            # Try to extract ticket_id from storage_path for legacy files
            ticket_id = storage_path.split('/')[0] if '/' in storage_path else None
            if ticket_id:
                return jsonify({
                    'error': 'File not found',
                    'message': 'This file was stored locally and is no longer available.'
                }), 404
            return jsonify({'error': 'Attachment not found'}), 404
        
        # Verify access to ticket
        ticket = g.db.query(Ticket).filter_by(ticket_id=attachment.ticket_id).first()
        if not ticket:
            return jsonify({'error': 'Ticket not found'}), 404
        
        if user.role.value == 'client' and ticket.client_id != user.user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        # For Cloudinary URLs, redirect to the URL
        if 'cloudinary.com' in attachment.file_url:
            # Add fl_attachment to force download
            download_url = attachment.file_url
            if '?' in download_url:
                download_url += '&fl_attachment=true'
            else:
                download_url += '?fl_attachment=true'
            return redirect(download_url)
        
        # Legacy local file
        return jsonify({
            'error': 'File not found',
            'message': 'This file was stored locally and is no longer available.'
        }), 404
        
    except Exception as e:
        print(f"Error downloading attachment: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@attachments_bp.route('/<attachment_id>', methods=['DELETE'])
@jwt_required()
def delete_attachment(attachment_id):
    """Delete an attachment"""
    try:
        current_user_id = get_jwt_identity()
        user = g.db.query(User).filter_by(user_id=current_user_id).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Find attachment
        attachment = g.db.query(Attachment).filter_by(attachment_id=attachment_id).first()
        if not attachment:
            return jsonify({'error': 'Attachment not found'}), 404
        
        # Check permissions (only uploader or admin can delete)
        if user.role.value != 'admin' and attachment.uploaded_by != user.user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        # Delete file from Cloudinary if it's a Cloudinary URL
        if 'cloudinary.com' in attachment.file_url:
            success, error = cloudinary_storage.delete_file(attachment.file_url)
            if not success:
                print(f"Warning: Could not delete file from Cloudinary: {error}")
        
        # Delete from database
        g.db.delete(attachment)
        g.db.commit()
        
        return jsonify({'message': 'Attachment deleted successfully'}), 200
        
    except Exception as e:
        g.db.rollback()
        print(f"Error deleting attachment: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@attachments_bp.route('/by-id/<attachment_id>', methods=['GET'])
@jwt_required()
def get_attachment_by_id(attachment_id):
    """Get attachment details by ID"""
    try:
        current_user_id = get_jwt_identity()
        user = g.db.query(User).filter_by(user_id=current_user_id).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Find attachment
        attachment = g.db.query(Attachment).filter_by(attachment_id=attachment_id).first()
        if not attachment:
            return jsonify({'error': 'Attachment not found'}), 404
        
        # Check access
        ticket = g.db.query(Ticket).filter_by(ticket_id=attachment.ticket_id).first()
        if user.role.value == 'client' and ticket.client_id != user.user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        return jsonify({
            'attachment': attachment.to_dict(include_uploader=True)
        }), 200
        
    except Exception as e:
        print(f"Error getting attachment: {e}")
        return jsonify({'error': 'Internal server error'}), 500
