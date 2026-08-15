import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../axios'; // ✅ instance avec intercepteur

const PrescriptionCreation = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [medicaments, setMedicaments] = useState([]);
  const [medecins, setMedecins] = useState([]);
  const [formData, setFormData] = useState({
    patient_id: patientId || '',
    medecin_id: '', // ✅ renommé pour correspondre au backend
    observations: '',
    lignes: [{ medicament_id: '', quantite_prescrit: 1, posologie: '' }]
  });
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  // Charger les données
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, produitsRes, stocksRes, medecinsRes] = await Promise.all([
          api.get('/patients'),
          api.get('/produits'), // catégorie 1 = médicaments
          api.get('/stocks'),
          api.get('/consultations/medecins/all')
        ]);

        const produits = produitsRes.data || [];
        const stocks = stocksRes.data || [];
        // Filtrer les médicaments (catégorie_id = 1)
        const meds = produits.filter(p => p.categorie_id === 1);
        const medicamentsAvecStock = meds.map(m => {
          const stock = stocks.find(s => s.produit_id === m.id);
          return { ...m, stock: stock?.quantite || 0 };
        });

        setPatients(patientsRes.data || []);
        setMedicaments(medicamentsAvecStock);
        setMedecins(medecinsRes.data || []);
      } catch (err) {
        console.error('Erreur chargement données:', err);
        setError('Impossible de charger les données. Vérifiez votre connexion.');
        showToast('Erreur de chargement des données', 'error');
      }
    };
    fetchData();
  }, []);

  // Si un patientId est passé en paramètre, le sélectionner automatiquement
  useEffect(() => {
    if (patientId && patients.length > 0) {
      const patientExists = patients.some(p => p.id === parseInt(patientId, 10));
      if (patientExists) {
        setFormData(prev => ({ ...prev, patient_id: patientId }));
      }
    }
  }, [patientId, patients]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLigneChange = (index, field, value) => {
    const newLignes = [...formData.lignes];
    newLignes[index][field] = value;
    setFormData({ ...formData, lignes: newLignes });
  };

  const addLigne = () => {
    setFormData({
      ...formData,
      lignes: [...formData.lignes, { medicament_id: '', quantite_prescrit: 1, posologie: '' }]
    });
  };

  const removeLigne = (index) => {
    if (formData.lignes.length === 1) return;
    const newLignes = formData.lignes.filter((_, i) => i !== index);
    setFormData({ ...formData, lignes: newLignes });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.medecin_id) {
      setError('Veuillez sélectionner un médecin prescripteur.');
      setLoading(false);
      return;
    }

    const validLignes = formData.lignes.filter(l => l.medicament_id && parseInt(l.quantite_prescrit, 10) > 0);
    if (validLignes.length === 0) {
      setError('Ajoutez au moins un médicament valide.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        patient_id: parseInt(formData.patient_id, 10),
        // Le backend utilise le médecin authentifié, mais on envoie aussi medecin_id pour référence
        medecin_id: parseInt(formData.medecin_id, 10),
        observations: formData.observations,
        lignes: validLignes.map(l => ({
          medicament_id: parseInt(l.medicament_id, 10),
          quantite_prescrit: parseInt(l.quantite_prescrit, 10),
          posologie: l.posologie || ''
        }))
      };

      await api.post('/consultations/ordonnances', payload);
      showToast('✅ Prescription créée avec succès !', 'success');
      setTimeout(() => navigate('/doctor/prescriptions'), 1500);
    } catch (err) {
      console.error('Erreur création:', err);
      const backendError = err.response?.data?.error || err.message;
      if (err.response?.status === 403) {
        setError('Mot de passe incorrect (si requis par le backend).');
      } else {
        setError(backendError);
      }
      showToast('❌ ' + backendError, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
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
      <h2 style={{ marginTop: 0 }}>📝 Nouvelle prescription</h2>

      {error && (
        <div style={{ color: '#dc2626', marginBottom: '16px', padding: '8px', backgroundColor: '#fee2e2', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Patient */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold' }}>Patient *</label>
          <select
            name="patient_id"
            value={formData.patient_id}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="">Sélectionner un patient</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.prenom} {p.nom} (ID: {p.id})
              </option>
            ))}
          </select>
        </div>

        {/* Médecin prescripteur */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold' }}>Médecin prescripteur *</label>
          <select
            name="medecin_id"
            value={formData.medecin_id}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="">-- Choisir un médecin --</option>
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

        {/* Médicaments */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold' }}>Médicaments *</label>
          {formData.lignes.map((ligne, index) => (
            <div key={index} style={{ border: '1px solid #eee', padding: '12px', marginBottom: '8px', borderRadius: '4px', backgroundColor: '#f9fafb' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                <select
                  value={ligne.medicament_id}
                  onChange={(e) => handleLigneChange(index, 'medicament_id', e.target.value)}
                  required
                  style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="">Médicament</option>
                  {medicaments.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nom} (stock: {m.stock || 0})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Qté"
                  value={ligne.quantite_prescrit}
                  onChange={(e) => handleLigneChange(index, 'quantite_prescrit', parseInt(e.target.value, 10) || 1)}
                  min="1"
                  style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <input
                  type="text"
                  placeholder="Posologie"
                  value={ligne.posologie}
                  onChange={(e) => handleLigneChange(index, 'posologie', e.target.value)}
                  style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <button
                  type="button"
                  onClick={() => removeLigne(index)}
                  style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addLigne}
            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '14px' }}
          >
            + Ajouter un médicament
          </button>
        </div>

        {/* Observations */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold' }}>Observations</label>
          <textarea
            name="observations"
            value={formData.observations}
            onChange={handleChange}
            rows="3"
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            placeholder="Notes particulières..."
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: '#16a34a',
              color: 'white',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Création...' : 'Créer la prescription'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/doctor/prescriptions')}
            style={{
              backgroundColor: '#e5e7eb',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '4px',
              cursor: 'pointer'
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

export default PrescriptionCreation;