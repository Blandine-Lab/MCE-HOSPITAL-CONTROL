// src/pages/qualite/QualiteModule.jsx
import { Outlet, NavLink } from 'react-router-dom';
import { FaShieldAlt, FaExclamationTriangle, FaClipboardCheck, FaTasks, FaChartLine, FaTimes } from 'react-icons/fa';

const linkStyle = ({ isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  color: isActive ? '#ef4444' : '#cbd5e1',
  textDecoration: 'none',
  padding: '12px 16px',
  borderRadius: '8px',
  backgroundColor: isActive ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
  transition: 'all 0.2s',
  marginBottom: '6px'
});

const QualiteModule = () => (
  <div style={{ display: 'flex', minHeight: '100vh' }}>
    <nav style={{
      width: '250px',
      backgroundColor: '#0f172a',
      color: 'white',
      padding: '24px 16px',
      position: 'fixed',
      height: '100vh',
      overflowY: 'auto'
    }}>
      <h2 style={{
        fontSize: '22px',
        marginBottom: '32px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        color: '#ef4444',
        borderBottom: '1px solid #334155',
        paddingBottom: '16px'
      }}>
        <FaShieldAlt /> Qualité & Risques
      </h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li><NavLink to="/qualite" end style={linkStyle}><FaChartLine /> Tableau de bord</NavLink></li>
        <li><NavLink to="/qualite/signalements" style={linkStyle}><FaExclamationTriangle /> Signalements</NavLink></li>
        <li><NavLink to="/qualite/audits" style={linkStyle}><FaClipboardCheck /> Audits</NavLink></li>
        <li><NavLink to="/qualite/actions-capa" style={linkStyle}><FaTasks /> Actions CAPA</NavLink></li>
        <li><NavLink to="/qualite/indicateurs" style={linkStyle}><FaChartLine /> Indicateurs</NavLink></li>
        <li><NavLink to="/qualite/non-conformites" style={linkStyle}><FaTimes /> Non-conformités</NavLink></li>
        <li><NavLink to="/qualite/evaluations-risques" style={linkStyle}><FaExclamationTriangle /> Évaluations risques</NavLink></li>
      </ul>
    </nav>
    <div style={{
      marginLeft: '250px',
      flex: 1,
      padding: '32px',
      backgroundColor: '#f8fafc',
      minHeight: '100vh'
    }}>
      <Outlet />
    </div>
  </div>
);

export default QualiteModule;