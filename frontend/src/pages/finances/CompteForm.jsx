// src/pages/finances/CompteForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave } from 'react-icons/fa';

const CompteForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    type: 'actif',
    parent_id: '',
    description: ''
  });
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (message, type = 'success') => {
    setToast(message);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [parentsRes] = await Promise.all([
          api.get('/comptes'),
          isEdit ? api.get(`/comptes/${id}`) : Promise.resolve({ data: null })
        ]);
        setParents(parentsRes.data);
        if (isEdit && parentsRes.data) {
          setFormData(parentsRes.data);
        }
      } catch (err) {
        console.error(err);
        showToast('Erreur chargement des données', 'error');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [id, isEdit]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation simple
    if (!formData.code.trim()) {
      setError('Le code est requis.');
      setLoading(false);
      return;
    }
    if (!formData.nom.trim()) {
      setError('Le nom est requis.');
      setLoading(false);
      return;
    }

    try {
      if (isEdit) {
        await api.put(`/comptes/${id}`, formData);
        showToast('✅ Compte modifié avec succès');
      } else {
        await api.post('/comptes', formData);
        showToast('✅ Compte créé avec succès');
      }
      navigate('/finance/comptes');
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(`❌ Erreur : ${msg}`);
      showToast(`❌ Erreur : ${msg}`, 'error');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>⏳ Chargement...</div>;
  }

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

      <Link
        to="/finance/comptes"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: '#3b82f6',
          textDecoration: 'none',
          marginBottom: '16px'
        }}
      >
        <FaArrowLeft /> Retour
      </Link>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '24px' }}>
          {isEdit ? 'Modifier' : 'Nouveau'} compte comptable
        </h2>

        {error && (
          <div style={{
            color: '#ef4444',
            backgroundColor: '#fee2e2',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
              Code <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
              Nom <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
              Type <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px'
              }}
            >
              <option value="actif">Actif</option>
              <option value="passif">Passif</option>
              <option value="charge">Charge</option>
              <option value="produit">Produit</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
              Compte parent
            </label>
            <select
              name="parent_id"
              value={formData.parent_id}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px'
              }}
            >
              <option value="">Aucun</option>
              {parents
                .filter(p => p.id !== parseInt(id))
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.nom}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px'
              }}
            />
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate('/finance/comptes')}
              style={{
                backgroundColor: '#e5e7eb',
                color: '#374151',
                padding: '12px 32px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
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
              <FaSave /> {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompteForm;