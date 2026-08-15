// frontend/src/pages/pharmacy/CommandesList.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../axios';
import { FaPlus, FaEye, FaCheck, FaTrash } from 'react-icons/fa';

const CommandesList = () => {
  const navigate = useNavigate();
  const [commandes, setCommandes] = useState([]);
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

  const showToast = (message, type = 'success') => {
    setToast(message);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCommandes = async () => {
    try {
      const res = await api.get('/pharmacy/commandes');
      setCommandes(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Erreur chargement commandes :', err);
      showToast('Erreur chargement des commandes', 'error');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommandes();
  }, []);

  const handleReception = (commandeId) => {
    navigate(`/pharmacy/commandes/${commandeId}/reception`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Supprimer définitivement cette commande ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/pharmacy/commandes/${id}`);
      setCommandes(commandes.filter(c => c.id !== id));
      showToast('Commande supprimée avec succès', 'success');
    } catch (err) {
      console.error('Erreur suppression commande :', err);
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut supprimer une commande.', 'error');
      } else {
        showToast(`❌ Erreur lors de la suppression : ${err.response?.data?.error || err.message}`, 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

  const getStatusBadge = (statut) => {
    const colors = {
      en_cours: '#f59e0b',
      recue: '#10b981',
      annulee: '#ef4444',
      partielle: '#8b5cf6'
    };
    const labels = {
      en_cours: '⏳ En cours',
      recue: '✅ Reçue',
      annulee: '❌ Annulée',
      partielle: '🔶 Partielle'
    };
    return (
      <span style={{
        backgroundColor: colors[statut] || '#6b7280',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {labels[statut] || statut}
      </span>
    );
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>⏳ Chargement...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0fdf4', padding: '32px' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#166534' }}>
            📦 Gestion des commandes
          </h1>
          <button
            onClick={() => navigate('/pharmacy/commandes/nouveau')}
            style={{
              backgroundColor: '#16a34a',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaPlus /> Nouvelle commande
          </button>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>N° Commande</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Fournisseur</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Statut</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {commandes.map(cmd => (
                <tr key={cmd.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px' }}>{cmd.numero_commande}</td>
                  <td style={{ padding: '12px' }}>{cmd.fournisseur_nom || '-'}</td>
                  <td style={{ padding: '12px' }}>{new Date(cmd.date_commande).toLocaleDateString()}</td>
                  <td style={{ padding: '12px' }}>{getStatusBadge(cmd.statut)}</td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => navigate(`/pharmacy/commandes/${cmd.id}`)}
                      style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}
                      title="Voir détails"
                    >
                      <FaEye />
                    </button>
                    {cmd.statut === 'en_cours' && (
                      <button
                        onClick={() => handleReception(cmd.id)}
                        style={{ background: '#10b981', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}
                        title="Réceptionner"
                      >
                        <FaCheck />
                      </button>
                    )}
                    {isAdmin ? (
                      <button
                        onClick={() => handleDelete(cmd.id)}
                        style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                        title="Supprimer (admin)"
                      >
                        <FaTrash />
                      </button>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '14px', marginLeft: '4px' }} title="Réservé aux administrateurs">🔒</span>
                    )}
                  </td>
                </tr>
              ))}
              {commandes.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    Aucune commande trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

export default CommandesList;