// src/pages/stock/InventaireForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave, FaPlus, FaTrash } from 'react-icons/fa';

const InventaireForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'complet',
    notes: '',
    lignes: [{ produit_id: '', quantite_theorique: 0, quantite_reelle: 0 }]
  });
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/produits')
      .then(res => { setProduits(res.data); })
      .catch(console.error);
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleLigneChange = (index, field, value) => {
    const lignes = [...formData.lignes];
    lignes[index][field] = value;

    // Si le produit change, rcuprer le stock thorique
    if (field === 'produit_id') {
      const produitId = value;
      if (produitId) {
        api.get(`/stocks?produit_id=${produitId}`)
          .then(res => {
            const stock = res.data[0]?.quantite || 0;
            lignes[index].quantite_theorique = stock;
            setFormData({ ...formData, lignes });
          })
          .catch(console.error);
      } else {
        lignes[index].quantite_theorique = 0;
        setFormData({ ...formData, lignes });
      }
    }

    // Si la quantit relle change, recalculer l'cart
    if (field === 'quantite_reelle') {
      const theorique = lignes[index].quantite_theorique || 0;
      const reelle = parseFloat(value) || 0;
      lignes[index].ecart = reelle - theorique;
    }

    setFormData({ ...formData, lignes });
  };

  const addLigne = () => {
    setFormData({
      ...formData,
      lignes: [...formData.lignes, { produit_id: '', quantite_theorique: 0, quantite_reelle: 0 }]
    });
  };

  const removeLigne = (index) => {
    if (formData.lignes.length === 1) return;
    const lignes = formData.lignes.filter((_, i) => i !== index);
    setFormData({ ...formData, lignes });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Vrifier qu'au moins une ligne est remplie
    if (formData.lignes.every(l => !l.produit_id)) {
      setError('Ajoutez au moins un produit avec une quantit relle.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        date: formData.date,
        type: formData.type,
        notes: formData.notes,
        lignes: formData.lignes.map(l => ({
          produit_id: l.produit_id,
          quantite_reelle: l.quantite_reelle || 0
        }))
      };
      await api.post('/inventaires', payload);
      navigate('/stock/inventaires');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
      setLoading(false);
    }
  };

  return (
    <div>
      <Link to="/stock/inventaires" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none' }}><FaArrowLeft /> Retour</Link>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2>Nouvel inventaire</h2>
        {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div><label>Date *</label><input name="date" type="date" value={formData.date} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
            <div><label>Type *</label>
              <select name="type" value={formData.type} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <option value="complet">Complet</option>
                <option value="partiel">Partiel</option>
                <option value="tournant">Tournant</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}><label>Notes</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          </div>

          <h3 style={{ marginTop: '24px' }}>Lignes d'inventaire</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f1f5f9' }}>
                <tr>
                  <th>Produit</th>
                  <th style={{ textAlign: 'center' }}>Stock thorique</th>
                  <th style={{ textAlign: 'center' }}>Quantit relle</th>
                  <th style={{ textAlign: 'center' }}>cart</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {formData.lignes.map((ligne, index) => {
                  const ecart = (ligne.quantite_reelle || 0) - (ligne.quantite_theorique || 0);
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px' }}>
                        <select
                          value={ligne.produit_id}
                          onChange={e => handleLigneChange(index, 'produit_id', e.target.value)}
                          style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                        >
                          <option value="">Slectionner</option>
                          {produits.map(p => <option key={p.id} value={p.id}>{p.code} - {p.nom}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={ligne.quantite_theorique}
                          readOnly
                          style={{ width: '80px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'center', backgroundColor: '#f3f4f6' }}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={ligne.quantite_reelle}
                          onChange={e => handleLigneChange(index, 'quantite_reelle', parseInt(e.target.value) || 0)}
                          min="0"
                          style={{ width: '80px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span style={{
                          fontWeight: 'bold',
                          color: ecart === 0 ? '#10b981' : ecart > 0 ? '#f59e0b' : '#ef4444'
                        }}>
                          {ecart > 0 ? `+${ecart}` : ecart}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button type="button" onClick={() => removeLigne(index)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><FaTrash /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addLigne} style={{ marginTop: '12px', backgroundColor: '#3b82f6', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><FaPlus /> Ajouter une ligne</button>

          <div style={{ marginTop: '24px' }}>
            <button type="submit" disabled={loading} style={{ backgroundColor: '#10b981', color: 'white', padding: '12px 32px', border: 'none', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <FaSave /> {loading ? 'Enregistrement...' : 'Enregistrer l\'inventaire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventaireForm;
