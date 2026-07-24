import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const PrescriptionForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [formData, setFormData] = useState({
    patient_id: '',
    notes: '',
    items: [
      { medicament: '', posologie: '', duree: '', quantite: 1 }
    ]
  });

  // Charger la liste des patients pour le select
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/patients', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPatients(res.data);
      } catch (err) {
        console.error('Erreur chargement patients:', err);
      }
    };
    fetchPatients();
  }, []);

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
      items: [...formData.items, { medicament: '', posologie: '', duree: '', quantite: 1 }]
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
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/prescriptions', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('✅ Ordonnance créée avec succès !');
      navigate('/prescriptions'); // Redirige vers la liste
    } catch (err) {
      console.error('Erreur création:', err);
      alert('❌ Erreur : ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📝 Nouvelle ordonnance</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Patient */}
        <div>
          <label className="block font-medium mb-1">Patient *</label>
          <select
            name="patient_id"
            value={formData.patient_id}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="">Sélectionner un patient</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.prenom} {p.nom} (ID: {p.id})
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block font-medium mb-1">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            rows="2"
            placeholder="Observations..."
          />
        </div>

        {/* Médicaments */}
        <div>
          <label className="block font-medium mb-2">Médicaments *</label>
          {formData.items.map((item, index) => (
            <div key={index} className="border rounded p-4 mb-3 bg-gray-50">
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Médicament *"
                  value={item.medicament}
                  onChange={(e) => handleItemChange(index, 'medicament', e.target.value)}
                  className="border rounded px-3 py-2"
                  required
                />
                <input
                  placeholder="Posologie *"
                  value={item.posologie}
                  onChange={(e) => handleItemChange(index, 'posologie', e.target.value)}
                  className="border rounded px-3 py-2"
                  required
                />
                <input
                  placeholder="Durée (ex: 7 jours)"
                  value={item.duree}
                  onChange={(e) => handleItemChange(index, 'duree', e.target.value)}
                  className="border rounded px-3 py-2"
                />
                <input
                  type="number"
                  placeholder="Quantité"
                  value={item.quantite}
                  onChange={(e) => handleItemChange(index, 'quantite', parseInt(e.target.value) || 1)}
                  className="border rounded px-3 py-2"
                  min="1"
                />
              </div>
              {formData.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="mt-2 text-red-600 text-sm"
                >
                  ✕ Supprimer ce médicament
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addItem}
            className="text-blue-600 hover:underline"
          >
            + Ajouter un médicament
          </button>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer l\'ordonnance'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/prescriptions')}
            className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
};

export default PrescriptionForm;