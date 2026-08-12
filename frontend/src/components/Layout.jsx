// src/components/Layout.jsx
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaArrowLeft, FaHome } from 'react-icons/fa';
import { usePermissions } from '../hooks/usePermissions';
import { menuItems } from '../config/menu';

const Navbar = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  // Filtrer les lments selon les permissions, puis forcer le chemin de la Pharmacie
  const filteredMenu = menuItems
    .filter(item => hasPermission(item.permission))
    .map(item => {
      // ?? Forcer le chemin de la Pharmacie vers le dashboard
      if (item.label === 'Pharmacie') {
        return { ...item, path: '/pharmacy/dashboard' };
      }
      return item;
    });

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: '#0f172a',
      color: 'white',
      padding: '2px 8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '3px',
      boxShadow: '0 2px 4px -1px rgba(0,0,0,0.3)',
      minHeight: '32px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img 
            src="/logo.jpeg" 
            alt="Logo" 
            style={{ 
              height: '22px',
              width: 'auto',
              objectFit: 'contain'
            }} 
          />
        </Link>

        {/* Menu */}
        <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', fontSize: '11px' }}>
          <Link
            to="/"
            style={{ 
              color: '#94a3b8', 
              textDecoration: 'none', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '2px',
              padding: '1px 4px',
              borderRadius: '4px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <FaHome size={11} />
            <span className="nav-label">Accueil</span>
          </Link>

          {filteredMenu.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{ 
                color: '#94a3b8', 
                textDecoration: 'none', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '2px',
                padding: '1px 4px',
                borderRadius: '4px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <item.icon size={11} />
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: '1px 4px'
          }}
          title="Retour"
        >
          <FaArrowLeft size={11} />
          <span className="nav-label">Retour</span>
        </button>
        <button 
          onClick={handleLogout} 
          style={{
            backgroundColor: '#dc2626',
            border: 'none',
            color: 'white',
            padding: '2px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            fontSize: '11px'
          }}
        >
          <FaSignOutAlt size={11} />
          <span className="nav-label">Dconnexion</span>
        </button>
      </div>
    </nav>
  );
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
