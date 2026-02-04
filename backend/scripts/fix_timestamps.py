#!/usr/bin/env python3
"""
Script para poblar timestamps faltantes en tickets existentes.
Este script establece assigned_at y resolved_at basándose en el historial
o en fechas de fallback razonables.

Ejecutar con: python scripts/fix_timestamps.py
"""

import os
import sys
from datetime import datetime, timedelta

# Agregar el directorio src al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Ticket, TicketHistory, TicketStatus

def get_database_url():
    """Obtiene la URL de la base de datos desde las variables de entorno"""
    return os.environ.get('DATABASE_URL', 'postgresql://localhost/soporte_ghp')

def fix_timestamps():
    """Corrige los timestamps faltantes en los tickets"""
    
    database_url = get_database_url()
    print(f"Conectando a la base de datos...")
    
    engine = create_engine(database_url)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Obtener todos los tickets
        tickets = session.query(Ticket).all()
        print(f"Total de tickets encontrados: {len(tickets)}")
        
        updated_count = 0
        
        for ticket in tickets:
            updated = False
            
            # Corregir assigned_at si está vacío pero el ticket está asignado
            if ticket.assigned_to and not ticket.assigned_at:
                # Buscar en el historial cuándo fue asignado
                history_entry = session.query(TicketHistory).filter(
                    TicketHistory.ticket_id == ticket.ticket_id,
                    TicketHistory.action == 'ticket_assigned'
                ).order_by(TicketHistory.created_at.asc()).first()
                
                if history_entry:
                    ticket.assigned_at = history_entry.created_at
                    print(f"  {ticket.ticket_id}: assigned_at establecido desde historial ({history_entry.created_at})")
                else:
                    # Usar created_at + 1 hora como fallback
                    ticket.assigned_at = ticket.created_at + timedelta(hours=1)
                    print(f"  {ticket.ticket_id}: assigned_at establecido como fallback ({ticket.assigned_at})")
                updated = True
            
            # Corregir resolved_at si está vacío pero el ticket está resuelto/cerrado
            if ticket.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED] and not ticket.resolved_at:
                # Buscar en el historial cuándo fue resuelto
                history_entry = session.query(TicketHistory).filter(
                    TicketHistory.ticket_id == ticket.ticket_id,
                    TicketHistory.action == 'status_change',
                    TicketHistory.new_value.in_(['resolved', 'closed'])
                ).order_by(TicketHistory.created_at.asc()).first()
                
                if history_entry:
                    ticket.resolved_at = history_entry.created_at
                    print(f"  {ticket.ticket_id}: resolved_at establecido desde historial ({history_entry.created_at})")
                else:
                    # Usar updated_at como fallback
                    ticket.resolved_at = ticket.updated_at or (ticket.created_at + timedelta(hours=24))
                    print(f"  {ticket.ticket_id}: resolved_at establecido como fallback ({ticket.resolved_at})")
                updated = True
            
            if updated:
                updated_count += 1
        
        # Guardar cambios
        session.commit()
        print(f"\n✅ Se actualizaron {updated_count} tickets")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        session.close()

if __name__ == '__main__':
    fix_timestamps()
