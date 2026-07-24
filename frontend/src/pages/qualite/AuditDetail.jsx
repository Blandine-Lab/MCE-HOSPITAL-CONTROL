// src/pages/qualite/AuditDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../axios';
import { 
  FaArrowLeft, FaCalendar, FaUser, FaEdit, FaTrash, 
  FaClipboardCheck, FaExclamationTriangle, FaFileAlt,
  FaCheckCircle, FaClock, FaBuilding
} from 'react-icons/fa';

const AuditDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchAudit();
  }, [id]);

  const fetchAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/audits/${id}`);
      setAudit(res.data);
    } catch (err) {
      console.error('Erreur chargement audit :', err);
      setError('Impossible de charger l\'audit. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet audit ?')) return;
    setDeleting(true);
    try {
      await api.delete(`/audits/${id}`);
      setToast({ type: 'success', message: 'Audit supprimé avec succès' });
      setTimeout(() => navigate('/qualite/audits'), 1500);
    } catch (err) {
      console.error('Erreur suppression :', err);
      setToast({ type: 'error', message: 'Erreur lors de la suppression' });
      setDeleting(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const getStatusBadge = (statut) => {
    const colors = {
      'planifie': { bg: '#fef3c7', text: '#92400e', label: '📋 Planifié' },
      'en_cours': { bg: '#dbeafe', text: '#1e40af', label: '⏳ En cours' },
      'termine': { bg: '#d1fae5', text: '#065f46', label: '✅ Terminé' },
      'annule': { bg: '#fee2e2', text: '#991b1b', label: '❌ Annulé' }
    };
    const s = colors[statut] || colors['planifie'];
    return {
      backgroundColor: s.bg,
      color: s.text,
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: '500',
      display: 'inline-block'
    };
  };

  const getTypeBadge = (type) => {
    const colors = {
      'interne': { bg: '#dbeafe', text: '#1e40af', label: 'Interne' },
      'externe': { bg: '#fef3c7', text: '#92400e', label: 'Externe' },
      'processus': { bg: '#d1fae5', text: '#065f46', label: 'Processus' }
    };
    const s = colors[type] || colors['interne'];
    return {
      backgroundColor: s.bg,
      color: s.text,
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: '500',
      display: 'inline-block'
    };
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', gap: '16px', padding: '20px' }}>
        <div style={{ backgroundColor: '#f1f5f9', height: '40px', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ backgroundColor: '#f1f5f9', height: '200px', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite 0.2s' }} />
        <div style={{ backgroundColor: '#f1f5f9', height: '100px', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite 0.4s' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#991b1b' }}>
        <FaExclamationTriangle style={{ fontSize: '48px', marginBottom: '16px' }} />
        <p>{error}</p>
        <button
          onClick={fetchAudit}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            marginTop: '16px'
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!audit) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>Audit non trouvé</div>;
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
        <FaArrowLeft /> Retour à la liste
      </Link>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ margin: 0, color: '#0f172a' }}>{audit.titre}</h1>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
              <span style={getStatusBadge(audit.statut)}>{audit.statut}</span>
              <span style={getTypeBadge(audit.type)}>{audit.type}</span>
              {audit.numero_audit && (
                <span style={{ color: '#64748b', fontSize: '14px' }}>N° {audit.numero_audit}</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link
              to={`/qualite/audits/${id}/edit`}
              style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FaEdit /> Modifier
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: deleting ? 0.6 : 1
              }}
            >
              <FaTrash /> {deleting ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>

        {/* Informations principales */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Service</div>
            <div style={{ fontWeight: '500', color: '#0f172a' }}>
              <FaBuilding style={{ marginRight: '8px', color: '#3b82f6' }} />
              {audit.service_nom || 'Non spécifié'}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Auditeur principal</div>
            <div style={{ fontWeight: '500', color: '#0f172a' }}>
              <FaUser style={{ marginRight: '8px', color: '#8b5cf6' }} />
              {audit.auditeur_principal || 'Non attribué'}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Date début</div>
            <div style={{ fontWeight: '500', color: '#0f172a' }}>
              <FaCalendar style={{ marginRight: '8px', color: '#f59e0b' }} />
              {formatDate(audit.date_debut)}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Date fin</div>
            <div style={{ fontWeight: '500', color: '#0f172a' }}>
              <FaCalendar style={{ marginRight: '8px', color: '#f59e0b' }} />
              {formatDate(audit.date_fin)}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Créé par</div>
            <div style={{ fontWeight: '500', color: '#0f172a' }}>
              <FaUser style={{ marginRight: '8px', color: '#3b82f6' }} />
              {audit.created_by_nom || '—'}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Date création</div>
            <div style={{ fontWeight: '500', color: '#0f172a' }}>
              <FaClock style={{ marginRight: '8px', color: '#8b5cf6' }} />
              {formatDate(audit.created_at || audit.date_creation)}
            </div>
          </div>
        </div>

        {/* Sections détaillées */}
        {audit.objectif && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
              <FaFileAlt style={{ marginRight: '8px', color: '#3b82f6' }} />
              Objectif
            </h4>
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              {audit.objectif}
            </div>
          </div>
        )}

        {audit.scope && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>Scope (périmètre)</h4>
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              {audit.scope}
            </div>
          </div>
        )}

        {audit.criteres && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>Critères</h4>
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              {audit.criteres}
            </div>
          </div>
        )}

        {audit.constatations && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
              <FaExclamationTriangle style={{ marginRight: '8px', color: '#f59e0b' }} />
              Constatations
            </h4>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', color: '#92400e' }}>
              {audit.constatations}
            </div>
          </div>
        )}

        {audit.conclusion && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
              <FaCheckCircle style={{ marginRight: '8px', color: '#10b981' }} />
              Conclusion
            </h4>
            <div style={{ padding: '12px', backgroundColor: '#d1fae5', borderRadius: '8px', color: '#065f46' }}>
              {audit.conclusion}
            </div>
          </div>
        )}

        {audit.recommandations && (
          <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '8px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' }}>
              <FaClipboardCheck style={{ marginRight: '8px', color: '#3b82f6' }} />
              Recommandations
            </h4>
            <div style={{ color: '#1e40af' }}>{audit.recommandations}</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default AuditDetail;