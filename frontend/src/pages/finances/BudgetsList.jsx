// src/pages/finances/BudgetsList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaWallet, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

const BudgetsList = () => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exercice, setExercice] = useState(new Date().getFullYear());
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [userRole, setUserRole] = useState(null); // ✅ Rôle de l'utilisateur

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

  const fetchBudgets = () => {
    setLoading(true);
    api.get(`/budgets?exercice=${exercice}`)
      .then(res => {
        setBudgets(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur chargement budgets:', err);
        showToast('Erreur lors du chargement des budgets', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBudgets();
  }, [exercice]);

  // ✅ handleDelete avec gestion 403
  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Supprimer définitivement ce budget ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/budgets/${id}`);
      setBudgets(budgets.filter(b => b.id !== id));
      showToast('Budget supprimé avec succès');
    } catch (err) {
      console.error('Erreur suppression budget:', err);
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut supprimer un budget.', 'error');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a' }}><FaWallet style={{ color: '#f59e0b', marginRight: '12px' }} /> Budgets</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input type="number" value={exercice} onChange={e => setExercice(parseInt(e.target.value))} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', width: '100px' }} />
          <Link to="/finance/budgets/nouveau" style={{ backgroundColor: '#f59e0b', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaPlus /> Ajouter
          </Link>
        </div>
      </div>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr><th>Compte</th><th style={{ textAlign: 'right' }}>Prévision</th><th style={{ textAlign: 'right' }}>Réalisé</th><th style={{ textAlign: 'right' }}>Écart</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
          </thead>
          <tbody>
            {budgets.map((b, i) => (
              <tr key={b.id} style={{ borderBottom: i === budgets.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 20px' }}>{b.compte_code} - {b.compte_nom}</td>
                <td style={{ padding: '14px 20px', textAlign: 'right' }}>{Number(b.montant_prevu).toLocaleString('fr-FR')} FCFA</td>
                <td style={{ padding: '14px 20px', textAlign: 'right' }}>{Number(b.montant_realise).toLocaleString('fr-FR')} FCFA</td>
                <td style={{ padding: '14px 20px', textAlign: 'right', color: (b.montant_prevu - b.montant_realise) >= 0 ? '#10b981' : '#ef4444' }}>
                  {Number(b.montant_prevu - b.montant_realise).toLocaleString('fr-FR')} FCFA
                </td>
                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                  <Link to={`/finance/budgets/${b.id}/edit`} style={{ color: '#f59e0b', marginRight: '12px' }}><FaEdit /></Link>
                  {/* ✅ Bouton supprimer visible uniquement pour admin */}
                  {isAdmin ? (
                    <button onClick={() => handleDelete(b.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
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

export default BudgetsList;
