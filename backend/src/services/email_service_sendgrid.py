"""
Email Service usando SendGrid
Green House Project - Sistema de Soporte
"""

import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from typing import List, Optional

class EmailServiceSendGrid:
    def __init__(self):
        self.api_key = os.getenv('SENDGRID_API_KEY', '')
        self.from_email = os.getenv('FROM_EMAIL', 'soporte@greenhproject.com')
        self.from_name = os.getenv('FROM_NAME', 'Green House Project - Soporte')
        self.enabled = os.getenv('EMAIL_ENABLED', 'false').lower() == 'true'
        
        if self.api_key:
            self.client = SendGridAPIClient(self.api_key)
        else:
            self.client = None
        
    def send_email(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str,
        cc: Optional[List[str]] = None
    ) -> bool:
        """Envía un email usando SendGrid"""
        if not self.enabled:
            print(f"[EMAIL] Emails deshabilitados. To: {to_email}, Subject: {subject}")
            return True
            
        if not self.client or not self.api_key:
            print("[EMAIL] SendGrid API Key no configurada")
            return False
            
        try:
            message = Mail(
                from_email=Email(self.from_email, self.from_name),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_content)
            )
            
            response = self.client.send(message)
            
            if response.status_code in [200, 201, 202]:
                print(f"[EMAIL] Enviado exitosamente a {to_email} (Status: {response.status_code})")
                return True
            else:
                print(f"[EMAIL] Error al enviar: Status {response.status_code}")
                return False
            
        except Exception as e:
            print(f"[EMAIL] Error al enviar email: {str(e)}")
            return False
    
    def send_ticket_created_notification(
        self, 
        ticket_id: str,
        ticket_title: str,
        client_name: str,
        client_email: str,
        priority: str,
        category: str,
        description: str
    ) -> bool:
        """Envía notificación de ticket creado"""
        subject = f"✅ Ticket {ticket_id} creado - {ticket_title}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .ticket-info {{ background: white; padding: 20px; border-left: 4px solid #4CAF50; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        .priority-high {{ color: #ff9800; font-weight: bold; }}
        .priority-critical {{ color: #f44336; font-weight: bold; }}
        .priority-medium {{ color: #2196F3; font-weight: bold; }}
        .priority-low {{ color: #4CAF50; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Ticket Creado Exitosamente</h1>
        </div>
        <div class="content">
            <p>Hola <strong>{client_name}</strong>,</p>
            
            <p>Tu ticket de soporte ha sido creado exitosamente y nuestro equipo lo revisará pronto.</p>
            
            <div class="ticket-info">
                <h3>📋 Detalles del Ticket</h3>
                <p><strong>ID:</strong> {ticket_id}</p>
                <p><strong>Título:</strong> {ticket_title}</p>
                <p><strong>Prioridad:</strong> <span class="priority-{priority.lower()}">{priority.upper()}</span></p>
                <p><strong>Categoría:</strong> {category}</p>
                <p><strong>Descripción:</strong></p>
                <p style="background: #f5f5f5; padding: 15px; border-radius: 5px;">{description}</p>
            </div>
            
            <p>Te notificaremos cuando haya actualizaciones en tu ticket.</p>
            
            <p><strong>¿Necesitas ayuda urgente?</strong></p>
            <p>
                📱 WhatsApp: <a href="https://wa.me/573227469557">+57 322 746 9557</a><br>
                📞 Teléfono: <a href="tel:+573009754614">+57 300 975 4614</a><br>
                📧 Email: <a href="mailto:soporte@greenhproject.com">soporte@greenhproject.com</a>
            </p>
        </div>
        <div class="footer">
            <p>© 2025 Green House Project - Sistema de Soporte</p>
            <p>Este es un email automático, por favor no respondas a este mensaje.</p>
        </div>
    </div>
</body>
</html>
        """
        
        return self.send_email(client_email, subject, html_content)
    
    def send_assignment_notification(
        self,
        ticket_id: str,
        ticket_title: str,
        engineer_name: str,
        engineer_email: str,
        client_name: str,
        priority: str,
        category: str
    ) -> bool:
        """Envía notificación de asignación a ingeniero"""
        subject = f"🔧 Ticket {ticket_id} asignado a ti - {priority.upper()}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .ticket-info {{ background: white; padding: 20px; border-left: 4px solid #2196F3; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        .btn {{ display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 Nuevo Ticket Asignado</h1>
        </div>
        <div class="content">
            <p>Hola <strong>{engineer_name}</strong>,</p>
            
            <p>Se te ha asignado un nuevo ticket de soporte.</p>
            
            <div class="ticket-info">
                <h3>📋 Detalles del Ticket</h3>
                <p><strong>ID:</strong> {ticket_id}</p>
                <p><strong>Título:</strong> {ticket_title}</p>
                <p><strong>Cliente:</strong> {client_name}</p>
                <p><strong>Prioridad:</strong> <span style="color: #ff9800; font-weight: bold;">{priority.upper()}</span></p>
                <p><strong>Categoría:</strong> {category}</p>
            </div>
            
            <p>Por favor, revisa el ticket y actualiza su estado lo antes posible.</p>
            
            <a href="https://soporte-frontend-ghp.vercel.app/tickets" class="btn">Ver Ticket</a>
        </div>
        <div class="footer">
            <p>© 2025 Green House Project - Sistema de Soporte</p>
        </div>
    </div>
</body>
</html>
        """
        
        return self.send_email(engineer_email, subject, html_content)
    
    def send_status_change_notification(
        self,
        ticket_id: str,
        ticket_title: str,
        old_status: str,
        new_status: str,
        client_email: str,
        client_name: str,
        changed_by: str = "Equipo de Soporte"
    ) -> bool:
        """Envía notificación de cambio de estado"""
        subject = f"🔄 Actualización de ticket {ticket_id} - Green House Project"
        
        # Mapeo de estados a español
        status_map = {
            'new': 'Nuevo',
            'assigned': 'Asignado',
            'in_progress': 'En Progreso',
            'waiting': 'En Espera',
            'resolved': 'Resuelto',
            'closed': 'Cerrado'
        }
        
        old_status_es = status_map.get(old_status, old_status)
        new_status_es = status_map.get(new_status, new_status)
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 10px; }}
        .header {{ background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
        .header h1 {{ margin: 0; font-size: 24px; }}
        .header p {{ margin: 5px 0 0 0; opacity: 0.9; font-size: 14px; }}
        .content {{ background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }}
        .ticket-info {{ background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2E7D32; border-radius: 5px; }}
        .ticket-info p {{ margin: 5px 0; font-size: 14px; }}
        .status-change {{ background: white; padding: 20px 10px; margin: 15px 0; text-align: center; border-radius: 8px; }}
        .status-change p {{ margin: 0 0 15px 0; font-weight: bold; font-size: 16px; }}
        .status-container {{ display: flex; flex-direction: column; align-items: center; gap: 10px; }}
        .status-row {{ display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 10px; }}
        .status {{ display: inline-block; padding: 10px 20px; border-radius: 20px; font-weight: bold; font-size: 14px; min-width: 100px; text-align: center; }}
        .arrow {{ font-size: 24px; color: #666; }}
        .btn {{ display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%); color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }}
        .footer {{ text-align: center; margin-top: 20px; padding: 15px; color: #666; font-size: 12px; }}
        
        @media only screen and (max-width: 600px) {{
            .container {{ padding: 5px; }}
            .header {{ padding: 15px; }}
            .header h1 {{ font-size: 20px; }}
            .content {{ padding: 15px; }}
            .status-change {{ padding: 15px 5px; }}
            .status {{ padding: 8px 15px; font-size: 13px; min-width: 90px; }}
            .arrow {{ font-size: 20px; }}
            .btn {{ padding: 12px 25px; font-size: 14px; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔄 Actualización de Ticket</h1>
            <p>Green House Project</p>
        </div>
        <div class="content">
            <p>Hola <strong>{client_name}</strong>,</p>
            
            <p>Tu ticket ha sido actualizado por <strong>{changed_by}</strong>.</p>
            
            <div class="ticket-info">
                <p><strong>🎫 ID:</strong> {ticket_id}</p>
                <p><strong>📝 Título:</strong> {ticket_title}</p>
            </div>
            
            <div class="status-change">
                <p>Cambio de Estado:</p>
                <div class="status-container">
                    <div class="status-row">
                        <span class="status" style="background: #ff9800; color: white;">{old_status_es}</span>
                    </div>
                    <div class="arrow">↓</div>
                    <div class="status-row">
                        <span class="status" style="background: #4CAF50; color: white;">{new_status_es}</span>
                    </div>
                </div>
            </div>
            
            <p>Nuestro equipo está trabajando en tu solicitud. Puedes ver los detalles y el progreso en el sistema.</p>
            
            <div style="text-align: center;">
                <a href="https://soporte-frontend-ghp.vercel.app/tickets/{ticket_id}" class="btn">Ver Ticket</a>
            </div>
        </div>
        <div class="footer">
            <p>© 2025 Green House Project - Sistema de Soporte</p>
            <p>Si no solicitaste este cambio, por favor contáctanos de inmediato.</p>
        </div>
    </div>
</body>
</html>
        """
        
        return self.send_email(client_email, subject, html_content)


    def send_password_reset_email(
        self,
        to_email: str,
        user_name: str,
        reset_url: str
    ) -> bool:
        """Envía email con link de recuperación de contraseña"""
        subject = "🔐 Recuperación de contraseña - Green House Project"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
        .button {{ display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }}
        .button:hover {{ background: linear-gradient(135deg, #059669 0%, #047857 100%); }}
        .info-box {{ background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 5px; }}
        .footer {{ text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }}
        .warning {{ background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 5px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🔐 Recuperación de Contraseña</h1>
        </div>
        
        <div class="content">
            <p style="font-size: 16px;">Hola <strong>{user_name}</strong>,</p>
            
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en el Sistema de Soporte de Green House Project.</p>
            
            <div class="info-box">
                <p style="margin: 0;"><strong>📧 Email:</strong> {to_email}</p>
            </div>
            
            <p>Para establecer una nueva contraseña, haz clic en el siguiente botón:</p>
            
            <div style="text-align: center;">
                <a href="{reset_url}" class="button">Restablecer Contraseña</a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">O copia y pega este enlace en tu navegador:</p>
            <p style="font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 5px;">{reset_url}</p>
            
            <div class="warning">
                <p style="margin: 0; font-size: 14px;"><strong>⚠️ Importante:</strong></p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
                    <li>Este enlace es válido por <strong>1 hora</strong></li>
                    <li>Solo puede usarse una vez</li>
                    <li>Si no solicitaste este cambio, ignora este email</li>
                </ul>
            </div>
            
            <p style="margin-top: 30px;">Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.</p>
            
            <p style="margin-top: 20px;">Saludos,<br><strong>Equipo de Soporte<br>Green House Project</strong></p>
        </div>
        
        <div class="footer">
            <p>Este es un email automático, por favor no respondas a este mensaje.</p>
            <p>© 2025 Green House Project. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>
"""
        
        return self.send_email(to_email, subject, html_content)


    def send_rating_request(
        self,
        ticket_id: str,
        ticket_title: str,
        client_email: str,
        client_name: str,
        engineer_name: str
    ) -> bool:
        """Envía solicitud de calificación al cliente"""
        subject = f"⭐ Califica el servicio - Ticket {ticket_id}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .ticket-info {{ background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #2E7D32; border-radius: 5px; }}
        .rating-section {{ background: white; padding: 30px; margin: 20px 0; text-align: center; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .stars-container {{ font-size: 40px; margin: 20px 0; letter-spacing: 10px; }}
        .star-link {{ text-decoration: none; cursor: pointer; transition: transform 0.2s; display: inline-block; }}
        .star-link:hover {{ transform: scale(1.2); }}
        .btn {{ display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%); color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }}
        .btn:hover {{ background: linear-gradient(135deg, #1B5E20 0%, #0d3d12 100%); }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⭐ ¡Tu Opinión es Importante!</h1>
            <p style="margin: 0; opacity: 0.9;">Green House Project</p>
        </div>
        <div class="content">
            <p>Hola <strong>{client_name}</strong>,</p>
            
            <p>¡Excelentes noticias! Tu ticket ha sido resuelto exitosamente.</p>
            
            <div class="ticket-info">
                <p style="margin: 0;"><strong>🎫 ID:</strong> {ticket_id}</p>
                <p style="margin: 10px 0 0 0;"><strong>📝 Título:</strong> {ticket_title}</p>
                <p style="margin: 10px 0 0 0;"><strong>👨‍🔧 Atendido por:</strong> {engineer_name}</p>
            </div>
            
            <div class="rating-section">
                <h2 style="color: #2E7D32; margin-top: 0;">¿Cómo fue tu experiencia?</h2>
                <p>Selecciona una estrella para calificar el servicio inmediatamente:</p>
                
                <div class="stars-container">
                    <a href="https://soporte-backend-ghp.up.railway.app/api/tickets/{ticket_id}/rate-quick/1" class="star-link" title="Muy Malo">⭐</a>
                    <a href="https://soporte-backend-ghp.up.railway.app/api/tickets/{ticket_id}/rate-quick/2" class="star-link" title="Malo">⭐</a>
                    <a href="https://soporte-backend-ghp.up.railway.app/api/tickets/{ticket_id}/rate-quick/3" class="star-link" title="Regular">⭐</a>
                    <a href="https://soporte-backend-ghp.up.railway.app/api/tickets/{ticket_id}/rate-quick/4" class="star-link" title="Bueno">⭐</a>
                    <a href="https://soporte-backend-ghp.up.railway.app/api/tickets/{ticket_id}/rate-quick/5" class="star-link" title="Excelente">⭐</a>
                </div>
                
                <div style="display: flex; justify-content: space-between; max-width: 300px; margin: 0 auto; font-size: 12px; color: #666;">
                    <span>Malo</span>
                    <span>Excelente</span>
                </div>

                <p style="margin-top: 20px; font-size: 14px; color: #666;">Tu calificación nos ayuda a mejorar continuamente nuestro servicio.</p>
                <a href="https://soporte-frontend-ghp.vercel.app/rate/{ticket_id}" style="display: inline-block; margin-top: 10px; color: #2E7D32; text-decoration: underline;">O deja un comentario detallado aquí</a>
            </div>
            
            <p style="margin-top: 30px;">Si tienes alguna pregunta adicional o el problema persiste, no dudes en contactarnos.</p>
            
            <p style="margin-top: 20px;">¡Gracias por confiar en nosotros!</p>
            <p><strong>Equipo de Soporte<br>Green House Project</strong></p>
        </div>
        <div class="footer">
            <p>© 2025 Green House Project - Sistema de Soporte</p>
            <p>Tu satisfacción es nuestra prioridad</p>
        </div>
    </div>
</body>
</html>
        """
        
        return self.send_email(client_email, subject, html_content)


    def send_comment_notification(
        self,
        ticket_id: str,
        ticket_title: str,
        commenter_name: str,
        comment_content: str,
        recipient_email: str,
        recipient_name: str,
        is_internal: bool = False
    ) -> bool:
        """Envía notificación de nuevo comentario"""
        comment_type = "Interno" if is_internal else "Público"
        subject = f"💬 Nuevo comentario en ticket {ticket_id} - Green House Project"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 10px; }}
        .header {{ background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
        .header h1 {{ margin: 0; font-size: 24px; }}
        .header p {{ margin: 5px 0 0 0; opacity: 0.9; font-size: 14px; }}
        .content {{ background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }}
        .ticket-info {{ background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2E7D32; border-radius: 5px; }}
        .ticket-info p {{ margin: 5px 0; font-size: 14px; }}
        .comment-box {{ background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border: 1px solid #e0e0e0; }}
        .comment-author {{ font-weight: bold; color: #2E7D32; margin-bottom: 10px; }}
        .comment-content {{ background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 10px; font-style: italic; }}
        .btn {{ display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%); color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }}
        .footer {{ text-align: center; margin-top: 20px; padding: 15px; color: #666; font-size: 12px; }}
        .badge {{ display: inline-block; padding: 5px 10px; background: #4CAF50; color: white; border-radius: 12px; font-size: 12px; margin-left: 10px; }}
        
        @media only screen and (max-width: 600px) {{
            .container {{ padding: 5px; }}
            .header {{ padding: 15px; }}
            .header h1 {{ font-size: 20px; }}
            .content {{ padding: 15px; }}
            .comment-box {{ padding: 15px; }}
            .btn {{ padding: 12px 25px; font-size: 14px; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💬 Nuevo Comentario</h1>
            <p>Green House Project</p>
        </div>
        <div class="content">
            <p>Hola <strong>{recipient_name}</strong>,</p>
            
            <p>Se ha agregado un nuevo comentario {comment_type.lower()} en tu ticket.</p>
            
            <div class="ticket-info">
                <p><strong>🎫 ID:</strong> {ticket_id}</p>
                <p><strong>📝 Título:</strong> {ticket_title}</p>
            </div>
            
            <div class="comment-box">
                <div class="comment-author">
                    👤 {commenter_name}
                    <span class="badge">{comment_type}</span>
                </div>
                <div class="comment-content">
                    {comment_content}
                </div>
            </div>
            
            <p>Puedes responder y ver todos los comentarios en el sistema.</p>
            
            <div style="text-align: center;">
                <a href="https://soporte-frontend-ghp.vercel.app/tickets/{ticket_id}" class="btn">Ver Ticket y Responder</a>
            </div>
        </div>
        <div class="footer">
            <p>© 2025 Green House Project - Sistema de Soporte</p>
            <p>Mantente conectado con tu equipo de soporte</p>
        </div>
    </div>
</body>
</html>
        """
        
        return self.send_email(recipient_email, subject, html_content)


# Instancia global del servicio
email_service = EmailServiceSendGrid()

