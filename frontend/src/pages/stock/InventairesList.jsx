// src/pages/stock/InventairesList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaClipboardList, FaPlus, FaEye, FaTrash } from 'react-icons/fa';

const InventairesList = () => {
  const [inventaires, setInventaires] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const fetchInventaires = () => {
    setLoading(true);
    api.get('/inventaires')
      .then(res => {
        setInventaires(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur de chargement des inventaires:', err);
        showToast('Erreur lors du chargement des inventaires', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchInventaires();
  }, []);

  const handleDelete = async (id, type, dateInventaire) => {
    const dateStr = new Date(dateInventaire).toLocaleDateString('fr-FR');
    if (!window.confirm(`⚠️ Voulez-vous vraiment supprimer l'inventaire de type "${type}" du ${dateStr} ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/inventaires/${id}`);
      setInventaires(inventaires.filter(inv => inv.id !== id));
      showToast('Inventaire supprimé avec succès');
    } catch (err) {
      console.error('Erreur suppression :', err);
      if (err.response?.status === 403) {
        showToast('⛔ Seul un administrateur peut supprimer un inventaire.', 'error');
      } else {
        showToast('❌ Erreur lors de la suppression', 'error');
      }
    }
  };

  const getStatusBadge = (statut) => {
    // Normalisation des clés pour gérer les anciennes valeurs
    const keyMap = {
      'termin': 'termine',
      'annul': 'annule'
    };
    const normalized = keyMap[statut] || statut;

    const configs = {
      en_cours: { bg: '#fef3c7', color: '#92400e', label: '⏳ En cours' },
      termine: { bg: '#d1fae5', color: '#065f46', label: '✅ Terminé' },
      annule: { bg: '#fee2e2', color: '#991b1b', label: '❌ Annulé' }
    };
    const c = configs[normalized] || configs.en_cours;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a' }}><FaClipboardList style={{ color: '#10b981', marginRight: '12px' }} /> Inventaires</h1>
        <Link to="/stock/inventaires/nouveau" style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPlus /> Nouvel inventaire
        </Link>
      </div>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr><th>Date</th><th>Type</th><th>Statut</th><th>Notes</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
          </thead>
          <tbody>
            {inventaires.map((inv, i) => (
              <tr key={inv.id} style={{ borderBottom: i === inventaires.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 20px' }}>{new Date(inv.date).toLocaleDateString('fr-FR')}</td>
                <td>{inv.type}</td>
                <td>{getStatusBadge(inv.statut)}</td>
                <td>{inv.notes || '-'}</td>
                <td style={{ textAlign: 'center' }}>
                  <Link to={`/stock/inventaires/${inv.id}`} style={{ color: '#3b82f6', marginRight: '12px' }}><FaEye /></Link>
                  {isAdmin ? (
                    <button onClick={() => handleDelete(inv.id, inv.type, inv.date)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><FaTrash /></button>
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

export default InventairesList;