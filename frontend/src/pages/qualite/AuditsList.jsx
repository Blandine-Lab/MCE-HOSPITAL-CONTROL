// src/pages/qualite/AuditsList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaClipboardCheck, FaPlus, FaEye, FaEdit, FaFilter, FaTrash } from 'react-icons/fa';

const AuditsList = () => {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
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

  const fetchAudits = () => {
    setLoading(true);
    const params = filter ? `?statut=${filter}` : '';
    api.get(`/audits${params}`)
      .then(res => {
        setAudits(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Erreur chargement audits', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAudits();
  }, [filter]);

  // ✅ handleDelete avec gestion 403
  const handleDelete = async (id, titre) => {
    if (!window.confirm(`⚠️ Voulez-vous vraiment supprimer l'audit "${titre}" ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/audits/${id}`);
      setAudits(audits.filter(a => a.id !== id));
      showToast('Audit supprimé avec succès');
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut supprimer un audit.', 'error');
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const getStatusBadge = (statut) => {
    const configs = {
      planifié: { bg: '#dbeafe', color: '#1e40af', label: '📋 Planifié' },
      en_cours: { bg: '#fef3c7', color: '#92400e', label: '⏳ En cours' },
      terminé: { bg: '#d1fae5', color: '#065f46', label: '✅ Terminé' },
      annulé: { bg: '#fee2e2', color: '#991b1b', label: '❌ Annulé' }
    };
    const c = configs[statut] || configs.planifié;
    return <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: c.bg, color: c.color }}>{c.label}</span>;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a' }}><FaClipboardCheck style={{ color: '#3b82f6', marginRight: '12px' }} /> Audits</h1>
        <Link to="/qualite/audits/nouveau" style={{ backgroundColor: '#3b82f6', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPlus /> Nouvel audit
        </Link>
      </div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <FaFilter style={{ color: '#64748b', alignSelf: 'center' }} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <option value="">Tous statuts</option>
          <option value="planifié">Planifié</option>
          <option value="en_cours">En cours</option>
          <option value="terminé">Terminé</option>
          <option value="annulé">Annulé</option>
        </select>
      </div>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr><th>N° Audit</th><th>Titre</th><th>Type</th><th>Service</th><th>Date début</th><th>Statut</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
          </thead>
          <tbody>
            {audits.map((a, i) => (
              <tr key={a.id} style={{ borderBottom: i === audits.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 20px', fontWeight: '500' }}>{a.numero_audit}</td>
                <td>{a.titre}</td>
                <td>{a.type}</td>
                <td>{a.service_nom || '-'}</td>
                <td>{new Date(a.date_debut).toLocaleDateString('fr-FR')}</td>
                <td>{getStatusBadge(a.statut)}</td>
                <td style={{ textAlign: 'center' }}>
                  <Link to={`/qualite/audits/${a.id}`} style={{ color: '#3b82f6', marginRight: '12px' }}><FaEye /></Link>
                  <Link to={`/qualite/audits/${a.id}/edit`} style={{ color: '#f59e0b', marginRight: '12px' }}><FaEdit /></Link>
                  {isAdmin ? (
                    <button
                      onClick={() => handleDelete(a.id, a.titre)}
                      style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                      title="Supprimer (admin)"
                    >
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

export default AuditsList;