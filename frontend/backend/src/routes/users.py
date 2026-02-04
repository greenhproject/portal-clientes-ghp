"""
Rutas de Usuarios
Green House Project - Sistema de Soporte
"""

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Ticket, TicketStatus, UserRole
from sqlalchemy import func, desc
from datetime import datetime, timedelta

users_bp = Blueprint('users', __name__)

@users_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Obtener datos del usuario actual"""
    try:
        current_user_id = get_jwt_identity()
        user = g.db.query(User).filter_by(user_id=current_user_id).first()
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
            
        return jsonify(user.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': 'Error al obtener usuario', 'details': str(e)}), 500

@users_bp.route('/me/performance', methods=['GET'])
@jwt_required()
def get_performance_metrics():
    """
    Obtener métricas de desempeño del ingeniero actual
    Incluye:
    - Calificación promedio
    - Total de calificaciones
    - Bono estimado
    - Desglose de calificaciones
    - Calificaciones recientes
    """
    try:
        current_user_id = get_jwt_identity()
        user = g.db.query(User).filter_by(user_id=current_user_id).first()
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
            
        if user.role != UserRole.ENGINEER and user.role != UserRole.ADMIN:
            return jsonify({'error': 'Solo ingenieros tienen métricas de desempeño'}), 403
            
        # Obtener tickets resueltos/cerrados asignados al ingeniero que tienen calificación
        rated_tickets = g.db.query(Ticket).filter(
            Ticket.assigned_to == current_user_id,
            Ticket.rating.isnot(None)
        ).all()
        
        total_ratings = len(rated_tickets)
        
        if total_ratings == 0:
            return jsonify({
                'average_rating': 0,
                'total_ratings': 0,
                'bonus_amount': 0,
                'tickets_resolved': 0,
                'ratings_breakdown': {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
                'recent_ratings': []
            }), 200
            
        # Calcular promedio
        total_score = sum(t.rating for t in rated_tickets)
        average_rating = total_score / total_ratings
        
        # Configuración de bono
        BASE_BONUS_PER_TICKET = 10000  # Base por ticket
        OVERTIME_MULTIPLIER = 1.5      # Multiplicador por horario extra
        
        bonus_amount = 0
        
        for t in rated_tickets:
            # Calcular bono base por calificación
            ticket_bonus = (t.rating / 5) * BASE_BONUS_PER_TICKET
            
            # Verificar si fue atendido en horario extra
            # Horario laboral: Lunes-Viernes 8am-5pm, Sábado 8am-12pm
            is_overtime = False
            
            # Usar resolved_at o updated_at como referencia del trabajo realizado
            work_time = t.resolved_at or t.updated_at
            
            if work_time:
                # Ajustar a zona horaria local si es necesario (asumiendo UTC por ahora)
                # TODO: Configurar timezone correcta
                
                weekday = work_time.weekday() # 0=Lunes, 6=Domingo
                hour = work_time.hour
                
                if weekday == 6: # Domingo
                    is_overtime = True
                elif weekday == 5: # Sábado
                    if hour < 8 or hour >= 12:
                        is_overtime = True
                else: # Lunes a Viernes
                    if hour < 8 or hour >= 17:
                        is_overtime = True
            
            if is_overtime:
                ticket_bonus *= OVERTIME_MULTIPLIER
                
            bonus_amount += ticket_bonus
        
        # Desglose por estrellas
        breakdown = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for t in rated_tickets:
            if t.rating in breakdown:
                breakdown[t.rating] += 1
                
        # Tickets resueltos este mes
        now = datetime.utcnow()
        start_of_month = datetime(now.year, now.month, 1)
        tickets_resolved_month = g.db.query(Ticket).filter(
            Ticket.assigned_to == current_user_id,
            Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED]),
            Ticket.updated_at >= start_of_month
        ).count()
        
        # Calificaciones recientes (últimas 10)
        recent_tickets = g.db.query(Ticket).filter(
            Ticket.assigned_to == current_user_id,
            Ticket.rating.isnot(None)
        ).order_by(desc(Ticket.updated_at)).limit(10).all()
        
        recent_ratings = []
        for t in recent_tickets:
            client_name = "Cliente"
            if t.client_id:
                client = g.db.query(User).filter_by(user_id=t.client_id).first()
                if client:
                    client_name = client.full_name
            
            recent_ratings.append({
                'ticket_id': t.ticket_id,
                'rating': t.rating,
                'comment': t.rating_comment,
                'created_at': t.updated_at.isoformat() if t.updated_at else None,
                'client_name': client_name
            })
            
        return jsonify({
            'average_rating': round(average_rating, 2),
            'total_ratings': total_ratings,
            'bonus_amount': round(bonus_amount, 2),
            'tickets_resolved': tickets_resolved_month,
            'ratings_breakdown': breakdown,
            'recent_ratings': recent_ratings
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Error al obtener métricas', 'details': str(e)}), 500
