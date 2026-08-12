// src/pages/rh-planning/ServiceForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave } from 'react-icons/fa';

const ServiceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [formData, setFormData] = useState({ nom:'', description:'', responsable_id:'' });
  const [responsables, setResponsables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/utilisateurs').then(res => setResponsables(res.data)).catch(console.error);
    if (isEdit) {
      api.get(`/services/${id}`).then(res => setFormData(res.data)).catch(console.error);
    }
  }, [id, isEdit]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (isEdit) await api.put(`/services/${id}`, formData);
      else await api.post('/services', formData);
      navigate('/rh/services');
    } catch (err) { setError('Erreur'); setLoading(false); }
  };

  return (
    <div>
      <Link to="/rh/services" style={{display:'inline-flex', alignItems:'center', gap:8, color:'#3b82f6', textDecoration:'none'}}><FaArrowLeft /> Retour</Link>
      <div style={{backgroundColor:'white', borderRadius:12, padding:32, marginTop:16, boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
        <h2>{isEdit ? 'Modifier' : 'Nouveau'} service</h2>
        {error && <div style={{color:'red'}}>{error}</div>}
        <form onSubmit={handleSubmit} style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
          <div><label>Nom *</label><input name="nom" value={formData.nom} onChange={handleChange} required style={{width:'100%', padding:10, border:'1px solid #e2e8f0', borderRadius:6}} /></div>
          <div><label>Responsable</label>
            <select name="responsable_id" value={formData.responsable_id} onChange={handleChange} style={{width:'100%', padding:10, border:'1px solid #e2e8f0', borderRadius:6}}>
              <option value="">Slectionner</option>
              {responsables.map(r => <option key={r.id} value={r.id}>{r.nom} {r.prenom}</option>)}
            </select>
          </div>
          <div style={{gridColumn:'span 2'}}><label>Description</label><textarea name="description" value={formData.description} onChange={handleChange} rows="3" style={{width:'100%', padding:10, border:'1px solid #e2e8f0', borderRadius:6}} /></div>
          <div style={{gridColumn:'span 2'}}>
            <button type="submit" disabled={loading} style={{backgroundColor:'#60a5fa', color:'white', padding:'12px 32px', border:'none', borderRadius:8, display:'inline-flex', alignItems:'center', gap:8}}>
              <FaSave /> {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceForm;
