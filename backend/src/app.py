"""
Aplicación Principal del Sistema de Soporte Post-Venta
Green House Project
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from datetime import timedelta

# Importar modelos
from models import Base

# Importar rutas
from routes.auth import auth_bp
from routes.tickets import tickets_bp
from routes.comments import comments_bp
from routes.attachments import attachments_bp
from routes.users import users_bp
from routes.dashboard import dashboard_bp
from routes.notifications import notifications_bp
from routes.audit import audit_bp
from routes.backup import backup_bp
from routes.settings import settings_bp
from routes.projects import projects_bp
from routes.rating import rating_bp
from routes.admin_tools import admin_tools_bp

# Crear aplicación Flask
app = Flask(__name__)
app.url_map.strict_slashes = False  # Evitar redirects por barras finales

# Configuración
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///soporte.db')
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL

# CORS configuration
CORS(app, 
     resources={r"/api/*": {"origins": "*"}},
     supports_credentials=False,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
     expose_headers=["Content-Type", "Authorization"])

# JWT configuration
jwt = JWTManager(app)

# Database setup
engine = create_engine(
    DATABASE_URL, 
    echo=True if os.getenv('DEBUG') == 'true' else False,
    pool_pre_ping=True,  # Verifica conexiones antes de usarlas
    pool_recycle=3600,   # Recicla conexiones cada hora
    pool_size=5,         # Tamaño del pool de conexiones
    max_overflow=10      # Máximo de conexiones adicionales
)
Session = scoped_session(sessionmaker(bind=engine))

# Crear tablas si no existen
Base.metadata.create_all(engine)

# Run Python-based migrations inline
print("🔄 Running Python migrations...")
try:
    from sqlalchemy import text
    with engine.connect() as conn:
        # Check if created_by_id column exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tickets' 
            AND column_name = 'created_by_id'
        """))
        
        if result.fetchone():
            print("✓ Column created_by_id already exists")
        else:
            print("🔄 Adding created_by_id column...")
            
            # Add column as nullable
            conn.execute(text("ALTER TABLE tickets ADD COLUMN created_by_id VARCHAR(50)"))
            conn.commit()
            print("✓ Column added")
            
            # Populate with client_id
            conn.execute(text("UPDATE tickets SET created_by_id = client_id WHERE created_by_id IS NULL"))
            conn.commit()
            print("✓ Existing tickets updated")
            
            # Make NOT NULL
            conn.execute(text("ALTER TABLE tickets ALTER COLUMN created_by_id SET NOT NULL"))
            conn.commit()
            print("✓ Column set to NOT NULL")
            
            # Add foreign key
            conn.execute(text("ALTER TABLE tickets ADD CONSTRAINT fk_tickets_created_by FOREIGN KEY (created_by_id) REFERENCES users(user_id)"))
            conn.commit()
            print("✓ Foreign key added")
            
            # Add index
            conn.execute(text("CREATE INDEX idx_tickets_created_by ON tickets(created_by_id)"))
            conn.commit()
            print("✓ Index created")
            
            print("✅ Migration completed: created_by_id field added")
except Exception as e:
    print(f"⚠ Migration warning: {e}")
    # Don't fail startup if migration fails

# Dependency injection para sesión de base de datos
@app.before_request
def before_request():
    from flask import g
    g.db = Session()

@app.teardown_request
def teardown_request(exception=None):
    from flask import g
    db = g.pop('db', None)
    if db is not None:
        db.close()

# Registrar blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(tickets_bp, url_prefix='/api/tickets')
app.register_blueprint(comments_bp, url_prefix='/api/comments')
app.register_blueprint(attachments_bp, url_prefix='/api/attachments')
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
app.register_blueprint(audit_bp, url_prefix='/api/audit')
app.register_blueprint(backup_bp, url_prefix='/api/backup')
app.register_blueprint(settings_bp, url_prefix='/api')
app.register_blueprint(projects_bp, url_prefix='/api/projects')
app.register_blueprint(rating_bp)  # No prefix - uses full path from blueprint
app.register_blueprint(admin_tools_bp, url_prefix='/api/admin')

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Recurso no encontrado'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Error interno del servidor'}), 500

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({'error': 'Archivo demasiado grande. Máximo 50MB'}), 413

# JWT error handlers
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({
        'error': 'Token expirado',
        'message': 'El token de autenticación ha expirado'
    }), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({
        'error': 'Token inválido',
        'message': 'El token de autenticación es inválido'
    }), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({
        'error': 'Token requerido',
        'message': 'Se requiere autenticación para acceder a este recurso'
    }), 401

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Endpoint de verificación de salud del servicio"""
    return jsonify({
        'status': 'healthy',
        'service': 'Green House Project - Sistema de Soporte',
        'version': '1.5.0-qr-history'
    })

# Root endpoint
@app.route('/', methods=['GET'])
def root():
    """Endpoint raíz con información del API"""
    return jsonify({
        'name': 'Green House Project - Sistema de Soporte Post-Venta',
        'version': '1.0.0',
        'description': 'API REST para gestión de tickets de soporte',
        'endpoints': {
            'auth': '/api/auth',
            'tickets': '/api/tickets',
            'comments': '/api/comments',
            'attachments': '/api/attachments',
            'users': '/api/users',
            'dashboard': '/api/dashboard',
            'notifications': '/api/notifications',
            'audit': '/api/audit',
            'health': '/api/health'
        }
    })

# Debug endpoint for notification config
@app.route('/api/debug/notifications', methods=['GET'])
def debug_notifications():
    """Endpoint para verificar configuración de notificaciones"""
    import os
    from services.email_service import email_service
    
    return {
        'email': {
            'enabled': email_service.enabled,
            'smtp_host': email_service.smtp_host,
            'smtp_port': email_service.smtp_port,
            'smtp_user': email_service.smtp_user,
            'from_email': email_service.from_email,
            'from_name': email_service.from_name,
            'env_EMAIL_ENABLED': os.getenv('EMAIL_ENABLED', 'NOT SET'),
            'env_SMTP_USER': os.getenv('SMTP_USER', 'NOT SET')
        },
        'whatsapp': {
            'twilio_configured': bool(os.getenv('TWILIO_ACCOUNT_SID') and os.getenv('TWILIO_AUTH_TOKEN')),
            'twilio_from': os.getenv('TWILIO_WHATSAPP_FROM', 'NOT SET')
        }
    }

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
