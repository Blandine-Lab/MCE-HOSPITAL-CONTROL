// src/pages/stock/DashboardStock.jsx
import { useState, useEffect } from 'react';
import api from '../../axios';
import { FaBoxes, FaTruck, FaShoppingCart, FaExclamationTriangle } from 'react-icons/fa';

const DashboardStock = () => {
  const [stats, setStats] = useState({ totalProduits: 0, totalFournisseurs: 0, commandesEnAttente: 0, alertesStock: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/produits'),
      api.get('/fournisseurs'),
      api.get('/commandes?statut=en_attente'),
      api.get('/stocks')
    ]).then(([prodRes, fourRes, cmdRes, stockRes]) => {
      const produits = prodRes.data;
      const stocks = stockRes.data;
      const alertes = stocks.filter(s => s.quantite <= s.seuil_alerte).length;
      setStats({
        totalProduits: produits.length,
        totalFournisseurs: fourRes.data.length,
        commandesEnAttente: cmdRes.data.length,
        alertesStock: alertes
      });
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>? Chargement...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '28px', color: '#0f172a', marginBottom: '24px' }}>Tableau de bord Stock</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <FaBoxes style={{ fontSize: '32px', color: '#3b82f6' }} />
          <h2>{stats.totalProduits}</h2>
          <p style={{ color: '#64748b' }}>Produits</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <FaTruck style={{ fontSize: '32px', color: '#f59e0b' }} />
          <h2>{stats.totalFournisseurs}</h2>
          <p style={{ color: '#64748b' }}>Fournisseurs</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <FaShoppingCart style={{ fontSize: '32px', color: '#8b5cf6' }} />
          <h2>{stats.commandesEnAttente}</h2>
          <p style={{ color: '#64748b' }}>Commandes en attente</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <FaExclamationTriangle style={{ fontSize: '32px', color: '#ef4444' }} />
          <h2>{stats.alertesStock}</h2>
          <p style={{ color: '#64748b' }}>Alertes stock</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardStock;
