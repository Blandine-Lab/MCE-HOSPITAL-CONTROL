// src/pages/interoperabilite/FluxList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaExchangeAlt, FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff } from 'react-icons/fa';

const FluxList = () => {
  const [flux, setFlux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    description: '',
    systeme_source_id: '',
    systeme_destination_id: '',
    type_flux: 'synchrone',
    format_donnees: 'json',
    mapping_config: {},
    periodicite: ''
  });
  const [systemes, setSystemes] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/interoperabilite/flux'),
      api.get('/interoperabilite/systemes')
    ]).then(([fluxRes, sysRes]) => {
      setFlux(fluxRes.data);
      setSystemes(sysRes.data);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/interoperabilite/flux', formData);
      setFlux([...flux, res.data]);
      setShowForm(false);
      setFormData({
        code: '',
        nom: '',
        description: '',
        systeme_source_id: '',
        systeme_destination_id: '',
        type_flux: 'synchrone',
        format_donnees: 'json',
        mapping_config: {},
        periodicite: ''
      });
    } catch (err) { console.error(err); }
  };

  const handleToggle = async (id, current) => {
    try {
      const f = flux.find(item => item.id === id);
      await api.put(`/interoperabilite/flux/${id}`, { ...f, statut: current ? 'inactif' : 'actif' });
      setFlux(flux.map(item => item.id === id ? { ...item, statut: current ? 'inactif' : 'actif' } : item));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce flux ?')) return;
    try {
      await api.delete(`/interoperabilite/flux/${id}`);
      setFlux(flux.filter(f => f.id !== id));
    } catch (err) { console.error(err); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>⏳ Chargement...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a' }}><FaExchangeAlt style={{ color: '#10b981', marginRight: '12px' }} /> Flux</h1>
        <button onClick={() => setShowForm(!showForm)} style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <FaPlus /> Ajouter
        </button>
      </div>
      {showForm && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <input name="code" placeholder="Code *" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} required style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
            <input name="nom" placeholder="Nom *" value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })} required style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
            <select value={formData.systeme_source_id} onChange={e => setFormData({ ...formData, systeme_source_id: e.target.value })} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="">Source</option>
              {systemes.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
            <select value={formData.systeme_destination_id} onChange={e => setFormData({ ...formData, systeme_destination_id: e.target.value })} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="">Destination</option>
              {systemes.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
            <input name="description" placeholder="Description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
            <select value={formData.type_flux} onChange={e => setFormData({ ...formData, type_flux: e.target.value })} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="synchrone">Synchrone</option>
              <option value="asynchrone">Asynchrone</option>
              <option value="batch">Batch</option>
            </select>
            <select value={formData.format_donnees} onChange={e => setFormData({ ...formData, format_donnees: e.target.value })} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="json">JSON</option>
              <option value="xml">XML</option>
              <option value="csv">CSV</option>
            </select>
            <input name="periodicite" placeholder="Périodicité (ex: quotidien)" value={formData.periodicite} onChange={e => setFormData({ ...formData, periodicite: e.target.value })} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', padding: '8px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Créer</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ marginLeft: '12px', padding: '8px 24px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>Annuler</button>
            </div>
          </form>
        </div>
      )}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr><th>Code</th><th>Nom</th><th>Source</th><th>Destination</th><th>Type</th><th>Statut</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
          </thead>
          <tbody>
            {flux.map((f, i) => (
              <tr key={f.id} style={{ borderBottom: i === flux.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 20px', fontWeight: '500' }}>{f.code}</td>
                <td>{f.nom}</td>
                <td>{f.source_nom || '-'}</td>
                <td>{f.dest_nom || '-'}</td>
                <td>{f.type_flux}</td>
                <td>{f.statut === 'actif' ? '🟢 Actif' : '🔴 Inactif'}</td>
                <td style={{ textAlign: 'center' }}>
                  <button onClick={() => handleToggle(f.id, f.statut === 'actif')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: f.statut === 'actif' ? '#10b981' : '#ef4444', marginRight: '8px' }}>{f.statut === 'actif' ? <FaToggleOn /> : <FaToggleOff />}</button>
                  <Link to={`/interoperabilite/flux/${f.id}/edit`} style={{ color: '#f59e0b', marginRight: '8px' }}><FaEdit /></Link>
                  <button onClick={() => handleDelete(f.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FluxList;
