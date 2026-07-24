// src/pages/security/RolesList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaUsersCog, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

const RolesList = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const fetchRoles = () => {
    setLoading(true);
    api.get('/security/roles')
      .then(res => {
        setRoles(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Erreur chargement des rôles', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // ✅ handleDelete avec gestion 403
  const handleDelete = async (id, nom) => {
    if (!window.confirm(`⚠️ Voulez-vous vraiment supprimer le rôle "${nom}" ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/security/roles/${id}`);
      setRoles(roles.filter(r => r.id !== id));
      showToast('Rôle supprimé avec succès');
    } catch (err) {
      console.error('Erreur suppression :', err);
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut supprimer un rôle.', 'error');
      } else {
        showToast('Erreur lors de la suppression', 'error');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a' }}><FaUsersCog style={{ color: '#f59e0b', marginRight: '12px' }} /> Rôles & Permissions</h1>
        <Link to="/security/roles/nouveau" style={{ backgroundColor: '#f59e0b', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPlus /> Nouveau rôle
        </Link>
      </div>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr><th>Nom</th><th>Description</th><th>Permissions</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
          </thead>
          <tbody>
            {roles.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: i === roles.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 20px', fontWeight: '500' }}>{r.nom}</td>
                <td>{r.description || '-'}</td>
                <td>{r.permissions?.map(p => p.code).join(', ') || '-'}</td>
                <td style={{ textAlign: 'center' }}>
                  <Link to={`/security/roles/${r.id}/edit`} style={{ color: '#f59e0b', marginRight: '12px' }}><FaEdit /></Link>
                  {isAdmin ? (
                    <button onClick={() => handleDelete(r.id, r.nom)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><FaTrash /></button>
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

export default RolesList;