// src/pages/laboratoire-imagerie/ExamenForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';
import { FaArrowLeft, FaSave, FaFlask, FaXRay, FaExclamationTriangle } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const ExamenForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    patient_id: '',
    consultation_id: '',
    type_examen_id: '',
    categorie: 'laboratoire',
    priorite: 'normal',
    service_id: '',
    description: '',
    date_demande: new Date().toISOString().split('T')[0],
    date_prevue: '',
    medecin_prescripteur: '',
    statut: 'demand',
    notes: '',
    instructions_preparation: '',
    type_prelevement: '',
    date_prelevement: '',
    preleveur_id: ''
  });

  const [patients, setPatients] = useState([]);
  const [typesExamens, setTypesExamens] = useState([]);
  const [services, setServices] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [employes, setEmployes] = useState([]);
  const [medecins, setMedecins] = useState([]); // ? Liste des mdecins
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState({});

  // Chargement initial des donnes
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [patientsRes, typesRes, servicesRes, employesRes, medecinsRes] = await Promise.all([
          api.get('/patients'),
          api.get('/types-examens'),
          api.get('/services'),
          api.get('/employes'),
          api.get('/consultations/medecins/all') // ? Rcupration des mdecins
        ]);
        setPatients(patientsRes.data);
        setTypesExamens(typesRes.data);
        setServices(servicesRes.data);
        setEmployes(employesRes.data);
        setMedecins(medecinsRes.data);
      } catch (err) {
        console.error('Erreur chargement donnes', err);
        setError('Erreur de chargement des donnes');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // Chargement de l'examen en dition
  useEffect(() => {
    if (isEdit && !loadingData) {
      api.get(`/examens/${id}`)
        .then(res => {
          const data = res.data;
          setFormData({
            patient_id: data.patient_id || '',
            consultation_id: data.consultation_id || '',
            type_examen_id: data.type_examen_id || '',
            categorie: data.categorie || 'laboratoire',
            priorite: data.priorite || 'normal',
            service_id: data.service_id || '',
            description: data.description || '',
            date_demande: data.date_demande ? data.date_demande.split('T')[0] : '',
            date_prevue: data.date_prevue ? data.date_prevue.split('T')[0] : '',
            medecin_prescripteur: data.medecin_prescripteur || '',
            statut: data.statut || 'demand',
            notes: data.notes || '',
            instructions_preparation: data.instructions_preparation || '',
            type_prelevement: data.type_prelevement || '',
            date_prelevement: data.date_prelevement ? data.date_prelevement.split('T')[0] : '',
            preleveur_id: data.preleveur_id || ''
          });
        })
        .catch(err => {
          console.error('Erreur chargement examen :', err);
          setError('Impossible de charger l\'examen');
        });
    }
  }, [id, isEdit, loadingData]);

  // Rcupration des consultations du patient slectionn
  useEffect(() => {
    if (formData.patient_id) {
      api.get(`/consultations/patient/${formData.patient_id}`)
        .then(res => {
          setConsultations(res.data);
          if (res.data.length === 1 && !formData.consultation_id) {
            setFormData(prev => ({ ...prev, consultation_id: res.data[0].id }));
          }
        })
        .catch(err => console.error('Erreur consultations', err));
    } else {
      setConsultations([]);
    }
  }, [formData.patient_id]);

  // Mise  jour du mdecin prescripteur quand une consultation est slectionne
  useEffect(() => {
    if (formData.consultation_id) {
      const consultation = consultations.find(c => c.id === parseInt(formData.consultation_id));
      if (consultation && consultation.medecin_nom) {
        setFormData(prev => ({ ...prev, medecin_prescripteur: consultation.medecin_nom }));
      }
    }
  }, [formData.consultation_id, consultations]);

  // Mise  jour de la catgorie quand le type d'examen change
  useEffect(() => {
    if (formData.type_examen_id) {
      const type = typesExamens.find(t => t.id === parseInt(formData.type_examen_id));
      if (type) {
        setFormData(prev => ({ ...prev, categorie: type.categorie }));
      }
    }
  }, [formData.type_examen_id, typesExamens]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.patient_id) newErrors.patient_id = 'Patient requis';
    if (!formData.type_examen_id) newErrors.type_examen_id = 'Type d\'examen requis';
    if (formData.date_prevue && new Date(formData.date_prevue) < new Date()) {
      newErrors.date_prevue = 'La date prvue ne peut pas tre dans le pass';
    }
    if (formData.priorite === 'urgent' && !formData.service_id) {
      newErrors.service_id = 'Service requis pour les urgences';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isEdit) {
        await api.put(`/examens/${id}`, formData);
        setSuccess('Examen modifi avec succs');
      } else {
        await api.post('/examens', formData);
        setSuccess('Examen cr avec succs');
        setTimeout(() => navigate('/laboratoire'), 1500);
        return;
      }
      setTimeout(() => navigate(`/laboratoire/examen/${id}`), 1000);
    } catch (err) {
      console.error('Erreur sauvegarde :', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '24px' }}>? Chargement des donnes...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/laboratoire" style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: '#3b82f6', 
          textDecoration: 'none',
          fontWeight: '500'
        }}>
          <FaArrowLeft /> Retour
        </Link>
      </div>

      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: '#0f172a' }}>
          {isEdit ? 'Modifier l\'examen' : 'Nouvelle demande d\'examen'}
        </h2>

        {error && (
          <div style={{ 
            color: '#ef4444', 
            padding: '12px', 
            backgroundColor: '#fee2e2',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ 
            color: '#10b981', 
            padding: '12px', 
            backgroundColor: '#d1fae5',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Ligne 1 : Patient, Consultation, Service */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
                Patient *
              </label>
              <select
                name="patient_id"
                value={formData.patient_id}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: `1px solid ${errors.patient_id ? '#ef4444' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                <option value="">Slectionner un patient</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nom} {p.prenom}
                  </option>
                ))}
              </select>
              {errors.patient_id && <div style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>{errors.patient_id}</div>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
                Consultation associe
              </label>
              <select
                name="consultation_id"
                value={formData.consultation_id}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                disabled={!formData.patient_id}
              >
                <option value="">Slectionner une consultation</option>
                {consultations.map(c => (
                  <option key={c.id} value={c.id}>
                    {new Date(c.date).toLocaleDateString()} - {c.motif || 'Consultation'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
                Service demandeur {formData.priorite === 'urgent' && '*'}
              </label>
              <select
                name="service_id"
                value={formData.service_id}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: `1px solid ${errors.service_id ? '#ef4444' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                required={formData.priorite === 'urgent'}
              >
                <option value="">Slectionner un service</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
              {errors.service_id && <div style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>{errors.service_id}</div>}
            </div>
          </div>

          {/* Ligne 2 : Catgorie, Type examen, Priorit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
                Catgorie *
              </label>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', paddingTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="categorie"
                    value="laboratoire"
                    checked={formData.categorie === 'laboratoire'}
                    onChange={handleChange}
                  />
                  <FaFlask style={{ color: '#8b5cf6' }} /> Laboratoire
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="categorie"
                    value="imagerie"
                    checked={formData.categorie === 'imagerie'}
                    onChange={handleChange}
                  />
                  <FaXRay style={{ color: '#3b82f6' }} /> Imagerie
                </label>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
                Type d'examen *
              </label>
              <select
                name="type_examen_id"
                value={formData.type_examen_id}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: `1px solid ${errors.type_examen_id ? '#ef4444' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                <option value="">Slectionner</option>
                {typesExamens
                  .filter(t => t.categorie === formData.categorie)
                  .map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nom}
                    </option>
                  ))}
              </select>
              {errors.type_examen_id && <div style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>{errors.type_examen_id}</div>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
                Priorit *
              </label>
              <select
                name="priorite"
                value={formData.priorite}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                <option value="normal">Normal</option>
                <option value="urgent">?? Urgent</option>
              </select>
              {formData.priorite === 'urgent' && (
                <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaExclamationTriangle /> Priorit urgente ?FC? dlai rduit
                </div>
              )}
            </div>
          </div>

          {/* Ligne 3 : Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
                Date demande
              </label>
              <input
                type="date"
                name="date_demande"
                value={formData.date_demande}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                disabled
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
                Date prvue
              </label>
              <input
                type="date"
                name="date_prevue"
                value={formData.date_prevue}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: `1px solid ${errors.date_prevue ? '#ef4444' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
              {errors.date_prevue && <div style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>{errors.date_prevue}</div>}
            </div>
          </div>

          {/* Ligne 4 : Mdecin prescripteur (liste droulante), Type prlvement, Date prlvement */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
                Mdecin prescripteur
              </label>
              <select
                name="medecin_prescripteur"
                value={formData.medecin_prescripteur}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                <option value="">Slectionner un mdecin</option>
                {medecins.map(m => (
                  <option key={m.id} value={`${m.nom} ${m.prenom}`}>
                    {m.nom} {m.prenom} {m.specialite ? `(${m.specialite})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
                Type de prlvement
              </label>
              <select
                name="type_prelevement"
                value={formData.type_prelevement}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                <option value="">Non spcifi</option>
                <option value="sang">Sang</option>
                <option value="urine">Urine</option>
                <option value="salive">Salive</option>
                <option value="selles">Selles</option>
                <option value="liquide_cephalo">Liquide cphalo-rachidien</option>
                <option value="autres">Autres</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
                Date de prlvement
              </label>
              <input
                type="date"
                name="date_prelevement"
                value={formData.date_prelevement}
                onChange={handleChange}
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

          {/* Zones texte */}
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
              Description / Motif
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
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

          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
              Instructions de prparation (pour le patient)
            </label>
            <textarea
              name="instructions_preparation"
              value={formData.instructions_preparation}
              onChange={handleChange}
              rows="2"
              placeholder="Jene, arrt de mdicaments, etc."
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

          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
              Notes internes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="2"
              placeholder="Informations complmentaires pour le laboratoire"
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
              marginTop: '24px',
              backgroundColor: '#f472b6',
              color: 'white',
              padding: '12px 32px',
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
            <FaSave /> {loading ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Demander l\'examen'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExamenForm;
