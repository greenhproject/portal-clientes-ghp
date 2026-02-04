/**
 * Página de Restablecer Contraseña
 * Green House Project - Sistema de Soporte
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import '../styles/Auth.css';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setError('Token no proporcionado');
      setValidating(false);
      return;
    }

    setToken(tokenParam);
    validateToken(tokenParam);
  }, [searchParams]);

  const validateToken = async (tokenToValidate: string) => {
    try {
      const response = await api.validateResetToken(tokenToValidate);
      if (response.valid) {
        setTokenValid(true);
        setUserEmail(response.email);
      } else {
        setError(response.error || 'Token inválido o expirado');
        setTokenValid(false);
      }
    } catch (err: any) {
      setError('Error al validar token');
      setTokenValid(false);
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      await api.resetPassword(token, newPassword);
      setSuccess(true);
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al actualizar contraseña');
    } finally {
      setLoading(false);
    }
  };

  // Validando token
  if (validating) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <img src="/logo.png" alt="Green House Project" className="auth-logo-image" />
          </div>
          <div className="auth-header">
            <h2>⏳ Validando...</h2>
            <p className="auth-subtitle">Verificando token de recuperación</p>
          </div>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  // Token inválido
  if (!tokenValid) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <img src="/logo.png" alt="Green House Project" className="auth-logo-image" />
          </div>
          <div className="auth-header">
            <h2>❌ Token Inválido</h2>
            <p className="auth-subtitle">No se puede restablecer la contraseña</p>
          </div>

          <div className="alert alert-error">
            {error || 'El enlace de recuperación es inválido o ha expirado'}
          </div>

          <div style={{ marginTop: '20px', padding: '15px', background: '#f9fafb', borderRadius: '8px', fontSize: '14px' }}>
            <p style={{ margin: '0 0 10px 0' }}><strong>💡 Posibles razones:</strong></p>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>El enlace ha expirado (válido por 1 hora)</li>
              <li>El enlace ya fue utilizado</li>
              <li>El enlace es incorrecto</li>
            </ul>
          </div>

          <div className="auth-footer" style={{ marginTop: '30px' }}>
            <Link to="/forgot-password" className="btn btn-primary btn-block">
              Solicitar Nuevo Enlace
            </Link>
            <p style={{ marginTop: '15px' }}>
              <Link to="/login">← Volver al Login</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Éxito
  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <img src="/logo.png" alt="Green House Project" className="auth-logo-image" />
          </div>
          <div className="auth-header">
            <h2>✅ Contraseña Actualizada</h2>
            <p className="auth-subtitle">Tu contraseña ha sido restablecida exitosamente</p>
          </div>

          <div className="alert alert-success">
            <p>Ya puedes iniciar sesión con tu nueva contraseña.</p>
            <p style={{ marginTop: '10px', fontSize: '14px' }}>
              Redirigiendo al login en 3 segundos...
            </p>
          </div>

          <div className="auth-footer" style={{ marginTop: '30px' }}>
            <Link to="/login" className="btn btn-primary btn-block">
              Ir al Login Ahora
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Formulario de reset
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo.png" alt="Green House Project" className="auth-logo-image" />
        </div>
        <div className="auth-header">
          <h2>🔐 Nueva Contraseña</h2>
          <p className="auth-subtitle">Establece una nueva contraseña para tu cuenta</p>
        </div>

        {userEmail && (
          <div style={{ marginBottom: '20px', padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '14px' }}>
            <p style={{ margin: 0 }}>
              <strong>📧 Email:</strong> {userEmail}
            </p>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="newPassword">Nueva Contraseña</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              disabled={loading}
              autoFocus
              minLength={6}
            />
            <small style={{ color: '#6b7280', fontSize: '13px', marginTop: '5px', display: 'block' }}>
              Debe tener al menos 6 caracteres
            </small>
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              required
              disabled={loading}
              minLength={6}
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <small style={{ color: '#ef4444', fontSize: '13px', marginTop: '5px', display: 'block' }}>
                ⚠️ Las contraseñas no coinciden
              </small>
            )}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading || newPassword !== confirmPassword}
          >
            {loading ? 'Actualizando...' : 'Restablecer Contraseña'}
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

export default ResetPassword;

