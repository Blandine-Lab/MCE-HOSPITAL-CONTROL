// src/pages/medical/AdmissionForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const AdmissionForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patient');

  const [formData, setFormData] = useState({
    patient_id: patientId || '',
    service_id: '',
    medecin_referent_id: '',
    lit_id: '',
    motif: '',
    date_admission: new Date().toISOString().split('T')[0]
  });

  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [medecins, setMedecins] = useState([]);
  const [lits, setLits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Charger patients, services, medecins
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, servicesRes, medecinsRes] = await Promise.all([
          api.get('/patients'),
          api.get('/services'),
          api.get('/medecins')
        ]);
        setPatients(patientsRes.data);
        setServices(servicesRes.data);
        setMedecins(medecinsRes.data);
      } catch (err) {
        console.error('Erreur chargement données :', err);
      }
    };
    fetchData();
  }, []);

  // Charger les lits disponibles en fonction du service sélectionné
  useEffect(() => {
    if (formData.service_id) {
      api.get(`/lits/disponibles?service_id=${formData.service_id}`)
        .then(res => setLits(res.data))
        .catch(err => console.error('Erreur chargement lits :', err));
    } else {
      setLits([]);
    }
  }, [formData.service_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Envoyer exactement ce que le backend attend
      await api.post('/admissions', {
        patient_id: formData.patient_id,
        lit_id: formData.lit_id,
        service_id: formData.service_id,
        motif: formData.motif,
        medecin_referent_id: formData.medecin_referent_id || null
      });
      navigate('/medical/admissions');
    } catch (err) {
      console.error('Erreur création admission :', err);
      setError(err.response?.data?.error || 'Erreur lors de l\'admission');
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/medical/admissions" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>
          <FaArrowLeft /> Retour
        </Link>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0, color: '#0f172a' }}>Nouvelle admission</h2>
        {error && <div style={{ color: '#ef4444', marginBottom: '16px', padding: '12px', backgroundColor: '#fee2e2', borderRadius: '8px' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {/* Patient */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Patient *</label>
            <select
              name="patient_id"
              value={formData.patient_id}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: 'white'
              }}
            >
              <option value="">Sélectionner un patient</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nom} {p.prenom} ({p.ipp || 'N/A'})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Service */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Service *</label>
              <select
                name="service_id"
                value={formData.service_id}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Sélectionner un service</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
            </div>

            {/* Date d'admission */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Date d'admission *</label>
              <input
                type="date"
                name="date_admission"
                value={formData.date_admission}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Médecin référent */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Médecin référent</label>
              <select
                name="medecin_referent_id"
                value={formData.medecin_referent_id}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Non attribué</option>
                {medecins.map(m => (
                  <option key={m.id} value={m.id}>{m.nom} {m.prenom}</option>
                ))}
              </select>
            </div>

            {/* Lit */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Lit *</label>
              <select
                name="lit_id"
                value={formData.lit_id}
                onChange={handleChange}
                required
                disabled={!formData.service_id}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: formData.service_id ? 'white' : '#f1f5f9'
                }}
              >
                <option value="">{formData.service_id ? 'Sélectionner un lit' : 'Choisissez un service d\'abord'}</option>
                {lits.map(l => (
                  <option key={l.id} value={l.id}>
                    Lit {l.numero} - {l.chambre_nom || 'Sans chambre'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Motif */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Motif de l'admission *</label>
            <textarea
              name="motif"
              value={formData.motif}
              onChange={handleChange}
              rows="4"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                resize: 'vertical'
              }}
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
            <FaSave /> {loading ? 'Enregistrement...' : 'Admettre le patient'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdmissionForm;