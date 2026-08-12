// src/pages/bloc/InterventionForm.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../axios';
import { FaSave, FaTimes, FaSpinner } from 'react-icons/fa';

const InterventionForm = () => {
  const { id } = useParams(); // Rcupre l'ID depuis l'URL si prsent (dition)
  const navigate = useNavigate();
  const isEdit = !!id; // true si on est en mode dition

  // tats pour les donnes du formulaire
  const [formData, setFormData] = useState({
    patient_id: '',
    salle_id: '',
    type_intervention: '',
    date_prevue: '',
    duree_estimee: 60,
    priorite: 'normale',
    chirurgien_principal_id: '',
    co_chirurgiens: [], // tableau d'IDs
    infirmiere_scolper: '',
    infirmiere_circulante: '',
    anesthesiste_id: '',
    notes_preoperatoires: '',
    motifs: '',
    statut: 'planifiee', // par dfaut
  });

  // tats pour les listes droulantes
  const [patients, setPatients] = useState([]);
  const [salles, setSalles] = useState([]);
  const [medecins, setMedecins] = useState([]); // chirurgiens
  const [infirmieres, setInfirmieres] = useState([]);
  const [anesthesistes, setAnesthesistes] = useState([]);

  // tats de chargement et d'erreur
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  // Charger les donnes initiales (patients, salles, personnels)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Rcupration en parallle pour optimiser
        const [patientsRes, sallesRes, medecinsRes, infirmieresRes, anesthesistesRes] = await Promise.all([
          api.get('/patients'),
          api.get('/bloc/salles'),
          api.get('/employes?role=medecin'),   // on suppose que le backend filtre par role
          api.get('/employes?role=infirmiere'),
          api.get('/employes?role=anesthesiste')
        ]);

        setPatients(patientsRes.data || []);
        setSalles(sallesRes.data || []);
        setMedecins(medecinsRes.data || []);
        setInfirmieres(infirmieresRes.data || []);
        setAnesthesistes(anesthesistesRes.data || []);
      } catch (err) {
        console.error('Erreur chargement donnes initiales :', err);
        setToast('Erreur lors du chargement des donnes');
        setTimeout(() => setToast(null), 5000);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Si on est en dition, charger les donnes de l'intervention
  useEffect(() => {
    if (isEdit) {
      const fetchIntervention = async () => {
        try {
          const res = await api.get(`/bloc/interventions/${id}`);
          const data = res.data;
          // Pr-remplir le formulaire avec les donnes existantes
          setFormData({
            patient_id: data.patient_id || '',
            salle_id: data.salle_id || '',
            type_intervention: data.type_intervention || '',
            date_prevue: data.date_prevue ? data.date_prevue.slice(0, 16) : '', // format datetime-local
            duree_estimee: data.duree_estimee || 60,
            priorite: data.priorite || 'normale',
            chirurgien_principal_id: data.chirurgien_principal_id || '',
            co_chirurgiens: data.co_chirurgiens || [],
            infirmiere_scolper: data.infirmiere_scolper || '',
            infirmiere_circulante: data.infirmiere_circulante || '',
            anesthesiste_id: data.anesthesiste_id || '',
            notes_preoperatoires: data.notes_preoperatoires || '',
            motifs: data.motifs || '',
            statut: data.statut || 'planifiee',
          });
        } catch (err) {
          console.error('Erreur chargement intervention :', err);
          setToast('Impossible de charger l\'intervention');
          setTimeout(() => setToast(null), 5000);
        }
      };
      fetchIntervention();
    }
  }, [id, isEdit]);

  // Gestionnaire de changement pour les champs simples
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Gestionnaire pour les co-chirurgiens (multi-slect)
  const handleCoChirurgiensChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({ ...prev, co_chirurgiens: selectedOptions }));
  };

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Validation simple : patient et date obligatoires
    if (!formData.patient_id || !formData.date_prevue) {
      setToast('Le patient et la date sont obligatoires');
      setTimeout(() => setToast(null), 5000);
      setSubmitting(false);
      return;
    }

    try {
      // Nettoyer les champs vides pour viter d'envoyer des chanes vides
      const cleanData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => {
          if (typeof value === 'string' && value.trim() === '') {
            return [key, null];
          }
          return [key, value];
        })
      );

      // Supprimer les proprits null ou undefined
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === null || cleanData[key] === undefined) {
          delete cleanData[key];
        }
      });

      let response;
      if (isEdit) {
        response = await api.put(`/bloc/interventions/${id}`, cleanData);
      } else {
        response = await api.post('/bloc/interventions', cleanData);
      }

      if (response.status === 201 || response.status === 200) {
        setToast(isEdit ? 'Intervention modifie avec succs' : 'Intervention cre avec succs');
        setTimeout(() => {
          setToast(null);
          navigate('/bloc/interventions');
        }, 1500);
      }
    } catch (err) {
      console.error('Erreur soumission :', err);
      // Afficher le message d'erreur du backend si disponible
      const msg = err.response?.data?.error || err.message || 'Une erreur est survenue';
      setToast(msg);
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  // Annuler et revenir  la liste
  const handleCancel = () => navigate('/bloc/interventions');

  // Style de base (identique  la liste)
  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    maxWidth: '800px',
    margin: '0 auto',
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '4px',
  };

  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '16px',
  };

  const fullRowStyle = {
    marginBottom: '16px',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #2563eb', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px',
          backgroundColor: toast.includes('Erreur') || toast.includes('Impossible') ? '#ef4444' : '#10b981',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
          {isEdit ? '?? Modifier l\'intervention' : '?? Nouvelle intervention'}
        </h2>
        <button
          onClick={handleCancel}
          style={{
            backgroundColor: '#f3f4f6',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px'
          }}
        >
          <FaTimes /> Annuler
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Patient et Salle */}
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Patient *</label>
            <select
              name="patient_id"
              value={formData.patient_id}
              onChange={handleChange}
              style={inputStyle}
              required
            >
              <option value="">Slectionner un patient</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nom} {p.prenom} ({p.numero_dossier})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Salle</label>
            <select
              name="salle_id"
              value={formData.salle_id}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">Slectionner une salle</option>
              {salles.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nom} {s.numero ? `(n${s.numero})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Type, Date, Dure */}
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Type d'intervention</label>
            <input
              type="text"
              name="type_intervention"
              value={formData.type_intervention}
              onChange={handleChange}
              style={inputStyle}
              placeholder="Ex: Appendicectomie"
            />
          </div>
          <div>
            <label style={labelStyle}>Date et heure *</label>
            <input
              type="datetime-local"
              name="date_prevue"
              value={formData.date_prevue}
              onChange={handleChange}
              style={inputStyle}
              required
            />
          </div>
        </div>

        {/* Dure et Priorit */}
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Dure estime (minutes)</label>
            <input
              type="number"
              name="duree_estimee"
              value={formData.duree_estimee}
              onChange={handleChange}
              style={inputStyle}
              min="5"
              step="5"
            />
          </div>
          <div>
            <label style={labelStyle}>Priorit</label>
            <select
              name="priorite"
              value={formData.priorite}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="elective">lective</option>
              <option value="normale">Normale</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>

        {/* Chirurgien principal */}
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Chirurgien principal</label>
            <select
              name="chirurgien_principal_id"
              value={formData.chirurgien_principal_id}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">Slectionner un chirurgien</option>
              {medecins.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nom} {m.prenom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Co-chirurgiens</label>
            <select
              multiple
              name="co_chirurgiens"
              value={formData.co_chirurgiens}
              onChange={handleCoChirurgiensChange}
              style={{ ...inputStyle, height: 'auto', minHeight: '60px' }}
            >
              {medecins.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nom} {m.prenom}
                </option>
              ))}
            </select>
            <small style={{ color: '#6b7280', fontSize: '12px' }}>Maintenez Ctrl (ou Cmd) pour slection multiple</small>
          </div>
        </div>

        {/* Infirmires et Anesthsiste */}
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Infirmire scolper</label>
            <select
              name="infirmiere_scolper"
              value={formData.infirmiere_scolper}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">Slectionner</option>
              {infirmieres.map(i => (
                <option key={i.id} value={i.id}>
                  {i.nom} {i.prenom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Infirmire circulante</label>
            <select
              name="infirmiere_circulante"
              value={formData.infirmiere_circulante}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">Slectionner</option>
              {infirmieres.map(i => (
                <option key={i.id} value={i.id}>
                  {i.nom} {i.prenom}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={fullRowStyle}>
          <label style={labelStyle}>Anesthsiste</label>
          <select
            name="anesthesiste_id"
            value={formData.anesthesiste_id}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="">Slectionner</option>
            {anesthesistes.map(a => (
              <option key={a.id} value={a.id}>
                {a.nom} {a.prenom}
              </option>
            ))}
          </select>
        </div>

        {/* Notes et motifs */}
        <div style={fullRowStyle}>
          <label style={labelStyle}>Notes pr-opratoires</label>
          <textarea
            name="notes_preoperatoires"
            value={formData.notes_preoperatoires}
            onChange={handleChange}
            style={{ ...inputStyle, minHeight: '80px' }}
            placeholder="Informations complmentaires"
          />
        </div>

        <div style={fullRowStyle}>
          <label style={labelStyle}>Motifs</label>
          <textarea
            name="motifs"
            value={formData.motifs}
            onChange={handleChange}
            style={{ ...inputStyle, minHeight: '60px' }}
            placeholder="Raisons de l'intervention"
          />
        </div>

        {/* Si dition, afficher le statut actuel (non modifiable dans ce formulaire) */}
        {isEdit && (
          <div style={fullRowStyle}>
            <label style={labelStyle}>Statut (modifiable depuis la liste)</label>
            <input
              type="text"
              value={formData.statut}
              disabled
              style={{ ...inputStyle, backgroundColor: '#f3f4f6' }}
            />
          </div>
        )}

        {/* Boutons de soumission */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: '10px 24px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '10px 24px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: submitting ? 'wait' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {submitting ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaSave />}
            {isEdit ? 'Mettre  jour' : 'Crer l\'intervention'}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default InterventionForm;
