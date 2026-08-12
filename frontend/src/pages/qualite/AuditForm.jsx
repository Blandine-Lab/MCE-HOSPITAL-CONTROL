// src/pages/qualite/AuditForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave, FaTimes, FaExclamationTriangle, FaClipboardCheck } from 'react-icons/fa';

const AuditForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [formData, setFormData] = useState({
    numero_audit: '',
    titre: '',
    type: 'interne',
    service_id: '',
    date_debut: new Date().toISOString().split('T')[0],
    date_fin: '',
    auditeur_principal: '',
    equipe_audit: '',
    objectif: '',
    scope: '',
    criteres: '',
    constatations: '',
    conclusion: '',
    recommandations: '',
    statut: 'planifie'
  });
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesRes] = await Promise.all([
          api.get('/services')
        ]);
        setServices(servicesRes.data || []);
      } catch (err) {
        console.error('Erreur chargement services :', err);
        setError('Impossible de charger les services.');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();

    if (isEdit) {
      setLoading(true);
      api.get(`/audits/${id}`)
        .then(res => {
          setFormData(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError('Impossible de charger l\'audit');
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
    // Validation des champs obligatoires
    if (!formData.numero_audit || !formData.titre || !formData.date_debut) {
      setError('Veuillez remplir tous les champs obligatoires (*)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...formData,
        service_id: formData.service_id || null,
        date_fin: formData.date_fin || null
      };
      if (isEdit) {
        await api.put(`/audits/${id}`, payload);
        setToast({ type: 'success', message: 'Audit modifi avec succs' });
      } else {
        await api.post('/audits', payload);
        setToast({ type: 'success', message: 'Audit cr avec succs' });
      }
      setTimeout(() => navigate('/qualite/audits'), 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>? Chargement des donnes...</div>;
  }

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

      <Link to="/qualite/audits" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none' }}>
        <FaArrowLeft /> Retour
      </Link>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaClipboardCheck style={{ color: '#3b82f6' }} />
          {isEdit ? 'Modifier' : 'Nouvel'} audit
        </h2>
        {error && (
          <div style={{
            color: '#991b1b',
            backgroundColor: '#fee2e2',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FaExclamationTriangle style={{ color: '#ef4444' }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Numro audit *</label>
            <input
              name="numero_audit"
              value={formData.numero_audit}
              onChange={handleChange}
              required
              placeholder="ex: AUD-2026-001"
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            />
          </div>
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

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Type *</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            >
              <option value="interne">Interne</option>
              <option value="externe">Externe</option>
              <option value="certification">Certification</option>
              <option value="inspections">Inspection</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Statut</label>
            <select
              name="statut"
              value={formData.statut}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            >
              <option value="planifie">?? Planifi</option>
              <option value="en_cours">? En cours</option>
              <option value="termine">? Termin</option>
              <option value="annule">? Annul</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Service</label>
            <select
              name="service_id"
              value={formData.service_id}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            >
              <option value="">Slectionner</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Auditeur principal</label>
            <input
              name="auditeur_principal"
              value={formData.auditeur_principal}
              onChange={handleChange}
              placeholder="Nom de l'auditeur principal"
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Date dbut *</label>
            <input
              name="date_debut"
              type="date"
              value={formData.date_debut}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Date fin</label>
            <input
              name="date_fin"
              type="date"
              value={formData.date_fin}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>quipe d'audit</label>
            <input
              name="equipe_audit"
              value={formData.equipe_audit}
              onChange={handleChange}
              placeholder="Noms des auditeurs"
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Objectif</label>
            <textarea
              name="objectif"
              value={formData.objectif}
              onChange={handleChange}
              rows="2"
              placeholder="Objectif de l'audit..."
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', resize: 'vertical' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Scope (primtre)</label>
            <textarea
              name="scope"
              value={formData.scope}
              onChange={handleChange}
              rows="2"
              placeholder="Primtre de l'audit..."
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', resize: 'vertical' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Critres</label>
            <textarea
              name="criteres"
              value={formData.criteres}
              onChange={handleChange}
              rows="2"
              placeholder="Critres d'valuation..."
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', resize: 'vertical' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Constatations</label>
            <textarea
              name="constatations"
              value={formData.constatations}
              onChange={handleChange}
              rows="3"
              placeholder="Constatations de l'audit..."
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', resize: 'vertical' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Conclusion</label>
            <textarea
              name="conclusion"
              value={formData.conclusion}
              onChange={handleChange}
              rows="2"
              placeholder="Conclusion de l'audit..."
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', resize: 'vertical' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Recommandations</label>
            <textarea
              name="recommandations"
              value={formData.recommandations}
              onChange={handleChange}
              rows="2"
              placeholder="Recommandations pour l'amlioration..."
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', resize: 'vertical' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '12px 32px',
                border: 'none',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'default' : 'pointer'
              }}
            >
              <FaSave /> {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <Link
              to="/qualite/audits"
              style={{
                backgroundColor: '#e5e7eb',
                color: '#0f172a',
                padding: '12px 32px',
                borderRadius: '8px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
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

export default AuditForm;
