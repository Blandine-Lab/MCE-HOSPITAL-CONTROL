// src/pages/finances/BudgetForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave } from 'react-icons/fa';

const BudgetForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [formData, setFormData] = useState({ compte_id: '', exercice: new Date().getFullYear(), montant_prevu: '' });
  const [comptes, setComptes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/comptes').then(res => setComptes(res.data)).catch(console.error);
    if (isEdit) {
      api.get(`/budgets/${id}`).then(res => setFormData(res.data)).catch(console.error);
    }
  }, [id, isEdit]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (isEdit) await api.put(`/budgets/${id}`, formData);
      else await api.post('/budgets', formData);
      navigate('/finance/budgets');
    } catch (err) { setError('Erreur'); setLoading(false); }
  };

  return (
    <div>
      <Link to="/finance/budgets" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none' }}><FaArrowLeft /> Retour</Link>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2>{isEdit ? 'Modifier' : 'Nouveau'} budget</h2>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div><label>Compte *</label>
            <select name="compte_id" value={formData.compte_id} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <option value="">Sélectionner</option>
              {comptes.map(c => <option key={c.id} value={c.id}>{c.code} - {c.nom}</option>)}
            </select>
          </div>
          <div><label>Exercice *</label><input name="exercice" type="number" value={formData.exercice} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div><label>Montant prévu *</label><input name="montant_prevu" type="number" step="0.01" value={formData.montant_prevu} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></div>
          <div style={{ gridColumn: 'span 2' }}>
            <button type="submit" disabled={loading} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '12px 32px', border: 'none', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <FaSave /> {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BudgetForm;
