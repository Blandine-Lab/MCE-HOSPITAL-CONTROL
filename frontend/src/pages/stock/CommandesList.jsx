// src/pages/stock/CommandesList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaShoppingCart, FaPlus, FaEye, FaEdit, FaTrash } from 'react-icons/fa';

const CommandesList = () => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const fetchCommandes = () => {
    setLoading(true);
    api.get('/commandes')
      .then(res => {
        setCommandes(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Erreur chargement des commandes', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCommandes();
  }, []);

  // ? handleDelete avec gestion 403
  const handleDelete = async (id, numero) => {
    if (!window.confirm(`?? Voulez-vous vraiment supprimer la commande n${numero} ? Cette action est irrversible.`)) return;
    try {
      await api.delete(`/commandes/${id}`);
      setCommandes(commandes.filter(c => c.id !== id));
      showToast('Commande supprime avec succs');
    } catch (err) {
      console.error('Erreur suppression :', err);
      if (err.response?.status === 403) {
        showToast('? Seul un administrateur peut supprimer une commande.', 'error');
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const getStatusBadge = (statut) => {
    const configs = {
      en_attente: { bg: '#fef3c7', color: '#92400e', label: '? En attente' },
      command: { bg: '#dbeafe', color: '#1e40af', label: '?? Command' },
      partiellement_livr: { bg: '#fef3c7', color: '#92400e', label: '?? Partiel' },
      livr: { bg: '#d1fae5', color: '#065f46', label: '? Livr' },
      annul: { bg: '#fee2e2', color: '#991b1b', label: '? Annul' }
    };
    const c = configs[statut] || configs.en_attente;
    return <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: c.bg, color: c.color }}>{c.label}</span>;
  };

  const isAdmin = userRole === 'admin';

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>? Chargement...</div>;

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
        <h1 style={{ fontSize: '28px', color: '#0f172a' }}><FaShoppingCart style={{ color: '#8b5cf6', marginRight: '12px' }} /> Commandes</h1>
        <Link to="/stock/commandes/nouveau" style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPlus /> Nouvelle commande
        </Link>
      </div>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr><th>N Commande</th><th>Fournisseur</th><th>Date</th><th style={{ textAlign: 'right' }}>Montant</th><th>Statut</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
          </thead>
          <tbody>
            {commandes.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: i === commandes.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 20px', fontWeight: '500' }}>{c.numero_commande}</td>
                <td>{c.fournisseur_nom}</td>
                <td>{new Date(c.date_commande).toLocaleDateString('fr-FR')}</td>
                <td style={{ textAlign: 'right' }}>{Number(c.montant_total).toLocaleString('fr-FR')} FCFA</td>
                <td>{getStatusBadge(c.statut)}</td>
                <td style={{ textAlign: 'center' }}>
                  <Link to={`/stock/commandes/${c.id}`} style={{ color: '#3b82f6', marginRight: '12px' }}><FaEye /></Link>
                  {c.statut !== 'livr' && c.statut !== 'annul' && (
                    <Link to={`/stock/commandes/${c.id}/edit`} style={{ color: '#f59e0b', marginRight: '12px' }}><FaEdit /></Link>
                  )}
                  {isAdmin ? (
                    <button onClick={() => handleDelete(c.id, c.numero_commande)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><FaTrash /></button>
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

export default CommandesList;
