/**
 * Settings Page - Platform Configuration
 * Green House Project - Sistema de Soporte
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import '../styles/Settings.css';

interface Settings {
  sla?: {
    first_response_time: number;
    resolution_time_critical: number;
    resolution_time_high: number;
    resolution_time_medium: number;
    resolution_time_low: number;
    business_hours_start: string;
    business_hours_end: string;
  };
  categories?: string[];
  priorities?: Array<{
    name: string;
    color: string;
    sla_hours: number;
  }>;
  notifications?: {
    email_enabled: boolean;
    whatsapp_enabled: boolean;
    notify_on_new_ticket: boolean;
    notify_on_assignment: boolean;
    notify_on_status_change: boolean;
    notify_on_comment: boolean;
  };
  branding?: {
    company_name: string;
    logo_url: string;
    primary_color: string;
    secondary_color: string;
  };
  automations?: {
    auto_assign_enabled: boolean;
    auto_escalation_enabled: boolean;
    auto_escalation_hours: number;
    auto_close_resolved_days: number;
  };
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('sla');
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New category state
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await apiService.getSettings?.() || {};
      setSettings(data);
    } catch (err) {
      console.error('Error loading settings:', err);
      // Set default values if API fails
      setSettings({
        sla: {
          first_response_time: 2,
          resolution_time_critical: 4,
          resolution_time_high: 24,
          resolution_time_medium: 48,
          resolution_time_low: 72,
          business_hours_start: '08:00',
          business_hours_end: '18:00',
        },
        categories: ['Eléctrico', 'Mecánico', 'Rendimiento', 'Otro'],
        priorities: [
          { name: 'critical', color: '#dc2626', sla_hours: 4 },
          { name: 'high', color: '#ea580c', sla_hours: 24 },
          { name: 'medium', color: '#2563eb', sla_hours: 48 },
          { name: 'low', color: '#6b7280', sla_hours: 72 },
        ],
        notifications: {
          email_enabled: true,
          whatsapp_enabled: false,
          notify_on_new_ticket: true,
          notify_on_assignment: true,
          notify_on_status_change: true,
          notify_on_comment: true,
        },
        branding: {
          company_name: 'Green House Project',
          logo_url: '',
          primary_color: '#10b981',
          secondary_color: '#059669',
        },
        automations: {
          auto_assign_enabled: false,
          auto_escalation_enabled: false,
          auto_escalation_hours: 24,
          auto_close_resolved_days: 7,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await apiService.updateSettings?.(settings);
      setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Error al guardar configuración' });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const updateSLA = (field: string, value: any) => {
    setSettings({
      ...settings,
      sla: {
        ...settings.sla,
        [field]: value,
      } as any,
    });
  };

  const updateNotifications = (field: string, value: boolean) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [field]: value,
      } as any,
    });
  };

  const updateBranding = (field: string, value: string) => {
    setSettings({
      ...settings,
      branding: {
        ...settings.branding,
        [field]: value,
      } as any,
    });
  };

  const updateAutomations = (field: string, value: any) => {
    setSettings({
      ...settings,
      automations: {
        ...settings.automations,
        [field]: value,
      } as any,
    });
  };

  const addCategory = () => {
    if (newCategory.trim()) {
      setSettings({
        ...settings,
        categories: [...(settings.categories || []), newCategory.trim()],
      });
      setNewCategory('');
    }
  };

  const removeCategory = (category: string) => {
    setSettings({
      ...settings,
      categories: (settings.categories || []).filter(c => c !== category),
    });
  };

  if (user?.role !== 'admin') {
    return (
      <div className="settings-container">
        <div className="alert alert-error">
          No tienes permisos para acceder a esta página
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <header className="settings-header">
        <h1>Configuración del Sistema</h1>
        <p>Personaliza y configura la plataforma según tus necesidades</p>
      </header>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-layout">
        {/* Tabs Navigation */}
        <nav className="settings-tabs">
          <button
            className={`tab-button ${activeTab === 'sla' ? 'active' : ''}`}
            onClick={() => setActiveTab('sla')}
          >
            <span className="tab-icon">⏱️</span>
            SLA y Tiempos
          </button>
          <button
            className={`tab-button ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            <span className="tab-icon">📋</span>
            Categorías
          </button>
          <button
            className={`tab-button ${activeTab === 'priorities' ? 'active' : ''}`}
            onClick={() => setActiveTab('priorities')}
          >
            <span className="tab-icon">🎯</span>
            Prioridades
          </button>
          <button
            className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <span className="tab-icon">🔔</span>
            Notificaciones
          </button>
          <button
            className={`tab-button ${activeTab === 'branding' ? 'active' : ''}`}
            onClick={() => setActiveTab('branding')}
          >
            <span className="tab-icon">🎨</span>
            Branding
          </button>
          <button
            className={`tab-button ${activeTab === 'automations' ? 'active' : ''}`}
            onClick={() => setActiveTab('automations')}
          >
            <span className="tab-icon">⚡</span>
            Automatizaciones
          </button>
        </nav>

        {/* Tab Content */}
        <div className="settings-content">
          {/* SLA Tab */}
          {activeTab === 'sla' && (
            <div className="settings-section">
              <h2>Configuración de SLA</h2>
              <p className="section-description">
                Define los tiempos objetivo de respuesta y resolución para garantizar la calidad del servicio
              </p>

              <div className="form-grid">
                <div className="form-group">
                  <label>Tiempo de Primera Respuesta (horas)</label>
                  <input
                    type="number"
                    value={settings.sla?.first_response_time || 2}
                    onChange={(e) => updateSLA('first_response_time', parseInt(e.target.value))}
                    min="1"
                  />
                  <small>Tiempo máximo para dar la primera respuesta a un ticket nuevo</small>
                </div>

                <div className="form-group">
                  <label>Horario de Operación - Inicio</label>
                  <input
                    type="time"
                    value={settings.sla?.business_hours_start || '08:00'}
                    onChange={(e) => updateSLA('business_hours_start', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Horario de Operación - Fin</label>
                  <input
                    type="time"
                    value={settings.sla?.business_hours_end || '18:00'}
                    onChange={(e) => updateSLA('business_hours_end', e.target.value)}
                  />
                </div>
              </div>

              <h3>Tiempos de Resolución por Prioridad</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Crítica (horas)</label>
                  <input
                    type="number"
                    value={settings.sla?.resolution_time_critical || 4}
                    onChange={(e) => updateSLA('resolution_time_critical', parseInt(e.target.value))}
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label>Alta (horas)</label>
                  <input
                    type="number"
                    value={settings.sla?.resolution_time_high || 24}
                    onChange={(e) => updateSLA('resolution_time_high', parseInt(e.target.value))}
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label>Media (horas)</label>
                  <input
                    type="number"
                    value={settings.sla?.resolution_time_medium || 48}
                    onChange={(e) => updateSLA('resolution_time_medium', parseInt(e.target.value))}
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label>Baja (horas)</label>
                  <input
                    type="number"
                    value={settings.sla?.resolution_time_low || 72}
                    onChange={(e) => updateSLA('resolution_time_low', parseInt(e.target.value))}
                    min="1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="settings-section">
              <h2>Gestión de Categorías</h2>
              <p className="section-description">
                Personaliza las categorías de tickets según los tipos de problemas que manejas
              </p>

              <div className="add-category-form">
                <input
                  type="text"
                  placeholder="Nueva categoría..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                />
                <button onClick={addCategory} className="btn btn-primary">
                  + Agregar
                </button>
              </div>

              <div className="categories-list">
                {(settings.categories || []).map((category, index) => (
                  <div key={index} className="category-item">
                    <span className="category-name">{category}</span>
                    <button
                      onClick={() => removeCategory(category)}
                      className="btn-remove"
                      title="Eliminar categoría"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Priorities Tab */}
          {activeTab === 'priorities' && (
            <div className="settings-section">
              <h2>Configuración de Prioridades</h2>
              <p className="section-description">
                Define los niveles de prioridad y sus características visuales
              </p>

              <div className="priorities-list">
                {(settings.priorities || []).map((priority, index) => (
                  <div key={index} className="priority-item">
                    <div className="priority-header">
                      <div className="priority-color" style={{ backgroundColor: priority.color }}></div>
                      <h3>{priority.name.charAt(0).toUpperCase() + priority.name.slice(1)}</h3>
                    </div>
                    <div className="priority-details">
                      <div className="form-group-inline">
                        <label>Color:</label>
                        <input
                          type="color"
                          value={priority.color}
                          onChange={(e) => {
                            const newPriorities = [...(settings.priorities || [])];
                            newPriorities[index].color = e.target.value;
                            setSettings({ ...settings, priorities: newPriorities });
                          }}
                        />
                      </div>
                      <div className="form-group-inline">
                        <label>SLA (horas):</label>
                        <input
                          type="number"
                          value={priority.sla_hours}
                          onChange={(e) => {
                            const newPriorities = [...(settings.priorities || [])];
                            newPriorities[index].sla_hours = parseInt(e.target.value);
                            setSettings({ ...settings, priorities: newPriorities });
                          }}
                          min="1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h2>Configuración de Notificaciones</h2>
              <p className="section-description">
                Controla cuándo y cómo se envían las notificaciones a los usuarios
              </p>

              <div className="notification-settings">
                <div className="setting-group">
                  <h3>Canales de Notificación</h3>
                  <div className="toggle-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={settings.notifications?.email_enabled || false}
                        onChange={(e) => updateNotifications('email_enabled', e.target.checked)}
                      />
                      <span>Notificaciones por Email</span>
                    </label>
                  </div>
                  <div className="toggle-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={settings.notifications?.whatsapp_enabled || false}
                        onChange={(e) => updateNotifications('whatsapp_enabled', e.target.checked)}
                      />
                      <span>Notificaciones por WhatsApp</span>
                    </label>
                  </div>
                </div>

                <div className="setting-group">
                  <h3>Eventos que Disparan Notificaciones</h3>
                  <div className="toggle-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={settings.notifications?.notify_on_new_ticket || false}
                        onChange={(e) => updateNotifications('notify_on_new_ticket', e.target.checked)}
                      />
                      <span>Nuevo ticket creado</span>
                    </label>
                  </div>
                  <div className="toggle-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={settings.notifications?.notify_on_assignment || false}
                        onChange={(e) => updateNotifications('notify_on_assignment', e.target.checked)}
                      />
                      <span>Ticket asignado a ingeniero</span>
                    </label>
                  </div>
                  <div className="toggle-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={settings.notifications?.notify_on_status_change || false}
                        onChange={(e) => updateNotifications('notify_on_status_change', e.target.checked)}
                      />
                      <span>Cambio de estado del ticket</span>
                    </label>
                  </div>
                  <div className="toggle-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={settings.notifications?.notify_on_comment || false}
                        onChange={(e) => updateNotifications('notify_on_comment', e.target.checked)}
                      />
                      <span>Nuevo comentario agregado</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className="settings-section">
              <h2>Personalización de Marca</h2>
              <p className="section-description">
                Personaliza la apariencia de la plataforma con tu identidad corporativa
              </p>

              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre de la Empresa</label>
                  <input
                    type="text"
                    value={settings.branding?.company_name || ''}
                    onChange={(e) => updateBranding('company_name', e.target.value)}
                    placeholder="Green House Project"
                  />
                </div>

                <div className="form-group">
                  <label>URL del Logo</label>
                  <input
                    type="url"
                    value={settings.branding?.logo_url || ''}
                    onChange={(e) => updateBranding('logo_url', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div className="form-group">
                  <label>Color Primario</label>
                  <div className="color-picker">
                    <input
                      type="color"
                      value={settings.branding?.primary_color || '#10b981'}
                      onChange={(e) => updateBranding('primary_color', e.target.value)}
                    />
                    <input
                      type="text"
                      value={settings.branding?.primary_color || '#10b981'}
                      onChange={(e) => updateBranding('primary_color', e.target.value)}
                      placeholder="#10b981"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Color Secundario</label>
                  <div className="color-picker">
                    <input
                      type="color"
                      value={settings.branding?.secondary_color || '#059669'}
                      onChange={(e) => updateBranding('secondary_color', e.target.value)}
                    />
                    <input
                      type="text"
                      value={settings.branding?.secondary_color || '#059669'}
                      onChange={(e) => updateBranding('secondary_color', e.target.value)}
                      placeholder="#059669"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Automations Tab */}
          {activeTab === 'automations' && (
            <div className="settings-section">
              <h2>Automatizaciones</h2>
              <p className="section-description">
                Configura reglas automáticas para optimizar el flujo de trabajo
              </p>

              <div className="automation-settings">
                <div className="automation-item">
                  <div className="automation-header">
                    <label>
                      <input
                        type="checkbox"
                        checked={settings.automations?.auto_assign_enabled || false}
                        onChange={(e) => updateAutomations('auto_assign_enabled', e.target.checked)}
                      />
                      <span>Auto-asignación de Tickets</span>
                    </label>
                  </div>
                  <p className="automation-description">
                    Asignar automáticamente tickets nuevos a ingenieros disponibles según carga de trabajo
                  </p>
                </div>

                <div className="automation-item">
                  <div className="automation-header">
                    <label>
                      <input
                        type="checkbox"
                        checked={settings.automations?.auto_escalation_enabled || false}
                        onChange={(e) => updateAutomations('auto_escalation_enabled', e.target.checked)}
                      />
                      <span>Escalamiento Automático</span>
                    </label>
                  </div>
                  <p className="automation-description">
                    Escalar tickets sin respuesta después de un tiempo determinado
                  </p>
                  {settings.automations?.auto_escalation_enabled && (
                    <div className="form-group-inline">
                      <label>Escalar después de (horas):</label>
                      <input
                        type="number"
                        value={settings.automations?.auto_escalation_hours || 24}
                        onChange={(e) => updateAutomations('auto_escalation_hours', parseInt(e.target.value))}
                        min="1"
                      />
                    </div>
                  )}
                </div>

                <div className="automation-item">
                  <div className="automation-header">
                    <label>
                      <span>Cierre Automático de Tickets Resueltos</span>
                    </label>
                  </div>
                  <p className="automation-description">
                    Cerrar automáticamente tickets que han estado en estado "Resuelto" por varios días
                  </p>
                  <div className="form-group-inline">
                    <label>Cerrar después de (días):</label>
                    <input
                      type="number"
                      value={settings.automations?.auto_close_resolved_days || 7}
                      onChange={(e) => updateAutomations('auto_close_resolved_days', parseInt(e.target.value))}
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="settings-actions">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="btn btn-primary btn-large"
            >
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

