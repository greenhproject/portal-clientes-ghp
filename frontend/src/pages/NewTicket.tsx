/**
 * Página para Crear Nuevo Ticket
 * Green House Project - Sistema de Soporte
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import '../styles/Ticket.css';

const NewTicket: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [engineers, setEngineers] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [categories, setCategories] = useState<string[]>(['Eléctrico', 'Mecánico', 'Rendimiento', 'Otro']);
  const [priorities, setPriorities] = useState<any[]>([
    { name: 'low', label: 'Baja', color: '#6b7280' },
    { name: 'medium', label: 'Media', color: '#3b82f6' },
    { name: 'high', label: 'Alta', color: '#f97316' },
    { name: 'critical', label: 'Crítica', color: '#ef4444' }
  ]);
  const [formData, setFormData] = useState({
    project_id: '',
    category: '',
    subcategory: '',
    priority: 'medium',
    title: '',
    description: '',
    assigned_to: '',
  });

  // Cargar configuración, ingenieros y rol del usuario
  useEffect(() => {
    const loadData = async () => {
      try {
        // Obtener perfil del usuario para verificar rol
        const profile = await apiService.getCurrentUser();
        setUserRole(profile.user.role);

        // Cargar categorías desde settings
        try {
          const categoriesResponse = await apiService.getCategories();
          if (categoriesResponse.categories && categoriesResponse.categories.length > 0) {
            setCategories(categoriesResponse.categories);
            setFormData(prev => ({ ...prev, category: categoriesResponse.categories[0] }));
          }
        } catch (err) {
          console.error('Error loading categories:', err);
        }

        // Cargar prioridades desde settings
        try {
          const prioritiesResponse = await apiService.getPriorities();
          if (prioritiesResponse.priorities && prioritiesResponse.priorities.length > 0) {
            setPriorities(prioritiesResponse.priorities);
          }
        } catch (err) {
          console.error('Error loading priorities:', err);
        }

        // Si es admin o ingeniero, cargar lista de ingenieros
        if (profile.user.role === 'admin' || profile.user.role === 'engineer') {
          const response = await apiService.getEngineers();
          setEngineers(response.engineers || []);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };
    loadData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      setLoadingMessage('Validando datos...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLoadingMessage('Conectando con OpenSolar...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setLoadingMessage('Creando ticket...');
      const response = await apiService.createTicket(formData);
      
      setLoadingMessage('¡Ticket creado exitosamente!');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      navigate(`/tickets/${response.ticket.ticket_id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear el ticket');
      setLoadingMessage('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ticket-page">
      <div className="container">
        <div className="page-header">
          <h1>Crear Nuevo Ticket de Soporte</h1>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Cancelar
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="ticket-form">
          <div className="form-section">
            <h2>Información del Proyecto</h2>
            
            <div className="form-group">
              <label htmlFor="project_id">ID del Proyecto (OpenSolar) *</label>
              <input
                type="text"
                id="project_id"
                name="project_id"
                value={formData.project_id}
                onChange={handleChange}
                placeholder="Ej: 8362212"
                required
              />
              <small>El ID del proyecto en OpenSolar</small>
            </div>
          </div>

          <div className="form-section">
            <h2>Detalles del Problema</h2>
            
            <div className="form-group">
              <label htmlFor="category">Categoría *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="">Seleccione una categoría</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="priority">Prioridad *</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                required
              >
                {priorities.map((priority) => (
                  <option key={priority.name} value={priority.name}>
                    {priority.label}
                  </option>
                ))}
              </select>
              <small>
                {priorities.find(p => p.name === formData.priority)?.name === 'critical' && 'Crítica: Sistema completamente fuera de servicio'}
                {priorities.find(p => p.name === formData.priority)?.name === 'high' && 'Alta: Problema grave que afecta el rendimiento'}
                {priorities.find(p => p.name === formData.priority)?.name === 'medium' && 'Media: Problema que requiere atención'}
                {priorities.find(p => p.name === formData.priority)?.name === 'low' && 'Baja: Consulta o problema menor'}
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="title">Título del Problema *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Resumen breve del problema"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Descripción Detallada *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={6}
                placeholder="Describa el problema en detalle..."
                required
              />
            </div>
          </div>

          {(userRole === 'admin' || userRole === 'engineer') && (
            <div className="form-section">
              <h2>Asignación</h2>
              
              <div className="form-group">
                <label htmlFor="assigned_to">Asignar a Ingeniero</label>
                <select
                  id="assigned_to"
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleChange}
                >
                  <option value="">Sin asignar</option>
                  {engineers.map((engineer) => (
                    <option key={engineer.user_id} value={engineer.user_id}>
                      {engineer.full_name} ({engineer.email})
                    </option>
                  ))}
                </select>
                <small>Opcional: Puede asignarse después</small>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? loadingMessage : 'Crear Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTicket;

