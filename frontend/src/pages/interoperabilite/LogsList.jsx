// src/pages/interoperabilite/LogsList.jsx
import { useState, useEffect } from 'react';
import api from '../../axios';
import { FaHistory, FaFilter, FaTrash } from 'react-icons/fa';

const LogsList = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ direction: '', systeme_id: '', date_debut: '', date_fin: '' });
  const [systemes, setSystemes] = useState([]);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [userRole, setUserRole] = useState(null);

  // ✅ Récupérer le rôle depuis le token JWT
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (e) {
        console.error('Erreur décodage token', e);
      }
    }
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchLogs = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.direction) params.append('direction', filters.direction);
    if (filters.systeme_id) params.append('systeme_id', filters.systeme_id);
    if (filters.date_debut) params.append('date_debut', filters.date_debut);
    if (filters.date_fin) params.append('date_fin', filters.date_fin);
    api.get(`/interoperabilite/logs?${params.toString()}`)
      .then(res => {
        setLogs(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur chargement logs:', err);
        showToast('Erreur lors du chargement des logs', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    Promise.all([
      api.get('/interoperabilite/systemes'),
      api.get('/interoperabilite/logs')
    ]).then(([sysRes, logsRes]) => {
      setSystemes(sysRes.data);
      setLogs(logsRes.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      showToast('Erreur chargement données', 'error');
      setLoading(false);
    });
  }, []);

  const applyFilters = () => {
    fetchLogs();
  };

  // ✅ handleDelete avec gestion 403
  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Supprimer définitivement ce log ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/interoperabilite/logs/${id}`);
      setLogs(logs.filter(l => l.id !== id));
      showToast('Log supprimé avec succès');
    } catch (err) {
      console.error('Erreur suppression log:', err);
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut supprimer un log.', 'error');
      } else {
        showToast('❌ Erreur lors de la suppression : ' + (err.response?.data?.error || err.message), 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>⏳ Chargement...</div>;

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}
      <h1 style={{ fontSize: '28px', color: '#0f172a', marginBottom: '24px' }}><FaHistory style={{ color: '#f59e0b', marginRight: '12px' }} /> Logs d'interopérabilité</h1>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <FaFilter style={{ color: '#64748b' }} />
        <select value={filters.direction} onChange={e => setFilters({ ...filters, direction: e.target.value })} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <option value="">Direction</option>
          <option value="IN">Entrant</option>
          <option value="OUT">Sortant</option>
        </select>
        <select value={filters.systeme_id} onChange={e => setFilters({ ...filters, systeme_id: e.target.value })} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <option value="">Système</option>
          {systemes.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
        </select>
        <input type="date" value={filters.date_debut} onChange={e => setFilters({ ...filters, date_debut: e.target.value })} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
        <span>→</span>
        <input type="date" value={filters.date_fin} onChange={e => setFilters({ ...filters, date_fin: e.target.value })} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
        <button onClick={applyFilters} style={{ backgroundColor: '#3b82f6', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Filtrer</button>
      </div>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr><th>Date</th><th>Système</th><th>Flux</th><th>Direction</th><th>Statut</th><th>Durée (ms)</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={l.id} style={{ borderBottom: i === logs.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 20px' }}>{new Date(l.date_action).toLocaleString()}</td>
                <td>{l.systeme_nom || '-'}</td>
                <td>{l.flux_nom || '-'}</td>
                <td>{l.direction === 'IN' ? '📥 Entrant' : '📤 Sortant'}</td>
                <td>
                  {l.status_code && l.status_code < 400 ? (
                    <span style={{ color: '#10b981' }}>✅ {l.status_code}</span>
                  ) : (
                    <span style={{ color: '#ef4444' }}>❌ {l.status_code || 'Erreur'}</span>
                  )}
                </td>
                <td>{l.duree_ms || '-'}</td>
                <td style={{ textAlign: 'center' }}>
                  {isAdmin ? (
                    <button onClick={() => handleDelete(l.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <FaTrash />
                    </button>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '14px' }} title="Réservé aux administrateurs">🔒</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LogsList;