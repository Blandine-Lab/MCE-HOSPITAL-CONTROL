// src/pages/finances/PaiementsList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaCreditCard, FaPlus, FaEye, FaTrash } from 'react-icons/fa';

const PaiementsList = () => {
  const [paiements, setPaiements] = useState([]);
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

  const fetchPaiements = () => {
    setLoading(true);
    api.get('/paiements')
      .then(res => {
        setPaiements(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur de chargement des paiements:', err);
        showToast('Erreur lors du chargement des paiements', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPaiements();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Supprimer définitivement ce paiement ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/paiements/${id}`);
      setPaiements(paiements.filter(p => p.id !== id));
      showToast('Paiement supprimé avec succès');
    } catch (err) {
      console.error('Erreur suppression paiement:', err);
      if (err.response?.status === 403) {
        showToast('⛔ Seul un administrateur peut supprimer un paiement.', 'error');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a' }}><FaCreditCard style={{ color: '#f59e0b', marginRight: '12px' }} /> Paiements</h1>
        <Link to="/finance/paiements/nouveau" style={{ backgroundColor: '#f59e0b', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPlus /> Nouveau paiement
        </Link>
      </div>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr><th>Facture</th><th>Montant</th><th>Date</th><th>Mode</th><th>Référence</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
          </thead>
          <tbody>
            {paiements.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: i === paiements.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 20px', fontWeight: '500' }}>{p.numero_facture}</td>
                <td style={{ padding: '14px 20px' }}>{Number(p.montant).toLocaleString('fr-FR')} FCFA</td>
                <td style={{ padding: '14px 20px' }}>{new Date(p.date_paiement).toLocaleDateString('fr-FR')}</td>
                <td style={{ padding: '14px 20px' }}>{p.mode_paiement}</td>
                <td style={{ padding: '14px 20px' }}>{p.reference || '-'}</td>
                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                  <Link to={`/finance/paiements/${p.id}`} style={{ color: '#3b82f6', marginRight: '12px' }}><FaEye /></Link>
                  {isAdmin ? (
                    <button onClick={() => handleDelete(p.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
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

export default PaiementsList;