// src/pages/rh-planning/CongeForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa';

const CongeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    employe_id: '',
    type: 'congé annuel',
    date_debut: '',
    date_fin: '',
    statut: 'en_attente',
    commentaire: ''
  });
  const [employes, setEmployes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // Charger la liste des employés
    api.get('/employes')
      .then(res => setEmployes(res.data))
      .catch(err => console.error('Erreur chargement employés :', err));

    // Si édition, charger les données du congé
    if (isEdit) {
      setLoading(true);
      api.get(`/conges/${id}`)
        .then(res => {
          const data = res.data;
          setFormData({
            employe_id: data.employe_id || '',
            type: data.type || 'congé annuel',
            date_debut: data.date_debut ? data.date_debut.split('T')[0] : '',
            date_fin: data.date_fin ? data.date_fin.split('T')[0] : '',
            statut: data.statut || 'en_attente',
            commentaire: data.commentaire || ''
          });
          setLoading(false);
        })
        .catch(err => {
          console.error('Erreur chargement congé :', err);
          setError('Impossible de charger le congé');
          setLoading(false);
        });
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Validation
    if (!formData.employe_id) {
      setError('Veuillez sélectionner un employé');
      return;
    }
    if (!formData.date_debut || !formData.date_fin) {
      setError('Veuillez renseigner les dates');
      return;
    }
    if (new Date(formData.date_fin) < new Date(formData.date_debut)) {
      setError('La date de fin doit être postérieure à la date de début');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        employe_id: parseInt(formData.employe_id, 10), // ✅ s'assurer que c'est un nombre
        type: formData.type,
        date_debut: formData.date_debut,
        date_fin: formData.date_fin,
        statut: formData.statut,
        commentaire: formData.commentaire || ''
      };

      if (isEdit) {
        await api.put(`/conges/${id}`, payload);
        setToast({ type: 'success', message: 'Congé modifié avec succès' });
      } else {
        await api.post('/conges', payload);
        setToast({ type: 'success', message: 'Congé créé avec succès' });
      }
      setTimeout(() => navigate('/rh/conges'), 1000);
    } catch (err) {
      console.error('Erreur enregistrement :', err);
      setError(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Chargement...</div>;

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          padding: '12px 24px',
          borderRadius: 8,
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {toast.message}
        </div>
      )}

      <Link to="/rh/conges" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#3b82f6', textDecoration: 'none' }}>
        <FaArrowLeft /> Retour
      </Link>

      <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 32, marginTop: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2>{isEdit ? 'Modifier' : 'Nouvelle'} demande de congé</h2>
        {error && <div style={{ color: '#ef4444', padding: 12, backgroundColor: '#fee2e2', borderRadius: 8, marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Employé *</label>
            <select
              name="employe_id"
              value={formData.employe_id}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }}
            >
              <option value="">Sélectionner</option>
              {employes.map(e => (
                <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Type de congé *</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }}
            >
              <option value="congé annuel">Congé annuel</option>
              <option value="congé maladie">Congé maladie</option>
              <option value="congé maternité">Congé maternité</option>
              <option value="congé sans solde">Congé sans solde</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Date début *</label>
            <input
              type="date"
              name="date_debut"
              value={formData.date_debut}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Date fin *</label>
            <input
              type="date"
              name="date_fin"
              value={formData.date_fin}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }}
            />
          </div>

          {/* ✅ Ajout du champ Statut pour l'édition */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Statut</label>
            <select
              name="statut"
              value={formData.statut}
              onChange={handleChange}
              style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }}
            >
              <option value="en_attente">En attente</option>
              <option value="approuvé">Approuvé</option>
              <option value="refusé">Refusé</option>
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Commentaire</label>
            <textarea
              name="commentaire"
              value={formData.commentaire}
              onChange={handleChange}
              rows="2"
              style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }}
            />
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', gap: 12 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#60a5fa',
                color: 'white',
                padding: '12px 32px',
                border: 'none',
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'default' : 'pointer'
              }}
            >
              <FaSave /> {loading ? 'Enregistrement...' : 'Envoyer la demande'}
            </button>
            <Link
              to="/rh/conges"
              style={{
                backgroundColor: '#e5e7eb',
                color: '#0f172a',
                padding: '12px 32px',
                borderRadius: 8,
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

export default CongeForm;
