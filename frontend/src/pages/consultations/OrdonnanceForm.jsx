import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaPlus, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import api from '../../axios';

const OrdonnanceForm = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [medicaments, setMedicaments] = useState([]);
  const [medecins, setMedecins] = useState([]);
  const [selectedMedecinId, setSelectedMedecinId] = useState('');
  const [lignes, setLignes] = useState([{ medicament_id: '', quantite_prescrit: 1, posologie: '' }]);
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!patientId) {
        navigate('/patients');
        return;
      }
      try {
        const [patientRes, medsRes, medecinsRes] = await Promise.all([
          api.get(`/patients/${patientId}`),
          api.get('/pharmacy/medicaments'),
          api.get('/consultations/medecins/all')
        ]);
        setPatient(patientRes.data);
        setMedicaments(medsRes.data);
        setMedecins(medecinsRes.data);
        setLoading(false);
      } catch (err) {
        console.error('Erreur chargement:', err);
        setError('Erreur de chargement des données. Vérifiez que le patient existe et que le serveur est accessible.');
        setLoading(false);
      }
    };
    fetchData();
  }, [patientId, navigate]);

  const addLigne = () => {
    setLignes([...lignes, { medicament_id: '', quantite_prescrit: 1, posologie: '' }]);
  };

  const removeLigne = (index) => {
    if (lignes.length <= 1) return;
    setLignes(lignes.filter((_, i) => i !== index));
  };

  const updateLigne = (index, field, value) => {
    const newLignes = [...lignes];
    newLignes[index][field] = value;
    setLignes(newLignes);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const validLignes = lignes.filter(l => l.medicament_id && parseInt(l.quantite_prescrit) > 0);
    if (validLignes.length === 0) {
      showToast('Ajoutez au moins un médicament avec une quantité valide.', 'error');
      setSaving(false);
      return;
    }

    // Le backend utilise le médecin authentifié (req.user.id)
    // On n'envoie donc pas medecin_id explicitement
    try {
      await api.post('/consultations/ordonnances', {
        patient_id: parseInt(patientId, 10),
        lignes: validLignes.map(l => ({
          medicament_id: parseInt(l.medicament_id, 10),
          quantite_prescrit: parseInt(l.quantite_prescrit, 10),
          posologie: l.posologie || null
        })),
        observations: observations || null
      });
      showToast('✅ Ordonnance créée avec succès.', 'success');
      setTimeout(() => navigate(`/patients/${patientId}`), 1500);
    } catch (err) {
      console.error('Erreur création ordonnance:', err);
      const msg = err.response?.data?.error || 'Erreur lors de la création de l\'ordonnance.';
      showToast('❌ ' + msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '18px' }}>
        ⏳ Chargement des données...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: '#dc2626', textAlign: 'center', marginTop: '50px', fontSize: '16px' }}>
        ❌ {error}
      </div>
    );
  }

  if (!patient) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '18px' }}>
        Patient non trouvé.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
            color: 'white',
            padding: '14px 24px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            animation: 'slideIn 0.3s ease-out',
            fontWeight: '500'
          }}
        >
          {toast}
        </div>
      )}

      <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>📝 Prescrire pour</span>
        <span style={{ color: '#1e3a8a' }}>
          {patient.nom} {patient.prenom}
        </span>
        <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 'normal' }}>
          (IPP: {patient.ipp || 'N/A'})
        </span>
      </h2>

      <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        {/* Médecin prescripteur - affichage informatif seulement */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1e293b' }}>
            Médecin prescripteur
          </label>
          <select
            value={selectedMedecinId}
            onChange={(e) => setSelectedMedecinId(e.target.value)}
            required
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
          >
            <option value="">-- Choisir un médecin (pour affichage) --</option>
            {medecins.map(m => (
              <option key={m.id} value={m.id}>
                {m.prenom} {m.nom} ({m.specialite || 'Généraliste'})
              </option>
            ))}
          </select>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Le médecin authentifié sera utilisé comme prescripteur principal.
          </p>
        </div>

        {/* Lignes de médicaments */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px', color: '#1e293b' }}>💊 Médicaments prescrits</h3>
          {lignes.map((ligne, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '12px',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}
            >
              <select
                value={ligne.medicament_id}
                onChange={e => updateLigne(index, 'medicament_id', e.target.value)}
                required
                style={{ flex: 2, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
              >
                <option value="">Sélectionner un médicament</option>
                {medicaments.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nom} (stock: {m.stock})
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Qté"
                value={ligne.quantite_prescrit}
                onChange={e => updateLigne(index, 'quantite_prescrit', parseInt(e.target.value) || 0)}
                required
                min="1"
                style={{ width: '80px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
              />
              <input
                type="text"
                placeholder="Posologie (ex: 1 comprimé/jour)"
                value={ligne.posologie}
                onChange={e => updateLigne(index, 'posologie', e.target.value)}
                style={{ flex: 2, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
              />
              <button
                type="button"
                onClick={() => removeLigne(index)}
                disabled={lignes.length <= 1}
                style={{
                  background: lignes.length <= 1 ? '#e2e8f0' : '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  cursor: lignes.length <= 1 ? 'not-allowed' : 'pointer',
                  opacity: lignes.length <= 1 ? 0.5 : 1
                }}
              >
                <FaTrash />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addLigne}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <FaPlus /> Ajouter un médicament
          </button>
        </div>

        {/* Observations */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1e293b' }}>
            Observations (optionnel)
          </label>
          <textarea
            value={observations}
            onChange={e => setObservations(e.target.value)}
            rows="3"
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }}
            placeholder="Notes particulières, précautions..."
          />
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => navigate(`/patients/${patientId}`)}
            style={{
              background: '#e5e7eb',
              color: '#1e293b',
              padding: '10px 24px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaTimes /> Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: saving ? '#6b7280' : '#16a34a',
              color: 'white',
              padding: '10px 28px',
              border: 'none',
              borderRadius: '8px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaSave /> {saving ? 'Enregistrement...' : 'Prescrire'}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default OrdonnanceForm;