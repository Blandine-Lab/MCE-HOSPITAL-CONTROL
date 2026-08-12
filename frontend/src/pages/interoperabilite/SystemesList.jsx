import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaServer, FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff } from 'react-icons/fa';

const SystemesList = () => {
  const [systemes, setSystemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nom: '', code: '', description: '', type: 'API', url_base: '', auth_type: 'api_key', auth_config: { api_key: '' }, actif: true
  });
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

  const fetchSystemes = () => {
    setLoading(true);
    api.get('/interoperabilite/systemes')
      .then(res => {
        setSystemes(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur chargement systèmes:', err);
        showToast('Erreur lors du chargement des systèmes', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSystemes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/interoperabilite/systemes', formData);
      setSystemes([...systemes, res.data]);
      setShowForm(false);
      setFormData({ nom: '', code: '', description: '', type: 'API', url_base: '', auth_type: 'api_key', auth_config: { api_key: '' }, actif: true });
      showToast('Système ajouté avec succès');
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de l\'ajout', 'error');
    }
  };

  const handleToggle = async (id, current) => {
    try {
      const sys = systemes.find(s => s.id === id);
      await api.put(`/interoperabilite/systemes/${id}`, { ...sys, actif: !current });
      setSystemes(systemes.map(s => s.id === id ? { ...s, actif: !current } : s));
      showToast(`Système ${current ? 'désactivé' : 'activé'}`);
    } catch (err) {
      console.error(err);
      showToast('Erreur lors du changement de statut', 'error');
    }
  };

  // ✅ handleDelete avec gestion 403
  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Supprimer définitivement ce système ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/interoperabilite/systemes/${id}`);
      setSystemes(systemes.filter(s => s.id !== id));
      showToast('Système supprimé avec succès');
    } catch (err) {
      console.error('Erreur suppression système:', err);
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut supprimer un système.', 'error');
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
        <h1 style={{ fontSize: '28px', color: '#0f172a' }}><FaServer style={{ color: '#3b82f6', marginRight: '12px' }} /> Systèmes externes</h1>
        <button onClick={() => setShowForm(!showForm)} style={{ backgroundColor: '#3b82f6', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <FaPlus /> Ajouter
        </button>
      </div>
      {showForm && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <input name="nom" placeholder="Nom *" value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })} required style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
            <input name="code" placeholder="Code *" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} required style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
            <input name="type" placeholder="Type" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
            <input name="url_base" placeholder="URL de base" value={formData.url_base} onChange={e => setFormData({ ...formData, url_base: e.target.value })} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
            <input name="description" placeholder="Description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
            <select value={formData.auth_type} onChange={e => setFormData({ ...formData, auth_type: e.target.value })} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="api_key">Clé API</option>
              <option value="basic">Basic Auth</option>
              <option value="oauth2">OAuth2</option>
            </select>
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" style={{ backgroundColor: '#3b82f6', color: 'white', padding: '8px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Créer</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ marginLeft: '12px', padding: '8px 24px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>Annuler</button>
            </div>
          </form>
        </div>
      )}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr><th>Nom</th><th>Code</th><th>Type</th><th>URL</th><th>Actif</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
          </thead>
          <tbody>
            {systemes.map((s, i) => (
              <tr key={s.id} style={{ borderBottom: i === systemes.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 20px', fontWeight: '500' }}>{s.nom}</td>
                <td>{s.code}</td>
                <td>{s.type}</td>
                <td>{s.url_base}</td>
                <td>{s.actif ? '🟢 Actif' : '🔴 Inactif'}</td>
                <td style={{ textAlign: 'center' }}>
                  <button onClick={() => handleToggle(s.id, s.actif)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.actif ? '#10b981' : '#ef4444', marginRight: '8px' }}>{s.actif ? <FaToggleOn /> : <FaToggleOff />}</button>
                  <Link to={`/interoperabilite/systemes/${s.id}/edit`} style={{ color: '#f59e0b', marginRight: '8px' }}><FaEdit /></Link>
                  {isAdmin ? (
                    <button onClick={() => handleDelete(s.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
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

export default SystemesList;
