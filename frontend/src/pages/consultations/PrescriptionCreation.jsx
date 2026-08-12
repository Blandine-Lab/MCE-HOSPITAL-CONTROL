import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const PrescriptionCreation = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [medicaments, setMedicaments] = useState([]);
  const [medecins, setMedecins] = useState([]);
  const [formData, setFormData] = useState({
    patient_id: patientId || '',
    doctor_id: '', // ? renomm
    notes: '',
    items: [{ medicament_id: '', quantite: 1, posologie: '' }]
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Charger les patients, mdicaments (depuis le stock) et mdecins
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        const patientsRes = await axios.get('/api/patients', { 
          headers: { Authorization: `Bearer ${token}` } 
        });

        // ? Rcuprer les mdicaments depuis le stock (catgorie 1)
        const produitsRes = await axios.get('/api/produits', { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        const produits = produitsRes.data || [];
        const meds = produits.filter(p => p.categorie_id === 1);
        
        const stocksRes = await axios.get('/api/stocks', { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        const stocks = stocksRes.data || [];
        
        const medicamentsAvecStock = meds.map(m => {
          const stock = stocks.find(s => s.produit_id === m.id);
          return { ...m, stock: stock?.quantite || 0 };
        });

        // ? Mdecins
        const medecinsRes = await axios.get('/api/consultations/medecins/all', { 
          headers: { Authorization: `Bearer ${token}` } 
        });

        setPatients(patientsRes.data);
        setMedicaments(medicamentsAvecStock);
        setMedecins(medecinsRes.data);
      } catch (err) {
        console.error('Erreur chargement donnes:', err);
        setError('Impossible de charger les donnes. Vrifiez votre connexion.');
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (patientId && patients.length > 0) {
      const patientExists = patients.some(p => p.id === parseInt(patientId));
      if (patientExists) {
        setFormData(prev => ({ ...prev, patient_id: patientId }));
      }
    }
  }, [patientId, patients]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { medicament_id: '', quantite: 1, posologie: '' }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!password) {
      setError('Veuillez saisir votre mot de passe pour valider la prescription.');
      setLoading(false);
      return;
    }

    if (!formData.doctor_id) {
      setError('Veuillez slectionner un mdecin prescripteur.');
      setLoading(false);
      return;
    }

    const validItems = formData.items.filter(item => item.medicament_id);
    if (validItems.length === 0) {
      setError('Ajoutez au moins un mdicament valide.');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        patient_id: parseInt(formData.patient_id),
        doctor_id: parseInt(formData.doctor_id), // ? doctor_id
        notes: formData.notes,
        items: validItems.map(item => ({
          medicament_id: parseInt(item.medicament_id),
          quantite: parseInt(item.quantite) || 1,
          posologie: item.posologie || ''
        })),
        password: password
      };

      const response = await axios.post('/api/prescriptions', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('? Prescription cre avec succs !');
      navigate('/doctor/prescriptions');
    } catch (err) {
      console.error('Erreur cration:', err);
      // Afficher le message d'erreur du backend
      const backendError = err.response?.data?.error || err.message;
      if (err.response?.status === 403) {
        setError('Mot de passe incorrect. Veuillez ressayer.');
      } else if (err.response?.status === 500) {
        setError(`Erreur serveur : ${backendError}`);
      } else {
        setError(backendError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff' }}>
      <h2 style={{ marginTop: 0 }}>?? Nouvelle prescription</h2>

      {error && <div style={{ color: 'red', marginBottom: '16px', padding: '8px', backgroundColor: '#fee2e2', borderRadius: '4px' }}>{error}</div>}

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
            <option value="">Slectionner un patient</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.prenom} {p.nom} (ID: {p.id})
              </option>
            ))}
          </select>
        </div>

        {/* Mdecin prescripteur (doctor_id) */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold' }}>Mdecin prescripteur *</label>
          <select
            name="doctor_id" // ? name="doctor_id"
            value={formData.doctor_id}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="">-- Choisir un mdecin --</option>
            {medecins.map(m => (
              <option key={m.id} value={m.id}>
                {m.prenom} {m.nom} ({m.specialite || 'Gnraliste'})
              </option>
            ))}
          </select>
        </div>

        {/* Mdicaments */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold' }}>Mdicaments *</label>
          {formData.items.map((item, index) => (
            <div key={index} style={{ border: '1px solid #eee', padding: '12px', marginBottom: '8px', borderRadius: '4px', backgroundColor: '#f9fafb' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                <select
                  value={item.medicament_id}
                  onChange={(e) => handleItemChange(index, 'medicament_id', e.target.value)}
                  required
                  style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="">Mdicament</option>
                  {medicaments.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nom} (stock: {m.stock || 0})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Qt"
                  value={item.quantite}
                  onChange={(e) => handleItemChange(index, 'quantite', parseInt(e.target.value) || 1)}
                  min="1"
                  style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <input
                  type="text"
                  placeholder="Posologie"
                  value={item.posologie}
                  onChange={(e) => handleItemChange(index, 'posologie', e.target.value)}
                  style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                >
                  ?
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addItem}
            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '14px' }}
          >
            + Ajouter un mdicament
          </button>
        </div>

        {/* Mot de passe de validation */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold' }}>Mot de passe de validation *</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            placeholder="Votre mot de passe pour valider cette prescription"
          />
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold' }}>Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            placeholder="Observations..."
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
            {loading ? 'Cration...' : 'Crer la prescription'}
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
    </div>
  );
};

export default PrescriptionCreation;
