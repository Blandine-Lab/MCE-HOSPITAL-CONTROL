// src/pages/qualite/EvaluationsRisquesList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaExclamationTriangle, FaPlus, FaEdit, FaFilter, FaTrash } from 'react-icons/fa';

const EvaluationsRisquesList = () => {
  const [items, setItems] = useState([]);
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

  const fetchItems = () => {
    setLoading(true);
    const params = filter ? `?niveau_risque=${filter}` : '';
    api.get(`/evaluations-risques${params}`)
      .then(res => {
        setItems(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Erreur chargement évaluations', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchItems();
  }, [filter]);

  // ✅ handleDelete avec gestion 403
  const handleDelete = async (id, numero) => {
    if (!window.confirm(`⚠️ Voulez-vous vraiment supprimer l'évaluation n°${numero} ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/evaluations-risques/${id}`);
      setItems(items.filter(item => item.id !== id));
      showToast('Évaluation supprimée avec succès');
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut supprimer une évaluation des risques.', 'error');
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const getNiveauBadge = (niveau) => {
    const colors = { faible: '#10b981', modere: '#f59e0b', eleve: '#f97316', critique: '#ef4444' };
    return <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: colors[niveau] + '20', color: colors[niveau] }}>{niveau}</span>;
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
        <h1 style={{ fontSize: '28px', color: '#0f172a' }}>
          <FaExclamationTriangle style={{ color: '#dc2626', marginRight: '12px' }} /> Évaluations des risques
        </h1>
        <Link to="/qualite/evaluations-risques/nouveau" style={{ backgroundColor: '#dc2626', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPlus /> Ajouter
        </Link>
      </div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <FaFilter style={{ color: '#64748b', alignSelf: 'center' }} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <option value="">Tous niveaux</option>
          <option value="faible">Faible</option>
          <option value="modere">Modéré</option>
          <option value="eleve">Élevé</option>
          <option value="critique">Critique</option>
        </select>
      </div>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th style={{ padding: '14px 20px', textAlign: 'left' }}>N° Éval</th>
              <th>Date</th>
              <th>Service</th>
              <th>Type</th>
              <th>Description</th>
              <th>Criticité</th>
              <th>Niveau</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: i === items.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 20px', fontWeight: '500' }}>{r.numero_evaluation}</td>
                <td>{new Date(r.date_evaluation).toLocaleDateString('fr-FR')}</td>
                <td>{r.service_nom || '-'}</td>
                <td>{r.type}</td>
                <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</td>
                <td>{r.probabilite} × {r.impact} = {r.criticite}</td>
                <td>{getNiveauBadge(r.niveau_risque)}</td>
                <td style={{ textAlign: 'center' }}>
                  <Link to={`/qualite/evaluations-risques/${r.id}/edit`} style={{ color: '#f59e0b', marginRight: '12px' }}><FaEdit /></Link>
                  {isAdmin ? (
                    <button
                      onClick={() => handleDelete(r.id, r.numero_evaluation)}
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

export default EvaluationsRisquesList;
