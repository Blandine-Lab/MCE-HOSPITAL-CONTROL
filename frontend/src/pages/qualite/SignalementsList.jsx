// src/pages/qualite/SignalementsList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaPlus, FaEye, FaEdit, FaFilter, FaExclamationTriangle, FaTrash } from 'react-icons/fa';

const SignalementsList = ({ active = true }) => {
  const [signalements, setSignalements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ statut: '', priorite: '' });
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [userRole, setUserRole] = useState(null);

  // ? Rcuprer le rle depuis le token JWT
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (e) {
        console.error('Erreur dcodage token', e);
      }
    }
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!active) {
      setLoading(false);
      return;
    }
    const params = new URLSearchParams();
    if (filters.statut) params.append('statut', filters.statut);
    if (filters.priorite) params.append('priorite', filters.priorite);
    api.get(`/signalements?${params.toString()}`)
      .then(res => {
        setSignalements(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Erreur chargement signalements', 'error');
        setLoading(false);
      });
  }, [filters, active]);

  // ? handleDelete avec gestion 403
  const handleDelete = async (id, numero) => {
    if (!window.confirm(`?? Voulez-vous vraiment supprimer le signalement n${numero} ? Cette action est irrversible.`)) return;
    try {
      await api.delete(`/signalements/${id}`);
      setSignalements(signalements.filter(s => s.id !== id));
      showToast('Signalement supprim avec succs');
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        showToast('? Seul un administrateur peut supprimer un signalement.', 'error');
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const getStatusBadge = (statut) => {
    const configs = {
      ouvert: { bg: '#fef3c7', color: '#92400e', label: '?? Ouvert' },
      en_cours: { bg: '#dbeafe', color: '#1e40af', label: '? En cours' },
      rsolu: { bg: '#d1fae5', color: '#065f46', label: '? Rsolu' },
      ferm: { bg: '#f1f5f9', color: '#475569', label: '?? Ferm' }
    };
    const c = configs[statut] || configs.ouvert;
    return <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: c.bg, color: c.color }}>{c.label}</span>;
  };

  const getPriorityBadge = (priorite) => {
    const colors = { basse: '#10b981', moyenne: '#f59e0b', haute: '#f97316', critique: '#ef4444' };
    const labels = { basse: '?? Basse', moyenne: '?? Moyenne', haute: '?? Haute', critique: '?? Critique' };
    return <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: colors[priorite] + '20', color: colors[priorite] }}>{labels[priorite] || priorite}</span>;
  };

  const isAdmin = userRole === 'admin';

  if (!active) return null;

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>? Chargement...</div>;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a' }}><FaExclamationTriangle style={{ color: '#f59e0b', marginRight: '12px' }} /> Signalements</h1>
        <Link to="/qualite/signalements/nouveau" style={{ backgroundColor: '#f59e0b', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPlus /> Nouveau signalement
        </Link>
      </div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <FaFilter style={{ color: '#64748b', alignSelf: 'center' }} />
        <select value={filters.statut} onChange={e => setFilters({ ...filters, statut: e.target.value })} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <option value="">Tous statuts</option>
          <option value="ouvert">Ouvert</option>
          <option value="en_cours">En cours</option>
          <option value="rsolu">Rsolu</option>
          <option value="ferm">Ferm</option>
        </select>
        <select value={filters.priorite} onChange={e => setFilters({ ...filters, priorite: e.target.value })} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <option value="">Toutes priorits</option>
          <option value="basse">Basse</option>
          <option value="moyenne">Moyenne</option>
          <option value="haute">Haute</option>
          <option value="critique">Critique</option>
        </select>
      </div>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr><th>N</th><th>Date</th><th>Catgorie</th><th>Description</th><th>Priorit</th><th>Statut</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
          </thead>
          <tbody>
            {signalements.map((s, i) => (
              <tr key={s.id} style={{ borderBottom: i === signalements.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 20px', fontWeight: '500' }}>{s.numero_signalement}</td>
                <td>{new Date(s.date_signalement).toLocaleDateString('fr-FR')}</td>
                <td>{s.categorie_nom || '-'}</td>
                <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description}</td>
                <td>{getPriorityBadge(s.priorite)}</td>
                <td>{getStatusBadge(s.statut)}</td>
                <td style={{ textAlign: 'center' }}>
                  <Link to={`/qualite/signalements/${s.id}`} style={{ color: '#3b82f6', marginRight: '12px' }}><FaEye /></Link>
                  <Link to={`/qualite/signalements/${s.id}/edit`} style={{ color: '#f59e0b', marginRight: '12px' }}><FaEdit /></Link>
                  {isAdmin ? (
                    <button
                      onClick={() => handleDelete(s.id, s.numero_signalement)}
                      style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                      title="Supprimer (admin)"
                    >
                      <FaTrash />
                    </button>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '14px' }} title="Rserv aux administrateurs">??</span>
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

export default SignalementsList;
