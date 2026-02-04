import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/ProjectHistory.css';

interface OpenSolarData {
  system_size_kw: string | number;
  panel_count: string | number;
  panel_model: string;
  inverter_model: string;
  installation_address: string;
  installation_date: string;
}

interface TicketData {
  ticket_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  assigned_engineer: string;
}

interface ProjectHistoryData {
  project_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  total_tickets: number;
  open_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
  opensolar_data: OpenSolarData;
  tickets: TicketData[];
}

const ProjectHistory: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [projectData, setProjectData] = useState<ProjectHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectHistory();
  }, [projectId]);

  const fetchProjectHistory = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(`${apiUrl}/projects/${projectId}/history`);

      if (!response.ok) {
        throw new Error('No se pudo cargar el historial del proyecto');
      }

      const data = await response.json();
      setProjectData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'new': 'status-new',
      'assigned': 'status-assigned',
      'in_progress': 'status-in-progress',
      'resolved': 'status-resolved',
      'closed': 'status-closed'
    };
    return statusMap[status] || 'status-default';
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: { [key: string]: string } = {
      'new': 'Nuevo',
      'assigned': 'Asignado',
      'in_progress': 'En Progreso',
      'resolved': 'Resuelto',
      'closed': 'Cerrado'
    };
    return statusLabels[status] || status;
  };

  const getPriorityBadgeClass = (priority: string) => {
    const priorityMap: { [key: string]: string } = {
      'critical': 'priority-critical',
      'high': 'priority-high',
      'medium': 'priority-medium',
      'low': 'priority-low'
    };
    return priorityMap[priority] || 'priority-default';
  };

  const getPriorityLabel = (priority: string) => {
    const priorityLabels: { [key: string]: string } = {
      'critical': 'Crítica',
      'high': 'Alta',
      'medium': 'Media',
      'low': 'Baja'
    };
    return priorityLabels[priority] || priority;
  };

  const getCategoryLabel = (category: string) => {
    const categoryLabels: { [key: string]: string } = {
      'electrical': 'Eléctrico',
      'mechanical': 'Mecánico',
      'performance': 'Rendimiento',
      'other': 'Otro'
    };
    return categoryLabels[category] || category;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCreateTicket = () => {
    navigate(`/new-ticket?project=${projectId}`);
  };

  if (loading) {
    return (
      <div className="project-history-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando historial del proyecto...</p>
        </div>
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="project-history-container">
        <div className="error-state">
          <h2>❌ Error</h2>
          <p>{error || 'No se pudo cargar el historial del proyecto'}</p>
          <button onClick={() => window.location.reload()} className="btn-retry">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="project-history-container">
      {/* Header */}
      <div className="project-header">
        <div className="project-header-content">
          <div className="project-logo">GHP</div>
          <div className="project-title-section">
            <h1>Green House Project</h1>
            <p className="project-subtitle">Historial de Soporte Técnico</p>
          </div>
        </div>
      </div>

      {/* Project Info Card */}
      <div className="project-info-card">
        <div className="card-header">
          <h2>📋 Información del Proyecto</h2>
          <span className="project-id-badge">ID: {projectData.project_id}</span>
        </div>
        
        <div className="info-grid">
          <div className="info-item">
            <span className="info-icon">👤</span>
            <div>
              <div className="info-label">Cliente</div>
              <div className="info-value">{projectData.client_name}</div>
            </div>
          </div>
          
          {projectData.opensolar_data.installation_address !== 'N/A' && (
            <div className="info-item">
              <span className="info-icon">📍</span>
              <div>
                <div className="info-label">Ubicación</div>
                <div className="info-value">{projectData.opensolar_data.installation_address}</div>
              </div>
            </div>
          )}
          
          {projectData.opensolar_data.system_size_kw !== 'N/A' && (
            <div className="info-item">
              <span className="info-icon">⚡</span>
              <div>
                <div className="info-label">Capacidad del Sistema</div>
                <div className="info-value">{projectData.opensolar_data.system_size_kw} kW</div>
              </div>
            </div>
          )}
          
          {projectData.opensolar_data.panel_count !== 'N/A' && (
            <div className="info-item">
              <span className="info-icon">☀️</span>
              <div>
                <div className="info-label">Paneles Solares</div>
                <div className="info-value">{projectData.opensolar_data.panel_count} unidades</div>
              </div>
            </div>
          )}
        </div>

        {/* Equipment Details */}
        {(projectData.opensolar_data.panel_model !== 'N/A' || 
          projectData.opensolar_data.inverter_model !== 'N/A') && (
          <div className="equipment-section">
            <h3>🔧 Equipos Instalados</h3>
            <div className="equipment-list">
              {projectData.opensolar_data.panel_model !== 'N/A' && (
                <div className="equipment-item">
                  <strong>Paneles:</strong> {projectData.opensolar_data.panel_model}
                </div>
              )}
              {projectData.opensolar_data.inverter_model !== 'N/A' && (
                <div className="equipment-item">
                  <strong>Inversor:</strong> {projectData.opensolar_data.inverter_model}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{projectData.total_tickets}</div>
          <div className="stat-label">Total Tickets</div>
        </div>
        <div className="stat-card stat-open">
          <div className="stat-icon">🔄</div>
          <div className="stat-value">{projectData.open_tickets}</div>
          <div className="stat-label">Abiertos</div>
        </div>
        <div className="stat-card stat-resolved">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{projectData.resolved_tickets}</div>
          <div className="stat-label">Resueltos</div>
        </div>
        <div className="stat-card stat-closed">
          <div className="stat-icon">🔒</div>
          <div className="stat-value">{projectData.closed_tickets}</div>
          <div className="stat-label">Cerrados</div>
        </div>
      </div>

      {/* Create Ticket Button */}
      <div className="action-section">
        <button onClick={handleCreateTicket} className="btn-create-ticket">
          ➕ Crear Nuevo Ticket
        </button>
      </div>

      {/* Tickets History */}
      <div className="tickets-history-section">
        <h2>📝 Historial de Tickets</h2>
        
        {projectData.tickets.length === 0 ? (
          <div className="no-tickets">
            <p>No hay tickets registrados para este proyecto</p>
          </div>
        ) : (
          <div className="tickets-list">
            {projectData.tickets.map((ticket) => (
              <div key={ticket.ticket_id} className="ticket-card">
                <div className="ticket-header">
                  <div className="ticket-id">{ticket.ticket_id}</div>
                  <div className="ticket-badges">
                    <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                    <span className={`badge ${getPriorityBadgeClass(ticket.priority)}`}>
                      {getPriorityLabel(ticket.priority)}
                    </span>
                  </div>
                </div>
                
                <h3 className="ticket-title">{ticket.title}</h3>
                <p className="ticket-description">{ticket.description}</p>
                
                <div className="ticket-meta">
                  <div className="meta-item">
                    <span className="meta-icon">🏷️</span>
                    <span>{getCategoryLabel(ticket.category)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-icon">👨‍🔧</span>
                    <span>{ticket.assigned_engineer}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-icon">📅</span>
                    <span>{formatDate(ticket.created_at)}</span>
                  </div>
                  {ticket.resolved_at && (
                    <div className="meta-item">
                      <span className="meta-icon">✅</span>
                      <span>Resuelto: {formatDate(ticket.resolved_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact Info */}
      <div className="contact-section">
        <h3>📞 Soporte Técnico 24/7</h3>
        <div className="contact-grid">
          <div className="contact-item">
            <span className="contact-icon">📱</span>
            <div>
              <div className="contact-label">WhatsApp</div>
              <a href="https://wa.me/573227469557" className="contact-value">+57 322 746 9557</a>
            </div>
          </div>
          <div className="contact-item">
            <span className="contact-icon">📞</span>
            <div>
              <div className="contact-label">Teléfono</div>
              <a href="tel:+573009754614" className="contact-value">+57 300 975 4614</a>
            </div>
          </div>
          <div className="contact-item">
            <span className="contact-icon">✉️</span>
            <div>
              <div className="contact-label">Email</div>
              <a href="mailto:soporte@greenhproject.com" className="contact-value">
                soporte@greenhproject.com
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="project-footer">
        <p>© 2025 Green House Project - Energía Solar Sostenible</p>
      </div>
    </div>
  );
};

export default ProjectHistory;

