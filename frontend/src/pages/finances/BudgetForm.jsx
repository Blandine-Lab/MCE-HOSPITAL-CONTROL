// src/pages/finances/EcritureDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaFileInvoice, FaCalendar, FaUser, FaCheck, FaTimes, FaClock } from 'react-icons/fa';

const EcritureDetail = () => {
  const { id } = useParams();
  const [ecriture, setEcriture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (message, type = 'success') => {
    setToast(message);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    api.get(`/ecritures/${id}`)
      .then(res => { setEcriture(res.data); setLoading(false); })
      .catch(err => { 
        console.error(err); 
        showToast('Erreur chargement de l\'écriture', 'error');
        setLoading(false); 
      });
  }, [id]);

  const getStatutBadge = (statut) => {
    const config = {
      'valid': { bg: '#d1fae5', color: '#065f46', label: '✅ Validée', icon: <FaCheck /> },
      'annul': { bg: '#fee2e2', color: '#991b1b', label: '❌ Annulée', icon: <FaTimes /> },
      'brouillon': { bg: '#fef3c7', color: '#92400e', label: '📝 Brouillon', icon: <FaClock /> }
    };
    const c = config[statut] || config['brouillon'];
    return (
      <span style={{
        backgroundColor: c.bg,
        color: c.color,
        padding: '6px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '500',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        {c.icon} {c.label}
      </span>
    );
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>⏳ Chargement...</div>;
  if (!ecriture) return <div style={{ textAlign: 'center', padding: '60px' }}>❌ Écriture non trouvée</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
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

      <Link to="/finance/ecritures" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none', marginBottom: '16px' }}>
        <FaArrowLeft /> Retour
      </Link>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px' }}>Écriture {ecriture.numero_piece}</h1>
            <p style={{ color: '#64748b', marginTop: '4px' }}>{ecriture.libelle}</p>
          </div>
          {getStatutBadge(ecriture.statut)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          <div><FaCalendar style={{ marginRight: '8px', color: '#3b82f6' }} /> <strong>Date :</strong> {new Date(ecriture.date_ecriture).toLocaleDateString('fr-FR')}</div>
          <div><FaFileInvoice style={{ marginRight: '8px', color: '#3b82f6' }} /> <strong>Journal :</strong> {ecriture.journal_nom || '-'}</div>
          <div><FaUser style={{ marginRight: '8px', color: '#3b82f6' }} /> <strong>Créé par :</strong> {ecriture.created_by_nom || '-'}</div>
        </div>

        <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Lignes d'écriture</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f1f5f9' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Compte</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Sens</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Montant</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {ecriture.lignes?.length > 0 ? (
                ecriture.lignes.map((l, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px' }}>{l.compte_code} - {l.compte_nom}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: l.sens === 'debit' ? '#dbeafe' : '#fce7f3',
                        color: l.sens === 'debit' ? '#1e40af' : '#9d174d',
                        padding: '2px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {l.sens === 'debit' ? 'Débit' : 'Crédit'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: '500' }}>
                      {Number(l.montant).toLocaleString('fr-FR')} FCFA
                    </td>
                    <td style={{ padding: '10px' }}>{l.description || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                    Aucune ligne pour cette écriture.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EcritureDetail;