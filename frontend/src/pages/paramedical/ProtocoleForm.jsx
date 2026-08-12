// src/pages/paramedical/ProtocoleForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave } from 'react-icons/fa';

const ProtocoleForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    version: '1.0',
    contenu: '',
    actif: true
  });

  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      api.get(`/protocoles/${id}`)
        .then(res => {
          setFormData(res.data);
        })
        .catch(err => {
          console.error('Erreur chargement protocole :', err);
          setError('Impossible de charger le protocole');
        });
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isEdit) {
        await api.put(`/protocoles/${id}`, formData);
      } else {
        await api.post('/protocoles', formData);
      }
      navigate('/paramedical/protocoles');
    } catch (err) {
      console.error('Erreur sauvegarde :', err);
      setError('Erreur lors de la sauvegarde');
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/paramedical/protocoles" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>
          <FaArrowLeft /> Retour
        </Link>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0, color: '#0f172a' }}>{isEdit ? 'Modifier le protocole' : 'Nouveau protocole'}</h2>
        {error && <div style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Nom du protocole</label>
            <input
              type="text"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Version</label>
              <input
                type="text"
                name="version"
                value={formData.version}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '30px' }}>
              <label style={{ fontWeight: '500', color: '#334155' }}>Actif</label>
              <input
                type="checkbox"
                name="actif"
                checked={formData.actif}
                onChange={handleChange}
                style={{ width: '20px', height: '20px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>Contenu (dtails du protocole)</label>
            <textarea
              name="contenu"
              value={formData.contenu}
              onChange={handleChange}
              rows="6"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px', resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaSave /> {loading ? 'Enregistrement...' : (isEdit ? 'Mettre  jour' : 'Crer')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProtocoleForm;
