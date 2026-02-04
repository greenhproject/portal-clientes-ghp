"""
Rutas de Tickets
Green House Project - Sistema de Soporte
"""

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Ticket, TicketPriority, TicketStatus, TicketHistory, Notification, UserRole
from services.opensolar_service import OpenSolarService
from services.notification_service import NotificationService
from services.email_service_sendgrid import email_service
from services.audit import AuditService, get_request_info
from uuid import uuid4
from datetime import datetime
from sqlalchemy import or_, and_, func

tickets_bp = Blueprint('tickets', __name__)
opensolar_service = OpenSolarService()
notification_service = NotificationService()


def get_available_engineer():
    """
    Obtiene un ingeniero disponible usando distribución equitativa (round-robin)
    Retorna el ingeniero con menos tickets asignados activos
    Fixed: UserRole import added to line 8
    """
    # Obtener todos los ingenieros
    engineers = g.db.query(User).filter(
        User.role == UserRole.ENGINEER,
        User.is_active == True
    ).all()
    
    if not engineers:
        return None
    
    # Contar tickets activos por ingeniero (no cerrados ni resueltos)
    engineer_loads = []
    for engineer in engineers:
        active_tickets = g.db.query(Ticket).filter(
            Ticket.assigned_to == engineer.user_id,
            Ticket.status.in_([TicketStatus.NEW, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.WAITING])
        ).count()
        engineer_loads.append((engineer, active_tickets))
    
    # Ordenar por carga (menos tickets primero)
    engineer_loads.sort(key=lambda x: x[1])
    
    # Retornar el ingeniero con menos carga
    return engineer_loads[0][0] if engineer_loads else None


