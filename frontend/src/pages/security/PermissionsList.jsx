// src/pages/security/PermissionsList.jsx
import { useState, useEffect } from 'react';
import api from '../../axios';
import { FaKey, FaPlus, FaTrash } from 'react-icons/fa';

const PermissionsList = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ code: '', nom: '', description: '', module: '' });
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

  const fetchPermissions = () => {
    setLoading(true);
    api.get('/security/permissions')
      .then(res => {
        setPermissions(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Erreur chargement des permissions', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/security/permissions', formData);
      setPermissions([...permissions, res.data]);
      setShowForm(false);
      setFormData({ code: '', nom: '', description: '', module: '' });
      showToast('Permission ajoutée avec succès');
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de l\'ajout', 'error');
    }
  };

  // ✅ handleDelete avec gestion 403
  const handleDelete = async (id, nom) => {
    if (!window.confirm(`⚠️ Voulez-vous vraiment supprimer la permission "${nom}" ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/security/permissions/${id}`);
      setPermissions(permissions.filter(p => p.id !== id));
      showToast('Permission supprimée avec succès');
    } catch (err) {
      console.error('Erreur suppression :', err);
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut supprimer une permission.', 'error');
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
        <h1 style={{ fontSize: '28px', color: '#0f172a' }}><FaKey style={{ color: '#f59e0b', marginRight: '12px' }} /> Permissions</h1>
        <button onClick={() => setShowForm(!showForm)} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <FaPlus /> Ajouter
        </button>
      </div>
      {showForm && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <input name="code" placeholder="Code *" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} required style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
            <input name="nom" placeholder="Nom *" value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })} required style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
            <input name="module" placeholder="Module" value={formData.module} onChange={e => setFormData({ ...formData, module: e.target.value })} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
            <input name="description" placeholder="Description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" style={{ backgroundColor: '#f59e0b', color: 'white', padding: '8px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Créer</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ marginLeft: '12px', padding: '8px 24px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>Annuler</button>
            </div>
          </form>
        </div>
      )}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr><th>Code</th><th>Nom</th><th>Module</th><th>Description</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
          </thead>
          <tbody>
            {permissions.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: i === permissions.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 20px', fontWeight: '500' }}>{p.code}</td>
                <td>{p.nom}</td>
                <td>{p.module || '-'}</td>
                <td>{p.description || '-'}</td>
                <td style={{ textAlign: 'center' }}>
                  {isAdmin ? (
                    <button onClick={() => handleDelete(p.id, p.nom)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><FaTrash /></button>
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

export default PermissionsList;
