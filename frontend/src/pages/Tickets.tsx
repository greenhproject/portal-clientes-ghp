/**
 * Página de Lista de Tickets con Filtros
 * Green House Project - Sistema de Soporte
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import TicketFilters, { type FilterState } from '../components/TicketFilters';
import QRGenerator from '../components/QRGenerator';
import '../styles/Tickets.css';

interface Ticket {
  ticket_id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  client?: {
    full_name: string;
    email: string;
  };
  assigned_engineer?: {
    full_name: string;
  };
}

interface Pagination {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

const Tickets: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrProjectId, setQrProjectId] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: '',
    category: '',
  });
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: '',
    priority: '',
    category: '',
    dateFrom: '',
    dateTo: '',
    orderBy: 'created_at',
    orderDir: 'desc',
  });

  // Dynamic categories and priorities from settings - initialized with defaults to prevent .map() errors
  const [categories, setCategories] = useState<string[]>(['Eléctrico', 'Mecánico', 'Rendimiento', 'Otro']);
  const [priorities, setPriorities] = useState<any[]>([
    { value: 'low', label: 'Baja', color: '#10b981' },
    { value: 'medium', label: 'Media', color: '#f59e0b' },
    { value: 'high', label: 'Alta', color: '#ef4444' },
    { value: 'critical', label: 'Crítica', color: '#dc2626' }
  ]);

  useEffect(() => {
    loadTickets();
    loadDynamicOptions();
  }, [filters, pagination.page]);

  const loadDynamicOptions = async () => {
    // Default values
    const defaultCategories = ['Eléctrico', 'Mecánico', 'Rendimiento', 'Otro'];
    const defaultPriorities = [
      { value: 'low', label: 'Baja', color: '#10b981' },
      { value: 'medium', label: 'Media', color: '#f59e0b' },
      { value: 'high', label: 'Alta', color: '#ef4444' },
      { value: 'critical', label: 'Crítica', color: '#dc2626' }
    ];
    
    try {
      const [categoriesData, prioritiesData] = await Promise.all([
        apiService.getCategories().catch(() => null),
        apiService.getPriorities().catch(() => null)
      ]);
      
      // Ensure categories is always an array
      if (Array.isArray(categoriesData) && categoriesData.length > 0) {
        setCategories(categoriesData);
      } else {
        setCategories(defaultCategories);
      }
      
      // Ensure priorities is always an array
      if (Array.isArray(prioritiesData) && prioritiesData.length > 0) {
        setPriorities(prioritiesData);
      } else {
        setPriorities(defaultPriorities);
      }
    } catch (error) {
      console.error('Error loading dynamic options:', error);
      // Fallback to defaults
      setCategories(defaultCategories);
      setPriorities(defaultPriorities);
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError('');

      // Construir parámetros de query
      const params: any = {
        page: pagination.page,
        per_page: pagination.per_page,
        order_by: filters.orderBy,
        order_dir: filters.orderDir,
      };

      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.category) params.category = filters.category;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;

      const response = await apiService.getTickets(params);
      setTickets(response.tickets || []);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setEditForm({
      title: ticket.title,
      description: '',
      priority: ticket.priority,
      category: ticket.category,
    });
    setShowEditModal(true);
  };

  // Block body scroll when modal is open
  useEffect(() => {
    if (showEditModal || showDeleteModal || showQRModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showEditModal, showDeleteModal, showQRModal]);

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;

    try {
      await apiService.updateTicket(selectedTicket.ticket_id, {
        title: editForm.title,
        priority: editForm.priority,
        category: editForm.category,
      });
      setShowEditModal(false);
      loadTickets();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al actualizar ticket');
    }
  };

  const handleDeleteTicket = async () => {
    if (!selectedTicket) return;

    try {
      await apiService.deleteTicket(selectedTicket.ticket_id);
      setShowDeleteModal(false);
      setSelectedTicket(null);
      loadTickets();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar ticket');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      new: { label: 'Nuevo', className: 'status-new' },
      assigned: { label: 'Asignado', className: 'status-assigned' },
      in_progress: { label: 'En Progreso', className: 'status-in-progress' },
      waiting: { label: 'Esperando', className: 'status-waiting' },
      resolved: { label: 'Resuelto', className: 'status-resolved' },
      closed: { label: 'Cerrado', className: 'status-closed' },
    };
    const statusInfo = statusMap[status] || { label: status, className: '' };
    return <span className={`status-badge ${statusInfo.className}`}>{statusInfo.label}</span>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { label: string; className: string }> = {
      low: { label: 'Baja', className: 'priority-low' },
      medium: { label: 'Media', className: 'priority-medium' },
      high: { label: 'Alta', className: 'priority-high' },
      critical: { label: 'Crítica', className: 'priority-critical' },
    };
    const priorityInfo = priorityMap[priority] || { label: priority, className: '' };
    return <span className={`priority-badge ${priorityInfo.className}`}>{priorityInfo.label}</span>;
  };

  return (
    <div className="tickets-page">
      <div className="page-header">
        <h1>📋 Tickets de Soporte</h1>
        <Link to="/new-ticket" className="btn btn-primary">
          + Nuevo Ticket
        </Link>
      </div>

      <TicketFilters onFilterChange={setFilters} />

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Cargando tickets...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Título</th>
                  <th>Estado</th>
                  <th>Prioridad</th>
                  <th>Categoría</th>
                  {user?.role === 'admin' && <th>Cliente</th>}
                  <th>Ingeniero</th>
                  <th>Proyecto</th>
                  <th>Creado</th>
                  {user?.role === 'admin' && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={user?.role === 'admin' ? 10 : 8} className="no-data">
                      No se encontraron tickets
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr key={ticket.ticket_id}>
                      <td>
                        <Link to={`/tickets/${ticket.ticket_id}`} className="ticket-link">
                          {ticket.ticket_id}
                        </Link>
                      </td>
                      <td className="ticket-title">
                        <Link to={`/tickets/${ticket.ticket_id}`}>{ticket.title}</Link>
                      </td>
                      <td>{getStatusBadge(ticket.status)}</td>
                      <td>{getPriorityBadge(ticket.priority)}</td>
                      <td>{ticket.category}</td>
                      {user?.role === 'admin' && (
                        <td>{ticket.client?.full_name || 'N/A'}</td>
                      )}
                      <td>{ticket.assigned_engineer?.full_name || 'Sin asignar'}</td>
                      <td>{ticket.project_id}</td>
                      <td>{formatDate(ticket.created_at)}</td>
                      {(user?.role === 'admin' || user?.role === 'engineer') && (
                        <td className="actions-cell">
                          <button
                            onClick={() => {
                              setQrProjectId(ticket.project_id);
                              setShowQRModal(true);
                            }}
                            className="btn-icon btn-qr"
                            title="Generar código QR"
                          >
                            📱
                          </button>
                          {user?.role === 'admin' && (
                            <>
                              <button
                                onClick={() => handleEditTicket(ticket)}
                                className="btn-icon btn-edit"
                                title="Editar ticket"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  setShowDeleteModal(true);
                                }}
                                className="btn-icon btn-delete"
                                title="Eliminar ticket"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="tickets-cards">
            {tickets.length === 0 ? (
              <div className="empty-state">
                <p>No se encontraron tickets</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div key={ticket.ticket_id} className="ticket-card">
                  <div className="ticket-card-header">
                    <Link to={`/tickets/${ticket.ticket_id}`} className="ticket-card-id">
                      {ticket.ticket_id}
                    </Link>
                    <div className="ticket-card-badges">
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                  </div>
                  
                  <div className="ticket-card-title">
                    <Link to={`/tickets/${ticket.ticket_id}`}>{ticket.title}</Link>
                  </div>
                  
                  <div className="ticket-card-info">
                    <div className="ticket-card-info-item">
                      <span className="ticket-card-info-label">Categoría</span>
                      <span className="ticket-card-info-value">{ticket.category}</span>
                    </div>
                    {user?.role === 'admin' && (
                      <div className="ticket-card-info-item">
                        <span className="ticket-card-info-label">Cliente</span>
                        <span className="ticket-card-info-value">{ticket.client?.full_name || 'N/A'}</span>
                      </div>
                    )}
                    <div className="ticket-card-info-item">
                      <span className="ticket-card-info-label">Ingeniero</span>
                      <span className="ticket-card-info-value">{ticket.assigned_engineer?.full_name || 'Sin asignar'}</span>
                    </div>
                    <div className="ticket-card-info-item">
                      <span className="ticket-card-info-label">Proyecto</span>
                      <span className="ticket-card-info-value">{ticket.project_id}</span>
                    </div>
                    <div className="ticket-card-info-item">
                      <span className="ticket-card-info-label">Creado</span>
                      <span className="ticket-card-info-value">{formatDate(ticket.created_at)}</span>
                    </div>
                  </div>
                  
                  {(user?.role === 'admin' || user?.role === 'engineer') && (
                    <div className="ticket-card-actions">
                      <button
                        onClick={() => {
                          setQrProjectId(ticket.project_id);
                          setShowQRModal(true);
                        }}
                        className="btn-icon btn-qr"
                        title="Generar código QR"
                      >
                        📱
                      </button>
                      {user?.role === 'admin' && (
                        <>
                          <button
                            onClick={() => handleEditTicket(ticket)}
                            className="btn-icon btn-edit"
                            title="Editar ticket"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setShowDeleteModal(true);
                            }}
                            className="btn-icon btn-delete"
                            title="Eliminar ticket"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="btn btn-outline"
              >
                ← Anterior
              </button>
              <span className="pagination-info">
                Página {pagination.page} de {pagination.pages} ({pagination.total} tickets)
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
                className="btn btn-outline"
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>⚠️ Confirmar Eliminación</h2>
            <p>
              ¿Estás seguro de que deseas eliminar el ticket <strong>{selectedTicket?.ticket_id}</strong>?
            </p>
            <p className="warning-text">Esta acción no se puede deshacer.</p>
            <div className="modal-actions">
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-outline">
                Cancelar
              </button>
              <button onClick={handleDeleteTicket} className="btn btn-danger">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h2>✏️ Editar Ticket {selectedTicket?.ticket_id}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateTicket();
              }}
            >
              <div className="form-group">
                <label>Título</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Prioridad</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  >
                    {priorities.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Categoría</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-outline"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Generador QR */}
      {showQRModal && (
        <QRGenerator
          projectId={qrProjectId}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </div>
  );
};

export default Tickets;

