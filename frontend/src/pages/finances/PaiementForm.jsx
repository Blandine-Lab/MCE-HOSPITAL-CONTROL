// src/pages/finances/PaiementForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave } from 'react-icons/fa';

const PaiementForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    facture_id: '',
    montant: '',
    date_paiement: new Date().toISOString().split('T')[0],
    mode_paiement: 'espèces',
    reference: '',
    notes: ''
  });
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/factures?statut_paiement=non_payée,partiellement_payée')
      .then(res => setFactures(res.data))
      .catch(console.error);
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      await api.post('/paiements', formData);
      navigate('/finance/paiements');
    } catch (err) { setError('Erreur'); setLoading(false); }
  };

  return (
    <div>
      <Link to="/finance/paiements" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none' }}><FaArrowLeft /> Retour</Link>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2>Nouveau paiement</h2>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div><label>Facture *</label>
            <select name="facture_id" value={formData.facture_id} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="">Sélectionner</option>
              {factures.map(f => <option key={f.id} value={f.id}>{f.numero_facture} - {f.patient_nom} ({Number(f.montant_total).toLocaleString('fr-FR')} FCFA)</option>)}
            </select>
          </div>
          <div><label>Montant *</label><input name="montant" type="number" step="0.01" value={formData.montant} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div><label>Date paiement *</label><input name="date_paiement" type="date" value={formData.date_paiement} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div><label>Mode paiement *</label>
            <select name="mode_paiement" value={formData.mode_paiement} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="espèces">Espèces</option>
              <option value="carte bancaire">Carte bancaire</option>
              <option value="virement">Virement bancaire</option>
              <option value="chèque">Chèque</option>
              <option value="mobile money">Mobile Money</option>
            </select>
          </div>
          <div><label>Référence</label><input name="reference" value={formData.reference} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div style={{ gridColumn: 'span 2' }}><label>Notes</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div style={{ gridColumn: 'span 2' }}>
            <button type="submit" disabled={loading} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '12px 32px', border: 'none', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <FaSave /> {loading ? 'Enregistrement...' : 'Enregistrer le paiement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaiementForm;
