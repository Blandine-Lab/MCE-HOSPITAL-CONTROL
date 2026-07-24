// src/pages/qualite/SignalementForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave } from 'react-icons/fa';

const SignalementForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [formData, setFormData] = useState({
    date_evenement: new Date().toISOString().split('T')[0],
    categorie_id: '',
    criticite_id: '',
    patient_id: '',
    employe_id: '',
    service_id: '',
    description: '',
    circonstances: '',
    consequence_patient: '',
    actions_immediates: '',
    priorite: 'moyenne'
  });
  const [categories, setCategories] = useState([]);
  const [criticites, setCriticites] = useState([]);
  const [patients, setPatients] = useState([]);
  const [employes, setEmployes] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/categories-evenements'),
      api.get('/niveaux-criticite'),
      api.get('/patients'),
      api.get('/employes'),
      api.get('/services')
    ]).then(([catRes, critRes, patRes, empRes, servRes]) => {
      setCategories(catRes.data);
      setCriticites(critRes.data);
      setPatients(patRes.data);
      setEmployes(empRes.data);
      setServices(servRes.data);
    }).catch(console.error);
    if (isEdit) {
      api.get(`/signalements/${id}`).then(res => setFormData(res.data)).catch(console.error);
    }
  }, [id, isEdit]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isEdit) await api.put(`/signalements/${id}`, formData);
      else await api.post('/signalements', formData);
      navigate('/qualite/signalements');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
      setLoading(false);
    }
  };

  return (
    <div>
      <Link to="/qualite/signalements" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none' }}><FaArrowLeft /> Retour</Link>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2>{isEdit ? 'Modifier' : 'Nouveau'} signalement</h2>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div><label>Date de l'événement *</label><input name="date_evenement" type="date" value={formData.date_evenement} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div><label>Catégorie</label>
            <select name="categorie_id" value={formData.categorie_id} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="">Sélectionner</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div><label>Niveau de criticité</label>
            <select name="criticite_id" value={formData.criticite_id} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="">Sélectionner</option>
              {criticites.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div><label>Patient</label>
            <select name="patient_id" value={formData.patient_id} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="">Sélectionner</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
            </select>
          </div>
          <div><label>Employé</label>
            <select name="employe_id" value={formData.employe_id} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="">Sélectionner</option>
              {employes.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
            </select>
          </div>
          <div><label>Service</label>
            <select name="service_id" value={formData.service_id} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="">Sélectionner</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </div>
          <div><label>Priorité</label>
            <select name="priorite" value={formData.priorite} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="basse">Basse</option>
              <option value="moyenne">Moyenne</option>
              <option value="haute">Haute</option>
              <option value="critique">Critique</option>
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}><label>Description *</label><textarea name="description" value={formData.description} onChange={handleChange} required rows="3" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div style={{ gridColumn: 'span 2' }}><label>Circonstances</label><textarea name="circonstances" value={formData.circonstances} onChange={handleChange} rows="2" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div style={{ gridColumn: 'span 2' }}><label>Conséquences pour le patient</label><textarea name="consequence_patient" value={formData.consequence_patient} onChange={handleChange} rows="2" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div style={{ gridColumn: 'span 2' }}><label>Actions immédiates</label><textarea name="actions_immediates" value={formData.actions_immediates} onChange={handleChange} rows="2" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div style={{ gridColumn: 'span 2' }}>
            <button type="submit" disabled={loading} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '12px 32px', border: 'none', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <FaSave /> {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignalementForm;