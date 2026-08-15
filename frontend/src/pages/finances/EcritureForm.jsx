// src/pages/finances/EcritureForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave, FaPlus, FaTrash } from 'react-icons/fa';

const EcritureForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    journal_id: '',
    date_ecriture: new Date().toISOString().split('T')[0],
    libelle: '',
    lignes: [{ compte_id: '', sens: 'debit', montant: '', description: '' }]
  });
  const [journaux, setJournaux] = useState([]);
  const [comptes, setComptes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/journaux'),
      api.get('/comptes')
    ]).then(([journauxRes, comptesRes]) => {
      setJournaux(journauxRes.data);
      setComptes(comptesRes.data);
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
      lignes: [...formData.lignes, { compte_id: '', sens: 'debit', montant: '', description: '' }]
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
      // Vérifier l'équilibre
      let totalDebit = 0, totalCredit = 0;
      formData.lignes.forEach(l => {
        if (l.sens === 'debit') totalDebit += parseFloat(l.montant) || 0;
        else totalCredit += parseFloat(l.montant) || 0;
      });
      if (totalDebit !== totalCredit) {
        setError('Les totaux débit et crédit doivent être égaux');
        setLoading(false);
        return;
      }

      await api.post('/ecritures', formData);
      navigate('/finance/ecritures');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
      setLoading(false);
    }
  };

  return (
    <div>
      <Link to="/finance/ecritures" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none' }}>
        <FaArrowLeft /> Retour
      </Link>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2>Nouvelle écriture comptable</h2>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            <div>
              <label>Journal *</label>
              <select name="journal_id" value={formData.journal_id} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <option value="">Sélectionner</option>
                {journaux.map(j => <option key={j.id} value={j.id}>{j.code} - {j.nom}</option>)}
              </select>
            </div>
            <div>
              <label>Date *</label>
              <input name="date_ecriture" type="date" value={formData.date_ecriture} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
            </div>
            <div>
              <label>Libellé *</label>
              <input name="libelle" value={formData.libelle} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
            </div>
          </div>

          <h3 style={{ marginTop: '24px' }}>Lignes d'écriture</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f1f5f9' }}>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Compte</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Sens</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Montant</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {formData.lignes.map((ligne, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px' }}>
                      <select value={ligne.compte_id} onChange={e => handleLigneChange(index, 'compte_id', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                        <option value="">Sélectionner</option>
                        {comptes.map(c => <option key={c.id} value={c.id}>{c.code} - {c.nom}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <select value={ligne.sens} onChange={e => handleLigneChange(index, 'sens', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                        <option value="debit">Débit</option>
                        <option value="credit">Crédit</option>
                      </select>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <input type="number" step="0.01" value={ligne.montant} onChange={e => handleLigneChange(index, 'montant', e.target.value)} style={{ width: '120px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'right' }} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="text" value={ligne.description} onChange={e => handleLigneChange(index, 'description', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button type="button" onClick={() => removeLigne(index)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><FaTrash /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" onClick={addLigne} style={{ marginTop: '12px', backgroundColor: '#3b82f6', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FaPlus /> Ajouter une ligne
          </button>

          <div style={{ marginTop: '24px' }}>
            <button type="submit" disabled={loading} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '12px 32px', border: 'none', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <FaSave /> {loading ? 'Enregistrement...' : 'Enregistrer l\'écriture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EcritureForm;