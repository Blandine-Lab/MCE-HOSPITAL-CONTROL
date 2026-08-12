// src/pages/finances/FinancesModule.jsx
import { Outlet, NavLink } from 'react-router-dom';
import { FaChartPie, FaBook, FaList, FaPlus, FaFileInvoice, FaWallet, FaChartBar, FaBuilding } from 'react-icons/fa';

const linkStyle = ({ isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  color: isActive ? '#f59e0b' : '#cbd5e1',
  textDecoration: 'none',
  padding: '12px 16px',
  borderRadius: '8px',
  backgroundColor: isActive ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
  transition: 'all 0.2s',
  marginBottom: '6px'
});

const FinancesModule = () => {
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
          color: '#f59e0b',
          borderBottom: '1px solid #334155',
          paddingBottom: '16px'
        }}>
          <FaChartPie /> Finances
        </h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li><NavLink to="/finance" end style={linkStyle}><FaChartBar /> Tableau de bord</NavLink></li>
          <li><NavLink to="/finance/comptes" style={linkStyle}><FaBook /> Plan comptable</NavLink></li>
          <li><NavLink to="/finance/ecritures" style={linkStyle}><FaList /> Écritures</NavLink></li>
          <li><NavLink to="/finance/ecritures/nouveau" style={linkStyle}><FaPlus /> Nouvelle écriture</NavLink></li>
          <li><NavLink to="/finance/journaux" style={linkStyle}><FaFileInvoice /> Journaux</NavLink></li>
          <li><NavLink to="/finance/budgets" style={linkStyle}><FaWallet /> Budgets</NavLink></li>
          <li><NavLink to="/finance/paiements" style={linkStyle}><FaBuilding /> Paiements</NavLink></li>
          <li><NavLink to="/finance/rapports" style={linkStyle}><FaChartPie /> Rapports</NavLink></li>
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

export default FinancesModule;
