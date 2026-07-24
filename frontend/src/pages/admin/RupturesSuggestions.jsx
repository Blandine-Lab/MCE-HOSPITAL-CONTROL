import { useEffect, useState } from 'react';
import axios from 'axios';
import { FaExclamationTriangle, FaShoppingCart } from 'react-icons/fa';

const RupturesSuggestions = () => {
  const [ruptures, setRuptures] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const axiosAuth = axios.create({ baseURL: 'http://localhost:5000' });
  axiosAuth.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  const fetchData = async () => {
    try {
      const [ruptRes, suggRes] = await Promise.all([
        axiosAuth.get('/api/pharmacy/ruptures'),
        axiosAuth.get('/api/pharmacy/suggestions-commandes')
      ]);
      setRuptures(ruptRes.data);
      setSuggestions(suggRes.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setToast('Erreur chargement données');
      setTimeout(() => setToast(null), 3000);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Chargement...</div>;

  return (
    <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
      {toast && <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: '#10b981', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 1000 }}>{toast}</div>}
      
      <h2 style={{ marginBottom: '20px' }}>📉 Ruptures de stock & Suggestions de commandes</h2>
      
      {/* Ruptures */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
          <FaExclamationTriangle /> Ruptures de stock
        </h3>
        {ruptures.length === 0 ? (
          <p>Aucune rupture de stock.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>ID</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Code</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Nom</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Stock</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Seuil</th>
              </tr>
            </thead>
            <tbody>
              {ruptures.map(r => (
                <tr key={r.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{r.id}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{r.code || '-'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{r.nom}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', color: 'red', fontWeight: 'bold' }}>{r.stock}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{r.seuil_alerte}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Suggestions */}
      <div>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb' }}>
          <FaShoppingCart /> Suggestions de réapprovisionnement
        </h3>
        {suggestions.length === 0 ? (
          <p>Aucune suggestion pour le moment.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>ID</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Code</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Nom</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Stock total</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Seuil</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Stock lots</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map(s => (
                <tr key={s.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{s.id}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{s.code || '-'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{s.nom}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', color: s.stock <= s.seuil_alerte ? 'orange' : 'black' }}>{s.stock}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{s.seuil_alerte}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{s.stock_lots}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default RupturesSuggestions;