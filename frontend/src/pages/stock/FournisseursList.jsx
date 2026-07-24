// src/pages/stock/FournisseursList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaTruck, FaPlus, FaEdit, FaTrash, FaSearch } from 'react-icons/fa';

const FournisseursList = () => {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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

  const fetchFournisseurs = () => {
    setLoading(true);
    api.get('/fournisseurs')
      .then(res => {
        setFournisseurs(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Erreur chargement des fournisseurs', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchFournisseurs();
  }, []);

  // ✅ handleDelete avec gestion 403
  const handleDelete = async (id, nom) => {
    if (!window.confirm(`⚠️ Voulez-vous vraiment supprimer le fournisseur "${nom}" ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/fournisseurs/${id}`);
      setFournisseurs(fournisseurs.filter(f => f.id !== id));
      showToast('Fournisseur supprimé avec succès');
    } catch (err) {
      console.error('Erreur suppression :', err);
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut supprimer un fournisseur.', 'error');
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const filtered = fournisseurs.filter(f =>
    f.nom.toLowerCase().includes(search.toLowerCase()) ||
    f.contact?.toLowerCase().includes(search.toLowerCase())
  );

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
        <h1 style={{ fontSize: '28px', color: '#0f172a' }}><FaTruck style={{ color: '#f59e0b', marginRight: '12px' }} /> Fournisseurs</h1>
        <Link to="/stock/fournisseurs/nouveau" style={{ backgroundColor: '#f59e0b', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPlus /> Ajouter
        </Link>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '4px 12px' }}>
          <FaSearch style={{ color: '#94a3b8' }} />
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: 'none', borderRadius: '8px', outline: 'none' }} />
        </div>
      </div>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr><th>Nom</th><th>Contact</th><th>Téléphone</th><th>Email</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map((f, i) => (
              <tr key={f.id} style={{ borderBottom: i === filtered.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 20px', fontWeight: '500' }}>{f.nom}</td>
                <td>{f.contact || '-'}</td>
                <td>{f.telephone || '-'}</td>
                <td>{f.email || '-'}</td>
                <td style={{ textAlign: 'center' }}>
                  <Link to={`/stock/fournisseurs/${f.id}/edit`} style={{ color: '#f59e0b', marginRight: '12px' }}><FaEdit /></Link>
                  {isAdmin ? (
                    <button onClick={() => handleDelete(f.id, f.nom)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><FaTrash /></button>
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

export default FournisseursList;