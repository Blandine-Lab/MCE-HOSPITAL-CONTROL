import { Outlet, NavLink } from 'react-router-dom';
import { FaNetworkWired, FaServer, FaExchangeAlt, FaHistory, FaPlug } from 'react-icons/fa';

const linkStyle = ({ isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  color: isActive ? '#3b82f6' : '#cbd5e1',
  textDecoration: 'none',
  padding: '12px 16px',
  borderRadius: '8px',
  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
  transition: 'all 0.2s',
  marginBottom: '6px'
});

const InteroperabiliteModule = () => (
  <div style={{ display: 'flex', minHeight: '100vh' }}>
    <nav style={{ width: '250px', backgroundColor: '#0f172a', color: 'white', padding: '24px 16px', position: 'fixed', height: '100vh', overflowY: 'auto' }}>
      <h2 style={{ fontSize: '22px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '10px', color: '#3b82f6', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <FaNetworkWired /> Interoprabilit
      </h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li><NavLink to="/interoperabilite" end style={linkStyle}><FaPlug /> Tableau de bord</NavLink></li>
        <li><NavLink to="/interoperabilite/systemes" style={linkStyle}><FaServer /> Systmes externes</NavLink></li>
        <li><NavLink to="/interoperabilite/flux" style={linkStyle}><FaExchangeAlt /> Flux</NavLink></li>
        <li><NavLink to="/interoperabilite/logs" style={linkStyle}><FaHistory /> Logs</NavLink></li>
        <li><NavLink to="/interoperabilite/webhooks" style={linkStyle}><FaPlug /> Webhooks</NavLink></li>
      </ul>
    </nav>
    <div style={{ marginLeft: '250px', flex: 1, padding: '32px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Outlet />
    </div>
  </div>
);

export default InteroperabiliteModule;
