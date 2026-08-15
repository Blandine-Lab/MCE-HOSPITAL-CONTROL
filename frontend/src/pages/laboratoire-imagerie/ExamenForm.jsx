// src/pages/laboratoire-imagerie/ExamenForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';
import { FaArrowLeft, FaSave, FaFlask, FaXRay, FaExclamationTriangle, FaPlus, FaTrash } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const ExamenForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { user } = useAuth();

  // Champs communs
  const [formData, setFormData] = useState({
    patient_id: '',
    consultation_id: '',
    service_id: '',
    medecin_prescripteur: '',
    priorite: 'normal',
    date_demande: new Date().toISOString().split('T')[0],
  });

  // Liste des examens (une ligne par examen)
  const [examens, setExamens] = useState([
    {
      type_examen_id: '',
      categorie: 'laboratoire',
      description: '',
      date_prevue: '',
      instructions_preparation: '',
      type_prelevement: '',
      date_prelevement: '',
      preleveur_id: '',
      notes: '',
      parametres: [] // { nom, valeur, unite, ref_min, ref_max, interpretation }
    }
  ]);

  const [patients, setPatients] = useState([]);
  const [typesExamens, setTypesExamens] = useState([]);
  const [services, setServices] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [employes, setEmployes] = useState([]);
  const [medecins, setMedecins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState({});

  // Chargement initial
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      setError('');
      try {
        const [patientsRes, typesRes, servicesRes, employesRes, medecinsRes] = await Promise.all([
          api.get('/patients').catch(() => ({ data: [] })),
          api.get('/types-examens').catch(() => ({ data: [] })),
          api.get('/services').catch(() => ({ data: [] })),
          api.get('/employes').catch(() => ({ data: [] })),
          api.get('/consultations/medecins/all').catch(() => ({ data: [] }))
        ]);
        setPatients(patientsRes.data || []);
        setTypesExamens(typesRes.data || []);
        setServices(servicesRes.data || []);
        setEmployes(employesRes.data || []);
        setMedecins(medecinsRes.data || []);
        console.log('📋 Types d\'examens chargés :', typesRes.data);
      } catch (err) {
        console.error('Erreur chargement données', err);
        setError('Erreur de chargement des données');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // Chargement des consultations du patient
  useEffect(() => {
    if (formData.patient_id) {
      api.get(`/consultations/patient/${formData.patient_id}`)
        .then(res => setConsultations(res.data || []))
        .catch(() => setConsultations([]));
    } else {
      setConsultations([]);
    }
  }, [formData.patient_id]);

  // Gestion des champs communs
  const handleCommonChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // Gestion des lignes d'examens
  const addExamen = () => {
    setExamens([
      ...examens,
      {
        type_examen_id: '',
        categorie: 'laboratoire',
        description: '',
        date_prevue: '',
        instructions_preparation: '',
        type_prelevement: '',
        date_prelevement: '',
        preleveur_id: '',
        notes: '',
        parametres: []
      }
    ]);
  };

  const removeExamen = (index) => {
    if (examens.length <= 1) return;
    setExamens(examens.filter((_, i) => i !== index));
  };

  // 🔧 FONCTION MODIFIÉE : charge automatiquement les paramètres par défaut du type sélectionné
  const updateExamen = (index, field, value) => {
    const newExamens = [...examens];
    newExamens[index][field] = value;

    // Si le type d'examen change, on met à jour la catégorie et on charge les paramètres
    if (field === 'type_examen_id') {
      const type = typesExamens.find(t => t.id === parseInt(value));
      if (type) {
        newExamens[index].categorie = type.categorie;

        // Charger les paramètres par défaut seulement si la liste est vide
        if (!newExamens[index].parametres || newExamens[index].parametres.length === 0) {
          let defaultParams = type.parametres_defaut;
          if (typeof defaultParams === 'string') {
            try { defaultParams = JSON.parse(defaultParams); } catch { defaultParams = []; }
          }
          if (Array.isArray(defaultParams) && defaultParams.length > 0) {
            newExamens[index].parametres = defaultParams.map(p => ({
              nom: p.nom || '',
              valeur: p.valeur || '',
              unite: p.unite || '',
              ref_min: p.ref_min || '',
              ref_max: p.ref_max || '',
              interpretation: p.interpretation || ''
            }));
          }
        }
      }
    }

    setExamens(newExamens);
  };

  // Gestion des paramètres par ligne
  const addParametre = (index) => {
    const newExamens = [...examens];
    newExamens[index].parametres.push({ nom: '', valeur: '', unite: '', ref_min: '', ref_max: '', interpretation: '' });
    setExamens(newExamens);
  };

  const removeParametre = (examenIndex, paramIndex) => {
    const newExamens = [...examens];
    newExamens[examenIndex].parametres = newExamens[examenIndex].parametres.filter((_, i) => i !== paramIndex);
    setExamens(newExamens);
  };

  const updateParametre = (examenIndex, paramIndex, field, value) => {
    const newExamens = [...examens];
    newExamens[examenIndex].parametres[paramIndex][field] = value;
    setExamens(newExamens);
  };

  // Validation simplifiée
  const validateForm = () => {
    const newErrors = {};
    if (!formData.patient_id) newErrors.patient_id = 'Patient requis';
    // Vérifier qu'au moins un examen a un type sélectionné
    const hasValidExamen = examens.some(e => e.type_examen_id);
    if (!hasValidExamen) newErrors.examens = 'Au moins un examen doit être sélectionné';
    // Vérifier que chaque examen a un type
    examens.forEach((e, idx) => {
      if (!e.type_examen_id) {
        newErrors[`examen_${idx}_type`] = 'Type requis';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Filtrer les examens vides (sans type)
    const validExamens = examens.filter(ex => ex.type_examen_id);

    if (validExamens.length === 0) {
      setError('Veuillez ajouter au moins un examen valide.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Préparer le payload pour la route /groupe
      const payload = {
        patient_id: formData.patient_id,
        consultation_id: formData.consultation_id || null,
        service_id: formData.service_id || null,
        medecin_prescripteur: formData.medecin_prescripteur || null,
        priorite: formData.priorite,
        examens: validExamens.map(ex => ({
          type_examen_id: ex.type_examen_id,
          categorie: ex.categorie,
          description: ex.description,
          date_prevue: ex.date_prevue || null,
          instructions_preparation: ex.instructions_preparation || null,
          type_prelevement: ex.type_prelevement || null,
          date_prelevement: ex.date_prelevement || null,
          preleveur_id: ex.preleveur_id || null,
          notes: ex.notes || null,
          parametres: ex.parametres || []
        }))
      };

      const res = await api.post('/examens/groupe', payload);
      setSuccess(`${res.data.examensIds.length} examen(s) créé(s) avec succès`);
      setTimeout(() => navigate('/laboratoire'), 2000);
    } catch (err) {
      console.error('Erreur sauvegarde :', err);
      setError(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '24px' }}>⏳ Chargement des données...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/laboratoire" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>
          <FaArrowLeft /> Retour
        </Link>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0, color: '#0f172a' }}>
          Nouvelle demande d'examens
        </h2>

        {error && (
          <div style={{ color: '#ef4444', padding: '12px', backgroundColor: '#fee2e2', borderRadius: '8px', marginBottom: '16px' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ color: '#10b981', padding: '12px', backgroundColor: '#d1fae5', borderRadius: '8px', marginBottom: '16px' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Champs communs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Patient *</label>
              <select
                name="patient_id"
                value={formData.patient_id}
                onChange={handleCommonChange}
                required
                style={{ width: '100%', padding: '10px 14px', border: `1px solid ${errors.patient_id ? '#ef4444' : '#e2e8f0'}`, borderRadius: '8px', fontSize: '16px' }}
              >
                <option value="">Sélectionner un patient</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>
                ))}
              </select>
              {errors.patient_id && <div style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>{errors.patient_id}</div>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Consultation associée (optionnel)</label>
              <select
                name="consultation_id"
                value={formData.consultation_id}
                onChange={handleCommonChange}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
                disabled={!formData.patient_id}
              >
                <option value="">Sélectionner une consultation</option>
                {consultations.map(c => (
                  <option key={c.id} value={c.id}>
                    {new Date(c.date).toLocaleDateString()} - {c.motif || 'Consultation'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Service demandeur (optionnel)</label>
              <select
                name="service_id"
                value={formData.service_id}
                onChange={handleCommonChange}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
              >
                <option value="">Sélectionner un service</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Médecin prescripteur</label>
              <select
                name="medecin_prescripteur"
                value={formData.medecin_prescripteur}
                onChange={handleCommonChange}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
              >
                <option value="">Sélectionner un médecin</option>
                {medecins.map(m => (
                  <option key={m.id} value={`${m.nom} ${m.prenom}`}>
                    {m.nom} {m.prenom} {m.specialite ? `(${m.specialite})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Priorité *</label>
              <select
                name="priorite"
                value={formData.priorite}
                onChange={handleCommonChange}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
              >
                <option value="normal">Normal</option>
                <option value="urgent">⚠️ Urgent</option>
              </select>
              {formData.priorite === 'urgent' && (
                <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaExclamationTriangle /> Priorité urgente : délai réduit
                </div>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Examens demandés</h3>
              <button
                type="button"
                onClick={addExamen}
                style={{ backgroundColor: '#3b82f6', color: 'white', padding: '6px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FaPlus /> Ajouter un examen
              </button>
            </div>
            {errors.examens && <div style={{ color: '#ef4444', fontSize: '14px', marginTop: '8px' }}>{errors.examens}</div>}
          </div>

          {/* Liste des examens */}
          {examens.map((ex, idx) => (
            <div key={idx} style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '20px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, color: '#1e293b' }}>Examen #{idx + 1}</h4>
                {examens.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeExamen(idx)}
                    style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <FaTrash /> Supprimer
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Catégorie *</label>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', paddingTop: '4px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={`categorie_${idx}`}
                        value="laboratoire"
                        checked={ex.categorie === 'laboratoire'}
                        onChange={() => updateExamen(idx, 'categorie', 'laboratoire')}
                      />
                      <FaFlask style={{ color: '#8b5cf6' }} /> Laboratoire
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={`categorie_${idx}`}
                        value="imagerie"
                        checked={ex.categorie === 'imagerie'}
                        onChange={() => updateExamen(idx, 'categorie', 'imagerie')}
                      />
                      <FaXRay style={{ color: '#3b82f6' }} /> Imagerie
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Type d'examen *</label>
                  <select
                    value={ex.type_examen_id}
                    onChange={(e) => updateExamen(idx, 'type_examen_id', e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px', border: `1px solid ${errors[`examen_${idx}_type`] ? '#ef4444' : '#e2e8f0'}`, borderRadius: '6px' }}
                  >
                    <option value="">Sélectionner</option>
                    {typesExamens
                      .filter(t => t.categorie && t.categorie.toLowerCase() === ex.categorie.toLowerCase())
                      .map(t => (
                        <option key={t.id} value={t.id}>{t.nom}</option>
                      ))}
                  </select>
                  {errors[`examen_${idx}_type`] && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors[`examen_${idx}_type`]}</div>}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Date prévue</label>
                  <input
                    type="date"
                    value={ex.date_prevue}
                    onChange={(e) => updateExamen(idx, 'date_prevue', e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Type de prélèvement</label>
                  <select
                    value={ex.type_prelevement}
                    onChange={(e) => updateExamen(idx, 'type_prelevement', e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                  >
                    <option value="">Non spécifié</option>
                    <option value="sang">Sang</option>
                    <option value="urine">Urine</option>
                    <option value="salive">Salive</option>
                    <option value="selles">Selles</option>
                    <option value="liquide_cephalo">Liquide céphalo-rachidien</option>
                    <option value="autres">Autres</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Date de prélèvement</label>
                  <input
                    type="date"
                    value={ex.date_prelevement}
                    onChange={(e) => updateExamen(idx, 'date_prelevement', e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Préleveur (ID)</label>
                  <input
                    type="text"
                    value={ex.preleveur_id || ''}
                    onChange={(e) => updateExamen(idx, 'preleveur_id', e.target.value)}
                    placeholder="ID du préleveur"
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Description / Motif</label>
                <textarea
                  value={ex.description}
                  onChange={(e) => updateExamen(idx, 'description', e.target.value)}
                  rows="2"
                  style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                />
              </div>

              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Instructions de préparation</label>
                <input
                  type="text"
                  value={ex.instructions_preparation || ''}
                  onChange={(e) => updateExamen(idx, 'instructions_preparation', e.target.value)}
                  placeholder="Jeûne, arrêt de médicaments, etc."
                  style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                />
              </div>

              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Notes internes</label>
                <input
                  type="text"
                  value={ex.notes || ''}
                  onChange={(e) => updateExamen(idx, 'notes', e.target.value)}
                  placeholder="Informations complémentaires"
                  style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                />
              </div>

              {/* Paramètres libres pour cet examen */}
              <div style={{ marginTop: '16px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontWeight: '500', color: '#334155' }}>Paramètres libres</label>
                  <button
                    type="button"
                    onClick={() => addParametre(idx)}
                    style={{ backgroundColor: '#e2e8f0', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <FaPlus /> Ajouter
                  </button>
                </div>
                {ex.parametres.length === 0 && (
                  <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '8px' }}>Aucun paramètre</div>
                )}
                {ex.parametres.map((p, pIdx) => (
                  <div key={pIdx} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="Nom"
                      value={p.nom || ''}
                      onChange={(e) => updateParametre(idx, pIdx, 'nom', e.target.value)}
                      style={{ flex: '1 1 100px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                    />
                    <input
                      type="text"
                      placeholder="Valeur"
                      value={p.valeur || ''}
                      onChange={(e) => updateParametre(idx, pIdx, 'valeur', e.target.value)}
                      style={{ flex: '1 1 80px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                    />
                    <input
                      type="text"
                      placeholder="Unité"
                      value={p.unite || ''}
                      onChange={(e) => updateParametre(idx, pIdx, 'unite', e.target.value)}
                      style={{ flex: '1 1 80px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                    />
                    <input
                      type="text"
                      placeholder="Réf. min"
                      value={p.ref_min || ''}
                      onChange={(e) => updateParametre(idx, pIdx, 'ref_min', e.target.value)}
                      style={{ flex: '1 1 70px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                    />
                    <input
                      type="text"
                      placeholder="Réf. max"
                      value={p.ref_max || ''}
                      onChange={(e) => updateParametre(idx, pIdx, 'ref_max', e.target.value)}
                      style={{ flex: '1 1 70px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                    />
                    <select
                      value={p.interpretation || ''}
                      onChange={(e) => updateParametre(idx, pIdx, 'interpretation', e.target.value)}
                      style={{ flex: '1 1 100px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                    >
                      <option value="">Interprétation</option>
                      <option value="normal">Normal</option>
                      <option value="haut">Haut</option>
                      <option value="bas">Bas</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeParametre(idx, pIdx)}
                      style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

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
            <FaSave /> {loading ? 'Enregistrement...' : 'Demander les examens'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExamenForm;