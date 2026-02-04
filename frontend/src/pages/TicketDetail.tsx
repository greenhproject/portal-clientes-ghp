import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import FileUpload from '../components/FileUpload';
import AttachmentGallery from '../components/AttachmentGallery';
import '../styles/Ticket.css';

interface Comment {
  comment_id: string;
  content: string;
  created_at: string;
  type: string;
  user: {
    full_name: string;
    role: string;
  };
}

interface Ticket {
  ticket_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  subcategory?: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  client: {
    full_name: string;
    user_id: string;
  };
  created_by?: {
    full_name: string;
    user_id: string;
    role: string;
  };
  assigned_to?: string;
  assigned_engineer?: {
    full_name: string;
    user_id: string;
  };
  opensolar_data?: {
    project_name?: string;
    client_name?: string;
    client_email?: string;
    client_phone?: string;
    address?: string;
    status?: string;
    system_capacity_kw?: number;
    panel_count?: number;
    panel_model?: string;
    panel_wattage?: number;
    inverter_model?: string;
    inverter_count?: number;
    battery_model?: string;
    battery_capacity_kwh?: number;
    annual_production_kwh?: number;
    installation_date?: string;
  };
}

const TicketDetail: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'public' | 'internal'>('public');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [engineers, setEngineers] = useState<{user_id: string; full_name: string}[]>([]);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isStaff = currentUser.role === 'admin' || currentUser.role === 'engineer';
  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    loadTicketData();
    if (isAdmin) {
      loadEngineers();
    }
  }, [ticketId]);

  const loadEngineers = async () => {
    try {
      const data = await api.getEngineers();
      setEngineers(data.engineers || []);
    } catch (err) {
      console.error('Error loading engineers:', err);
    }
  };

  const loadTicketData = async () => {
    try {
      setLoading(true);
      const [ticketData, commentsData, attachmentsData] = await Promise.all([
        api.getTicket(ticketId!),
        api.getTicketComments(ticketId!),
        api.getTicketAttachments(ticketId!)
      ]);
      setTicket(ticketData.ticket);
      setComments(commentsData.comments || []);
      setAttachments(attachmentsData.attachments || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar el ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      await api.createComment({
        ticket_id: ticketId!,
        content: newComment,
        type: commentType
      });
      setNewComment('');
      setCommentType('public');
      await loadTicketData(); // Reload to show new comment
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al agregar comentario');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    try {
      await api.changeTicketStatus(ticketId!, newStatus);
      await loadTicketData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al actualizar estado');
    }
  };

  const handlePriorityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPriority = e.target.value;
    try {
      await api.updateTicket(ticketId!, { priority: newPriority });
      await loadTicketData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al actualizar prioridad');
    }
  };

  const handleEngineerChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEngineerId = e.target.value;
    if (!newEngineerId) return;
    try {
      console.log('Assigning engineer:', newEngineerId, 'to ticket:', ticketId);
      const result = await api.assignTicket(ticketId!, newEngineerId);
      console.log('Assignment result:', result);
      await loadTicketData();
    } catch (err: any) {
      console.error('Error assigning engineer:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Error al asignar ingeniero';
      alert(errorMessage);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const statusMap: Record<string, string> = {
      new: 'status-new',
      in_progress: 'status-progress',
      waiting: 'status-waiting',
      resolved: 'status-resolved',
      closed: 'status-closed'
    };
    return statusMap[status] || 'status-new';
  };

  const getPriorityBadgeClass = (priority: string) => {
    const priorityMap: Record<string, string> = {
      low: 'priority-low',
      medium: 'priority-medium',
      high: 'priority-high',
      critical: 'priority-critical'
    };
    return priorityMap[priority] || 'priority-medium';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'Nuevo',
      in_progress: 'En Progreso',
      waiting: 'Esperando Cliente',
      resolved: 'Resuelto',
      closed: 'Cerrado'
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      critical: 'Crítica'
    };
    return labels[priority] || priority;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter comments based on user role
  const visibleComments = isStaff 
    ? comments 
    : comments.filter(c => c.type === 'public');

  if (loading) {
    return (
      <div className="ticket-detail-container">
        <div className="loading">Cargando...</div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="ticket-detail-container">
        <div className="error-message">{error || 'Ticket no encontrado'}</div>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary">
          Volver al Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="ticket-detail-container">
      <div className="ticket-header">
        <button onClick={() => navigate('/dashboard')} className="btn-back">
          ← Volver
        </button>
        <h1>Ticket {ticket.ticket_id}</h1>
      </div>

      <div className="ticket-content">
        <div className="ticket-main">
          {/* Ticket Info Card */}
          <div className="ticket-info-card">
            <div className="ticket-title-section">
              <h2>{ticket.title}</h2>
              <div className="ticket-badges">
                <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>
                  {getStatusLabel(ticket.status)}
                </span>
                <span className={`badge ${getPriorityBadgeClass(ticket.priority)}`}>
                  {getPriorityLabel(ticket.priority)}
                </span>
              </div>
            </div>

            <div className="ticket-description">
              <h3>Descripción</h3>
              <p>{ticket.description}</p>
            </div>

            <div className="ticket-metadata">
              <div className="metadata-item">
                <strong>Categoría:</strong> {ticket.category}
              </div>
              {ticket.subcategory && (
                <div className="metadata-item">
                  <strong>Subcategoría:</strong> {ticket.subcategory}
                </div>
              )}
              <div className="metadata-item">
                <strong>Proyecto:</strong> {ticket.project_id}
              </div>
              <div className="metadata-item">
                <strong>Cliente:</strong> {ticket.client?.full_name || 'No especificado'}
              </div>
              {ticket.created_by && (
                <div className="metadata-item">
                  <strong>Creado por:</strong> {ticket.created_by.full_name}
                </div>
              )}
              <div className="metadata-item">
                <strong>Creado:</strong> {formatDate(ticket.created_at)}
              </div>
              <div className="metadata-item">
                <strong>Actualizado:</strong> {formatDate(ticket.updated_at)}
              </div>
              {ticket.assigned_engineer && (
                <div className="metadata-item">
                  <strong>Asignado a:</strong> {ticket.assigned_engineer.full_name}
                </div>
              )}
            </div>
          </div>

          {/* OpenSolar Project Data */}
          {ticket.opensolar_data && isStaff && (
            <div className="ticket-info-card">
              <h3>📊 Información del Proyecto (OpenSolar)</h3>
              
              <div className="ticket-metadata">
                {ticket.opensolar_data.project_name && (
                  <div className="metadata-item">
                    <strong>Nombre del Proyecto:</strong> {ticket.opensolar_data.project_name}
                  </div>
                )}
                {ticket.opensolar_data.address && (
                  <div className="metadata-item">
                    <strong>Dirección:</strong> {ticket.opensolar_data.address}
                  </div>
                )}
                {ticket.opensolar_data.client_name && (
                  <div className="metadata-item">
                    <strong>Cliente (OpenSolar):</strong> {ticket.opensolar_data.client_name}
                  </div>
                )}
                {ticket.opensolar_data.client_email && (
                  <div className="metadata-item">
                    <strong>Email:</strong> {ticket.opensolar_data.client_email}
                  </div>
                )}
                {ticket.opensolar_data.client_phone && (
                  <div className="metadata-item">
                    <strong>Teléfono:</strong> {ticket.opensolar_data.client_phone}
                  </div>
                )}
                {ticket.opensolar_data.status && (
                  <div className="metadata-item">
                    <strong>Estado del Proyecto:</strong> {ticket.opensolar_data.status}
                  </div>
                )}
              </div>

              {/* System Details */}
              {(ticket.opensolar_data.system_capacity_kw || ticket.opensolar_data.panel_count) && (
                <>
                  <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>⚡ Equipos Instalados</h4>
                  <div className="ticket-metadata">
                    {ticket.opensolar_data.system_capacity_kw && (
                      <div className="metadata-item">
                        <strong>Capacidad del Sistema:</strong> {ticket.opensolar_data.system_capacity_kw} kW
                      </div>
                    )}
                    {ticket.opensolar_data.panel_count && (
                      <div className="metadata-item">
                        <strong>Paneles Solares:</strong> {ticket.opensolar_data.panel_count} unidades
                      </div>
                    )}
                    {ticket.opensolar_data.panel_model && (
                      <div className="metadata-item">
                        <strong>Modelo de Panel:</strong> {ticket.opensolar_data.panel_model}
                      </div>
                    )}
                    {ticket.opensolar_data.panel_wattage && (
                      <div className="metadata-item">
                        <strong>Potencia por Panel:</strong> {ticket.opensolar_data.panel_wattage} W
                      </div>
                    )}
                    {ticket.opensolar_data.inverter_model && (
                      <div className="metadata-item">
                        <strong>Modelo de Inversor:</strong> {ticket.opensolar_data.inverter_model}
                      </div>
                    )}
                    {ticket.opensolar_data.inverter_count && (
                      <div className="metadata-item">
                        <strong>Cantidad de Inversores:</strong> {ticket.opensolar_data.inverter_count}
                      </div>
                    )}
                    {ticket.opensolar_data.battery_model && (
                      <div className="metadata-item">
                        <strong>Modelo de Batería:</strong> {ticket.opensolar_data.battery_model}
                      </div>
                    )}
                    {ticket.opensolar_data.battery_capacity_kwh && (
                      <div className="metadata-item">
                        <strong>Capacidad de Batería:</strong> {ticket.opensolar_data.battery_capacity_kwh} kWh
                      </div>
                    )}
                    {ticket.opensolar_data.annual_production_kwh && (
                      <div className="metadata-item">
                        <strong>Producción Anual Estimada:</strong> {ticket.opensolar_data.annual_production_kwh.toLocaleString()} kWh
                      </div>
                    )}
                    {ticket.opensolar_data.installation_date && (
                      <div className="metadata-item">
                        <strong>Fecha de Instalación:</strong> {new Date(ticket.opensolar_data.installation_date).toLocaleDateString('es-ES')}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Attachments Section */}
          <div className="attachments-section">
            <div className="section-header">
              <h3>📎 Archivos Adjuntos ({attachments.length})</h3>
              <button 
                className="btn-secondary"
                onClick={() => setShowUpload(!showUpload)}
              >
                {showUpload ? 'Ocultar' : '➕ Subir Archivos'}
              </button>
            </div>
            
            {showUpload && (
              <FileUpload 
                ticketId={ticketId!} 
                onUploadComplete={() => {
                  loadTicketData();
                  setShowUpload(false);
                }}
              />
            )}
            
            <AttachmentGallery 
              attachments={attachments}
              onDelete={(attachmentId) => {
                setAttachments(attachments.filter(a => a.attachment_id !== attachmentId));
              }}
              canDelete={isStaff}
            />
          </div>

          {/* Comments Section */}
          <div className="comments-section">
            <h3>Comentarios ({visibleComments.length})</h3>
            
            <div className="comments-list">
              {visibleComments.length === 0 ? (
                <p className="no-comments">No hay comentarios aún</p>
              ) : (
                visibleComments.map((comment) => (
                  <div key={comment.comment_id} className={`comment-card ${comment.type === 'internal' ? 'comment-internal' : ''}`}>
                    <div className="comment-header">
                      <strong>{comment.user.full_name}</strong>
                      <span className="comment-role">({comment.user.role})</span>
                      {comment.type === 'internal' && (
                        <span className="comment-type-badge">🔒 Interno</span>
                      )}
                      <span className="comment-date">{formatDate(comment.created_at)}</span>
                    </div>
                    <div className="comment-content">{comment.content}</div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="comment-form">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe un comentario..."
                rows={4}
                disabled={submittingComment}
              />
              
              {isStaff && (
                <div className="comment-type-selector">
                  <label>
                    <input
                      type="radio"
                      value="public"
                      checked={commentType === 'public'}
                      onChange={(e) => setCommentType(e.target.value as 'public' | 'internal')}
                    />
                    <span>🔓 Público (cliente puede ver)</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="internal"
                      checked={commentType === 'internal'}
                      onChange={(e) => setCommentType(e.target.value as 'public' | 'internal')}
                    />
                    <span>🔒 Interno (solo equipo)</span>
                  </label>
                </div>
              )}

              <button 
                type="submit" 
                className="btn-primary"
                disabled={submittingComment || !newComment.trim()}
              >
                {submittingComment ? 'Agregando...' : 'Agregar Comentario'}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="ticket-sidebar">
          {isStaff && (
            <>
              <div className="action-card">
                <h3>Cambiar Estado</h3>
                <select 
                  value={ticket.status} 
                  onChange={handleStatusChange}
                  className="action-select"
                >
                  <option value="new">Nuevo</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="waiting">Esperando Cliente</option>
                  <option value="resolved">Resuelto</option>
                  <option value="closed">Cerrado</option>
                </select>
              </div>

              <div className="action-card">
                <h3>Cambiar Prioridad</h3>
                <select 
                  value={ticket.priority} 
                  onChange={handlePriorityChange}
                  className="action-select"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="critical">Crítica</option>
                </select>
              </div>

              {isAdmin && (
                <div className="action-card">
                  <h3>Asignar Ingeniero</h3>
                  <select 
                    value={ticket.assigned_engineer?.user_id || ''} 
                    onChange={handleEngineerChange}
                    className="action-select"
                  >
                    <option value="">Sin asignar</option>
                    {engineers.map((eng) => (
                      <option key={eng.user_id} value={eng.user_id}>
                        {eng.full_name}
                      </option>
                    ))}
                  </select>
                  {ticket.assigned_engineer && (
                    <p className="current-engineer">
                      Actual: {ticket.assigned_engineer.full_name}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          <div className="info-card">
            <h3>Información</h3>
            <p className="info-text">
              Este ticket fue creado el {formatDate(ticket.created_at)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;

