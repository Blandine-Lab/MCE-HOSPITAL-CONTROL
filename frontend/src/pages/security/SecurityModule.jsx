// src/pages/security/SecurityModule.jsx
import { Link, Outlet } from 'react-router-dom';
import { FaShieldAlt, FaUserCog, FaUsers, FaLock, FaClipboardList, FaUserLock } from 'react-icons/fa';

const SecurityModule = () => {
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* En-tte */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <FaShieldAlt style={{ fontSize: '32px', color: '#3b82f6' }} />
        <h1 style={{ margin: 0, color: '#0f172a' }}>Scurit & Conformit</h1>
      </div>

      {/* ---- Bouton Administration ---- */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          to="/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#f59e0b',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '16px',
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: '0 4px 6px rgba(245, 158, 11, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 8px 12px rgba(245, 158, 11, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(245, 158, 11, 0.3)';
          }}
        >
          <FaUserCog /> Administration (Gestion des utilisateurs & rles)
        </Link>
      </div>

      {/* ---- Menu de navigation du module Scurit ---- */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <Link to="/security" style={{ color: '#3b82f6', textDecoration: 'none' }}>?? Tableau de bord</Link>
        <Link to="/security/roles" style={{ color: '#64748b', textDecoration: 'none' }}>?? Rles & Permissions</Link>
        <Link to="/security/permissions" style={{ color: '#64748b', textDecoration: 'none' }}>?? Permissions</Link>
        <Link to="/security/logs" style={{ color: '#64748b', textDecoration: 'none' }}>?? Logs d'audit</Link>
        <Link to="/security/sessions" style={{ color: '#64748b', textDecoration: 'none' }}>??? Sessions actives</Link>
        <Link to="/security/tentatives" style={{ color: '#64748b', textDecoration: 'none' }}>?? Tentatives connexion</Link>
      </div>

      {/* ---- Contenu des sous-routes (DashboardSecurity, RolesList, etc.) ---- */}
      <Outlet />
    </div>
  );
};

export default SecurityModule;
