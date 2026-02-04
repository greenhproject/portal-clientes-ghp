/**
 * Página de Gestión de Usuarios (Solo Administradores)
 * Green House Project - Sistema de Soporte
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';
import '../styles/UserManagement.css';

interface User {
  user_id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  opensolar_project_ids?: string[];
  created_at: string;
  last_login?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Verificar que el usuario sea admin
  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.getUsers();
      setUsers(response.users || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser({ ...user });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      await api.updateUser(editingUser.user_id, {
        full_name: editingUser.full_name,
        email: editingUser.email,
        phone: editingUser.phone,
        role: editingUser.role,
        opensolar_project_ids: editingUser.opensolar_project_ids
      });

      setShowEditModal(false);
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al actualizar usuario');
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar al usuario ${userName}?`)) {
      return;
    }

    try {
      await api.deleteUser(userId);
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar usuario');
    }
  };

  const getRoleBadge = (role: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      admin: { label: 'Administrador', className: 'badge-admin' },
      engineer: { label: 'Ingeniero', className: 'badge-engineer' },
      client: { label: 'Cliente', className: 'badge-client' }
    };
    const badge = badges[role] || { label: role, className: 'badge-default' };
    return <span className={`role-badge ${badge.className}`}>{badge.label}</span>;
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando usuarios...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="user-management-container">
        <div className="page-header">
          <h1>Gestión de Usuarios</h1>
          <p className="page-subtitle">Administra los usuarios del sistema</p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Rol</th>
                <th>Proyectos</th>
                <th>Registro</th>
                <th>Último Acceso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id}>
                  <td className="user-name">{user.full_name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone || '-'}</td>
                  <td>{getRoleBadge(user.role)}</td>
                  <td>
                    {user.opensolar_project_ids && user.opensolar_project_ids.length > 0
                      ? user.opensolar_project_ids.join(', ')
                      : '-'}
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    {user.last_login
                      ? new Date(user.last_login).toLocaleDateString()
                      : 'Nunca'}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => handleEdit(user)}
                      title="Editar usuario"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDelete(user.user_id, user.full_name)}
                      title="Eliminar usuario"
                      disabled={user.user_id === currentUser?.user_id}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="empty-state">
              <p>No hay usuarios registrados</p>
            </div>
          )}
        </div>

        {/* Modal de Edición */}
        {showEditModal && editingUser && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Editar Usuario</h2>
                <button
                  className="modal-close"
                  onClick={() => setShowEditModal(false)}
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="input-group">
                  <label>Nombre Completo</label>
                  <input
                    type="text"
                    value={editingUser.full_name}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, full_name: e.target.value })
                    }
                  />
                </div>

                <div className="input-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, email: e.target.value })
                    }
                  />
                </div>

                <div className="input-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    value={editingUser.phone || ''}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, phone: e.target.value })
                    }
                  />
                </div>

                <div className="input-group">
                  <label>Rol</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, role: e.target.value })
                    }
                  >
                    <option value="client">Cliente</option>
                    <option value="engineer">Ingeniero</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>IDs de Proyectos OpenSolar (separados por coma)</label>
                  <input
                    type="text"
                    value={editingUser.opensolar_project_ids?.join(', ') || ''}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        opensolar_project_ids: e.target.value
                          .split(',')
                          .map((id) => id.trim())
                          .filter((id) => id)
                      })
                    }
                    placeholder="8177994, 8381979"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={handleSaveEdit}>
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UserManagement;

