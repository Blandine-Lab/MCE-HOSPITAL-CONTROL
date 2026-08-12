// src/pages/rh-planning/RHPlanningModule.jsx
import { Outlet, NavLink } from 'react-router-dom';
import { FaUsers, FaCalendarAlt, FaUserMd, FaClipboardList, FaChartPie, FaBuilding, FaPlane, FaFileContract } from 'react-icons/fa';

const linkStyle = ({ isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  color: isActive ? '#60a5fa' : '#cbd5e1',
  textDecoration: 'none',
  padding: '12px 16px',
  borderRadius: '8px',
  backgroundColor: isActive ? 'rgba(96, 165, 250, 0.15)' : 'transparent',
  transition: 'all 0.2s',
  marginBottom: '6px'
});

const RHPlanningModule = () => (
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
        color: '#60a5fa', 
        borderBottom: '1px solid #334155', 
        paddingBottom: '16px' 
      }}>
        <FaUsers /> RH & Planning
      </h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li><NavLink to="/rh" end style={linkStyle}>📊 Tableau de bord</NavLink></li>
        <li><NavLink to="/rh/employes" style={linkStyle}><FaUserMd /> Employés</NavLink></li>
        <li><NavLink to="/rh/services" style={linkStyle}><FaBuilding /> Services</NavLink></li>
        <li><NavLink to="/rh/plannings" style={linkStyle}><FaCalendarAlt /> Plannings</NavLink></li>
        <li><NavLink to="/rh/conges" style={linkStyle}><FaPlane /> Congés</NavLink></li>
        <li><NavLink to="/rh/absences" style={linkStyle}><FaClipboardList /> Absences</NavLink></li>
        {/* ✅ NOUVEAU : Lien vers la gestion des contrats */}
        <li><NavLink to="/rh/contrats" style={linkStyle}><FaFileContract /> Contrats</NavLink></li>
        <li><NavLink to="/rh/stats" style={linkStyle}><FaChartPie /> Statistiques</NavLink></li>
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

export default RHPlanningModule;
