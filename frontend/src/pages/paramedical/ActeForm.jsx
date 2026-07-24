// src/pages/paramedical/ActeForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave } from 'react-icons/fa';

const ActeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [patients, setPatients] = useState([]);
  const [formData, setFormData] = useState({
    patient_id: '',
    nom_acte: '',
    description: '',
    date_realisation: new Date().toISOString().split('T')[0],
    praticien: '',
    notes: ''
  });

  const isEdit = !!id;

  useEffect(() => {
    api.get('/patients')
      .then(res => setPatients(res.data))
      .catch(err => console.error('Erreur chargement patients :', err));

    if (isEdit) {
      api.get(`/actes/${id}`)
        .then(res => {
          const data = res.data;
          setFormData({
            patient_id: data.patient_id || '',
            nom_acte: data.nom_acte || '',
            description: data.description || '',
            date_realisation: data.date_realisation ? new Date(data.date_realisation).toISOString().split('T')[0] : '',
            praticien: data.praticien || '',
            notes: data.notes || ''
          });
        })
        .catch(err => {
          console.error('Erreur chargement acte :', err);
          setError('Impossible de charger l\'acte');
        });
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isEdit) {
        await api.put(`/actes/${id}`, formData);
      } else {
        await api.post('/actes', formData);
      }
      navigate('/paramedical/actes');
    } catch (err) {
      console.error('Erreur sauvegarde :', err);
      setError('Erreur lors de la sauvegarde');
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/paramedical/actes" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>
          <FaArrowLeft /> Retour
        </Link>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0, color: '#0f172a' }}>{isEdit ? 'Modifier l\'acte' : 'Nouvel acte paramédical'}</h2>
        {error && <div style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Patient</label>
            <select
              name="patient_id"
              value={formData.patient_id}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
            >
              <option value="">Sélectionner un patient</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Nom de l'acte</label>
              <input
                type="text"
                name="nom_acte"
                value={formData.nom_acte}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Date de réalisation</label>
              <input
                type="date"
                name="date_realisation"
                value={formData.date_realisation}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px', resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Praticien</label>
            <input
              type="text"
              name="praticien"
              value={formData.praticien}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="2"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px', resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaSave /> {loading ? 'Enregistrement...' : (isEdit ? 'Mettre à jour' : 'Créer')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ActeForm;