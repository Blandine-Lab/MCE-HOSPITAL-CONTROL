// src/pages/laboratoire-imagerie/LaboratoireImagerieModule.jsx
import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../axios';
import {
  FaFlask,
  FaList,
  FaPlus,
  FaClipboardCheck,
  FaMicroscope,
  FaBell,
  FaChartBar,
  FaCog,
  FaBars,
  FaTimes,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa';

const LaboratoireImagerieModule = () => {
  const { user, loading } = useAuth();
  const permissions = user?.permissions || [];
  
  // ✅ Autorisation : admin, biologiste, laborantin ou permission view_laboratory
  const canView = 
    permissions.includes('view_laboratory') || 
    user?.role === 'admin' || 
    user?.role === 'biologiste' ||
    user?.role === 'laborantin';
    
  // ✅ Le laborantin peut gérer (saisir/finaliser) même sans permission explicite
  const canManage = permissions.includes('manage_laboratory') || user?.role === 'laborantin';
  const canValidate = permissions.includes('validate_laboratory') || user?.role === 'biologiste';
  const isAdmin = user?.role === 'admin';

  const [counts, setCounts] = useState({ total: 0, urgent: 0, aSaisir: 0, aValider: 0 });
  const [notifications, setNotifications] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const location = useLocation();

  // Chargement des compteurs
  useEffect(() => {
    if (!canView) return;
    const fetchCounts = async () => {
      try {
        const res = await api.get('/examens/counts');
        setCounts(res.data);
      } catch (err) {
        console.error('Erreur chargement compteurs', err);
      }
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, [canView]);

  // Notifications (polling)
  useEffect(() => {
    if (!canView) return;
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/examens/recent');
        setNotifications(res.data);
      } catch (err) {
        console.error('Erreur notifications', err);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [canView]);

  // Responsive
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setIsMenuOpen(true);
      else setIsMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Gestion du chargement du profil
  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px' }}>⏳ Chargement du profil utilisateur...</div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#ef4444' }}>
        <h2>Accès non autorisé</h2>
        <p>Vous n'avez pas les permissions nécessaires pour accéder à ce module.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {isMobile && (
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 1000,
            backgroundColor: '#0f172a',
            color: 'white',
            border: 'none',
            padding: '10px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '18px'
          }}
        >
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
      )}

      <nav
        style={{
          width: isMenuOpen ? (isMobile ? '280px' : '260px') : '0',
          backgroundColor: '#0f172a',
          color: 'white',
          padding: isMenuOpen ? '24px 16px' : '0',
          boxShadow: '2px 0 10px rgba(0,0,0,0.2)',
          position: 'fixed',
          height: '100vh',
          overflowY: 'auto',
          transition: 'width 0.3s ease',
          zIndex: 999,
          overflowX: 'hidden'
        }}
      >
        <h2
          style={{
            fontSize: '20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#f472b6',
            borderBottom: '1px solid #334155',
            paddingBottom: '16px',
            whiteSpace: 'nowrap'
          }}
        >
          <FaFlask /> Labo & Imagerie
        </h2>

        {notifications.length > 0 && (
          <div
            style={{
              backgroundColor: 'rgba(244, 114, 182, 0.2)',
              padding: '8px 12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#f472b6'
            }}
          >
            <FaBell /> {notifications.length} nouveau(x) examen(s)
          </div>
        )}

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li style={{ marginBottom: '8px', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Demandes
          </li>
          <MenuItem
            to="/laboratoire"
            icon={<FaList />}
            label="Tous les examens"
            badge={counts.total}
            end
          />
          <MenuItem
            to="/laboratoire/urgents"
            icon={<FaExclamationTriangle />}
            label="Urgents"
            badge={counts.urgent}
            badgeColor="#dc2626"
          />

          {canManage && (
            <>
              <li style={{ marginTop: '16px', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Saisie
              </li>
              <MenuItem
                to="/laboratoire/resultats"
                icon={<FaMicroscope />}
                label="Résultats à saisir"
                badge={counts.aSaisir}
                badgeColor="#f59e0b"
              />
              {canValidate && (
                <MenuItem
                  to="/laboratoire/validation"
                  icon={<FaClipboardCheck />}
                  label="�FC valider"
                  badge={counts.aValider}
                  badgeColor="#8b5cf6"
                />
              )}
              <MenuItem
                to="/laboratoire/examen/nouveau"
                icon={<FaPlus />}
                label="Nouvel examen"
              />
            </>
          )}

          {isAdmin && (
            <>
              <li style={{ marginTop: '16px', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Administration
              </li>
              <MenuItem
                to="/laboratoire/types"
                icon={<FaClipboardCheck />}
                label="Types d'examens"
              />
              <MenuItem
                to="/laboratoire/parametres"
                icon={<FaCog />}
                label="Paramètres"
              />
            </>
          )}

          <li style={{ marginTop: '16px', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Rapports
          </li>
          <MenuItem
            to="/laboratoire/stats"
            icon={<FaChartBar />}
            label="Statistiques"
          />
        </ul>
      </nav>

      <div
        style={{
          marginLeft: isMenuOpen ? (isMobile ? '280px' : '260px') : '0',
          flex: 1,
          padding: isMobile ? '70px 16px 32px' : '32px',
          backgroundColor: '#f8fafc',
          minHeight: '100vh',
          transition: 'margin-left 0.3s ease'
        }}
      >
        <Breadcrumb />
        <Outlet />
      </div>
    </div>
  );
};

// Composant réutilisable pour un élément de menu
const MenuItem = ({ to, icon, label, badge, badgeColor = '#f472b6', end }) => {
  return (
    <li style={{ marginBottom: '4px' }}>
      <NavLink
        to={to}
        end={end}
        style={({ isActive }) => ({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          color: isActive ? '#f472b6' : '#cbd5e1',
          textDecoration: 'none',
          padding: '10px 14px',
          borderRadius: '8px',
          backgroundColor: isActive ? 'rgba(244, 114, 182, 0.15)' : 'transparent',
          transition: 'all 0.2s'
        })}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {icon} {label}
        </span>
        {badge > 0 && (
          <span
            style={{
              backgroundColor: badgeColor,
              color: 'white',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
              minWidth: '20px',
              textAlign: 'center'
            }}
          >
            {badge}
          </span>
        )}
      </NavLink>
    </li>
  );
};

// Composant Breadcrumb
const Breadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 1 && pathnames[0] === 'laboratoire') {
    return null;
  }

  return (
    <div style={{ marginBottom: '20px', fontSize: '14px', color: '#64748b' }}>
      <Link to="/laboratoire" style={{ color: '#3b82f6', textDecoration: 'none' }}>
        <FaFlask style={{ marginRight: '4px' }} /> Accueil
      </Link>
      {pathnames.slice(1).map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 2).join('/')}`;
        const isLast = index === pathnames.length - 2;
        const displayName = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');
        return (
          <span key={routeTo}>
            <span style={{ margin: '0 8px' }}>/</span>
            {isLast ? (
              <span style={{ fontWeight: '500', color: '#0f172a' }}>{displayName}</span>
            ) : (
              <Link to={routeTo} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                {displayName}
              </Link>
            )}
          </span>
        );
      })}
    </div>
  );
};

export default LaboratoireImagerieModule;
