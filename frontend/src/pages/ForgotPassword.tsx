/**
 * Página de Recuperación de Contraseña
 * Green House Project - Sistema de Soporte
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import '../styles/Auth.css';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al enviar solicitud');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <img src="/logo.png" alt="Green House Project" className="auth-logo-image" />
          </div>
          <div className="auth-header">
            <h2>✅ Email Enviado</h2>
            <p className="auth-subtitle">Revisa tu bandeja de entrada</p>
          </div>

          <div className="alert alert-success">
            <p>Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.</p>
            <p style={{ marginTop: '10px', fontSize: '14px' }}>
              El enlace es válido por <strong>1 hora</strong>.
            </p>
          </div>

          <div style={{ marginTop: '20px', padding: '15px', background: '#f9fafb', borderRadius: '8px', fontSize: '14px' }}>
            <p style={{ margin: '0 0 10px 0' }}><strong>💡 Consejos:</strong></p>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Revisa tu carpeta de spam</li>
              <li>Verifica que el email sea correcto</li>
              <li>Si no recibes el email en 5 minutos, intenta de nuevo</li>
            </ul>
          </div>

          <div className="auth-footer" style={{ marginTop: '30px' }}>
            <Link to="/login" className="btn btn-secondary btn-block">
              Volver al Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo.png" alt="Green House Project" className="auth-logo-image" />
        </div>
        <div className="auth-header">
          <h2>🔐 Recuperar Contraseña</h2>
          <p className="auth-subtitle">Ingresa tu email para recibir un enlace de recuperación</p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              disabled={loading}
              autoFocus
            />
            <small style={{ color: '#6b7280', fontSize: '13px', marginTop: '5px', display: 'block' }}>
              Te enviaremos un enlace para restablecer tu contraseña
            </small>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            <Link to="/login">← Volver al Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

