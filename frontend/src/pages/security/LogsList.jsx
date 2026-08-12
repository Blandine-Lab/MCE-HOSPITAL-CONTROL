// src/pages/security/LogsList.jsx
import { useState, useEffect } from 'react';
import api from '../../axios';
import { FaHistory, FaFilter } from 'react-icons/fa';

const LogsList = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', date_debut: '', date_fin: '' });

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.action) params.append('action', filters.action);
    if (filters.date_debut) params.append('date_debut', filters.date_debut);
    if (filters.date_fin) params.append('date_fin', filters.date_fin);
    api.get(`/security/logs?${params.toString()}`)
      .then(res => { setLogs(res.data); setLoading(false); })
      .catch(console.error);
  }, [filters]);

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>? Chargement...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '28px', color: '#0f172a', marginBottom: '24px' }}><FaHistory style={{ color: '#10b981', marginRight: '12px' }} /> Logs d'audit</h1>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <FaFilter style={{ color: '#64748b', alignSelf: 'center' }} />
        <input type="text" placeholder="Action..." value={filters.action} onChange={e => setFilters({ ...filters, action: e.target.value })} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
        <input type="date" value={filters.date_debut} onChange={e => setFilters({ ...filters, date_debut: e.target.value })} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
        <span>?</span>
        <input type="date" value={filters.date_fin} onChange={e => setFilters({ ...filters, date_fin: e.target.value })} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
      </div>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr><th>Utilisateur</th><th>Action</th><th>Ressource</th><th>IP</th><th>Date</th></tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={l.id} style={{ borderBottom: i === logs.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td>{l.utilisateur_prenom} {l.utilisateur_nom}</td>
                <td>{l.action}</td>
                <td>{l.ressource || '-'}</td>
                <td>{l.ip || '-'}</td>
                <td>{new Date(l.date_action).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LogsList;
