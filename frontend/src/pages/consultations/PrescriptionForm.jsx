import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../axios'; // ✅ Utilisation de l'instance partagée

const PrescriptionForm = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([
    { medicament: '', posologie: '', duree: '', quantite: 1 }
  ]);
  const [notes, setNotes] = useState('');
  const [medecins, setMedecins] = useState([]);
  const [selectedMedecinId, setSelectedMedecinId] = useState('');

  useEffect(() => {
    // Charger le patient
    if (patientId) {
      api.get(`/patients/${patientId}`)
        .then(res => {
          setPatient(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Erreur patient:', err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    // Charger la liste des médecins
    api.get('/consultations/medecins/all')
      .then(res => {
        console.log('✅ Médecins reçus :', res.data);
        setMedecins(res.data);
      })
      .catch(err => {
        console.error('❌ Erreur chargement médecins :', err);
        alert('Erreur chargement des médecins : ' + (err.response?.data?.error || err.message));
      });
  }, [patientId]);

  // Fonctions addItem, removeItem, handleItemChange, handleSubmit
  const addItem = () => {
    setItems([...items, { medicament: '', posologie: '', duree: '', quantite: 1 }]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMedecinId) {
      alert('Veuillez sélectionner un médecin prescripteur.');
      return;
    }
    const hasValid = items.some(item => item.medicament.trim() !== '');
    if (!hasValid) {
      alert('Veuillez saisir au moins un médicament.');
      return;
    }
    try {
      await api.post('/prescriptions', {
        patient_id: patientId,
        medecin_id: selectedMedecinId,
        items: items,
        notes
      });
      alert('✅ Prescription créée avec succès !');
      navigate('/doctor/prescriptions');
    } catch (err) {
      alert('❌ Erreur : ' + (err.response?.data?.error || err.message));
    }
  };

  // RENDU
  if (loading) return <div>Chargement du patient...</div>;
  if (!patient && patientId) return <div>Patient non trouvé</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <h1>📝 Nouvelle prescription</h1>
      {patient && (
        <div style={{ background: '#f0f4ff', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
          <strong>Patient :</strong> {patient.prenom} {patient.nom} (IPP: {patient.ipp || 'N/A'})
        </div>
      )}
      <form onSubmit={handleSubmit}>
        {/* Médecin prescripteur */}
        <div style={{ marginBottom: '16px' }}>
          <label>Médecin prescripteur *</label>
          <select
            value={selectedMedecinId}
            onChange={(e) => setSelectedMedecinId(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="">-- Choisir un médecin --</option>
            {medecins.length === 0 ? (
              <option value="" disabled>Aucun médecin disponible</option>
            ) : (
              medecins.map(m => (
                <option key={m.id} value={m.id}>
                  {m.prenom} {m.nom} ({m.specialite || 'Généraliste'})
                </option>
              ))
            )}
          </select>
          {medecins.length === 0 && (
            <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>
              ⚠️ Aucun médecin trouvé. Vérifiez que la table `medecins` contient des données.
            </p>
          )}
        </div>

        {/* Liste des médicaments */}
        {items.map((item, index) => (
          <div key={index} style={{ border: '1px solid #ccc', padding: '16px', marginBottom: '16px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>Médicament #{index + 1}</h4>
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(index)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>
                  ✖
                </button>
              )}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label>Médicament *</label>
              <input
                type="text"
                value={item.medicament}
                onChange={(e) => handleItemChange(index, 'medicament', e.target.value)}
                required
                style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label>Posologie / Instructions</label>
              <textarea
                value={item.posologie}
                onChange={(e) => handleItemChange(index, 'posologie', e.target.value)}
                rows="2"
                style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <label>Durée</label>
                <input
                  type="text"
                  value={item.duree}
                  onChange={(e) => handleItemChange(index, 'duree', e.target.value)}
                  placeholder="ex: 7 jours"
                  style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Quantité</label>
                <input
                  type="number"
                  value={item.quantite}
                  onChange={(e) => handleItemChange(index, 'quantite', parseInt(e.target.value) || 1)}
                  min="1"
                  style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          style={{ background: '#2563eb', color: 'white', padding: '6px 16px', border: 'none', borderRadius: '4px', marginBottom: '16px', cursor: 'pointer' }}
        >
          + Ajouter un médicament
        </button>

        <div style={{ marginBottom: '16px' }}>
          <label>Notes (optionnelles)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="2"
            style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
            placeholder="Observations particulières..."
          />
        </div>

        <button
          type="submit"
          style={{ background: '#16a34a', color: 'white', padding: '10px 24px', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer' }}
        >
          💾 Enregistrer la prescription
        </button>
      </form>
    </div>
  );
};

export default PrescriptionForm;