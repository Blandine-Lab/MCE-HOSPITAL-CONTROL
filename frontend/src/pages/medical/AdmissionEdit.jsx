// src/pages/medical/AdmissionEdit.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa';

const AdmissionEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    patient_id: '',
    service_id: '',
    medecin_referent_id: '',
    lit_id: '',
    motif: '',
    date_admission: ''
  });
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [medecins, setMedecins] = useState([]);
  const [lits, setLits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [admissionRes, patientsRes, servicesRes, medecinsRes] = await Promise.all([
          api.get(`/consultations/admissions/${id}`),
          api.get('/patients'),
          api.get('/services'),
          api.get('/consultations/medecins')
        ]);

        const admission = admissionRes.data;
        setFormData({
          patient_id: admission.patient_id || '',
          service_id: admission.service_id || '',
          medecin_referent_id: admission.medecin_referent_id || '',
          lit_id: admission.lit_id || '',
          motif: admission.motif || '',
          date_admission: admission.date_admission ? admission.date_admission.split('T')[0] : ''
        });
        setPatients(patientsRes.data);
        setServices(servicesRes.data);
        setMedecins(medecinsRes.data);

        if (admission.service_id) {
          const litsRes = await api.get(`/consultations/lits/disponibles?service_id=${admission.service_id}`);
          console.log('📦 Lits chargés (init) :', litsRes.data);
          setLits(litsRes.data);
        }

        setLoading(false);
      } catch (err) {
        console.error('Erreur chargement données :', err);
        setError('Impossible de charger les données');
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Recharger les lits quand le service change
  useEffect(() => {
    if (formData.service_id) {
      api.get(`/consultations/lits/disponibles?service_id=${formData.service_id}`)
        .then(res => {
          console.log(`🛏️ Lits pour service ${formData.service_id} :`, res.data);
          setLits(res.data);
        })
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
    setSaving(true);
    setError('');
    try {
      await api.put(`/consultations/admissions/${id}`, formData);
      navigate(`/medical/admissions/${id}`);
    } catch (err) {
      console.error('Erreur mise à jour :', err);
      setError(err.response?.data?.error || 'Erreur lors de la modification');
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Chargement...</div>;
  if (error && !formData.patient_id) return <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>{error}</div>;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link to={`/medical/admissions/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>
          <FaArrowLeft /> Retour au détail
        </Link>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0, color: '#0f172a' }}>Modifier l’admission #{id}</h2>
        {error && <div style={{ color: '#ef4444', marginBottom: '16px', padding: '12px', backgroundColor: '#fee2e2', borderRadius: '8px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Patient (lecture seule) */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Patient</label>
            <select
              name="patient_id"
              value={formData.patient_id}
              onChange={handleChange}
              required
              disabled
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: '#f1f5f9',
                cursor: 'not-allowed'
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

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Date d’admission *</label>
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
                <option value="">
                  {formData.service_id
                    ? (lits.length === 0 ? 'Aucun lit disponible' : 'Sélectionner un lit')
                    : 'Choisissez un service d\'abord'}
                </option>
                {lits.map(l => (
                  <option key={l.id} value={l.id}>
                    Lit {l.numero || l.nom || l.identifiant || l.id} - {l.chambre_nom || l.chambre || 'Sans chambre'}
                  </option>
                ))}
              </select>
              {formData.service_id && lits.length === 0 && (
                <div style={{ color: '#f59e0b', fontSize: '14px', marginTop: '4px' }}>
                  ⚠️ Aucun lit disponible pour ce service. Veuillez choisir un autre service ou ajouter des lits.
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Motif de l’admission *</label>
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

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              type="submit"
              disabled={saving}
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
                gap: '8px',
                opacity: saving ? 0.6 : 1
              }}
            >
              <FaSave /> {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
            <Link
              to={`/medical/admissions/${id}`}
              style={{
                backgroundColor: '#e5e7eb',
                color: '#0f172a',
                padding: '12px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '500'
              }}
            >
              <FaTimes /> Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdmissionEdit;