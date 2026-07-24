// src/pages/rh-planning/AbsenceForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa';

const AbsenceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employes, setEmployes] = useState([]);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    employe_id: '',
    date: '',
    motif: '',
    justifiee: false,
    statut: 'en_attente'
  });

  useEffect(() => {
    api.get('/employes')
      .then(res => setEmployes(res.data))
      .catch(err => console.error('Erreur chargement employés :', err));

    if (isEdit) {
      setLoading(true);
      api.get(`/absences/${id}`)
        .then(res => {
          const data = res.data;
          setFormData({
            employe_id: data.employe_id || '',
            date: data.date ? data.date.split('T')[0] : '',
            motif: data.motif || '',
            justifiee: data.justifiee || false,
            statut: data.statut || 'en_attente'
          });
          setLoading(false);
        })
        .catch(err => {
          console.error('Erreur chargement absence :', err);
          setError('Impossible de charger l\'absence');
          setLoading(false);
        });
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employe_id) {
      setError('Veuillez sélectionner un employé');
      return;
    }
    if (!formData.date) {
      setError('Veuillez renseigner la date');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        employe_id: parseInt(formData.employe_id),
        date: formData.date,
        motif: formData.motif || '',
        justifiee: formData.justifiee,
        statut: formData.statut
      };

      if (isEdit) {
        await api.put(`/absences/${id}`, payload);
      } else {
        await api.post('/absences', payload);
      }
      navigate('/rh/absences');
    } catch (err) {
      console.error('Erreur enregistrement :', err);
      setError(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>⏳ Chargement...</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link to="/rh/absences" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#3b82f6', textDecoration: 'none' }}>
          <FaArrowLeft /> Retour à la liste
        </Link>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0, color: '#0f172a' }}>{isEdit ? 'Modifier' : 'Nouvelle'} absence</h2>
        {error && <div style={{ color: '#ef4444', padding: 12, backgroundColor: '#fee2e2', borderRadius: 8, marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Employé *</label>
              <select
                name="employe_id"
                value={formData.employe_id}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
              >
                <option value="">Sélectionner</option>
                {employes.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.nom} {e.prenom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Date *</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
              />
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Motif</label>
            <input
              type="text"
              name="motif"
              value={formData.motif}
              onChange={handleChange}
              placeholder="Raison de l'absence"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Statut</label>
              <select
                name="statut"
                value={formData.statut}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
              >
                <option value="en_attente">En attente</option>
                <option value="approuvé">Approuvé</option>
                <option value="refusé">Refusé</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                <input
                  type="checkbox"
                  name="justifiee"
                  checked={formData.justifiee}
                  onChange={handleChange}
                />
                Justifiée
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '10px 24px',
                border: 'none',
                borderRadius: 6,
                fontWeight: 500,
                cursor: 'pointer',
                opacity: saving ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <FaSave /> {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <Link
              to="/rh/absences"
              style={{
                backgroundColor: '#e5e7eb',
                color: '#0f172a',
                padding: '10px 24px',
                borderRadius: 6,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <FaTimes /> Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AbsenceForm;