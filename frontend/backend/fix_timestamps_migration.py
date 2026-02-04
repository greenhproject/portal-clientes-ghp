#!/usr/bin/env python3
"""
Migración para poblar assigned_at y resolved_at en tickets existentes
Green House Project - Sistema de Soporte
"""

import os
import sys
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from models import Ticket, TicketStatus, TicketHistory

def fix_timestamps():
    """Poblar assigned_at y resolved_at basándose en el historial"""
    
    # Conectar a la base de datos
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL no configurada")
        return False
    
    # Fix for Railway PostgreSQL URL
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    engine = create_engine(database_url)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        print("🔧 Iniciando migración de timestamps...")
        
        # Obtener todos los tickets
        tickets = session.query(Ticket).all()
        print(f"📊 Encontrados {len(tickets)} tickets")
        
        updated_count = 0
        
        for ticket in tickets:
            updated = False
            
            # Si el ticket está asignado pero no tiene assigned_at
            if ticket.assigned_to and not ticket.assigned_at:
                # Buscar en el historial cuándo fue asignado
                assignment_history = session.query(TicketHistory).filter(
                    TicketHistory.ticket_id == ticket.ticket_id,
                    TicketHistory.action.in_(['ticket_assigned', 'status_changed']),
                    TicketHistory.new_value.in_(['assigned', 'in_progress'])
                ).order_by(TicketHistory.timestamp.asc()).first()
                
                if assignment_history:
                    ticket.assigned_at = assignment_history.timestamp
                    updated = True
                    print(f"  ✓ {ticket.ticket_id}: assigned_at = {assignment_history.timestamp}")
                else:
                    # Si no hay historial, usar created_at
                    ticket.assigned_at = ticket.created_at
                    updated = True
                    print(f"  ✓ {ticket.ticket_id}: assigned_at = {ticket.created_at} (fallback)")
            
            # Si el ticket está resuelto/cerrado pero no tiene resolved_at
            if ticket.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED] and not ticket.resolved_at:
                # Buscar en el historial cuándo fue resuelto
                resolution_history = session.query(TicketHistory).filter(
                    TicketHistory.ticket_id == ticket.ticket_id,
                    TicketHistory.action == 'status_changed',
                    TicketHistory.new_value == 'resolved'
                ).order_by(TicketHistory.timestamp.asc()).first()
                
                if resolution_history:
                    ticket.resolved_at = resolution_history.timestamp
                    updated = True
                    print(f"  ✓ {ticket.ticket_id}: resolved_at = {resolution_history.timestamp}")
                else:
                    # Si no hay historial, usar updated_at
                    ticket.resolved_at = ticket.updated_at
                    updated = True
                    print(f"  ✓ {ticket.ticket_id}: resolved_at = {ticket.updated_at} (fallback)")
            
            if updated:
                updated_count += 1
        
        # Commit cambios
        session.commit()
        print(f"\n✅ Migración completada: {updated_count} tickets actualizados")
        return True
        
    except Exception as e:
        session.rollback()
        print(f"\n❌ Error en migración: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        session.close()


if __name__ == '__main__':
    success = fix_timestamps()
    sys.exit(0 if success else 1)

