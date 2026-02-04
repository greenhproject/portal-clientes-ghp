"""
Admin Tools - Herramientas administrativas
Green House Project - Sistema de Soporte
"""

from flask import Blueprint, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Ticket, TicketHistory, TicketStatus
from datetime import timedelta

admin_tools_bp = Blueprint('admin_tools', __name__)


def admin_required(f):
    """Decorador para requerir rol de administrador"""
    from functools import wraps
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = g.db.query(User).filter_by(user_id=current_user_id).first()
        if not user or user.role.value != 'admin':
            return jsonify({'error': 'Se requiere rol de administrador'}), 403
        return f(user, *args, **kwargs)
    return decorated_function


@admin_tools_bp.route('/fix-timestamps', methods=['POST'])
@admin_required
def fix_timestamps(current_user):
    """
    Corrige los timestamps faltantes en los tickets existentes.
    Establece assigned_at y resolved_at basándose en el historial o fechas de fallback.
    """
    try:
        tickets = g.db.query(Ticket).all()
        updated_count = 0
        details = []
        
        for ticket in tickets:
            updated = False
            ticket_details = {'ticket_id': ticket.ticket_id, 'changes': []}
            
            # Corregir assigned_at si está vacío pero el ticket está asignado
            if ticket.assigned_to and not ticket.assigned_at:
                # Buscar en el historial cuándo fue asignado
                history_entry = g.db.query(TicketHistory).filter(
                    TicketHistory.ticket_id == ticket.ticket_id,
                    TicketHistory.action == 'ticket_assigned'
                ).order_by(TicketHistory.created_at.asc()).first()
                
                if history_entry:
                    ticket.assigned_at = history_entry.created_at
                    ticket_details['changes'].append(f'assigned_at desde historial: {history_entry.created_at}')
                else:
                    # Usar created_at + 1 hora como fallback
                    ticket.assigned_at = ticket.created_at + timedelta(hours=1)
                    ticket_details['changes'].append(f'assigned_at fallback: {ticket.assigned_at}')
                updated = True
            
            # Corregir resolved_at si está vacío pero el ticket está resuelto/cerrado
            if ticket.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED] and not ticket.resolved_at:
                # Buscar en el historial cuándo fue resuelto
                history_entry = g.db.query(TicketHistory).filter(
                    TicketHistory.ticket_id == ticket.ticket_id,
                    TicketHistory.action == 'status_change',
                    TicketHistory.new_value.in_(['resolved', 'closed'])
                ).order_by(TicketHistory.created_at.asc()).first()
                
                if history_entry:
                    ticket.resolved_at = history_entry.created_at
                    ticket_details['changes'].append(f'resolved_at desde historial: {history_entry.created_at}')
                else:
                    # Usar updated_at como fallback
                    ticket.resolved_at = ticket.updated_at or (ticket.created_at + timedelta(hours=24))
                    ticket_details['changes'].append(f'resolved_at fallback: {ticket.resolved_at}')
                updated = True
            
            if updated:
                updated_count += 1
                details.append(ticket_details)
        
        g.db.commit()
        
        return jsonify({
            'message': f'Se actualizaron {updated_count} tickets',
            'updated_count': updated_count,
            'total_tickets': len(tickets),
            'details': details
        }), 200
        
    except Exception as e:
        g.db.rollback()
        return jsonify({'error': 'Error al corregir timestamps', 'details': str(e)}), 500


@admin_tools_bp.route('/recalculate-sla', methods=['POST'])
@admin_required
def recalculate_sla(current_user):
    """
    Recalcula el cumplimiento de SLA para todos los tickets.
    """
    try:
        tickets = g.db.query(Ticket).filter(
            Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
        ).all()
        
        updated_count = 0
        
        for ticket in tickets:
            if ticket.assigned_at and ticket.sla_response_deadline:
                ticket.sla_response_met = ticket.assigned_at <= ticket.sla_response_deadline
            
            if ticket.resolved_at and ticket.sla_resolution_deadline:
                ticket.sla_resolution_met = ticket.resolved_at <= ticket.sla_resolution_deadline
                updated_count += 1
        
        g.db.commit()
        
        return jsonify({
            'message': f'Se recalculó SLA para {updated_count} tickets',
            'updated_count': updated_count
        }), 200
        
    except Exception as e:
        g.db.rollback()
        return jsonify({'error': 'Error al recalcular SLA', 'details': str(e)}), 500
