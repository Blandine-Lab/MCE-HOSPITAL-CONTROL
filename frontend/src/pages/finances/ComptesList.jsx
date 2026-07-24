// src/pages/finances/ComptesList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaBook } from 'react-icons/fa';

const ComptesList = () => {
  const [comptes, setComptes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
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

  const fetchComptes = () => {
    const params = filterType ? `?type=${filterType}` : '';
    api.get(`/comptes${params}`)
      .then(res => {
        setComptes(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur chargement comptes :', err);
        showToast('Erreur lors du chargement des comptes', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchComptes();
  }, [filterType]);

  const filtered = comptes.filter(c =>
    c.code?.toLowerCase().includes(search.toLowerCase()) ||
    c.nom?.toLowerCase().includes(search.toLowerCase()) ||
    c.type?.toLowerCase().includes(search.toLowerCase())
  );

  // ✅ handleDelete avec gestion 403
  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Supprimer définitivement ce compte ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/comptes/${id}`);
      setComptes(comptes.filter(c => c.id !== id));
      showToast('Compte supprimé avec succès');
    } catch (err) {
      console.error('Erreur suppression compte:', err);
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut supprimer un compte.', 'error');
      } else {
        showToast('❌ Erreur lors de la suppression : ' + (err.response?.data?.error || err.message), 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

  const getTypeBadge = (type) => {
    const colors = {
      actif: { bg: '#dbeafe', color: '#1e40af' },
      passif: { bg: '#fef3c7', color: '#92400e' },
      charge: { bg: '#fee2e2', color: '#991b1b' },
      produit: { bg: '#d1fae5', color: '#065f46' }
    };
    const c = colors[type] || colors.actif;
    return (
      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: c.bg, color: c.color }}>
        {type}
      </span>
    );
  };

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
        <h1 style={{ fontSize: '28px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaBook style={{ color: '#f59e0b' }} /> Plan comptable
        </h1>
        <Link to="/finance/comptes/nouveau" style={{ backgroundColor: '#f59e0b', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPlus /> Nouveau compte
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '4px 12px' }}>
          <FaSearch style={{ color: '#94a3b8' }} />
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: 'none', borderRadius: '8px', outline: 'none' }} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white' }}>
          <option value="">Tous les types</option>
          <option value="actif">Actif</option>
          <option value="passif">Passif</option>
          <option value="charge">Charge</option>
          <option value="produit">Produit</option>
        </select>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th style={{ padding: '14px 20px', textAlign: 'left' }}>Code</th>
              <th style={{ padding: '14px 20px', textAlign: 'left' }}>Nom</th>
              <th style={{ padding: '14px 20px', textAlign: 'left' }}>Type</th>
              <th style={{ padding: '14px 20px', textAlign: 'left' }}>Parent</th>
              <th style={{ padding: '14px 20px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Aucun compte trouvé</td></tr>
            ) : (
              filtered.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i === filtered.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 20px', fontWeight: '500' }}>{c.code}</td>
                  <td style={{ padding: '14px 20px' }}>{c.nom}</td>
                  <td style={{ padding: '14px 20px' }}>{getTypeBadge(c.type)}</td>
                  <td style={{ padding: '14px 20px' }}>{c.parent_nom || '-'}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <Link to={`/finance/comptes/${c.id}/edit`} style={{ color: '#f59e0b', marginRight: '12px' }}><FaEdit /></Link>
                    {isAdmin ? (
                      <button onClick={() => handleDelete(c.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <FaTrash />
                      </button>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '14px' }} title="Réservé aux administrateurs">🔒</span>
                    )}
                  </td>
                </tr>
              ))
            )}
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

export default ComptesList;