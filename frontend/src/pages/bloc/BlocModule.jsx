import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FaCalendarAlt, FaList, FaHospital, FaChartLine } from 'react-icons/fa';

const BlocModule = () => {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#eff6ff',
    padding: '32px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  const innerStyle = {
    maxWidth: '1400px',
    margin: '0 auto',
  };

  const titleStyle = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: '24px',
    opacity: loaded ? 1 : 0,
    transform: loaded ? 'translateY(0)' : 'translateY(-20px)',
    transition: 'all 0.5s',
  };

  const menuCardStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '16px 0',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    marginBottom: '24px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    opacity: loaded ? 1 : 0,
    transform: loaded ? 'translateY(0)' : 'translateY(20px)',
    transition: 'all 0.5s 0.1s',
  };

  const linkStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    color: isActive ? 'white' : '#374151',
    textDecoration: 'none',
    fontWeight: isActive ? '600' : '500',
    backgroundColor: isActive ? '#2563eb' : 'transparent',
    borderRadius: '8px',
    transition: 'all 0.2s',
    fontSize: '14px',
  });

  return (
    <div style={containerStyle}>
      <div style={innerStyle}>
        <h1 style={titleStyle}>🏥 Bloc Opératoire</h1>

        {/* Menu horizontal (comme les onglets) */}
        <div style={menuCardStyle}>
          <NavLink to="/bloc" end style={({ isActive }) => linkStyle(isActive)}>
            <FaCalendarAlt /> Planning
          </NavLink>
          <NavLink to="/bloc/interventions" style={({ isActive }) => linkStyle(isActive)}>
            <FaList /> Interventions
          </NavLink>
          <NavLink to="/bloc/salles" style={({ isActive }) => linkStyle(isActive)}>
            <FaHospital /> Salles
          </NavLink>
          <NavLink to="/bloc/stats" style={({ isActive }) => linkStyle(isActive)}>
            <FaChartLine /> Statistiques
          </NavLink>
        </div>

        {/* Contenu */}
        <Outlet />
      </div>
    </div>
  );
};

export default BlocModule;