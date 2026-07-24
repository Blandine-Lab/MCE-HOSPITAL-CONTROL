// src/pages/rh-planning/PlanningForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave } from 'react-icons/fa';

const PlanningForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [formData, setFormData] = useState({ employe_id:'', date:'', heure_debut:'', heure_fin:'', type:'présentiel', notes:'' });
  const [employes, setEmployes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/employes').then(res => setEmployes(res.data)).catch(console.error);
    if (isEdit) {
      api.get(`/plannings/${id}`).then(res => setFormData(res.data)).catch(console.error);
    }
  }, [id, isEdit]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (isEdit) await api.put(`/plannings/${id}`, formData);
      else await api.post('/plannings', formData);
      navigate('/rh/plannings');
    } catch (err) { setError('Erreur'); setLoading(false); }
  };

  return (
    <div>
      <Link to="/rh/plannings" style={{display:'inline-flex', alignItems:'center', gap:8, color:'#3b82f6', textDecoration:'none'}}><FaArrowLeft /> Retour</Link>
      <div style={{backgroundColor:'white', borderRadius:12, padding:32, marginTop:16, boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
        <h2>{isEdit ? 'Modifier' : 'Nouveau'} planning</h2>
        {error && <div style={{color:'red'}}>{error}</div>}
        <form onSubmit={handleSubmit} style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
          <div><label>Employé *</label>
            <select name="employe_id" value={formData.employe_id} onChange={handleChange} required style={{width:'100%', padding:10, border:'1px solid #e2e8f0', borderRadius:6}}>
              <option value="">Sélectionner</option>
              {employes.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
            </select>
          </div>
          <div><label>Date *</label><input name="date" type="date" value={formData.date} onChange={handleChange} required style={{width:'100%', padding:10, border:'1px solid #e2e8f0', borderRadius:6}} /></div>
          <div><label>Heure début</label><input name="heure_debut" type="time" value={formData.heure_debut} onChange={handleChange} style={{width:'100%', padding:10, border:'1px solid #e2e8f0', borderRadius:6}} /></div>
          <div><label>Heure fin</label><input name="heure_fin" type="time" value={formData.heure_fin} onChange={handleChange} style={{width:'100%', padding:10, border:'1px solid #e2e8f0', borderRadius:6}} /></div>
          <div><label>Type</label>
            <select name="type" value={formData.type} onChange={handleChange} style={{width:'100%', padding:10, border:'1px solid #e2e8f0', borderRadius:6}}>
              <option value="présentiel">Présentiel</option>
              <option value="télétravail">Télétravail</option>
              <option value="congé">Congé</option>
              <option value="formation">Formation</option>
            </select>
          </div>
          <div style={{gridColumn:'span 2'}}><label>Notes</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" style={{width:'100%', padding:10, border:'1px solid #e2e8f0', borderRadius:6}} /></div>
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

export default PlanningForm;