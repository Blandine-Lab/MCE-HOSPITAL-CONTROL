import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave } from 'react-icons/fa';

const EmployeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    poste: '',
    service_id: '',
    date_embauche: '',
    statut: 'actif',
    photo: null,
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/services')
      .then(res => {
        setServices(res.data);
        // ✅ Reset service_id si la valeur courante n'existe plus dans la liste fraîche
        setFormData(f => {
          const exists = res.data.some(s => String(s.id) === String(f.service_id));
          return exists ? f : { ...f, service_id: '' };
        });
      })
      .catch(console.error);

    if (isEdit) {
      api.get(`/employes/${id}`).then(res => {
        const data = res.data;
        setFormData({
          nom: data.nom || '',
          prenom: data.prenom || '',
          email: data.email || '',
          telephone: data.telephone || '',
          poste: data.poste || '',
          service_id: data.service_id || '',
          date_embauche: data.date_embauche || '',
          statut: data.statut || 'actif',
          photo: data.photo || null,
        });
        if (data.photo) {
          const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
          setPhotoPreview(`${baseUrl}${data.photo}`);
        }
      }).catch(console.error);
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, photo: file });
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // ✅ Valider service_id contre la liste fraîche
    if (formData.service_id) {
      const valid = services.some(s => String(s.id) === String(formData.service_id));
      if (!valid) {
        setError('Service invalide — rechargez la page et sélectionnez un service de la liste.');
        setLoading(false);
        return;
      }
    }

    const data = new FormData();
    for (const key in formData) {
      if (key === 'photo') {
        if (formData.photo instanceof File) {
          data.append('photo', formData.photo);
        } else if (typeof formData.photo === 'string' && formData.photo) {
          data.append('photo', formData.photo);
        }
        continue;
      }
      const value = formData[key];
      // ✅ N'envoyer que les champs non vides
      if (value !== '' && value !== null && value !== undefined) {
        data.append(key, value);
      }
    }

    try {
      if (isEdit) {
        await api.put(`/employes/${id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/employes', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      navigate('/rh/employes');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
      setLoading(false);
    }
  };

  return (
    <div>
      <Link to="/rh/employes" style={{display:'inline-flex', alignItems:'center', gap:8, color:'#3b82f6', textDecoration:'none'}}>
        <FaArrowLeft /> Retour
      </Link>
      <div style={{backgroundColor:'white', borderRadius:12, padding:32, marginTop:16, boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
        <h2>{isEdit ? 'Modifier' : 'Nouvel'} employé</h2>
        {error && <div style={{color:'red', marginBottom:16, padding:12, backgroundColor:'#fee', borderRadius:6}}>{error}</div>}
        <form onSubmit={handleSubmit} style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
          <div><label>Nom *</label><input name="nom" value={formData.nom} onChange={handleChange} required style={{width:'100%', padding:10, border:'1px solid #e2e8f0', borderRadius:6}} /></div>
          <div><label>Prénom *</label><input name="prenom" value={formData.prenom} onChange={handleChange} required style={{width:'100%', padding:10, border:'1px solid #e2e8f0', borderRadius:6}} /></div>
          <div><label>Email</label><input name="email" type="email" value={formData.email} onChange={handleChange} style={{width:'100%', padding:10, border:'1px solid #e2e8f0', borderRadius:6}} /></div>
          <div><label>Téléphone</label><input name="telephone" value={formData.telephone} onChange={handleChange} style={{width:'100%', padding:10, border:'1px solid #e2e8f0', borderRadius:6}} /></div>
          <div><label>Poste</label><input name="poste" value={formData.poste} onChange={handleChange} style={{width:'100%', padding:10, border:'1px solid #e2e8f0', borderRadius:6}} /></div>
          <div><label>Service</label>
            <select name="service_id" value={formData.service_id || ''} onChange={handleChange} style={{width:'100%', padding:10, border:'1px solid #e2e8f0', borderRadius:6}}>
              <option value="">Sélectionner</option>
              {services.map(s => <option key={s.id} value={String(s.id)}>{s.nom}</option>)}
            </select>
          </div>
          <div><label>Date d'embauche</label><input name="date_embauche" type="date" value={formData.date_embauche} onChange={handleChange} style={{width:'100%', padding:10, border:'1px solid #e2e8f0', borderRadius:6}} /></div>
          <div><label>Statut</label>
            <select name="statut" value={formData.statut} onChange={handleChange} style={{width:'100%', padding:10, border:'1px solid #e2e8f0', borderRadius:6}}>
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
            </select>
          </div>
          <div style={{gridColumn:'span 2'}}>
            <label>Photo</label>
            <input type="file" accept="image/*" onChange={handleFileChange} style={{display:'block', marginTop:6}} />
            {photoPreview && (
              <div style={{marginTop:8}}>
                <img src={photoPreview} alt="Aperçu" style={{width:'100px', height:'100px', objectFit:'cover', borderRadius:8}} />
              </div>
            )}
          </div>
          <div style={{gridColumn:'span 2', display:'flex', gap:12, marginTop:8}}>
            <button type="submit" disabled={loading} style={{backgroundColor:'#60a5fa', color:'white', padding:'12px 32px', border:'none', borderRadius:8, display:'inline-flex', alignItems:'center', gap:8}}>
              <FaSave /> {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeForm;