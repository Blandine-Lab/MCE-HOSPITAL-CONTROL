// src/pages/security/TentativesList.jsx
import { useState, useEffect } from 'react';
import api from '../../axios';
import { FaUserLock } from 'react-icons/fa';

const TentativesList = () => {
  const [tentatives, setTentatives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/security/tentatives-connexion')
      .then(res => { setTentatives(res.data); setLoading(false); })
      .catch(console.error);
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>? Chargement...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '28px', color: '#0f172a', marginBottom: '24px' }}><FaUserLock style={{ color: '#ef4444', marginRight: '12px' }} /> Tentatives de connexion</h1>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr><th>Email</th><th>IP</th><th>Succs</th><th>Date</th></tr>
          </thead>
          <tbody>
            {tentatives.map((t, i) => (
              <tr key={t.id} style={{ borderBottom: i === tentatives.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td>{t.email || '-'}</td>
                <td>{t.ip || '-'}</td>
                <td>{t.succes ? '? Oui' : '? Non'}</td>
                <td>{new Date(t.date_tentative).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TentativesList;
