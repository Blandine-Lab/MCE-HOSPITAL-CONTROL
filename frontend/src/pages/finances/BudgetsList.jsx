// src/pages/finances/BudgetsList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaWallet, FaPlus, FaEdit, FaTrash, FaInfoCircle } from 'react-icons/fa';

const BudgetsList = () => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exercice, setExercice] = useState(new Date().getFullYear());
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

  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Supprimer définitivement ce budget ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/budgets/${id}`);
      setBudgets(budgets.filter(b => b.id !== id));
      showToast('✅ Budget supprimé avec succès');
    } catch (err) {
      console.error('Erreur suppression budget:', err);
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut supprimer un budget.', 'error');
      } else {
        showToast(`❌ Erreur lors de la suppression : ${err.response?.data?.error || err.message}`, 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>⏳ Chargement...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
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
        <h1 style={{ fontSize: '28px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaWallet style={{ color: '#f59e0b' }} /> Budgets
        </h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="exercice" style={{ fontWeight: '500', color: '#374151' }}>Exercice :</label>
            <input
              id="exercice"
              type="number"
              min="2000"
              max="2100"
              value={exercice}
              onChange={e => setExercice(parseInt(e.target.value) || new Date().getFullYear())}
              style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', width: '100px' }}
            />
          </div>
          <Link
            to="/finance/budgets/nouveau"
            style={{
              backgroundColor: '#f59e0b',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => e.target.style.backgroundColor = '#d97706'}
            onMouseLeave={e => e.target.style.backgroundColor = '#f59e0b'}
          >
            <FaPlus /> Ajouter
          </Link>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f1f5f9' }}>
              <tr>
                <th style={{ padding: '14px 20px', textAlign: 'left' }}>Compte</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Prévision</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Réalisé</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Écart</th>
                <th style={{ padding: '14px 20px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {budgets.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    Aucun budget trouvé pour l'exercice {exercice}.
                  </td>
                </tr>
              ) : (
                budgets.map((b, i) => {
                  const ecart = Number(b.montant_prevu) - Number(b.montant_realise);
                  return (
                    <tr key={b.id} style={{ borderBottom: i === budgets.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <strong>{b.compte_code}</strong> - {b.compte_nom}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: '500' }}>
                        {Number(b.montant_prevu).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {Number(b.montant_realise).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td style={{
                        padding: '14px 20px',
                        textAlign: 'right',
                        fontWeight: '600',
                        color: ecart >= 0 ? '#10b981' : '#ef4444'
                      }}>
                        {ecart.toLocaleString('fr-FR')} FCFA
                        <span style={{ fontSize: '12px', marginLeft: '4px' }}>
                          {ecart >= 0 ? '✅' : '⚠️'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <Link
                          to={`/finance/budgets/${b.id}/edit`}
                          style={{ color: '#f59e0b', marginRight: '12px', transition: 'opacity 0.2s' }}
                          onMouseEnter={e => e.target.style.opacity = '0.7'}
                          onMouseLeave={e => e.target.style.opacity = '1'}
                          title="Modifier"
                        >
                          <FaEdit />
                        </Link>
                        {isAdmin ? (
                          <button
                            onClick={() => handleDelete(b.id)}
                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s' }}
                            onMouseEnter={e => e.target.style.opacity = '0.7'}
                            onMouseLeave={e => e.target.style.opacity = '1'}
                            title="Supprimer"
                          >
                            <FaTrash />
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '14px' }} title="Réservé aux administrateurs">🔒</span>
                        )}
                      </td>
                    </tr>
                  );
                })
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

export default BudgetsList;