@tickets_bp.route('/', methods=['POST'])
@jwt_required()
def create_ticket():
    """
    Crear nuevo ticket de soporte
    
    Body:
    {
        "project_id": "8177994",
        "category": "electrical",
        "subcategory": "inverter_not_working",
        "priority": "high",
        "title": "Inversor no enciende",
        "description": "Descripción detallada del problema..."
    }
    """
    try:
        current_user_id = get_jwt_identity()
        user = g.db.query(User).filter_by(user_id=current_user_id).first()
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        data = request.get_json()
        
        # Validar campos requeridos
        required_fields = ['project_id', 'category', 'title', 'description']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo requerido: {field}'}), 400
        
        # Verificar acceso al proyecto (solo para clientes)
        if user.role.value == 'client' and not user.has_project_access(data['project_id']):
            return jsonify({'error': 'No tiene acceso a este proyecto'}), 403
        
        # Determinar el cliente del ticket
        ticket_client_id = current_user_id  # Por defecto, el usuario actual
        opensolar_data = None
        
        # Si admin/ingeniero crea el ticket, buscar/crear cliente desde OpenSolar
        if user.role.value in ['admin', 'engineer']:
            try:
                from services.opensolar_service import OpenSolarService
                opensolar = OpenSolarService()
                opensolar_data = opensolar.get_project_data(data['project_id'])
                
                if opensolar_data and opensolar_data.get('client_email') and opensolar_data['client_email'] != 'N/A':
                    client_email = opensolar_data['client_email'].strip().lower()
                    
                    # Buscar cliente existente por email
                    existing_client = g.db.query(User).filter(
                        User.email == client_email,
                        User.role == UserRole.CLIENT
                    ).first()
                    
                    if existing_client:
                        ticket_client_id = existing_client.user_id
                        print(f'✓ Cliente encontrado: {existing_client.full_name} ({client_email})')
                    else:
                        # Crear nuevo cliente automáticamente
                        from uuid import uuid4
                        import secrets
                        
                        new_client = User(
                            user_id=f"USR-{uuid4().hex[:12].upper()}",
                            email=client_email,
                            password_hash=secrets.token_urlsafe(32),  # Password temporal
                            full_name=opensolar_data.get('client_name', 'Cliente').strip(),
                            phone=opensolar_data.get('client_phone', '').strip() or None,
                            role=UserRole.CLIENT,
                            opensolar_project_ids=[data['project_id']]
                        )
                        g.db.add(new_client)
                        g.db.flush()  # Para obtener el user_id
                        
                        ticket_client_id = new_client.user_id
                        print(f'✓ Nuevo cliente creado: {new_client.full_name} ({client_email})')
                        print(f'  → Deberá iniciar sesión con su email para activar su cuenta')
                else:
                    print(f'⚠ No se pudo obtener email del cliente desde OpenSolar')
                    print(f'  → Ticket quedará asignado al admin/ingeniero temporalmente')
            except Exception as e:
                print(f'⚠ Error al obtener datos de OpenSolar: {str(e)}')
                print(f'  → Ticket quedará asignado al admin/ingeniero temporalmente')
        
        # Generar ticket_id secuencial por proyecto
        # Formato: PROYECTO-NNN (ej: 8360052-001)
        project_ticket_count = g.db.query(Ticket).filter(
            Ticket.project_id == data['project_id']
        ).count()
        ticket_number = str(project_ticket_count + 1).zfill(3)
        ticket_id = f"{data['project_id']}-{ticket_number}"
        
        # Determinar asignación de ingeniero
        assigned_engineer_id = None
        
        if user.role.value in ['admin', 'engineer']:
            # Admin/Ingeniero puede asignar manualmente
            assigned_engineer_id = data.get('assigned_to')
            # Convertir string vacío a None para evitar error de foreign key
            if assigned_engineer_id == '' or assigned_engineer_id == 'null':
                assigned_engineer_id = None
        else:
            # Cliente: asignación automática
            available_engineer = get_available_engineer()
            if available_engineer:
                assigned_engineer_id = available_engineer.user_id
                print(f'✓ Ticket auto-asignado a ingeniero: {available_engineer.full_name}')
            else:
                print('⚠ No hay ingenieros disponibles para auto-asignación')
        
        # Crear ticket
        now = datetime.utcnow()
        ticket = Ticket(
            ticket_id=ticket_id,
            project_id=data['project_id'],
            client_id=ticket_client_id,
            created_by_id=current_user_id,
            assigned_to=assigned_engineer_id,
            category=data['category'],
            subcategory=data.get('subcategory'),
            priority=TicketPriority(data.get('priority', 'medium')),
            title=data['title'].strip(),
            description=data['description'].strip(),
            opensolar_data=opensolar_data,
            created_at=now,  # Initialize created_at before SLA calculation
            assigned_at=now if assigned_engineer_id else None,  # Set assigned_at if engineer assigned
            status=TicketStatus.ASSIGNED if assigned_engineer_id else TicketStatus.NEW  # Set correct status
        )
        
        # Calcular SLA deadlines
        sla_config = get_sla_config(ticket.priority.value)
        ticket.calculate_sla_deadlines(sla_config)
        
        g.db.add(ticket)
        
        # Crear entrada en historial
        history = TicketHistory.create_entry(
            ticket_id=ticket.ticket_id,
            user_id=current_user_id,
            action='ticket_created',
            extra_data={'priority': ticket.priority.value, 'category': ticket.category}
        )
        g.db.add(history)
        
        g.db.commit()
        
        # Registrar en auditoría - TEMPORALMENTE DESHABILITADO (tabla eliminada)
        # ip_address, user_agent = get_request_info(request)
        # AuditService.log_action(
        #     user_id=current_user_id,
        #     action='CREATE',
        #     entity_type='ticket',
        #     entity_id=ticket.ticket_id,
        #     details={
        #         'title': ticket.title,
        #         'category': ticket.category,
        #         'priority': ticket.priority.value,
        #         'assigned_to': ticket.assigned_to
        #     },
        #     ip_address=ip_address,
        #     user_agent=user_agent
        # )
        print(f'⚠ Audit logging disabled (table dropped)')
        
        # Enviar notificaciones en thread separado (no bloqueante)
        # Extraer datos antes del thread para evitar problemas con SQLAlchemy session
        
        # Obtener datos del CLIENTE REAL del ticket (no del creador)
        actual_client = g.db.query(User).filter(User.user_id == ticket_client_id).first()
        client_name = actual_client.full_name if actual_client else 'Cliente'
        client_email = actual_client.email if actual_client else None
        client_phone = actual_client.phone if actual_client else None
        
        # Obtener datos del ingeniero asignado
        engineer_phone = None
        engineer_name = None
        if assigned_engineer_id:
            engineer = g.db.query(User).filter(User.user_id == assigned_engineer_id).first()
            if engineer:
                engineer_phone = engineer.phone
                engineer_name = engineer.full_name
        
        notification_data = {
            'ticket_id': ticket.ticket_id,
            'ticket_title': ticket.title,
            'client_name': client_name,
            'client_email': client_email,
            'client_phone': client_phone,
            'priority': ticket.priority if isinstance(ticket.priority, str) else ticket.priority.value,
            'category': ticket.category,
            'description': ticket.description,
            'assigned_to_id': ticket.assigned_to,
            'project_id': ticket.project_id,
            'engineer_phone': engineer_phone,
            'engineer_name': engineer_name
        }
        
        def send_notifications_async(data):
            try:
                # Enviar email al cliente
                email_service.send_ticket_created_notification(
                    ticket_id=data['ticket_id'],
                    ticket_title=data['ticket_title'],
                    client_name=data['client_name'],
                    client_email=data['client_email'],
                    priority=data['priority'],
                    category=data['category'],
                    description=data['description']
                )
                print(f"[EMAIL] Notificación enviada para ticket {data['ticket_id']}")
                
                # Enviar WhatsApp al ingeniero si está asignado y es prioridad alta/crítica
                from services.notification_service import NotificationService
                notification_service = NotificationService()
                
                if data.get('engineer_phone') and data['priority'] in ['high', 'critical']:
                    # WhatsApp al ingeniero
                    notification_service.send_whatsapp(
                        to=data['engineer_phone'],
                        message=f"""🔔 *Nuevo ticket asignado*

📋 Ticket: {data['ticket_id']}
📝 Título: {data['ticket_title']}
⚡ Prioridad: {data['priority'].upper()}
🏠 Proyecto: {data['project_id']}
👤 Cliente: {data['client_name']}

Revisa los detalles en el sistema de soporte."""
                    )
                    print(f"[WHATSAPP] Notificación enviada a ingeniero {data['engineer_name']} ({data['engineer_phone']})")
                
                # Enviar WhatsApp al cliente si tiene teléfono
                if data.get('client_phone'):
                    # WhatsApp al cliente
                    notification_service.send_whatsapp(
                        to=data['client_phone'],
                        message=f"""🔔 *Ticket de soporte creado*

📋 Ticket: {data['ticket_id']}
📝 Título: {data['ticket_title']}
⚡ Prioridad: {data['priority'].upper()}
🏠 Proyecto: {data['project_id']}

Hemos recibido tu solicitud y estamos trabajando en ella.
Te mantendremos informado del progreso.

Green House Project - Soporte Técnico"""
                    )
                    print(f"[WHATSAPP] Notificación enviada a cliente {data['client_name']} ({data['client_phone']})")
                        
            except Exception as e:
                print(f"[NOTIFICATIONS] Error: {e}")
                import traceback
                traceback.print_exc()
                # No fallar el ticket si las notificaciones fallan
                pass
        
        # Ejecutar en thread separado
        import threading
        notification_thread = threading.Thread(target=send_notifications_async, args=(notification_data,), daemon=True)
        notification_thread.start()
        
        return jsonify({
            'message': 'Ticket creado exitosamente',
            'ticket': ticket.to_dict(include_relations=True)
        }), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"ERROR COMPLETO AL CREAR TICKET: {error_details}")
        g.db.rollback()
        return jsonify({'error': 'Error al crear ticket', 'details': str(e), 'traceback': error_details}), 500


