"""
Enhanced Dashboard Stats for Admin
Green House Project - Sistema de Soporte
"""

from flask import g
from models import User, Ticket, TicketStatus, TicketPriority, UserRole
from sqlalchemy import func, case, and_, or_
from datetime import datetime, timedelta


def get_enhanced_admin_stats():
    """
    Estadísticas avanzadas para administradores
    Incluye métricas de rendimiento, calidad y volumen
    """
    now = datetime.utcnow()
    
    # === MÉTRICAS BÁSICAS ===
    total_tickets = g.db.query(Ticket).count()
    
    by_status = dict(
        g.db.query(Ticket.status, func.count(Ticket.ticket_id))
        .group_by(Ticket.status)
        .all()
    )
    
    by_priority = dict(
        g.db.query(Ticket.priority, func.count(Ticket.ticket_id))
        .group_by(Ticket.priority)
        .all()
    )
    
    # === MÉTRICAS DE TIEMPO ===
    
    # Tiempo promedio de primera respuesta (tiempo hasta asignación)
    avg_first_response = g.db.query(
        func.avg(
            func.extract('epoch', Ticket.assigned_at) - func.extract('epoch', Ticket.created_at)
        ) / 3600  # Convertir a horas
    ).filter(
        Ticket.assigned_at.isnot(None)
    ).scalar() or 0
    
    # Tiempo promedio de resolución (tiempo hasta resolver)
    avg_resolution_time = g.db.query(
        func.avg(
            func.extract('epoch', Ticket.resolved_at) - func.extract('epoch', Ticket.created_at)
        ) / 3600  # Convertir a horas
    ).filter(
        Ticket.resolved_at.isnot(None)
    ).scalar() or 0
    
    # === MÉTRICAS DE CALIDAD ===
    
    # Calificación promedio global
    avg_rating = g.db.query(func.avg(Ticket.rating)).filter(
        Ticket.rating.isnot(None)
    ).scalar()
    
    # Tasa de cumplimiento SLA
    total_closed = g.db.query(Ticket).filter(
        Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
    ).count()
    
    sla_met_count = g.db.query(Ticket).filter(
        Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED]),
        Ticket.sla_resolution_met == True
    ).count()
    
    sla_compliance_rate = (sla_met_count / total_closed * 100) if total_closed > 0 else 0
    
    # Tickets vencidos (activos que superaron SLA)
    overdue_tickets = g.db.query(Ticket).filter(
        Ticket.status.in_([TicketStatus.NEW, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.WAITING]),
        Ticket.sla_resolution_deadline < now
    ).count()
    
    # === MÉTRICAS POR INGENIERO ===
    
    engineers = g.db.query(User).filter(
        User.role == UserRole.ENGINEER,
        User.is_active == True
    ).all()
    
    engineer_stats = []
    for engineer in engineers:
        # Tickets asignados activos
        active_tickets = g.db.query(Ticket).filter(
            Ticket.assigned_to == engineer.user_id,
            Ticket.status.in_([TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.WAITING])
        ).count()
        
        # Tickets resueltos
        resolved_tickets = g.db.query(Ticket).filter(
            Ticket.assigned_to == engineer.user_id,
            Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
        ).count()
        
        # Calificación promedio
        engineer_rating = g.db.query(func.avg(Ticket.rating)).filter(
            Ticket.assigned_to == engineer.user_id,
            Ticket.rating.isnot(None)
        ).scalar()
        
        # Tiempo promedio de resolución
        engineer_avg_resolution = g.db.query(
            func.avg(
                func.extract('epoch', Ticket.resolved_at) - func.extract('epoch', Ticket.created_at)
            ) / 3600
        ).filter(
            Ticket.assigned_to == engineer.user_id,
            Ticket.resolved_at.isnot(None)
        ).scalar() or 0
        
        # Tasa de cumplimiento SLA
        engineer_total_closed = g.db.query(Ticket).filter(
            Ticket.assigned_to == engineer.user_id,
            Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
        ).count()
        
        engineer_sla_met = g.db.query(Ticket).filter(
            Ticket.assigned_to == engineer.user_id,
            Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED]),
            Ticket.sla_resolution_met == True
        ).count()
        
        engineer_sla_rate = (engineer_sla_met / engineer_total_closed * 100) if engineer_total_closed > 0 else 0
        
        engineer_stats.append({
            'engineer_id': engineer.user_id,
            'engineer_name': engineer.full_name,
            'active_tickets': active_tickets,
            'resolved_tickets': resolved_tickets,
            'avg_rating': round(engineer_rating, 2) if engineer_rating else None,
            'avg_resolution_hours': round(engineer_avg_resolution, 2),
            'sla_compliance_rate': round(engineer_sla_rate, 2)
        })
    
    # === MÉTRICAS POR CATEGORÍA ===
    
    by_category = dict(
        g.db.query(Ticket.category, func.count(Ticket.ticket_id))
        .group_by(Ticket.category)
        .all()
    )
    
    # === ALERTAS ===
    
    # Tickets críticos sin asignar
    critical_unassigned = g.db.query(Ticket).filter(
        Ticket.priority == TicketPriority.CRITICAL,
        Ticket.assigned_to.is_(None)
    ).count()
    
    # Tickets próximos a vencer (menos de 2 horas)
    two_hours_from_now = now + timedelta(hours=2)
    tickets_near_deadline = g.db.query(Ticket).filter(
        Ticket.status.in_([TicketStatus.NEW, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.WAITING]),
        Ticket.sla_resolution_deadline.between(now, two_hours_from_now)
    ).count()
    
    # === TENDENCIAS (últimos 7 días vs 7 días anteriores) ===
    
    seven_days_ago = now - timedelta(days=7)
    fourteen_days_ago = now - timedelta(days=14)
    
    tickets_last_7_days = g.db.query(Ticket).filter(
        Ticket.created_at >= seven_days_ago
    ).count()
    
    tickets_previous_7_days = g.db.query(Ticket).filter(
        Ticket.created_at.between(fourteen_days_ago, seven_days_ago)
    ).count()
    
    trend_percentage = ((tickets_last_7_days - tickets_previous_7_days) / tickets_previous_7_days * 100) if tickets_previous_7_days > 0 else 0
    
    # === CONTADORES ADICIONALES ===
    
    # Tickets nuevos (sin asignar)
    new_tickets = g.db.query(Ticket).filter(
        Ticket.status == TicketStatus.NEW
    ).count()
    
    # Tickets en progreso (asignados + in_progress + waiting)
    in_progress_tickets = g.db.query(Ticket).filter(
        Ticket.status.in_([TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.WAITING])
    ).count()
    
    # Tickets resueltos
    resolved_tickets = g.db.query(Ticket).filter(
        Ticket.status == TicketStatus.RESOLVED
    ).count()
    
    # Tickets cerrados
    closed_tickets = g.db.query(Ticket).filter(
        Ticket.status == TicketStatus.CLOSED
    ).count()
    
    # === RETORNAR TODAS LAS MÉTRICAS ===
    
    return {
        # Básicas
        'total_tickets': total_tickets,
        'new_tickets': new_tickets,
        'in_progress_tickets': in_progress_tickets,
        'resolved_tickets': resolved_tickets,
        'closed_tickets': closed_tickets,
        'by_status': {k.value: v for k, v in by_status.items()},
        'by_priority': {k.value: v for k, v in by_priority.items()},
        'by_category': by_category,
        
        # Tiempo (nombres compatibles con frontend)
        'avg_response_time': round(avg_first_response, 2),
        'avg_resolution_time': round(avg_resolution_time, 2),
        'avg_first_response_hours': round(avg_first_response, 2),  # Mantener compatibilidad
        'avg_resolution_hours': round(avg_resolution_time, 2),  # Mantener compatibilidad
        
        # Calidad (nombres compatibles con frontend)
        'avg_rating': round(avg_rating, 2) if avg_rating else None,
        'sla_compliance': round(sla_compliance_rate, 2),
        'sla_compliance_rate': round(sla_compliance_rate, 2),  # Mantener compatibilidad
        'overdue_tickets': overdue_tickets,
        
        # Ingenieros
        'engineer_stats': engineer_stats,
        'engineer_performance': engineer_stats,  # Alias para frontend
        
        # Alertas
        'critical_unassigned': critical_unassigned,
        'tickets_near_deadline': tickets_near_deadline,
        
        # Tendencias
        'tickets_last_7_days': tickets_last_7_days,
        'tickets_previous_7_days': tickets_previous_7_days,
        'trend_percentage': round(trend_percentage, 2)
    }

