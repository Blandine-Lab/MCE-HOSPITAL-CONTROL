// src/pages/paramedical/SoinDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaUser, FaCalendar, FaClock, FaClipboardList, FaEdit } from 'react-icons/fa';

const SoinDetail = () => {
  const { id } = useParams();
  const [soin, setSoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/soins/${id}`)
      .then(res => {
        setSoin(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur chargement détail :', err);
        setError('Impossible de charger les détails du soin');
        setLoading(false);
      });
  }, [id]);

  const getStatusBadge = (statut) => {
    const configs = {
      'planifié': { bg: '#dbeafe', color: '#1e40af', label: '📅 Planifié' },
      'en_cours': { bg: '#fef3c7', color: '#92400e', label: '⏳ En cours' },
      'effectué': { bg: '#d1fae5', color: '#065f46', label: '✅ Effectué' },
      'annulé': { bg: '#fee2e2', color: '#991b1b', label: '❌ Annulé' },
    };
    const config = configs[statut] || configs['planifié'];
    return (
      <span style={{
        padding: '6px 16px',
        borderRadius: '20px',
        fontSize: '16px',
        fontWeight: '500',
        backgroundColor: config.bg,
        color: config.color
      }}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '24px' }}>⏳ Chargement...</div>
      </div>
    );
  }

  if (error || !soin) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ef4444' }}>
        <div style={{ fontSize: '20px' }}>{error || 'Soin non trouvé'}</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/paramedical/soins" style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: '#3b82f6', 
          textDecoration: 'none',
          fontWeight: '500'
        }}>
          <FaArrowLeft /> Retour à la liste
        </Link>
      </div>

      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', color: '#0f172a' }}>
              {soin.type_soin}
            </h1>
            <p style={{ color: '#64748b', marginTop: '4px' }}>
              Soin #{soin.id}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {getStatusBadge(soin.statut)}
            <Link 
              to={`/paramedical/soins/${soin.id}/edit`}
              style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '500'
              }}
            >
              <FaEdit /> Modifier
            </Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Patient</p>
            <p style={{ fontWeight: '500', fontSize: '18px', margin: '4px 0 0 0' }}>
              <FaUser style={{ marginRight: '8px', color: '#3b82f6' }} />
              {soin.patient_prenom} {soin.patient_nom}
            </p>
          </div>

          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Prestataire</p>
            <p style={{ fontWeight: '500', fontSize: '18px', margin: '4px 0 0 0' }}>
              {soin.prestataire || 'Non assigné'}
            </p>
          </div>

          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Date</p>
            <p style={{ fontWeight: '500', fontSize: '18px', margin: '4px 0 0 0' }}>
              <FaCalendar style={{ marginRight: '8px', color: '#3b82f6' }} />
              {new Date(soin.date_soin).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>

          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Heure</p>
            <p style={{ fontWeight: '500', fontSize: '18px', margin: '4px 0 0 0' }}>
              <FaClock style={{ marginRight: '8px', color: '#3b82f6' }} />
              {soin.heure_soin || 'Non spécifiée'}
            </p>
          </div>
        </div>

        {soin.description && (
          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
              <FaClipboardList style={{ marginRight: '8px' }} />
              Description
            </p>
            <p style={{ margin: '8px 0 0 0', color: '#0f172a' }}>{soin.description}</p>
          </div>
        )}

        {soin.notes && (
          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Notes</p>
            <p style={{ margin: '8px 0 0 0', color: '#0f172a' }}>{soin.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SoinDetail;