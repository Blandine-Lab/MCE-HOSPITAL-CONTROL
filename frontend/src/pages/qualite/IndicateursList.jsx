// src/pages/qualite/IndicateursList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaChartLine, FaPlus, FaEdit, FaTrash, FaFilter } from 'react-icons/fa';

const IndicateursList = ({ active = true }) => {
  const [indicateurs, setIndicateurs] = useState([]);
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

  useEffect(() => {
    if (!active) {
      setLoading(false);
      return;
    }
    const params = filter ? `?categorie=${filter}` : '';
    api.get(`/indicateurs${params}`)
      .then(res => {
        setIndicateurs(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Erreur chargement indicateurs', 'error');
        setLoading(false);
      });
  }, [filter, active]);

  // ✅ handleDelete avec gestion 403
  const handleDelete = async (id, nom) => {
    if (!window.confirm(`⚠️ Voulez-vous vraiment supprimer l'indicateur "${nom}" ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/indicateurs/${id}`);
      setIndicateurs(indicateurs.filter(i => i.id !== id));
      showToast('Indicateur supprimé avec succès');
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut supprimer un indicateur.', 'error');
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

  if (!active) return null;

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
        <h1 style={{ fontSize: '28px', color: '#0f172a' }}><FaChartLine style={{ color: '#10b981', marginRight: '12px' }} /> Indicateurs de qualité</h1>
        <Link to="/qualite/indicateurs/nouveau" style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPlus /> Ajouter
        </Link>
      </div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <FaFilter style={{ color: '#64748b', alignSelf: 'center' }} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <option value="">Toutes catégories</option>
          <option value="qualité">Qualité</option>
          <option value="performance">Performance</option>
          <option value="satisfaction">Satisfaction</option>
          <option value="sécurité">Sécurité</option>
        </select>
      </div>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr><th>Code</th><th>Nom</th><th>Catégorie</th><th>Unité</th><th>Cible</th><th>Statut</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
          </thead>
          <tbody>
            {indicateurs.map((ind, i) => (
              <tr key={ind.id} style={{ borderBottom: i === indicateurs.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 20px', fontWeight: '500' }}>{ind.code}</td>
                <td>{ind.nom}</td>
                <td>{ind.categorie || '-'}</td>
                <td>{ind.unite || '-'}</td>
                <td>{ind.cible}</td>
                <td>{ind.statut === 'actif' ? '🟢 Actif' : '🔴 Inactif'}</td>
                <td style={{ textAlign: 'center' }}>
                  <Link to={`/qualite/indicateurs/${ind.id}/edit`} style={{ color: '#f59e0b', marginRight: '12px' }}><FaEdit /></Link>
                  {isAdmin ? (
                    <button
                      onClick={() => handleDelete(ind.id, ind.nom)}
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

export default IndicateursList;