// src/pages/qualite/NonConformiteForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave } from 'react-icons/fa';

const NonConformiteForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [formData, setFormData] = useState({
    numero_nc: '',
    date_detection: new Date().toISOString().split('T')[0],
    source: 'interne',
    source_id: '',
    description: '',
    gravite: 'mineure',
    service_id: '',
    action_immediate: '',
    cause_racine: '',
    action_corrective_id: '',
    statut: 'ouverte'
  });
  const [services, setServices] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/services'),
      api.get('/actions-capa')
    ]).then(([servRes, actRes]) => {
      setServices(servRes.data);
      setActions(actRes.data);
    }).catch(console.error);
    if (isEdit) {
      api.get(`/non-conformites/${id}`).then(res => setFormData(res.data)).catch(console.error);
    }
  }, [id, isEdit]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (isEdit) await api.put(`/non-conformites/${id}`, formData);
      else await api.post('/non-conformites', formData);
      navigate('/qualite/non-conformites');
    } catch (err) { setError('Erreur'); setLoading(false); }
  };

  return (
    <div>
      <Link to="/qualite/non-conformites" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none' }}><FaArrowLeft /> Retour</Link>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2>{isEdit ? 'Modifier' : 'Nouvelle'} non-conformité</h2>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div><label>Numéro NC *</label><input name="numero_nc" value={formData.numero_nc} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div><label>Date détection *</label><input name="date_detection" type="date" value={formData.date_detection} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div><label>Source</label>
            <select name="source" value={formData.source} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="interne">Interne</option>
              <option value="audit">Audit</option>
              <option value="signalement">Signalement</option>
              <option value="inspection">Inspection</option>
            </select>
          </div>
          <div><label>Gravité</label>
            <select name="gravite" value={formData.gravite} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="mineure">Mineure</option>
              <option value="majeure">Majeure</option>
              <option value="critique">Critique</option>
            </select>
          </div>
          <div><label>Service</label>
            <select name="service_id" value={formData.service_id} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="">Sélectionner</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </div>
          <div><label>Action corrective</label>
            <select name="action_corrective_id" value={formData.action_corrective_id} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="">Sélectionner</option>
              {actions.map(a => <option key={a.id} value={a.id}>{a.numero_action} - {a.titre}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}><label>Description *</label><textarea name="description" value={formData.description} onChange={handleChange} required rows="3" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div style={{ gridColumn: 'span 2' }}><label>Action immédiate</label><textarea name="action_immediate" value={formData.action_immediate} onChange={handleChange} rows="2" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div style={{ gridColumn: 'span 2' }}><label>Cause racine</label><textarea name="cause_racine" value={formData.cause_racine} onChange={handleChange} rows="2" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div style={{ gridColumn: 'span 2' }}>
            <button type="submit" disabled={loading} style={{ backgroundColor: '#ef4444', color: 'white', padding: '12px 32px', border: 'none', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <FaSave /> {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NonConformiteForm;
