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
    mode_paiement: 'especes',
    reference: '',
    notes: ''
  });
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (message, type = 'success') => {
    setToast(message);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    // Récupérer les factures non payées ou partiellement payées
    api.get('/billing/factures?statut=impayee,partielle')
      .then(res => setFactures(res.data))
      .catch(err => {
        console.error('Erreur chargement factures:', err);
        showToast('Erreur de chargement des factures', 'error');
      });
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation simple
    if (!formData.facture_id || !formData.montant || parseFloat(formData.montant) <= 0) {
      setError('Veuillez sélectionner une facture et saisir un montant valide.');
      setLoading(false);
      return;
    }

    try {
      await api.post('/billing/paiements', {
        facture_id: parseInt(formData.facture_id),
        montant: parseFloat(formData.montant),
        mode: formData.mode_paiement,
        reference: formData.reference || null,
        notes: formData.notes || null,
        date_paiement: formData.date_paiement
      });
      showToast('✅ Paiement enregistré avec succès', 'success');
      setTimeout(() => navigate('/finance/paiements'), 1500);
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement du paiement:', err);
      const msg = err.response?.data?.error || err.message;
      setError(`❌ Erreur : ${msg}`);
      showToast(`❌ Erreur : ${msg}`, 'error');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
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
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {toast}
        </div>
      )}

      <Link to="/finance/paiements" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none', marginBottom: '16px' }}>
        <FaArrowLeft /> Retour
      </Link>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 'bold' }}>💳 Nouveau paiement</h2>

        {error && <div style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Facture *</label>
            <select
              name="facture_id"
              value={formData.facture_id}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            >
              <option value="">Sélectionner</option>
              {factures.map(f => (
                <option key={f.id} value={f.id}>
                  {f.numero_facture || f.id} - {f.patient_nom} {f.patient_prenom} (
                  {Number(f.montant_total).toLocaleString('fr-FR')} FC)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Montant *</label>
            <input
              name="montant"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.montant}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Date paiement *</label>
            <input
              name="date_paiement"
              type="date"
              value={formData.date_paiement}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Mode paiement *</label>
            <select
              name="mode_paiement"
              value={formData.mode_paiement}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            >
              <option value="especes">Espèces</option>
              <option value="carte bancaire">Carte bancaire</option>
              <option value="virement">Virement bancaire</option>
              <option value="cheque">Chèque</option>
              <option value="mobile money">Mobile Money</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Référence</label>
            <input
              name="reference"
              value={formData.reference}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="2"
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate('/finance/paiements')}
              style={{ backgroundColor: '#e5e7eb', color: '#374151', padding: '12px 32px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                padding: '12px 32px',
                border: 'none',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              <FaSave /> {loading ? 'Enregistrement...' : 'Enregistrer le paiement'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default PaiementForm;