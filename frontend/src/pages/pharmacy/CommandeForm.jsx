// frontend/src/pages/pharmacy/CommandeForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../axios';
import { FaSave, FaTimes, FaPlus, FaTrash } from 'react-icons/fa';

const CommandeForm = () => {
  const navigate = useNavigate();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [medicaments, setMedicaments] = useState([]);
  const [form, setForm] = useState({
    fournisseur_id: '',
    lignes: [{ medicament_id: '', quantite_commandee: 1, prix_unitaire_ht: 0 }]
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fournRes, medsRes] = await Promise.all([
          api.get('/pharmacy/fournisseurs'),
          api.get('/pharmacy/medicaments')
        ]);
        setFournisseurs(fournRes.data);
        setMedicaments(medsRes.data);
        setLoading(false);
      } catch (err) {
        console.error('Erreur chargement:', err);
        setToast('Erreur chargement des données');
        setTimeout(() => setToast(null), 3000);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const addLigne = () => {
    setForm({
      ...form,
      lignes: [...form.lignes, { medicament_id: '', quantite_commandee: 1, prix_unitaire_ht: 0 }]
    });
  };

  const removeLigne = (index) => {
    if (form.lignes.length === 1) return;
    const newLignes = form.lignes.filter((_, i) => i !== index);
    setForm({ ...form, lignes: newLignes });
  };

  const updateLigne = (index, field, value) => {
    const newLignes = [...form.lignes];
    newLignes[index][field] = value;
    setForm({ ...form, lignes: newLignes });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fournisseur_id) {
      setToast('Veuillez sélectionner un fournisseur');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const validLignes = form.lignes.filter(l => l.medicament_id && l.quantite_commandee > 0);
    if (validLignes.length === 0) {
      setToast('Ajoutez au moins un médicament');
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setSaving(true);
    try {
      await api.post('/pharmacy/commandes', {
        fournisseur_id: parseInt(form.fournisseur_id),
        lignes: validLignes.map(l => ({
          medicament_id: parseInt(l.medicament_id),
          quantite_commandee: parseInt(l.quantite_commandee),
          prix_unitaire_ht: parseFloat(l.prix_unitaire_ht) || 0
        }))
      });
      setToast('✅ Commande créée avec succès');
      setTimeout(() => setToast(null), 3000);
      navigate('/pharmacy/commandes');
    } catch (err) {
      console.error('Erreur création:', err);
      setToast('❌ Erreur : ' + (err.response?.data?.error || err.message));
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>⏳ Chargement...</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0fdf4', padding: '32px' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: toast.includes('✅') ? '#10b981' : '#ef4444', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 1000 }}>
          {toast}
        </div>
      )}
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#166534', marginBottom: '24px' }}>📦 Nouvelle commande</h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Fournisseur *</label>
            <select
              value={form.fournisseur_id}
              onChange={(e) => setForm({...form, fournisseur_id: e.target.value})}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
            >
              <option value="">-- Choisir --</option>
              {fournisseurs.map(f => (
                <option key={f.id} value={f.id}>{f.nom}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>Lignes de commande</h3>
            {form.lignes.map((ligne, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <select
                  value={ligne.medicament_id}
                  onChange={(e) => updateLigne(index, 'medicament_id', e.target.value)}
                  required
                  style={{ flex: 3, padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="">Médicament</option>
                  {medicaments.map(m => (
                    <option key={m.id} value={m.id}>{m.nom} (stock: {m.stock})</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Qté"
                  value={ligne.quantite_commandee}
                  onChange={(e) => updateLigne(index, 'quantite_commandee', parseInt(e.target.value) || 0)}
                  required
                  min="1"
                  style={{ width: '80px', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Prix HT"
                  value={ligne.prix_unitaire_ht}
                  onChange={(e) => updateLigne(index, 'prix_unitaire_ht', parseFloat(e.target.value) || 0)}
                  style={{ width: '100px', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <button type="button" onClick={() => removeLigne(index)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                  <FaTrash />
                </button>
              </div>
            ))}
            <button type="button" onClick={addLigne} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
              <FaPlus /> Ajouter une ligne
            </button>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
            <button type="button" onClick={() => navigate('/pharmacy/commandes')} style={{ backgroundColor: '#e5e7eb', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              <FaTimes /> Annuler
            </button>
            <button type="submit" disabled={saving} style={{ backgroundColor: '#16a34a', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              <FaSave /> {saving ? 'Enregistrement...' : 'Créer la commande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommandeForm;