// src/pages/rh-planning/ContratForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa';

const ContratForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [employes, setEmployes] = useState([]);
  const [formData, setFormData] = useState({
    employe_id: '',
    type: 'CDI',
    date_debut: '',
    date_fin: '',
    salaire: '',
    statut: 'actif',
    commentaire: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/employes')
      .then(res => setEmployes(res.data))
      .catch(console.error);

    if (isEdit) {
      setLoading(true);
      api.get(`/contrats/${id}`)
        .then(res => {
          const data = res.data;
          setFormData({
            employe_id: data.employe_id || '',
            type: data.type || 'CDI',
            date_debut: data.date_debut ? data.date_debut.split('T')[0] : '',
            date_fin: data.date_fin ? data.date_fin.split('T')[0] : '',
            salaire: data.salaire || '',
            statut: data.statut || 'actif',
            commentaire: data.commentaire || ''
          });
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError('Impossible de charger le contrat');
          setLoading(false);
        });
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employe_id || !formData.type || !formData.date_debut) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        employe_id: parseInt(formData.employe_id, 10),
        type: formData.type,
        date_debut: formData.date_debut,
        date_fin: formData.date_fin || null,
        salaire: formData.salaire ? parseFloat(formData.salaire) : null,
        statut: formData.statut,
        commentaire: formData.commentaire
      };
      if (isEdit) {
        await api.put(`/contrats/${id}`, payload);
      } else {
        await api.post('/contrats', payload);
      }
      navigate('/rh/contrats');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
      setLoading(false);
    }
  };

  if (loading && isEdit) return <div style={{ padding: 40, textAlign: 'center' }}>⏳ Chargement...</div>;

  return (
    <div>
      <Link to="/rh/contrats" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#3b82f6', textDecoration: 'none' }}>
        <FaArrowLeft /> Retour
      </Link>
      <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 32, marginTop: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2>{isEdit ? 'Modifier' : 'Nouveau'} contrat</h2>
        {error && <div style={{ color: '#ef4444', padding: 12, backgroundColor: '#fee2e2', borderRadius: 8, marginBottom: 16 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Employé *</label>
            <select name="employe_id" value={formData.employe_id} onChange={handleChange} required style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }}>
              <option value="">Sélectionner</option>
              {employes.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Type de contrat *</label>
            <select name="type" value={formData.type} onChange={handleChange} required style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }}>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="Intérim">Intérim</option>
              <option value="Stage">Stage</option>
              <option value="Apprentissage">Apprentissage</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Date début *</label>
            <input type="date" name="date_debut" value={formData.date_debut} onChange={handleChange} required style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Date fin</label>
            <input type="date" name="date_fin" value={formData.date_fin} onChange={handleChange} style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Salaire (FC)</label>
            <input type="number" step="0.01" name="salaire" value={formData.salaire} onChange={handleChange} placeholder="ex: 2500.00" style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Statut</label>
            <select name="statut" value={formData.statut} onChange={handleChange} style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }}>
              <option value="actif">Actif</option>
              <option value="expiré">Expiré</option>
              <option value="résilié">Résilié</option>
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Commentaire</label>
            <textarea name="commentaire" value={formData.commentaire} onChange={handleChange} rows="3" style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }} />
          </div>
          <div style={{ gridColumn: 'span 2', display: 'flex', gap: 12 }}>
            <button type="submit" disabled={loading} style={{ backgroundColor: '#60a5fa', color: 'white', padding: '12px 32px', border: 'none', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8, opacity: loading ? 0.6 : 1 }}>
              <FaSave /> {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <Link to="/rh/contrats" style={{ backgroundColor: '#e5e7eb', color: '#0f172a', padding: '12px 32px', borderRadius: 8, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <FaTimes /> Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContratForm;
