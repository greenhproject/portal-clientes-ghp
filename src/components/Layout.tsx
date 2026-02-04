import React from 'react';
import Header from './Header';
import '../styles/Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="app-layout">
      <Header />
      <main className="app-main">
        {children}
      </main>
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <img src="/logo-icon.png" alt="GHP" className="footer-icon" />
            <span>Green House Project</span>
          </div>
          <div className="footer-text">
            <p>Revoluciona el concepto de vivir</p>
            <p className="footer-copyright">© 2025 Green House Project. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

