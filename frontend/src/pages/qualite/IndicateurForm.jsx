// src/pages/qualite/IndicateurForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave } from 'react-icons/fa';

const IndicateurForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    description: '',
    categorie: '',
    unite: '',
    cible: '',
    seuil_alerte: '',
    formule: '',
    periode: 'mensuel',
    statut: 'actif'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      api.get(`/indicateurs/${id}`).then(res => setFormData(res.data)).catch(console.error);
    }
  }, [id, isEdit]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (isEdit) await api.put(`/indicateurs/${id}`, formData);
      else await api.post('/indicateurs', formData);
      navigate('/qualite/indicateurs');
    } catch (err) { setError('Erreur'); setLoading(false); }
  };

  return (
    <div>
      <Link to="/qualite/indicateurs" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none' }}><FaArrowLeft /> Retour</Link>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2>{isEdit ? 'Modifier' : 'Nouvel'} indicateur</h2>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div><label>Code *</label><input name="code" value={formData.code} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div><label>Nom *</label><input name="nom" value={formData.nom} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div><label>Catégorie</label>
            <select name="categorie" value={formData.categorie} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="">Sélectionner</option>
              <option value="qualité">Qualité</option>
              <option value="performance">Performance</option>
              <option value="satisfaction">Satisfaction</option>
              <option value="sécurité">Sécurité</option>
            </select>
          </div>
          <div><label>Unité</label><input name="unite" value={formData.unite} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div><label>Cible</label><input name="cible" type="number" step="0.01" value={formData.cible} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div><label>Seuil d'alerte</label><input name="seuil_alerte" type="number" step="0.01" value={formData.seuil_alerte} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div><label>Formule</label><input name="formule" value={formData.formule} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div><label>Période</label>
            <select name="periode" value={formData.periode} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="journalier">Journalier</option>
              <option value="hebdomadaire">Hebdomadaire</option>
              <option value="mensuel">Mensuel</option>
              <option value="trimestriel">Trimestriel</option>
              <option value="annuel">Annuel</option>
            </select>
          </div>
          <div><label>Statut</label>
            <select name="statut" value={formData.statut} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}><label>Description</label><textarea name="description" value={formData.description} onChange={handleChange} rows="3" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div style={{ gridColumn: 'span 2' }}>
            <button type="submit" disabled={loading} style={{ backgroundColor: '#10b981', color: 'white', padding: '12px 32px', border: 'none', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <FaSave /> {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IndicateurForm;
