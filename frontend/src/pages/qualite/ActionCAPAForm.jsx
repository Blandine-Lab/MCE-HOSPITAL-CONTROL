// src/pages/qualite/ActionCAPAForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa';

const ActionCAPAForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [formData, setFormData] = useState({
    numero_action: '',
    titre: '',
    type: 'corrective',
    signalement_id: '',
    audit_id: '',
    description: '',
    cause_racine: '',
    action_planifiee: '',
    responsable_id: '',
    date_prevue: new Date().toISOString().split('T')[0],
    date_realisation: '',
    statut: 'ouverte',
    efficacite: '',
    verification_par: '',
    date_verification: ''
  });
  const [signalements, setSignalements] = useState([]);
  const [audits, setAudits] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // Charger les donnes ncessaires (signalements, audits, utilisateurs)
    const fetchData = async () => {
      try {
        const [sigRes, audRes, userRes] = await Promise.all([
          api.get('/signalements'),
          api.get('/audits'),
          api.get('/utilisateurs')
        ]);
        setSignalements(sigRes.data || []);
        setAudits(audRes.data || []);
        setUtilisateurs(userRes.data || []);
      } catch (err) {
        console.error('Erreur chargement donnes :', err);
        setError('Impossible de charger les donnes ncessaires.');
      }
    };
    fetchData();

    if (isEdit) {
      setLoading(true);
      api.get(`/actions-capa/${id}`)
        .then(res => {
          const data = res.data;
          setFormData({
            numero_action: data.numero_action || '',
            titre: data.titre || '',
            type: data.type || 'corrective',
            signalement_id: data.signalement_id || '',
            audit_id: data.audit_id || '',
            description: data.description || '',
            cause_racine: data.cause_racine || '',
            action_planifiee: data.action_planifiee || '',
            responsable_id: data.responsable_id || '',
            date_prevue: data.date_prevue ? data.date_prevue.split('T')[0] : new Date().toISOString().split('T')[0],
            date_realisation: data.date_realisation ? data.date_realisation.split('T')[0] : '',
            statut: data.statut || 'ouverte',
            efficacite: data.efficacite || '',
            verification_par: data.verification_par || '',
            date_verification: data.date_verification ? data.date_verification.split('T')[0] : ''
          });
          setLoading(false);
        })
        .catch(err => {
          console.error('Erreur chargement action CAPA :', err);
          setError('Impossible de charger l\'action CAPA.');
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
    // Validation simple
    if (!formData.numero_action || !formData.titre || !formData.description || !formData.action_planifiee) {
      setError('Veuillez remplir tous les champs obligatoires (*).');
      setTimeout(() => setError(''), 5000);
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isEdit) {
        await api.put(`/actions-capa/${id}`, formData);
        setToast({ type: 'success', message: 'Action CAPA modifie avec succs' });
      } else {
        await api.post('/actions-capa', formData);
        setToast({ type: 'success', message: 'Action CAPA cre avec succs' });
      }
      setTimeout(() => navigate('/qualite/actions-capa'), 1500);
    } catch (err) {
      console.error('Erreur enregistrement :', err);
      setError(err.response?.data?.error || 'Erreur lors de l\'enregistrement.');
      setLoading(false);
      setTimeout(() => setError(''), 5000);
    }
  };

  if (loading && isEdit) return <div style={{ textAlign: 'center', padding: '60px' }}>? Chargement...</div>;

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 24px',
          borderRadius: '8px',
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast.message}
        </div>
      )}

      <Link to="/qualite/actions-capa" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none' }}>
        <FaArrowLeft /> Retour
      </Link>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0, color: '#0f172a' }}>{isEdit ? 'Modifier' : 'Nouvelle'} action CAPA</h2>

        {error && (
          <div style={{
            color: '#991b1b',
            backgroundColor: '#fee2e2',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Numro action */}
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Numro action *</label>
            <input
              name="numero_action"
              value={formData.numero_action}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            />
          </div>

          {/* Titre */}
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Titre *</label>
            <input
              name="titre"
              value={formData.titre}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            />
          </div>

          {/* Type */}
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Type *</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            >
              <option value="corrective">Corrective</option>
              <option value="preventive">Prventive</option>
              <option value="amelioration">Amlioration</option>
            </select>
          </div>

          {/* Signalement associ */}
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Signalement associ</label>
            <select
              name="signalement_id"
              value={formData.signalement_id}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            >
              <option value="">Slectionner</option>
              {signalements.map(s => (
                <option key={s.id} value={s.id}>
                  {s.numero_signalement || s.id} - {s.titre || s.description?.substring(0, 50) || 'Signalement'}
                </option>
              ))}
            </select>
          </div>

          {/* Audit associ */}
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Audit associ</label>
            <select
              name="audit_id"
              value={formData.audit_id}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            >
              <option value="">Slectionner</option>
              {audits.map(a => (
                <option key={a.id} value={a.id}>
                  {a.numero_audit || a.id} - {a.titre || 'Audit'}
                </option>
              ))}
            </select>
          </div>

          {/* Responsable */}
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Responsable</label>
            <select
              name="responsable_id"
              value={formData.responsable_id}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            >
              <option value="">Slectionner</option>
              {utilisateurs.map(u => (
                <option key={u.id} value={u.id}>
                  {u.prenom} {u.nom} ({u.email || u.login})
                </option>
              ))}
            </select>
          </div>

          {/* Date prvue */}
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Date prvue *</label>
            <input
              name="date_prevue"
              type="date"
              value={formData.date_prevue}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            />
          </div>

          {/* Date ralisation */}
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Date ralisation</label>
            <input
              name="date_realisation"
              type="date"
              value={formData.date_realisation}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            />
          </div>

          {/* Statut */}
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Statut</label>
            <select
              name="statut"
              value={formData.statut}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            >
              <option value="ouverte">Ouverte</option>
              <option value="en_cours">En cours</option>
              <option value="terminee">Termine</option>
              <option value="annulee">Annule</option>
            </select>
          </div>

          {/* Efficacit */}
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Efficacit</label>
            <select
              name="efficacite"
              value={formData.efficacite}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            >
              <option value="">Non value</option>
              <option value="efficace">Efficace</option>
              <option value="partiellement_efficace">Partiellement efficace</option>
              <option value="inefficace">Inefficace</option>
            </select>
          </div>

          {/* Vrification par */}
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Vrification par</label>
            <select
              name="verification_par"
              value={formData.verification_par}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            >
              <option value="">Slectionner</option>
              {utilisateurs.map(u => (
                <option key={u.id} value={u.id}>
                  {u.prenom} {u.nom} ({u.email || u.login})
                </option>
              ))}
            </select>
          </div>

          {/* Date vrification */}
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Date vrification</label>
            <input
              name="date_verification"
              type="date"
              value={formData.date_verification}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            />
          </div>

          {/* Description */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="3"
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            />
          </div>

          {/* Cause racine */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Cause racine</label>
            <textarea
              name="cause_racine"
              value={formData.cause_racine}
              onChange={handleChange}
              rows="2"
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            />
          </div>

          {/* Action planifie */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Action planifie *</label>
            <textarea
              name="action_planifiee"
              value={formData.action_planifiee}
              onChange={handleChange}
              required
              rows="3"
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            />
          </div>

          {/* Actions */}
          <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#8b5cf6',
                color: 'white',
                padding: '10px 24px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: loading ? 0.6 : 1
              }}
            >
              <FaSave /> {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <Link
              to="/qualite/actions-capa"
              style={{
                backgroundColor: '#e5e7eb',
                color: '#0f172a',
                padding: '10px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FaTimes /> Annuler
            </Link>
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

export default ActionCAPAForm;
