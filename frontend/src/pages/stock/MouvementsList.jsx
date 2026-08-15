// src/pages/stock/MouvementsList.jsx
import { useState, useEffect } from 'react';
import api from '../../axios';
import { FaFilter, FaSearch, FaTrash } from 'react-icons/fa';

const MouvementsList = () => {
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', date_debut: '', date_fin: '' });
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [userRole, setUserRole] = useState(null);

  // Récupérer le rôle depuis le token JWT
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

  const fetchMouvements = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.date_debut) params.append('date_debut', filters.date_debut);
    if (filters.date_fin) params.append('date_fin', filters.date_fin);
    api.get(`/mouvements?${params.toString()}`)
      .then(res => {
        setMouvements(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur de chargement des mouvements:', err);
        showToast('Erreur lors du chargement des mouvements', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMouvements();
  }, [filters]);

  const handleDelete = async (id, produitNom) => {
    if (!window.confirm(`⚠️ Voulez-vous vraiment supprimer le mouvement du produit "${produitNom}" ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/mouvements/${id}`);
      setMouvements(mouvements.filter(m => m.id !== id));
      showToast('Mouvement supprimé avec succès');
    } catch (err) {
      console.error('Erreur suppression :', err);
      if (err.response?.status === 403) {
        showToast('⛔ Seul un administrateur peut supprimer un mouvement de stock.', 'error');
      } else {
        showToast('❌ Erreur lors de la suppression', 'error');
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
          padding: '12px 24px',
          borderRadius: 8,
          backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}
      <h1 style={{ fontSize: '28px', color: '#0f172a', marginBottom: '24px' }}>📦 Mouvements de stock</h1>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <FaFilter style={{ color: '#64748b' }} />
        <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <option value="">Tous les types</option>
          <option value="entree">Entrée</option>
          <option value="sortie">Sortie</option>
          <option value="ajustement">Ajustement</option>
          <option value="retour">Retour</option>
        </select>
        <input type="date" value={filters.date_debut} onChange={e => setFilters({ ...filters, date_debut: e.target.value })} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
        <span>→</span>
        <input type="date" value={filters.date_fin} onChange={e => setFilters({ ...filters, date_fin: e.target.value })} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
      </div>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th style={{ padding: '14px 20px', textAlign: 'left' }}>Date</th>
              <th>Produit</th>
              <th style={{ textAlign: 'center' }}>Type</th>
              <th style={{ textAlign: 'right' }}>Quantité</th>
              <th>Référence</th>
              <th>Motif</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mouvements.map((m, i) => (
              <tr key={m.id} style={{ borderBottom: i === mouvements.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 20px' }}>{new Date(m.date_mouvement).toLocaleDateString('fr-FR')}</td>
                <td>{m.produit_nom}</td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: m.type === 'entree' || m.type === 'retour' ? '#d1fae5' : '#fee2e2', color: m.type === 'entree' || m.type === 'retour' ? '#065f46' : '#991b1b' }}>
                    {m.type === 'entree' ? '📥 Entrée' : m.type === 'sortie' ? '📤 Sortie' : m.type === 'retour' ? '↩️ Retour' : '📐 Ajustement'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>{m.quantite}</td>
                <td>{m.reference || '-'}</td>
                <td>{m.motif || '-'}</td>
                <td style={{ textAlign: 'center' }}>
                  {isAdmin ? (
                    <button onClick={() => handleDelete(m.id, m.produit_nom)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><FaTrash /></button>
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

export default MouvementsList;