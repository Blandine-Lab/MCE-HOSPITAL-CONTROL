// src/pages/paramedical/ParamedicalModule.jsx
import { Outlet, NavLink } from 'react-router-dom';
import { FaHeartbeat, FaCalendar, FaList, FaPlus, FaUserMd, FaClipboardList } from 'react-icons/fa';

const ParamedicalModule = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Menu latéral */}
      <nav style={{
        width: '250px',
        backgroundColor: '#0f172a',
        color: 'white',
        padding: '24px 16px',
        boxShadow: '2px 0 10px rgba(0,0,0,0.2)',
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
          color: '#34d399',
          borderBottom: '1px solid #334155',
          paddingBottom: '16px'
        }}>
          <FaHeartbeat /> Paramédical
        </h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '8px' }}>
            <NavLink
              to="/paramedical"
              end
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: isActive ? '#34d399' : '#cbd5e1',
                textDecoration: 'none',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: isActive ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
                transition: 'all 0.2s'
              })}
            >
              <FaList /> Tous les soins
            </NavLink>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <NavLink
              to="/paramedical/soins/nouveau"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: isActive ? '#34d399' : '#cbd5e1',
                textDecoration: 'none',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: isActive ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
                transition: 'all 0.2s'
              })}
            >
              <FaPlus /> Nouveau soin
            </NavLink>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <NavLink
              to="/paramedical/planning"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: isActive ? '#34d399' : '#cbd5e1',
                textDecoration: 'none',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: isActive ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
                transition: 'all 0.2s'
              })}
            >
              <FaCalendar /> Planning
            </NavLink>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <NavLink
              to="/paramedical/actes"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: isActive ? '#34d399' : '#cbd5e1',
                textDecoration: 'none',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: isActive ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
                transition: 'all 0.2s'
              })}
            >
              <FaClipboardList /> Actes paramédicaux
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Contenu principal */}
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
};

export default ParamedicalModule;