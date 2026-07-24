// src/pages/stock/StockModule.jsx
import { Outlet, NavLink } from 'react-router-dom';
import { FaBoxes, FaTruck, FaShoppingCart, FaClipboardList, FaHistory, FaPlus, FaChartBar } from 'react-icons/fa';

const linkStyle = ({ isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  color: isActive ? '#10b981' : '#cbd5e1',
  textDecoration: 'none',
  padding: '12px 16px',
  borderRadius: '8px',
  backgroundColor: isActive ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
  transition: 'all 0.2s',
  marginBottom: '6px'
});

const StockModule = () => (
  <div style={{ display: 'flex', minHeight: '100vh' }}>
    <nav style={{ width: '250px', backgroundColor: '#0f172a', color: 'white', padding: '24px 16px', position: 'fixed', height: '100vh', overflowY: 'auto' }}>
      <h2 style={{ fontSize: '22px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <FaBoxes /> Stock
      </h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li><NavLink to="/stock" end style={linkStyle}><FaChartBar /> Tableau de bord</NavLink></li>
        <li><NavLink to="/stock/produits" style={linkStyle}><FaBoxes /> Produits</NavLink></li>
        <li><NavLink to="/stock/stocks" style={linkStyle}><FaClipboardList /> État des stocks</NavLink></li>
        <li><NavLink to="/stock/mouvements" style={linkStyle}><FaHistory /> Mouvements</NavLink></li>
        <li><NavLink to="/stock/fournisseurs" style={linkStyle}><FaTruck /> Fournisseurs</NavLink></li>
        <li><NavLink to="/stock/commandes" style={linkStyle}><FaShoppingCart /> Commandes</NavLink></li>
        <li><NavLink to="/stock/inventaires" style={linkStyle}><FaClipboardList /> Inventaires</NavLink></li>
      </ul>
    </nav>
    <div style={{ marginLeft: '250px', flex: 1, padding: '32px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Outlet />
    </div>
  </div>
);

export default StockModule;