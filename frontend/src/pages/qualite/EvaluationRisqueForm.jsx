// src/pages/qualite/EvaluationRisqueForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave } from 'react-icons/fa';

const EvaluationRisqueForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [formData, setFormData] = useState({
    numero_evaluation: '',
    date_evaluation: new Date().toISOString().split('T')[0],
    service_id: '',
    type: 'processus',
    description: '',
    probabilite: 1,
    impact: 1,
    maitrise_actuelle: '',
    actions_reduction: '',
    statut: 'en_cours'
  });
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/services').then(res => setServices(res.data)).catch(console.error);
    if (isEdit) {
      api.get(`/evaluations-risques/${id}`).then(res => setFormData(res.data)).catch(console.error);
    }
  }, [id, isEdit]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (isEdit) await api.put(`/evaluations-risques/${id}`, formData);
      else await api.post('/evaluations-risques', formData);
      navigate('/qualite/evaluations-risques');
    } catch (err) { setError('Erreur'); setLoading(false); }
  };

  return (
    <div>
      <Link to="/qualite/evaluations-risques" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none' }}><FaArrowLeft /> Retour</Link>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2>{isEdit ? 'Modifier' : 'Nouvelle'} valuation des risques</h2>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div><label>Numro valuation *</label><input name="numero_evaluation" value={formData.numero_evaluation} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div><label>Date valuation *</label><input name="date_evaluation" type="date" value={formData.date_evaluation} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div><label>Service</label>
            <select name="service_id" value={formData.service_id} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="">Slectionner</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </div>
          <div><label>Type</label>
            <select name="type" value={formData.type} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="processus">Processus</option>
              <option value="patient">Patient</option>
              <option value="medicament">Mdicament</option>
              <option value="dispositif">Dispositif</option>
              <option value="infectieux">Infectieux</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div><label>Probabilit (1-5)</label><input name="probabilite" type="number" min="1" max="5" value={formData.probabilite} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div><label>Impact (1-5)</label><input name="impact" type="number" min="1" max="5" value={formData.impact} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div style={{ gridColumn: 'span 2' }}><label>Description *</label><textarea name="description" value={formData.description} onChange={handleChange} required rows="3" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div style={{ gridColumn: 'span 2' }}><label>Matrise actuelle</label><textarea name="maitrise_actuelle" value={formData.maitrise_actuelle} onChange={handleChange} rows="2" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div style={{ gridColumn: 'span 2' }}><label>Actions de rduction</label><textarea name="actions_reduction" value={formData.actions_reduction} onChange={handleChange} rows="2" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div style={{ gridColumn: 'span 2' }}>
            <button type="submit" disabled={loading} style={{ backgroundColor: '#dc2626', color: 'white', padding: '12px 32px', border: 'none', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <FaSave /> {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EvaluationRisqueForm;
