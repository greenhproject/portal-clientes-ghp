/**
 * Página de Registro
 * Green House Project - Sistema de Soporte
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Auth.css';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    role: 'client',
    opensolar_project_id: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const registerData = {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone || undefined,
        role: formData.role,
        opensolar_project_ids: formData.opensolar_project_id 
          ? [formData.opensolar_project_id] 
          : [],
      };

      await register(registerData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo.png" alt="Green House Project" className="auth-logo-image" />
        </div>
        <div className="auth-header">
          <h2>Crear Cuenta</h2>
          <p className="auth-subtitle">Regístrate para acceder al sistema</p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="full_name">Nombre Completo *</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Juan Pérez"
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="email">Correo Electrónico *</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="phone">Teléfono</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+57 301 234 5678"
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="role">Tipo de Usuario *</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              disabled={loading}
              className="form-select"
            >
              <option value="client">Cliente</option>
              <option value="engineer">Ingeniero</option>
              <option value="admin">Administrador</option>
            </select>
            <small className="input-hint">
              {formData.role === 'client' && 'Puede crear tickets y ver sus proyectos'}
              {formData.role === 'engineer' && 'Puede gestionar y resolver tickets'}
              {formData.role === 'admin' && 'Acceso completo al sistema'}
            </small>
          </div>

          <div className="input-group">
            <label htmlFor="opensolar_project_id">ID de Proyecto OpenSolar (opcional)</label>
            <input
              id="opensolar_project_id"
              name="opensolar_project_id"
              type="text"
              value={formData.opensolar_project_id}
              onChange={handleChange}
              placeholder="8177994"
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Contraseña *</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña *</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión aquí</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

