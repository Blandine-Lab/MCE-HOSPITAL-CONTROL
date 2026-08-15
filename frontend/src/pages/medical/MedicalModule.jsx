// src/pages/medical/MedicalModule.jsx
import { Outlet, NavLink } from 'react-router-dom';
import { FaUserMd, FaProcedures, FaHospital, FaHome, FaFileMedical } from 'react-icons/fa';

const MedicalModule = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Menu latéral DME */}
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
          color: '#60a5fa',
          borderBottom: '1px solid #334155',
          paddingBottom: '16px'
        }}>
          <FaFileMedical /> DME
        </h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '8px' }}>
            <NavLink
              to="/medical"
              end
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: isActive ? '#60a5fa' : '#cbd5e1',
                textDecoration: 'none',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: isActive ? 'rgba(96, 165, 250, 0.15)' : 'transparent',
                transition: 'all 0.2s'
              })}
            >
              <FaHome /> Accueil DME
            </NavLink>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <NavLink
              to="/medical/patients"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: isActive ? '#60a5fa' : '#cbd5e1',
                textDecoration: 'none',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: isActive ? 'rgba(96, 165, 250, 0.15)' : 'transparent',
                transition: 'all 0.2s'
              })}
            >
              <FaUserMd /> Patients
            </NavLink>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <NavLink
              to="/medical/admissions"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: isActive ? '#60a5fa' : '#cbd5e1',
                textDecoration: 'none',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: isActive ? 'rgba(96, 165, 250, 0.15)' : 'transparent',
                transition: 'all 0.2s'
              })}
            >
              <FaProcedures /> Admissions
            </NavLink>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <NavLink
              to="/medical/beds"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: isActive ? '#60a5fa' : '#cbd5e1',
                textDecoration: 'none',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: isActive ? 'rgba(96, 165, 250, 0.15)' : 'transparent',
                transition: 'all 0.2s'
              })}
            >
              <FaHospital /> Gestion des lits
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

export default MedicalModule;