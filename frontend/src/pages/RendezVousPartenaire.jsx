// frontend/src/pages/RendezVousPartenaire.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../axios';

const RendezVousPartenaire = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    date_rdv: '',
    heure_rdv: '',
    medecin_id: '',
    motif: ''
  });
  const [medecins, setMedecins] = useState([]);

  // Charger la liste des médecins disponibles
  useEffect(() => {
    api.get('/medecins/disponibles')
      .then(res => setMedecins(res.data))
      .catch(console.error);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Envoyer au webhook avec le token
      const response = await api.post(`/interoperabilite/webhook/${token}`, formData);
      setSuccess(true);
      setLoading(false);
      // Rediriger après 3 secondes
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création du rendez-vous');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ maxWidth: '500px', margin: '100px auto', textAlign: 'center' }}>
        <h2 style={{ color: '#10b981' }}>✅ Rendez-vous créé avec succès !</h2>
        <p>Vous allez être redirigé...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '30px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      <h1 style={{ textAlign: 'center', color: '#0f172a' }}>📅 Prendre un rendez-vous</h1>
      <p style={{ textAlign: 'center', color: '#64748b' }}>Formulaire de prise de rendez-vous pour les partenaires</p>

      {error && <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label>Nom *</label>
            <input name="nom" value={formData.nom} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
          </div>
          <div>
            <label>Prénom *</label>
            <input name="prenom" value={formData.prenom} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
          </div>
          <div>
            <label>Email</label>
            <input name="email" type="email" value={formData.email} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
          </div>
          <div>
            <label>Téléphone *</label>
            <input name="telephone" value={formData.telephone} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
          </div>
          <div>
            <label>Date *</label>
            <input name="date_rdv" type="date" value={formData.date_rdv} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
          </div>
          <div>
            <label>Heure *</label>
            <input name="heure_rdv" type="time" value={formData.heure_rdv} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label>Médecin *</label>
            <select name="medecin_id" value={formData.medecin_id} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="">Sélectionner un médecin</option>
              {medecins.map(m => (
                <option key={m.id} value={m.id}>{m.prenom} {m.nom} - {m.specialite}</option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label>Motif</label>
            <textarea name="motif" value={formData.motif} onChange={handleChange} rows="3" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
          </div>
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '20px', backgroundColor: '#3b82f6', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}>
          {loading ? 'Envoi en cours...' : '📩 Prendre rendez-vous'}
        </button>
      </form>
    </div>
  );
};

export default RendezVousPartenaire;
