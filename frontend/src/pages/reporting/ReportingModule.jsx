// src/pages/reporting/ReportingModule.jsx
import { Outlet, NavLink } from 'react-router-dom';
import { FaChartBar, FaChartPie, FaFileExport, FaSave, FaDatabase } from 'react-icons/fa';

const linkStyle = ({ isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  color: isActive ? '#8b5cf6' : '#cbd5e1',
  textDecoration: 'none',
  padding: '12px 16px',
  borderRadius: '8px',
  backgroundColor: isActive ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
  transition: 'all 0.2s',
  marginBottom: '6px'
});

const ReportingModule = () => (
  <div style={{ display: 'flex', minHeight: '100vh' }}>
    <nav style={{ width: '250px', backgroundColor: '#0f172a', color: 'white', padding: '24px 16px', position: 'fixed', height: '100vh', overflowY: 'auto' }}>
      <h2 style={{ fontSize: '22px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '10px', color: '#8b5cf6', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <FaChartBar /> Reporting & BI
      </h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li><NavLink to="/reporting" end style={linkStyle}><FaChartPie /> Tableau de bord</NavLink></li>
        <li><NavLink to="/reporting/rapports" style={linkStyle}><FaSave /> Rapports sauvegards</NavLink></li>
        <li><NavLink to="/reporting/export" style={linkStyle}><FaFileExport /> Exports</NavLink></li>
      </ul>
    </nav>
    <div style={{ marginLeft: '250px', flex: 1, padding: '32px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Outlet />
    </div>
  </div>
);

export default ReportingModule;