@tickets_bp.route('/', methods=['GET'])
@jwt_required()
def list_tickets():
    """
    Listar tickets con filtros
    
    Query params:
    - status: Estado del ticket (new, assigned, in_progress, etc.)
    - priority: Prioridad (low, medium, high, critical)
    - category: Categoría del problema
    - assigned_to: ID del ingeniero asignado
    - client_id: ID del cliente (solo para admins/engineers)
    - project_id: ID del proyecto
    - page: Número de página (default: 1)
    - per_page: Tickets por página (default: 20)
    """
    try:
        current_user_id = get_jwt_identity()
        user = g.db.query(User).filter_by(user_id=current_user_id).first()
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # Construir query base
        query = g.db.query(Ticket)
        
        # Filtrar según rol
        if user.role.value == 'client':
            query = query.filter(Ticket.client_id == current_user_id)
        elif user.role.value == 'engineer':
            # Ingenieros ven tickets asignados a ellos o sin asignar
            if request.args.get('view') == 'all':
                pass  # Ver todos
            else:
                query = query.filter(
                    or_(
                        Ticket.assigned_to == current_user_id,
                        Ticket.assigned_to == None
                    )
                )
        
        # Aplicar filtros
        if 'status' in request.args:
            query = query.filter(Ticket.status == TicketStatus(request.args['status']))
        
        if 'priority' in request.args:
            query = query.filter(Ticket.priority == TicketPriority(request.args['priority']))
        
        if 'category' in request.args:
            query = query.filter(Ticket.category == request.args['category'])
        
        if 'assigned_to' in request.args:
            query = query.filter(Ticket.assigned_to == request.args['assigned_to'])
        
        if 'client_id' in request.args and user.role.value in ['engineer', 'admin']:
            query = query.filter(Ticket.client_id == request.args['client_id'])
        
        if 'project_id' in request.args:
            query = query.filter(Ticket.project_id == request.args['project_id'])
        
        # Búsqueda por texto (ID, cliente, email, título, descripción)
        if 'search' in request.args:
            search_term = f"%{request.args['search']}%"
            query = query.join(User, Ticket.client_id == User.user_id)
            query = query.filter(
                or_(
                    Ticket.ticket_id.ilike(search_term),
                    Ticket.title.ilike(search_term),
                    Ticket.description.ilike(search_term),
                    Ticket.project_id.ilike(search_term),
                    User.full_name.ilike(search_term),
                    User.email.ilike(search_term)
                )
            )
        
        # Filtro por rango de fechas
        if 'date_from' in request.args:
            date_from = datetime.fromisoformat(request.args['date_from'])
            query = query.filter(Ticket.created_at >= date_from)
        
        if 'date_to' in request.args:
            date_to = datetime.fromisoformat(request.args['date_to'])
            query = query.filter(Ticket.created_at <= date_to)
        
        # Ordenamiento
        order_by = request.args.get('order_by', 'created_at')
        order_dir = request.args.get('order_dir', 'desc')
        
        if order_by == 'created_at':
            order_field = Ticket.created_at
        elif order_by == 'updated_at':
            order_field = Ticket.updated_at
        elif order_by == 'priority':
            order_field = Ticket.priority
        elif order_by == 'status':
            order_field = Ticket.status
        else:
            order_field = Ticket.created_at
        
        if order_dir == 'asc':
            query = query.order_by(order_field.asc())
        else:
            query = query.order_by(order_field.desc())
        
        # Paginación
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        total = query.count()
        tickets = query.limit(per_page).offset((page - 1) * per_page).all()
        
        return jsonify({
            'tickets': [ticket.to_dict(include_relations=True) for ticket in tickets],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Error al listar tickets', 'details': str(e)}), 500


@tickets_bp.route('/<ticket_id>', methods=['GET'])
@jwt_required()
def get_ticket(ticket_id):
    """
    Obtener detalles de un ticket específico
    """
    try:
        current_user_id = get_jwt_identity()
        user = g.db.query(User).filter_by(user_id=current_user_id).first()
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        ticket = g.db.query(Ticket).filter_by(ticket_id=ticket_id).first()
        
        if not ticket:
            return jsonify({'error': 'Ticket no encontrado'}), 404
        
        # Verificar permisos
        if not user.can_view_ticket(ticket):
            return jsonify({'error': 'No tiene permisos para ver este ticket'}), 403
        
        return jsonify({
            'ticket': ticket.to_dict(include_relations=True)
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Error al obtener ticket', 'details': str(e)}), 500


@tickets_bp.route('/<ticket_id>', methods=['PATCH'])
@jwt_required()
def update_ticket(ticket_id):
    """
    Actualizar ticket
    
    Body puede incluir:
    {
        "title": "Nuevo título",
        "description": "Nueva descripción",
        "priority": "high",
        "category": "electrical",
        "subcategory": "inverter_not_working"
    }
    """
    try:
        current_user_id = get_jwt_identity()
        user = g.db.query(User).filter_by(user_id=current_user_id).first()
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        ticket = g.db.query(Ticket).filter_by(ticket_id=ticket_id).first()
        
        if not ticket:
            return jsonify({'error': 'Ticket no encontrado'}), 404
        
        # Verificar permisos
        if not user.can_edit_ticket(ticket):
            return jsonify({'error': 'No tiene permisos para editar este ticket'}), 403
        
        data = request.get_json()
        
        # Actualizar campos permitidos
        if 'title' in data and user.role.value in ['client', 'admin']:
            old_value = ticket.title
            ticket.title = data['title'].strip()
            create_history_entry(ticket.ticket_id, current_user_id, 'field_updated', 'title', old_value, ticket.title)
        
        if 'description' in data and user.role.value in ['client', 'admin']:
            old_value = ticket.description
            ticket.description = data['description'].strip()
            create_history_entry(ticket.ticket_id, current_user_id, 'field_updated', 'description', old_value, ticket.description)
        
        if 'priority' in data and user.role.value in ['engineer', 'admin']:
            old_value = ticket.priority.value
            ticket.priority = TicketPriority(data['priority'])
            create_history_entry(ticket.ticket_id, current_user_id, 'priority_changed', 'priority', old_value, ticket.priority.value)
            
            # Recalcular SLA
            sla_config = get_sla_config(ticket.priority.value)
            ticket.calculate_sla_deadlines(sla_config)
        
        if 'category' in data and user.role.value in ['engineer', 'admin']:
            old_value = ticket.category
            ticket.category = data['category']
            if 'subcategory' in data:
                ticket.subcategory = data['subcategory']
            create_history_entry(ticket.ticket_id, current_user_id, 'category_changed', 'category', old_value, ticket.category)
        
        g.db.commit()
        
        # Registrar en auditoría
        ip_address, user_agent = get_request_info(request)
        AuditService.log_action(
            user_id=current_user_id,
            action='UPDATE',
            entity_type='ticket',
            entity_id=ticket_id,
            details={'updated_fields': list(data.keys())},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return jsonify({
            'message': 'Ticket actualizado exitosamente',
            'ticket': ticket.to_dict(include_relations=True)
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        g.db.rollback()
        return jsonify({'error': 'Error al actualizar ticket', 'details': str(e)}), 500


@tickets_bp.route('/<ticket_id>/assign', methods=['POST'])
@jwt_required()
def assign_ticket(ticket_id):
    """
    Asignar ticket a un ingeniero
    
    Body:
    {
        "engineer_id": "USR-XXXXX"
    }
    """
    try:
        current_user_id = get_jwt_identity()
        user = g.db.query(User).filter_by(user_id=current_user_id).first()
        
        if not user or user.role.value not in ['engineer', 'admin']:
            return jsonify({'error': 'No tiene permisos para asignar tickets'}), 403
        
        ticket = g.db.query(Ticket).filter_by(ticket_id=ticket_id).first()
        
        if not ticket:
            return jsonify({'error': 'Ticket no encontrado'}), 404
        
        data = request.get_json()
        engineer_id = data.get('engineer_id')
        
        if not engineer_id:
            return jsonify({'error': 'ID de ingeniero requerido'}), 400
        
        engineer = g.db.query(User).filter_by(user_id=engineer_id).first()
        
        if not engineer or engineer.role.value != 'engineer':
            return jsonify({'error': 'Ingeniero no encontrado'}), 404
        
        old_engineer = ticket.assigned_to
        ticket.assign_to_engineer(engineer_id)
        
        # Crear entrada en historial
        create_history_entry(
            ticket.ticket_id,
            current_user_id,
            'ticket_assigned',
            'assigned_to',
            old_engineer,
            engineer_id
        )
        
        g.db.commit()
        
        # Notificar al ingeniero
        notification_service.notify_ticket_assigned(ticket, engineer)
        
        # Enviar email al ingeniero
        try:
            client = g.db.query(User).filter_by(user_id=ticket.client_id).first()
            email_service.send_assignment_notification(
                ticket_id=ticket.ticket_id,
                ticket_title=ticket.title,
                engineer_email=engineer.email,
                engineer_name=engineer.full_name,
                priority=ticket.priority.value,
                category=ticket.category,
                client_name=client.full_name if client else 'N/A'
            )
        except Exception as e:
            print(f"Error sending email: {e}")
        
        return jsonify({
            'message': 'Ticket asignado exitosamente',
            'ticket': ticket.to_dict(include_relations=True)
        }), 200
        
    except Exception as e:
        g.db.rollback()
        return jsonify({'error': 'Error al asignar ticket', 'details': str(e)}), 500


@tickets_bp.route('/<ticket_id>/status', methods=['POST'])
@jwt_required()
def change_ticket_status(ticket_id):
    """
    Cambiar estado del ticket
    
    Body:
    {
        "status": "in_progress",
        "notes": "Notas opcionales sobre el cambio"
    }
    """
    try:
        current_user_id = get_jwt_identity()
        user = g.db.query(User).filter_by(user_id=current_user_id).first()
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        ticket = g.db.query(Ticket).filter_by(ticket_id=ticket_id).first()
        
        if not ticket:
            return jsonify({'error': 'Ticket no encontrado'}), 404
        
        # Verificar permisos
        if user.role.value == 'client' and request.json.get('status') not in ['waiting', 'closed']:
            return jsonify({'error': 'No tiene permisos para cambiar a este estado'}), 403
        
        data = request.get_json()
        new_status = TicketStatus(data['status'])
        
        old_status = ticket.change_status(new_status)
        
        # Crear entrada en historial
        create_history_entry(
            ticket.ticket_id,
            current_user_id,
            'status_changed',
            'status',
            old_status.value,
            new_status.value,
            {'notes': data.get('notes')}
        )
        
        g.db.commit()
        
        # Notificar cambio de estado
        notification_service.notify_status_changed(ticket, old_status.value, new_status.value)
        
        # Enviar email al cliente
        try:
            client = g.db.query(User).filter_by(user_id=ticket.client_id).first()
            if client:
                email_service.send_status_change_notification(
                    ticket_id=ticket.ticket_id,
                    ticket_title=ticket.title,
                    old_status=old_status.value,
                    new_status=new_status.value,
                    client_email=client.email,
                    client_name=client.full_name,
                    changed_by=user.full_name
                )
        except Exception as e:
            print(f"Error sending email: {e}")
        
        return jsonify({
            'message': 'Estado actualizado exitosamente',
            'ticket': ticket.to_dict(include_relations=True)
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        g.db.rollback()
        return jsonify({'error': 'Error al cambiar estado', 'details': str(e)}), 500


@tickets_bp.route('/<ticket_id>/resolve', methods=['POST'])
@jwt_required()
def resolve_ticket(ticket_id):
    """
    Resolver ticket
    
    Body:
    {
        "resolution_notes": "Descripción de la solución aplicada"
    }
    """
    try:
        current_user_id = get_jwt_identity()
        user = g.db.query(User).filter_by(user_id=current_user_id).first()
        
        if not user or user.role.value not in ['engineer', 'admin']:
            return jsonify({'error': 'No tiene permisos para resolver tickets'}), 403
        
        ticket = g.db.query(Ticket).filter_by(ticket_id=ticket_id).first()
        
        if not ticket:
            return jsonify({'error': 'Ticket no encontrado'}), 404
        
        data = request.get_json()
        
        if not data.get('resolution_notes'):
            return jsonify({'error': 'Notas de resolución requeridas'}), 400
        
        ticket.resolution_notes = data['resolution_notes']
        old_status = ticket.change_status(TicketStatus.RESOLVED)
        
        # Crear entrada en historial
        create_history_entry(
            ticket.ticket_id,
            current_user_id,
            'ticket_resolved',
            'status',
            old_status.value,
            'resolved'
        )
        
        g.db.commit()
        
        # Notificar resolución
        notification_service.notify_ticket_resolved(ticket)
        
        return jsonify({
            'message': 'Ticket resuelto exitosamente',
            'ticket': ticket.to_dict(include_relations=True)
        }), 200
        
    except Exception as e:
        g.db.rollback()
        return jsonify({'error': 'Error al resolver ticket', 'details': str(e)}), 500


@tickets_bp.route('/<ticket_id>/close', methods=['POST'])
@jwt_required()
def close_ticket(ticket_id):
    """
    Cerrar ticket
    
    Body:
    {
        "rating": 5,  // 1-5
        "rating_comment": "Excelente servicio"
    }
    """
    try:
        current_user_id = get_jwt_identity()
        user = g.db.query(User).filter_by(user_id=current_user_id).first()
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        ticket = g.db.query(Ticket).filter_by(ticket_id=ticket_id).first()
        
        if not ticket:
            return jsonify({'error': 'Ticket no encontrado'}), 404
        
        # Solo el cliente o admin pueden cerrar
        if user.role.value == 'client' and ticket.client_id != current_user_id:
            return jsonify({'error': 'No tiene permisos para cerrar este ticket'}), 403
        
        if user.role.value not in ['client', 'admin']:
            return jsonify({'error': 'No tiene permisos para cerrar tickets'}), 403
        
        data = request.get_json()
        
        # Establecer calificación si se proporciona
        if 'rating' in data:
            ticket.set_rating(data['rating'], data.get('rating_comment'))
        
        old_status = ticket.change_status(TicketStatus.CLOSED)
        
        # Crear entrada en historial
        create_history_entry(
            ticket.ticket_id,
            current_user_id,
            'ticket_closed',
            'status',
            old_status.value,
            'closed',
            {'rating': data.get('rating')}
        )
        
        g.db.commit()
        
        return jsonify({
            'message': 'Ticket cerrado exitosamente',
            'ticket': ticket.to_dict(include_relations=True)
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        g.db.rollback()
        return jsonify({'error': 'Error al cerrar ticket', 'details': str(e)}), 500


@tickets_bp.route('/<ticket_id>/history', methods=['GET'])
@jwt_required()
def get_ticket_history(ticket_id):
    """
    Obtener historial de cambios del ticket
    """
    try:
        current_user_id = get_jwt_identity()
        user = g.db.query(User).filter_by(user_id=current_user_id).first()
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        ticket = g.db.query(Ticket).filter_by(ticket_id=ticket_id).first()
        
        if not ticket:
            return jsonify({'error': 'Ticket no encontrado'}), 404
        
        if not user.can_view_ticket(ticket):
            return jsonify({'error': 'No tiene permisos para ver este ticket'}), 403
        
        history = g.db.query(TicketHistory).filter_by(ticket_id=ticket_id).order_by(TicketHistory.created_at.desc()).all()
        
        return jsonify({
            'history': [entry.to_dict() for entry in history]
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Error al obtener historial', 'details': str(e)}), 500


# Funciones auxiliares

def get_sla_config(priority):
    """Obtiene configuración de SLA para una prioridad"""
    sla_configs = {
        'critical': {'response_time_hours': 1, 'resolution_time_hours': 4},
        'high': {'response_time_hours': 4, 'resolution_time_hours': 24},
        'medium': {'response_time_hours': 8, 'resolution_time_hours': 72},
        'low': {'response_time_hours': 24, 'resolution_time_hours': 168}
    }
    return sla_configs.get(priority, sla_configs['medium'])


@tickets_bp.route('/<ticket_id>/rate', methods=['POST'])
@jwt_required()
def rate_ticket(ticket_id):
    """
    Calificar ticket resuelto
    Solo clientes pueden calificar
    Solo tickets en estado RESOLVED o CLOSED
    
    Body:
    {
        "rating": 5,  // 1-5 (requerido)
        "rating_comment": "Excelente servicio" // opcional
    }
    """
    try:
        current_user_id = get_jwt_identity()
        user = g.db.query(User).filter_by(user_id=current_user_id).first()
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # Solo clientes pueden calificar
        if user.role.value != 'client':
            return jsonify({'error': 'Solo los clientes pueden calificar tickets'}), 403
        
        ticket = g.db.query(Ticket).filter_by(ticket_id=ticket_id).first()
        
        if not ticket:
            return jsonify({'error': 'Ticket no encontrado'}), 404
        
        # Verificar que el ticket pertenece al cliente
        if ticket.client_id != current_user_id:
            return jsonify({'error': 'No tiene permisos para calificar este ticket'}), 403
        
        # Solo se pueden calificar tickets resueltos o cerrados
        if ticket.status not in [TicketStatus.RESOLVED, TicketStatus.CLOSED]:
            return jsonify({'error': 'Solo se pueden calificar tickets resueltos o cerrados'}), 400
        
        # Verificar que no haya sido calificado previamente
        if ticket.rating is not None:
            return jsonify({'error': 'Este ticket ya ha sido calificado'}), 400
        
        data = request.get_json()
        
        if 'rating' not in data:
            return jsonify({'error': 'El campo rating es requerido'}), 400
        
        rating = data['rating']
        rating_comment = data.get('rating_comment')
        
        # Validar rating
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            return jsonify({'error': 'El rating debe ser un número entre 1 y 5'}), 400
        
        # Establecer calificación
        ticket.set_rating(rating, rating_comment)
        
        # Crear entrada en historial
        create_history_entry(
            ticket.ticket_id,
            current_user_id,
            'ticket_rated',
            'rating',
            None,
            str(rating),
            {'rating': rating, 'comment': rating_comment}
        )
        
        g.db.commit()
        
        # Registrar en auditoría
        ip_address, user_agent = get_request_info(request)
        AuditService.log_action(
            user_id=current_user_id,
            action='UPDATE',
            entity_type='ticket',
            entity_id=ticket_id,
            details={'rating': rating, 'comment': rating_comment},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return jsonify({
            'message': 'Ticket calificado exitosamente',
            'ticket_id': ticket.ticket_id,
            'rating': ticket.rating,
            'rating_comment': ticket.rating_comment
        }), 200
        
    except ValueError as e:
        g.db.rollback()
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        g.db.rollback()
        return jsonify({'error': 'Error al calificar ticket', 'details': str(e)}), 500


@tickets_bp.route('/<ticket_id>', methods=['DELETE'])
@jwt_required()
def delete_ticket(ticket_id):
    """
    Eliminar ticket (solo administradores)
    """
    try:
        current_user_id = get_jwt_identity()
        user = g.db.query(User).filter_by(user_id=current_user_id).first()
        
        if not user or user.role.value != 'admin':
            return jsonify({'error': 'No tiene permisos para eliminar tickets'}), 403
        
        ticket = g.db.query(Ticket).filter_by(ticket_id=ticket_id).first()
        
        if not ticket:
            return jsonify({'error': 'Ticket no encontrado'}), 404
        
        # Guardar información del ticket antes de eliminarlo
        ticket_info = {
            'ticket_id': ticket.ticket_id,
            'title': ticket.title,
            'client_id': ticket.client_id
        }
        
        # Eliminar ticket (cascade eliminará comentarios, archivos, historial, etc.)
        g.db.delete(ticket)
        g.db.commit()
        
        # Registrar en auditoría
        ip_address, user_agent = get_request_info(request)
        AuditService.log_action(
            user_id=current_user_id,
            action='DELETE',
            entity_type='ticket',
            entity_id=ticket_id,
            details=ticket_info,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return jsonify({
            'message': 'Ticket eliminado exitosamente',
            'ticket': ticket_info
        }), 200
        
    except Exception as e:
        g.db.rollback()
        return jsonify({'error': 'Error al eliminar ticket', 'details': str(e)}), 500


def create_history_entry(ticket_id, user_id, action, field=None, old_value=None, new_value=None, metadata=None):
    """Crea una entrada en el historial del ticket"""
    history = TicketHistory.create_entry(
        ticket_id=ticket_id,
        user_id=user_id,
        action=action,
        field_changed=field,
        old_value=old_value,
        new_value=new_value,
        extra_data=metadata  # Changed from metadata to extra_data
    )
    g.db.add(history)



@tickets_bp.route('/<ticket_id>/rating', methods=['GET'])
def get_ticket_rating_info(ticket_id):
    """
    Obtener información de calificación del ticket (público)
    Permite verificar si un ticket puede ser calificado
    
    Returns:
    {
        "ticket_id": "8177994-001",
        "rating": 5,  // null si no ha sido calificado
        "rating_comment": "...",  // null si no hay comentario
        "can_rate": true  // false si ya fue calificado o no está resuelto
    }
    """
    try:
        ticket = g.db.query(Ticket).filter_by(ticket_id=ticket_id).first()
        
        if not ticket:
            return jsonify({'error': 'Ticket no encontrado'}), 404
        
        # Verificar si puede ser calificado
        can_rate = (
            ticket.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED] and
            ticket.rating is None
        )
        
        return jsonify({
            'ticket_id': ticket.ticket_id,
            'rating': ticket.rating,
            'rating_comment': ticket.rating_comment,
            'can_rate': can_rate
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Error al obtener información del ticket', 'details': str(e)}), 500


@tickets_bp.route('/<ticket_id>/rate', methods=['POST'])
def rate_ticket_public(ticket_id):
    """
    Calificar ticket resuelto (público - sin autenticación)
    Solo tickets en estado RESOLVED o CLOSED
    Solo puede calificarse una vez
    
    Body:
    {
        "rating": 5,  // 1-5 (requerido)
        "comment": "Excelente servicio" // opcional
    }
    """
    try:
        ticket = g.db.query(Ticket).filter_by(ticket_id=ticket_id).first()
        
        if not ticket:
            return jsonify({'error': 'Ticket no encontrado'}), 404
        
        # Verificar que el ticket esté resuelto o cerrado
        if ticket.status not in [TicketStatus.RESOLVED, TicketStatus.CLOSED]:
            return jsonify({'error': 'Solo se pueden calificar tickets resueltos o cerrados'}), 400
        
        # Verificar que no haya sido calificado previamente
        if ticket.rating is not None:
            return jsonify({'error': 'Este ticket ya ha sido calificado'}), 400
        
        data = request.get_json()
        
        if 'rating' not in data:
            return jsonify({'error': 'El campo rating es requerido'}), 400
        
        rating = data['rating']
        rating_comment = data.get('comment')  # Note: using 'comment' not 'rating_comment'
        
        # Validar rating
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            return jsonify({'error': 'El rating debe ser un número entre 1 y 5'}), 400
        
        # Establecer calificación
        ticket.set_rating(rating, rating_comment)
        
        # Crear entrada en historial (sin user_id ya que es público)
        create_history_entry(
            ticket.ticket_id,
            ticket.client_id,  # Use client_id as the user who rated
            'ticket_rated',
            'rating',
            None,
            str(rating),
            {'rating': rating, 'comment': rating_comment, 'public_rating': True}
        )
        
        g.db.commit()
        
        return jsonify({
            'message': 'Gracias por tu calificación',
            'ticket_id': ticket.ticket_id,
            'rating': ticket.rating
        }), 200
        
    except ValueError as e:
        g.db.rollback()
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        g.db.rollback()
        return jsonify({'error': 'Error al calificar ticket', 'details': str(e)}), 500



@tickets_bp.route('/<ticket_id>/rate-quick/<int:rating>', methods=['GET'])
def rate_ticket_quick(ticket_id, rating):
    """
    Calificación rápida desde email (one-click)
    Redirige al frontend después de calificar
    """
    try:
        ticket = g.db.query(Ticket).filter_by(ticket_id=ticket_id).first()
        
        if not ticket:
            return "Ticket no encontrado", 404
        
        # Si ya está calificado, redirigir a página de agradecimiento
        if ticket.rating is not None:
            return redirect(f"https://soporte-frontend-ghp.vercel.app/rate/{ticket_id}?already_rated=true")
            
        # Verificar estado
        if ticket.status not in [TicketStatus.RESOLVED, TicketStatus.CLOSED]:
            return redirect(f"https://soporte-frontend-ghp.vercel.app/rate/{ticket_id}?error=status")
            
        # Validar rating
        if rating < 1 or rating > 5:
            return "Rating inválido", 400
            
        # Guardar calificación
        ticket.set_rating(rating, None)
        
        # Historial
        create_history_entry(
            ticket.ticket_id,
            ticket.client_id,
            'ticket_rated',
            'rating',
            None,
            str(rating),
            {'rating': rating, 'source': 'email_quick_link'}
        )
        
        g.db.commit()
        
        # Redirigir al frontend para pedir comentario opcional o mostrar agradecimiento
        return redirect(f"https://soporte-frontend-ghp.vercel.app/rate/{ticket_id}?rated={rating}")
        
    except Exception as e:
        g.db.rollback()
        print(f"Error en quick rating: {str(e)}")
        return redirect(f"https://soporte-frontend-ghp.vercel.app/rate/{ticket_id}?error=server")
