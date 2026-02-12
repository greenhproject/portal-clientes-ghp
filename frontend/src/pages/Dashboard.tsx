/**
 * Dashboard Principal - Enhanced Version
 * Green House Project - Sistema de Soporte
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import '../styles/Dashboard.css';

interface Stats {
  total_tickets?: number;
  open_tickets?: number;
  closed_tickets?: number;
  new_tickets?: number;
  in_progress_tickets?: number;
  assigned_tickets?: number;
  resolved_tickets?: number;
  avg_rating?: number;
  by_status?: Record<string, number>;
  by_priority?: Record<string, number>;
  by_category?: Record<string, number>;
  avg_response_time?: number;
  avg_resolution_time?: number;
  sla_compliance?: number;
  engineer_performance?: Array<{
    engineer_name: string;
    assigned_count: number;
    resolved_count: number;
    avg_rating: number;
    active_tickets?: number;
    resolved_tickets?: number;
    avg_resolution_hours?: number;
    sla_compliance_rate?: number;
  }>;
}

interface Ticket {
  ticket_id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  project_id: string;
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<Stats>({});
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, ticketsData] = await Promise.all([
        apiService.getDashboardStats().catch((err) => {
          console.error('Error fetching stats:', err);
          return {};
        }),
        apiService.getTickets({ page: 1, per_page: 10 }).catch((err) => {
          console.error('Error fetching tickets:', err);
          return { tickets: [] };
        }),
      ]);
      
      console.log('Dashboard Stats:', statsData);
      console.log('Dashboard Tickets:', ticketsData);

      setStats(statsData);
      // Handle both array response and paginated response format
      if (Array.isArray(ticketsData)) {
        setTickets(ticketsData);
      } else if (ticketsData && Array.isArray(ticketsData.tickets)) {
        setTickets(ticketsData.tickets);
      } else {
        console.warn('Unexpected tickets data format:', ticketsData);
        setTickets([]);
      }
      setError('');
    } catch (err: any) {
      setError('Error al cargar datos del dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const statusMap: Record<string, string> = {
      new: 'badge-info',
      assigned: 'badge-warning',
      in_progress: 'badge-warning',
      waiting: 'badge-neutral',
      resolved: 'badge-success',
      closed: 'badge-neutral',
    };
    return `badge ${statusMap[status] || 'badge-neutral'}`;
  };

  const getPriorityBadgeClass = (priority: string) => {
    const priorityMap: Record<string, string> = {
      critical: 'badge-error',
      high: 'badge-warning',
      medium: 'badge-info',
      low: 'badge-neutral',
    };
    return `badge ${priorityMap[priority] || 'badge-neutral'}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (hours: number | undefined | null) => {
    if (hours === undefined || hours === null || typeof hours !== 'number') return 'N/A';
    if (hours === 0) return '0h';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <div>
              <h1>Sistema de Soporte</h1>
              <p>Bienvenido, {user?.full_name || 'Usuario'}</p>
            </div>
            <div className="header-actions">
              <Link to="/tickets/new" className="btn btn-primary">
                + Nuevo Ticket
              </Link>
              <button onClick={logout} className="btn btn-secondary">
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main container">
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {/* Estadísticas principales */}
        <section className="stats-section">
          <h2>Resumen General</h2>
          <div className="stats-grid">
            {user?.role === 'client' && (
              <>
                <div className="stat-card">
                  <div className="stat-value">{stats.total_tickets || 0}</div>
                  <div className="stat-label">Total de Tickets</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.open_tickets || 0}</div>
                  <div className="stat-label">Tickets Abiertos</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.closed_tickets || 0}</div>
                  <div className="stat-label">Tickets Cerrados</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {stats.avg_rating && typeof stats.avg_rating === 'number' ? stats.avg_rating.toFixed(1) : 'N/A'}
                  </div>
                  <div className="stat-label">Calificación Promedio</div>
                </div>
              </>
            )}

            {user?.role === 'engineer' && (
              <>
                <div className="stat-card">
                  <div className="stat-value">{stats.assigned_tickets || 0}</div>
                  <div className="stat-label">Tickets Asignados</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.resolved_tickets || 0}</div>
                  <div className="stat-label">Tickets Resueltos</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.closed_tickets || 0}</div>
                  <div className="stat-label">Tickets Cerrados</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {stats.avg_rating && typeof stats.avg_rating === 'number' ? stats.avg_rating.toFixed(1) : 'N/A'}
                  </div>
                  <div className="stat-label">Calificación Promedio</div>
                </div>
              </>
            )}

            {user?.role === 'admin' && (
              <>
                <div className="stat-card">
                  <div className="stat-value">{stats.total_tickets || 0}</div>
                  <div className="stat-label">Total de Tickets</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {stats.new_tickets ?? stats.by_status?.new ?? 0}
                  </div>
                  <div className="stat-label">Nuevos</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {stats.in_progress_tickets ?? ((stats.by_status?.assigned || 0) + (stats.by_status?.in_progress || 0) + (stats.by_status?.waiting || 0))}
                  </div>
                  <div className="stat-label">En Progreso</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {stats.resolved_tickets ?? stats.by_status?.resolved ?? 0}
                  </div>
                  <div className="stat-label">Resueltos</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {stats.closed_tickets ?? stats.by_status?.closed ?? 0}
                  </div>
                  <div className="stat-label">Cerrados</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {stats.avg_rating && typeof stats.avg_rating === 'number' ? stats.avg_rating.toFixed(1) : 'N/A'}
                  </div>
                  <div className="stat-label">Calificación Promedio</div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Métricas avanzadas para Admin */}
        {user?.role === 'admin' && (
          <>
            <section className="stats-section">
              <h2>Métricas de Rendimiento</h2>
              <div className="stats-grid stats-grid-3">
                <div className="stat-card stat-card-accent">
                  <div className="stat-icon stat-icon-blue">⏱️</div>
                  <div className="stat-content">
                    <div className="stat-title">Tiempo de Respuesta</div>
                    <div className="stat-value">{formatTime(stats.avg_response_time)}</div>
                    <div className="stat-description">Promedio de primera respuesta a tickets</div>
                  </div>
                </div>
                <div className="stat-card stat-card-accent">
                  <div className="stat-icon stat-icon-green">✅</div>
                  <div className="stat-content">
                    <div className="stat-title">Tiempo de Resolución</div>
                    <div className="stat-value">{formatTime(stats.avg_resolution_time)}</div>
                    <div className="stat-description">Promedio para resolver tickets</div>
                  </div>
                </div>
                <div className="stat-card stat-card-accent">
                  <div className="stat-icon stat-icon-purple">📊</div>
                  <div className="stat-content">
                    <div className="stat-title">Cumplimiento SLA</div>
                    <div className="stat-value">
                      {stats.sla_compliance && typeof stats.sla_compliance === 'number' 
                        ? `${stats.sla_compliance.toFixed(0)}%` 
                        : 'N/A'}
                    </div>
                    <div className="stat-description">Tickets resueltos dentro del SLA</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Distribución por Prioridad */}
            {stats.by_priority && Object.keys(stats.by_priority).length > 0 && (
              <section className="stats-section">
                <h2>Distribución por Prioridad</h2>
                <div className="stats-grid stats-grid-4">
                  {Object.entries(stats.by_priority).map(([priority, count]) => (
                    <div key={priority} className="stat-card stat-card-small">
                      <div className="stat-value">{count}</div>
                      <div className="stat-label">{priority.charAt(0).toUpperCase() + priority.slice(1)}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Distribución por Categoría */}
            {stats.by_category && Object.keys(stats.by_category).length > 0 && (
              <section className="stats-section">
                <h2>Distribución por Categoría</h2>
                <div className="stats-grid stats-grid-4">
                  {Object.entries(stats.by_category).map(([category, count]) => (
                    <div key={category} className="stat-card stat-card-small">
                      <div className="stat-value">{count}</div>
                      <div className="stat-label">{category}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Rendimiento de Ingenieros */}
            {stats.engineer_performance && stats.engineer_performance.length > 0 && (
              <section className="stats-section">
                <h2>Rendimiento de Ingenieros</h2>
                <div className="engineer-performance-grid">
                  {stats.engineer_performance.map((engineer, index) => (
                    <div key={index} className="engineer-card">
                      <div className="engineer-header">
                        <div className="engineer-avatar">
                          {engineer.engineer_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="engineer-info">
                          <h3>{engineer.engineer_name}</h3>
                          <div className="engineer-stats">
                            <span>{engineer.assigned_count} asignados</span>
                            <span>•</span>
                            <span>{engineer.resolved_count} resueltos</span>
                          </div>
                        </div>
                      </div>
                      <div className="engineer-rating">
                        <span className="rating-value">
                          {engineer.avg_rating && typeof engineer.avg_rating === 'number' 
                            ? engineer.avg_rating.toFixed(1) 
                            : 'N/A'}
                        </span>
                        <span className="rating-label">⭐ Calificación</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Lista de Tickets Recientes */}
        <section className="tickets-section">
          <div className="section-header">
            <h2>Tickets Recientes</h2>
            <Link to="/tickets" className="btn btn-outline">
              Ver Todos
            </Link>
          </div>

          {tickets.length === 0 ? (
            <div className="empty-state">
              <p>No hay tickets aún</p>
              <Link to="/tickets/new" className="btn btn-primary">
                Crear Primer Ticket
              </Link>
            </div>
          ) : (
            <div className="tickets-list">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.ticket_id}
                  to={`/tickets/${ticket.ticket_id}`}
                  className="ticket-card"
                >
                  <div className="ticket-header">
                    <h3>{ticket.title}</h3>
                    <div className="ticket-badges">
                      <span className={getPriorityBadgeClass(ticket.priority)}>
                        {ticket.priority}
                      </span>
                      <span className={getStatusBadgeClass(ticket.status)}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                  <div className="ticket-meta">
                    <span>ID: {ticket.ticket_id}</span>
                    <span>Proyecto: {ticket.project_id}</span>
                    <span>Creado: {formatDate(ticket.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;

