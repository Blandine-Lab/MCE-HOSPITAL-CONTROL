import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../axios';

const PrescriptionForm = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);       // 🔧 anti double-clic
  const [medicaments, setMedicaments] = useState([]);
  const [lignes, setLignes] = useState([
    { medicament_id: '', quantite_prescrit: 1, posologie: '' }
  ]);
  const [observations, setObservations] = useState('');
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  // ✅ 1. Charger le patient
  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }
    api.get(`/patients/${patientId}`)
      .then(res => setPatient(res.data))
      .catch(err => {
        console.error('❌ Erreur chargement patient :', err);
        showToast('Patient introuvable', 'error');
      })
      .finally(() => setLoading(false));
  }, [patientId]);

  // ✅ 2. Charger les médicaments depuis le module pharmacie
  useEffect(() => {
    api.get('/pharmacy/medicaments')
      .then(res => {
        console.log('💊 Médicaments chargés :', res.data?.length);
        setMedicaments(res.data || []);
      })
      .catch(err => {
        console.error('❌ Erreur chargement médicaments :', err);
        showToast('Erreur de chargement des médicaments', 'error');
      });
  }, []);

  const addLigne = () => {
    setLignes([...lignes, { medicament_id: '', quantite_prescrit: 1, posologie: '' }]);
  };

  const removeLigne = (index) => {
    if (lignes.length === 1) return;
    setLignes(lignes.filter((_, i) => i !== index));
  };

  const handleLigneChange = (index, field, value) => {
    const newLignes = [...lignes];
    newLignes[index][field] = value;
    setLignes(newLignes);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔧 Garde-fou : patientId doit exister et être un entier
    const patientIdNum = parseInt(patientId, 10);
    if (!Number.isInteger(patientIdNum) || patientIdNum <= 0) {
      showToast('Patient invalide dans l’URL.', 'error');
      return;
    }

    const validLignes = lignes.filter(
      l => l.medicament_id && parseInt(l.quantite_prescrit, 10) > 0
    );
    if (validLignes.length === 0) {
      showToast('Ajoutez au moins un médicament valide.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        patient_id: patientIdNum,
        lignes: validLignes.map(l => ({
          medicament_id: parseInt(l.medicament_id, 10),
          quantite_prescrit: parseInt(l.quantite_prescrit, 10),
          posologie: l.posologie || null
        })),
        observations: observations || null
      };

      await api.post('/consultations/ordonnances', payload);
      showToast('✅ Prescription créée avec succès !', 'success');
      setTimeout(() => navigate('/doctor/prescriptions'), 1500);
    } catch (err) {
      console.error('Erreur création prescription:', err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Erreur lors de la création.';
      showToast('❌ ' + msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        ⏳ Chargement des données...
      </div>
    );
  }

  if (!patient && patientId) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px', color: '#dc2626' }}>
        ❌ Patient non trouvé.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}

      <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>📝 Nouvelle prescription</h1>

      {patient ? (
        <div style={{
          background: '#f0f4ff',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #2563eb'
        }}>
          <strong>Patient :</strong> {patient.prenom} {patient.nom} (IPP: {patient.ipp || 'N/A'})
        </div>
      ) : (
        <div style={{
          background: '#fef3c7',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #f59e0b',
          color: '#92400e'
        }}>
          ⚠️ Aucun patient sélectionné dans l'URL.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {lignes.map((ligne, index) => (
          <div
            key={index}
            style={{
              border: '1px solid #e2e8f0',
              padding: '16px',
              marginBottom: '16px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ margin: 0 }}>💊 Médicament #{index + 1}</h4>
              {lignes.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLigne(index)}
                  style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
                Médicament *
              </label>
              <select
                value={ligne.medicament_id}
                onChange={(e) => handleLigneChange(index, 'medicament_id', e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              >
                <option value="">Sélectionner un médicament</option>
                {medicaments.map(m => (
                  <option key={m.id} value={m.id}>
                    {/* 🔧 stock peut être absent/null → on protège */}
                    {m.nom}{m.stock != null ? ` (stock: ${m.stock})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
                  Quantité *
                </label>
                <input
                  type="number"
                  value={ligne.quantite_prescrit}
                  onChange={(e) => handleLigneChange(index, 'quantite_prescrit', parseInt(e.target.value, 10) || 1)}
                  min="1"
                  required
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
                  Posologie (optionnel)
                </label>
                <input
                  type="text"
                  value={ligne.posologie}
                  onChange={(e) => handleLigneChange(index, 'posologie', e.target.value)}
                  placeholder="ex: 1 comprimé 2x/jour"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addLigne}
          style={{
            background: '#3b82f6',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '16px'
          }}
        >
          + Ajouter un médicament
        </button>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
            Observations (optionnel)
          </label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows="3"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            placeholder="Notes particulières..."
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              backgroundColor: '#16a34a',
              color: 'white',
              padding: '10px 28px',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: submitting ? 'wait' : 'pointer',
              fontSize: '16px',
              opacity: submitting ? 0.6 : 1
            }}
          >
            {submitting ? '💾 Création...' : '💾 Créer la prescription'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/doctor/prescriptions')}
            style={{
              backgroundColor: '#e5e7eb',
              color: '#1e293b',
              padding: '10px 28px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Annuler
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

export default PrescriptionForm;