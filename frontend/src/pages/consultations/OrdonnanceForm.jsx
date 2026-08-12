import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaPlus, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import api from '../../axios'; // ✅ Utilisation de l'instance partagée

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
        setError('Erreur chargement des données. Vérifiez que le patient existe et que le serveur est accessible.');
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
    
    const validLignes = lignes.filter(l => l.medicament_id && l.quantite_prescrit > 0);
    if (validLignes.length === 0) {
      setToast('Ajoutez au moins un médicament');
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
      return;
    }
    
    if (!selectedMedecinId) {
      setToast('Veuillez sélectionner un médecin prescripteur.');
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
      return;
    }

    try {
      await api.post('/consultations/ordonnances', {
        patient_id: parseInt(patientId),
        medecin_id: parseInt(selectedMedecinId),
        lignes: validLignes,
        observations
      });
      setToast('Ordonnance créée avec succès');
      setTimeout(() => setToast(null), 3000);
      navigate(`/patients/${patientId}`);
    } catch (err) {
      console.error('Erreur création ordonnance:', err);
      setToast('Erreur lors de la création de l\'ordonnance');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>⏳ Chargement...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center', marginTop: '50px' }}>{error}</div>;
  if (!patient) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Patient non trouvé.</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      {toast && <div style={{ backgroundColor: '#10b981', color: 'white', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>{toast}</div>}
      <h2 style={{ marginBottom: '20px' }}>📝 Prescrire pour {patient.nom} {patient.prenom}</h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Médecin prescripteur *
          </label>
          <select
            value={selectedMedecinId}
            onChange={(e) => setSelectedMedecinId(e.target.value)}
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
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>Médicaments prescrits</h3>
          {lignes.map((ligne, index) => (
            <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
              <select
                value={ligne.medicament_id}
                onChange={e => updateLigne(index, 'medicament_id', e.target.value)}
                required
                style={{ flex: 2, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                <option value="">Médicament</option>
                {medicaments.map(m => <option key={m.id} value={m.id}>{m.nom} (stock: {m.stock})</option>)}
              </select>
              <input
                type="number"
                placeholder="Qté"
                value={ligne.quantite_prescrit}
                onChange={e => updateLigne(index, 'quantite_prescrit', parseInt(e.target.value) || 0)}
                required
                min="1"
                style={{ width: '80px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              <input
                type="text"
                placeholder="Posologie"
                value={ligne.posologie}
                onChange={e => updateLigne(index, 'posologie', e.target.value)}
                style={{ flex: 2, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              <button type="button" onClick={() => removeLigne(index)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                <FaTrash />
              </button>
            </div>
          ))}
          <button type="button" onClick={addLigne} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
            <FaPlus /> Ajouter médicament
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Observations</label>
          <textarea
            value={observations}
            onChange={e => setObservations(e.target.value)}
            rows="3"
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            placeholder="Notes particulières..."
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" disabled={saving} style={{ background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>
            <FaSave /> {saving ? 'Enregistrement...' : 'Prescrire'}
          </button>
          <button type="button" onClick={() => navigate(`/patients/${patientId}`)} style={{ background: '#e5e7eb', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            <FaTimes /> Annuler
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrdonnanceForm;
