// src/pages/stock/CommandeForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave, FaPlus, FaTrash } from 'react-icons/fa';

const CommandeForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fournisseur_id: '',
    date_commande: new Date().toISOString().split('T')[0],
    date_livraison_prevue: '',
    notes: '',
    lignes: [{ produit_id: '', quantite: 1, prix_unitaire: 0 }]
  });
  const [fournisseurs, setFournisseurs] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/fournisseurs'),
      api.get('/produits')
    ]).then(([fourRes, prodRes]) => {
      setFournisseurs(fourRes.data);
      setProduits(prodRes.data);
    }).catch(console.error);
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleLigneChange = (index, field, value) => {
    const lignes = [...formData.lignes];
    lignes[index][field] = value;
    setFormData({ ...formData, lignes });
  };

  const addLigne = () => {
    setFormData({
      ...formData,
      lignes: [...formData.lignes, { produit_id: '', quantite: 1, prix_unitaire: 0 }]
    });
  };

  const removeLigne = (index) => {
    if (formData.lignes.length === 1) return;
    const lignes = formData.lignes.filter((_, i) => i !== index);
    setFormData({ ...formData, lignes });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/commandes', formData);
      navigate('/stock/commandes');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
      setLoading(false);
    }
  };

  return (
    <div>
      <Link to="/stock/commandes" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none' }}><FaArrowLeft /> Retour</Link>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2>Nouvelle commande</h2>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            <div><label>Fournisseur *</label>
              <select name="fournisseur_id" value={formData.fournisseur_id} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <option value="">Slectionner</option>
                {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </div>
            <div><label>Date commande *</label><input name="date_commande" type="date" value={formData.date_commande} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
            <div><label>Date livraison prvue</label><input name="date_livraison_prevue" type="date" value={formData.date_livraison_prevue} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
            <div style={{ gridColumn: 'span 3' }}><label>Notes</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          </div>

          <h3 style={{ marginTop: '24px' }}>Lignes de commande</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f1f5f9' }}>
                <tr><th>Produit</th><th style={{ textAlign: 'right' }}>Quantit</th><th style={{ textAlign: 'right' }}>Prix unitaire</th><th style={{ textAlign: 'right' }}>Total</th><th></th></tr>
              </thead>
              <tbody>
                {formData.lignes.map((ligne, index) => {
                  const total = (ligne.quantite || 0) * (ligne.prix_unitaire || 0);
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px' }}>
                        <select value={ligne.produit_id} onChange={e => handleLigneChange(index, 'produit_id', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                          <option value="">Slectionner</option>
                          {produits.map(p => <option key={p.id} value={p.id}>{p.code} - {p.nom}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <input type="number" value={ligne.quantite} onChange={e => handleLigneChange(index, 'quantite', parseInt(e.target.value))} min="1" style={{ width: '80px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'right' }} />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <input type="number" step="0.01" value={ligne.prix_unitaire} onChange={e => handleLigneChange(index, 'prix_unitaire', parseFloat(e.target.value))} min="0" style={{ width: '120px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'right' }} />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{total.toLocaleString('fr-FR')} FCFA</td>
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
            <button type="submit" disabled={loading} style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '12px 32px', border: 'none', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <FaSave /> {loading ? 'Enregistrement...' : 'Enregistrer la commande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommandeForm;
