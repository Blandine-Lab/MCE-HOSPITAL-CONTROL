// src/pages/stock/StocksList.jsx
import { useState, useEffect } from 'react';
import api from '../../axios';
import { FaEdit, FaSearch } from 'react-icons/fa';

const StocksList = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/stocks')
      .then(res => { setStocks(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const filtered = stocks.filter(s =>
    s.produit_nom.toLowerCase().includes(search.toLowerCase()) ||
    s.produit_code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>⏳ Chargement...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '28px', color: '#0f172a', marginBottom: '24px' }}>📊 État des stocks</h1>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '4px 12px' }}>
          <FaSearch style={{ color: '#94a3b8' }} />
          <input type="text" placeholder="Rechercher un produit..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: 'none', borderRadius: '8px', outline: 'none' }} />
        </div>
      </div>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th style={{ padding: '14px 20px', textAlign: 'left' }}>Code</th>
              <th>Produit</th>
              <th style={{ textAlign: 'right' }}>Quantité</th>
              <th style={{ textAlign: 'right' }}>Réservé</th>
              <th style={{ textAlign: 'right' }}>Seuil alerte</th>
              <th style={{ textAlign: 'center' }}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => {
              const isAlert = s.quantite <= s.seuil_alerte;
              return (
                <tr key={s.id} style={{ borderBottom: i === filtered.length - 1 ? 'none' : '1px solid #f1f5f9', backgroundColor: isAlert ? '#fef2f2' : 'white' }}>
                  <td style={{ padding: '14px 20px', fontWeight: '500' }}>{s.produit_code}</td>
                  <td>{s.produit_nom}</td>
                  <td style={{ textAlign: 'right' }}>{s.quantite}</td>
                  <td style={{ textAlign: 'right' }}>{s.quantite_reservee || 0}</td>
                  <td style={{ textAlign: 'right' }}>{s.seuil_alerte}</td>
                  <td style={{ textAlign: 'center' }}>
                    {isAlert ? (
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: '#fee2e2', color: '#991b1b' }}>
                        ⚠️ Stock bas
                      </span>
                    ) : (
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: '#d1fae5', color: '#065f46' }}>
                        ✅ Normal
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StocksList;