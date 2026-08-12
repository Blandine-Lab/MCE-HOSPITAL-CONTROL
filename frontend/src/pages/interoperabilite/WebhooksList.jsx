// src/pages/interoperabilite/WebhooksList.jsx
import { useState, useEffect } from 'react';
import api from '../../axios';
import { FaPlug, FaPlus, FaTrash, FaToggleOn, FaToggleOff, FaCopy } from 'react-icons/fa';

const WebhooksList = () => {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nom: '', description: '', url_callback: '' });

  useEffect(() => {
    api.get('/interoperabilite/webhooks')
      .then(res => { setWebhooks(res.data); setLoading(false); })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/interoperabilite/webhooks', formData);
      setWebhooks([...webhooks, res.data]);
      setShowForm(false);
      setFormData({ nom: '', description: '', url_callback: '' });
    } catch (err) { console.error(err); }
  };

  const handleToggle = async (id, current) => {
    try {
      const w = webhooks.find(item => item.id === id);
      await api.put(`/interoperabilite/webhooks/${id}`, { ...w, actif: !current });
      setWebhooks(webhooks.map(item => item.id === id ? { ...item, actif: !current } : item));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce webhook ?')) return;
    try {
      await api.delete(`/interoperabilite/webhooks/${id}`);
      setWebhooks(webhooks.filter(w => w.id !== id));
    } catch (err) { console.error(err); }
  };

  const copyToken = (token) => {
    navigator.clipboard.writeText(token);
    alert('Token copi !');
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>? Chargement...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a' }}><FaPlug style={{ color: '#8b5cf6', marginRight: '12px' }} /> Webhooks entrants</h1>
        <button onClick={() => setShowForm(!showForm)} style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <FaPlus /> Ajouter
        </button>
      </div>
      {showForm && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <input name="nom" placeholder="Nom *" value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })} required style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
            <input name="url_callback" placeholder="URL de callback" value={formData.url_callback} onChange={e => setFormData({ ...formData, url_callback: e.target.value })} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
            <div style={{ gridColumn: 'span 2' }}>
              <label>Description</label>
              <textarea name="description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows="2" style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '8px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Crer</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ marginLeft: '12px', padding: '8px 24px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>Annuler</button>
            </div>
          </form>
        </div>
      )}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr><th>Nom</th><th>Token</th><th>URL callback</th><th>Actif</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
          </thead>
          <tbody>
            {webhooks.map((w, i) => (
              <tr key={w.id} style={{ borderBottom: i === webhooks.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 20px', fontWeight: '500' }}>{w.nom}</td>
                <td>
                  <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{w.token}</code>
                  <button onClick={() => copyToken(w.token)} style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer' }}><FaCopy /></button>
                </td>
                <td>{w.url_callback || '-'}</td>
                <td>{w.actif ? '?? Actif' : '?? Inactif'}</td>
                <td style={{ textAlign: 'center' }}>
                  <button onClick={() => handleToggle(w.id, w.actif)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: w.actif ? '#10b981' : '#ef4444', marginRight: '8px' }}>{w.actif ? <FaToggleOn /> : <FaToggleOff />}</button>
                  <button onClick={() => handleDelete(w.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WebhooksList;
