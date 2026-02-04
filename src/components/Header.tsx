import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Header.css';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      'client': 'Cliente',
      'engineer': 'Ingeniero',
      'admin': 'Administrador'
    };
    return roles[role] || role;
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Logo Section */}
        <div className="header-logo" onClick={() => navigate('/dashboard')}>
          <img 
            src="/logo-icon.png" 
            alt="Green House Project" 
            className="header-logo-icon"
          />
          <div className="header-logo-text">
            <span className="logo-green">Green</span>
            <span className="logo-gray">House</span>
            <span className="logo-black">Project</span>
          </div>
        </div>

        {/* Mobile Menu Button */}
        {user && (
          <button 
            className="mobile-menu-btn"
            onClick={toggleMobileMenu}
            aria-label="Menú"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        )}

        {/* Navigation - Desktop */}
        {user && (
          <nav className="header-nav desktop-nav">
            <button 
              className="nav-link"
              onClick={() => navigate('/dashboard')}
            >
              📊 Dashboard
            </button>
            <button 
              className="nav-link"
              onClick={() => navigate('/tickets/new')}
            >
              ➕ Nuevo Ticket
            </button>
            {user.role === 'admin' && (
              <>
                <button 
                  className="nav-link"
                  onClick={() => navigate('/users')}
                >
                  👥 Usuarios
                </button>
                <button 
                  className="nav-link"
                  onClick={() => navigate('/settings')}
                >
                  ⚙️ Configuración
                </button>
              </>
            )}
          </nav>
        )}

        {/* User Section - Desktop */}
        {user && (
          <div className="header-user desktop-user">
            <div className="user-info">
              <img 
                src="/logo-icon-padded.png" 
                alt="Avatar" 
                className="user-avatar"
              />
              <div className="user-details">
                <span className="user-name">{user.full_name}</span>
                <span className="user-role">{getRoleName(user.role)}</span>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>

      {/* Mobile Menu Drawer - Rendered via Portal */}
      {user && mobileMenuOpen && ReactDOM.createPortal(
        <>
          <div className="mobile-menu-overlay" onClick={toggleMobileMenu}></div>
          <div className="mobile-menu">
            {/* User Info in Mobile Menu */}
            <div className="mobile-menu-user">
              <img 
                src="/logo-icon-padded.png" 
                alt="Avatar" 
                className="mobile-user-avatar"
              />
              <div className="mobile-user-details">
                <span className="mobile-user-name">{user.full_name}</span>
                <span className="mobile-user-role">{getRoleName(user.role)}</span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="mobile-menu-nav">
              <button 
                className="mobile-nav-link"
                onClick={() => handleNavClick('/dashboard')}
              >
                <span className="mobile-nav-icon">📊</span>
                <span>Dashboard</span>
              </button>
              <button 
                className="mobile-nav-link"
                onClick={() => handleNavClick('/tickets/new')}
              >
                <span className="mobile-nav-icon">➕</span>
                <span>Nuevo Ticket</span>
              </button>
              {user.role === 'admin' && (
                <>
                  <button 
                    className="mobile-nav-link"
                    onClick={() => handleNavClick('/users')}
                  >
                    <span className="mobile-nav-icon">👥</span>
                    <span>Usuarios</span>
                  </button>
                  <button 
                    className="mobile-nav-link"
                    onClick={() => handleNavClick('/settings')}
                  >
                    <span className="mobile-nav-icon">⚙️</span>
                    <span>Configuración</span>
                  </button>
                </>
              )}
              <button 
                className="mobile-nav-link logout-link"
                onClick={handleLogout}
              >
                <span className="mobile-nav-icon">🚪</span>
                <span>Cerrar Sesión</span>
              </button>
            </nav>
          </div>
        </>,
        document.body
      )}
    </header>
  );
};

export default Header;

