// src/pages/qualite/ActionCAPADetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../axios';
import { 
  FaArrowLeft, FaUser, FaCalendar, FaEdit, FaTrash, 
  FaClock, FaCheckCircle, FaTimesCircle, FaFileAlt,
  FaLink, FaExclamationTriangle
} from 'react-icons/fa';

const ActionCAPADetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchAction();
  }, [id]);

  const fetchAction = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/actions-capa/${id}`);
      setAction(res.data);
    } catch (err) {
      console.error('Erreur chargement action CAPA :', err);
      setError('Impossible de charger l\'action CAPA. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette action CAPA ?')) return;
    setDeleting(true);
    try {
      await api.delete(`/actions-capa/${id}`);
      setToast({ type: 'success', message: 'Action CAPA supprimée avec succès' });
      setTimeout(() => navigate('/qualite/actions-capa'), 1500);
    } catch (err) {
      console.error('Erreur suppression :', err);
      setToast({ type: 'error', message: 'Erreur lors de la suppression' });
      setDeleting(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const getStatutBadge = (statut) => {
    const colors = {
      'ouverte': { bg: '#fef3c7', text: '#92400e', label: 'Ouverte' },
      'en_cours': { bg: '#dbeafe', text: '#1e40af', label: 'En cours' },
      'terminee': { bg: '#d1fae5', text: '#065f46', label: 'Terminée' },
      'annulee': { bg: '#fee2e2', text: '#991b1b', label: 'Annulée' }
    };
    const s = colors[statut] || colors['ouverte'];
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
      'corrective': { bg: '#fee2e2', text: '#991b1b', label: 'Corrective' },
      'preventive': { bg: '#dbeafe', text: '#1e40af', label: 'Préventive' },
      'amelioration': { bg: '#d1fae5', text: '#065f46', label: 'Amélioration' }
    };
    const s = colors[type] || colors['corrective'];
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
          onClick={fetchAction}
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

  if (!action) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>Action CAPA non trouvée</div>;
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

      <Link to="/qualite/actions-capa" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none' }}>
        <FaArrowLeft /> Retour à la liste
      </Link>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ margin: 0, color: '#0f172a' }}>{action.titre}</h1>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
              <span style={getStatutBadge(action.statut)}>{action.statut}</span>
              <span style={getTypeBadge(action.type)}>{action.type}</span>
              {action.numero_action && (
                <span style={{ color: '#64748b', fontSize: '14px' }}>N° {action.numero_action}</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link
              to={`/qualite/actions-capa/${id}/edit`}
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
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Responsable</div>
            <div style={{ fontWeight: '500', color: '#0f172a' }}>
              <FaUser style={{ marginRight: '8px', color: '#3b82f6' }} />
              {action.responsable_nom || 'Non attribué'}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Date prévue</div>
            <div style={{ fontWeight: '500', color: '#0f172a' }}>
              <FaCalendar style={{ marginRight: '8px', color: '#f59e0b' }} />
              {formatDate(action.date_prevue)}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Date création</div>
            <div style={{ fontWeight: '500', color: '#0f172a' }}>
              <FaClock style={{ marginRight: '8px', color: '#8b5cf6' }} />
              {formatDate(action.created_at || action.date_creation)}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Efficacité</div>
            <div style={{ fontWeight: '500', color: '#0f172a' }}>
              {action.efficacite ? (
                <>
                  <FaCheckCircle style={{ marginRight: '8px', color: '#10b981' }} />
                  {action.efficacite}
                </>
              ) : (
                'Non évaluée'
              )}
            </div>
          </div>
        </div>

        {/* Éléments liés */}
        {(action.signalement_id || action.audit_id || action.non_conformite_id) && (
          <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#0f172a' }}>
              <FaLink style={{ marginRight: '8px', color: '#3b82f6' }} />
              Éléments liés
            </h4>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {action.signalement_id && (
                <Link to={`/qualite/signalements/${action.signalement_id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                  <FaFileAlt style={{ marginRight: '4px' }} /> Signalement #{action.signalement_id}
                </Link>
              )}
              {action.audit_id && (
                <Link to={`/qualite/audits/${action.audit_id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                  <FaFileAlt style={{ marginRight: '4px' }} /> Audit #{action.audit_id}
                </Link>
              )}
              {action.non_conformite_id && (
                <Link to={`/qualite/non-conformites/${action.non_conformite_id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                  <FaFileAlt style={{ marginRight: '4px' }} /> Non-conformité #{action.non_conformite_id}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Descriptions */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>Description</h4>
          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            {action.description || '—'}
          </div>
        </div>

        {action.cause_racine && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>Cause racine</h4>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', color: '#92400e' }}>
              {action.cause_racine}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>Action planifiée</h4>
          <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '8px', color: '#1e40af' }}>
            {action.action_planifiee || '—'}
          </div>
        </div>

        {action.date_realisation && (
          <div style={{ padding: '12px', backgroundColor: '#d1fae5', borderRadius: '8px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' }}>Date de réalisation</h4>
            <div style={{ color: '#065f46' }}>{formatDate(action.date_realisation)}</div>
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

export default ActionCAPADetail;