// src/components/Layout.jsx
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaArrowLeft, FaHome, FaHospital, FaClipboardList } from 'react-icons/fa';
import { usePermissions } from '../hooks/usePermissions';
import { menuItems } from '../config/menu';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const { hopital, logout } = useAuth();

  // 🔑 Branding : super_admin n'a AUCUN hôpital → branding plateforme
  const logoUrl = isSuperAdmin
    ? '/logo.jpeg'
    : (hopital?.logo_url || '/logo.jpeg');
  const nomHopital = isSuperAdmin
    ? 'Super Admin — Plateforme e-Santé'
    : (hopital?.nom || 'Hôpital');

  // 🚪 Logout propre : on supprime TOUT ce qui identifie l'utilisateur
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');      // ⬅️ ajouté
    localStorage.removeItem('hopital');   // ⬅️ ajouté
    if (typeof logout === 'function') logout();
    navigate('/login', { replace: true });
  };

  // 👑 Menu spécifique super_admin : pas d'onglets métier
  if (isSuperAdmin) {
    return (
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        backgroundColor: '#0f172a', color: 'white', padding: '2px 8px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '3px', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.3)',
        minHeight: '32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <Link to="/super-admin" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: '6px' }}>
            <img src={logoUrl} alt="Plateforme" style={{ height: '22px', width: 'auto', objectFit: 'contain' }} />
            <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
              {nomHopital}
            </span>
          </Link>

          <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', fontSize: '11px' }}>
            <Link to="/super-admin" style={navLinkStyle}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <FaHome size={11} />
              <span className="nav-label">Super Admin</span>
            </Link>
            <Link to="/superadmin/hospitals" style={navLinkStyle}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <FaHospital size={11} />
              <span className="nav-label">Hôpitaux</span>
            </Link>
            <Link to="/superadmin/hospitals/new" style={navLinkStyle}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <FaClipboardList size={11} />
              <span className="nav-label">Nouvel hôpital</span>
            </Link>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={() => navigate(-1)} style={backBtnStyle} title="Retour">
            <FaArrowLeft size={11} />
            <span className="nav-label">Retour</span>
          </button>
          <button onClick={handleLogout} style={logoutBtnStyle}>
            <FaSignOutAlt size={11} />
            <span className="nav-label">Déconnexion</span>
          </button>
        </div>
      </nav>
    );
  }

  // 👤 Menu normal pour les admins d'hôpital et autres rôles
  const filteredMenu = menuItems
    .filter(item => hasPermission(item.permission))
    .map(item => {
      if (item.label === 'Pharmacie') {
        return { ...item, path: '/pharmacy/dashboard' };
      }
      return item;
    });

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      backgroundColor: '#0f172a', color: 'white', padding: '2px 8px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: '3px', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.3)',
      minHeight: '32px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: '6px' }}>
          <img src={logoUrl} alt={`Logo ${nomHopital}`} style={{ height: '22px', width: 'auto', objectFit: 'contain' }} />
          <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
            {nomHopital}
          </span>
        </Link>

        <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', fontSize: '11px' }}>
          <Link
            to="/"
            style={navLinkStyle}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <FaHome size={11} />
            <span className="nav-label">Accueil</span>
          </Link>

          {/* 📚 Bibliothèque (multi-tenant, Supabase) */}
          <Link
            to="/library"
            style={navLinkStyle}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            📚
            <span className="nav-label">Bibliothèque</span>
          </Link>

          {filteredMenu.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={navLinkStyle}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <item.icon size={11} />
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button onClick={() => navigate(-1)} style={backBtnStyle} title="Retour">
          <FaArrowLeft size={11} />
          <span className="nav-label">Retour</span>
        </button>
        <button onClick={handleLogout} style={logoutBtnStyle}>
          <FaSignOutAlt size={11} />
          <span className="nav-label">Déconnexion</span>
        </button>
      </div>
    </nav>
  );
};

const navLinkStyle = {
  color: '#94a3b8',
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
  padding: '1px 4px',
  borderRadius: '4px',
  transition: 'background 0.2s',
};

const backBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: '11px',
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
  padding: '1px 4px',
};

const logoutBtnStyle = {
  backgroundColor: '#dc2626',
  border: 'none',
  color: 'white',
  padding: '2px 10px',
  borderRadius: '4px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
  fontSize: '11px',
};

const Layout = () => {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: '36px' }}>
        <Outlet />
      </div>
    </>
  );
};

export default Layout;