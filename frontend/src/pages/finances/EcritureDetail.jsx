// src/pages/finances/EcritureDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaFileInvoice, FaCalendar, FaUser, FaCheck, FaTimes } from 'react-icons/fa';

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
    const fetchEcriture = async () => {
      try {
        const res = await api.get(`/ecritures/${id}`);
        setEcriture(res.data);
        setLoading(false);
      } catch (err) {
        console.error('Erreur de chargement de l\'écriture:', err);
        showToast('Erreur de chargement de l\'écriture', 'error');
        setLoading(false);
      }
    };
    fetchEcriture();
  }, [id]);

  const getStatusBadge = (statut) => {
    const styles = {
      validee: { bg: '#d1fae5', color: '#065f46', label: '✅ Validée' },
      annulee: { bg: '#fee2e2', color: '#991b1b', label: '❌ Annulée' },
      brouillon: { bg: '#fef3c7', color: '#92400e', label: '📝 Brouillon' }
    };
    const defaultStyle = { bg: '#f3f4f6', color: '#374151', label: statut || 'Inconnu' };
    const style = styles[statut] || defaultStyle;
    return (
      <span style={{
        padding: '6px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '500',
        backgroundColor: style.bg,
        color: style.color
      }}>
        {style.label}
      </span>
    );
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>⏳ Chargement...</div>;
  }

  if (!ecriture) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>❌ Écriture non trouvée</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
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
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          animation: 'slideIn 0.3s ease-out'
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
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
              Écriture {ecriture.numero_piece || `#${ecriture.id}`}
            </h1>
            <p style={{ color: '#64748b', marginTop: '4px' }}>{ecriture.libelle || 'Sans libellé'}</p>
          </div>
          {getStatusBadge(ecriture.statut)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
          <div><FaCalendar style={{ marginRight: '8px', color: '#6b7280' }} /> <strong>Date :</strong> {new Date(ecriture.date_ecriture).toLocaleDateString('fr-FR')}</div>
          <div><FaFileInvoice style={{ marginRight: '8px', color: '#6b7280' }} /> <strong>Journal :</strong> {ecriture.journal_nom || '-'}</div>
          <div><FaUser style={{ marginRight: '8px', color: '#6b7280' }} /> <strong>Créé par :</strong> {ecriture.created_by_nom || '-'}</div>
          {ecriture.date_validation && (
            <div><FaCheck style={{ marginRight: '8px', color: '#10b981' }} /> <strong>Validé le :</strong> {new Date(ecriture.date_validation).toLocaleDateString('fr-FR')}</div>
          )}
          {ecriture.date_annulation && (
            <div><FaTimes style={{ marginRight: '8px', color: '#ef4444' }} /> <strong>Annulé le :</strong> {new Date(ecriture.date_annulation).toLocaleDateString('fr-FR')}</div>
          )}
        </div>

        {ecriture.notes && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <strong>Notes :</strong> {ecriture.notes}
          </div>
        )}

        <h3 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '18px', fontWeight: 'bold' }}>Lignes d'écriture</h3>
        {ecriture.lignes && ecriture.lignes.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f1f5f9' }}>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Compte</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Sens</th>
                  <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Montant</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {ecriture.lignes.map((l, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px' }}>{l.compte_code} - {l.compte_nom}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: l.sens === 'debit' ? '#dbeafe' : '#fce7f3',
                        color: l.sens === 'debit' ? '#1e40af' : '#9d174d'
                      }}>
                        {l.sens === 'debit' ? 'Débit' : 'Crédit'}
                      </span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{Number(l.montant).toLocaleString('fr-FR')} FCFA</td>
                    <td style={{ padding: '8px' }}>{l.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ fontWeight: 'bold', borderTop: '2px solid #e2e8f0' }}>
                <tr>
                  <td colSpan="3" style={{ padding: '10px', textAlign: 'right' }}>Total :</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    {ecriture.lignes.reduce((acc, l) => acc + Number(l.montant), 0).toLocaleString('fr-FR')} FCFA
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p style={{ color: '#6b7280' }}>Aucune ligne d'écriture.</p>
        )}

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
          <Link to="/finance/ecritures" style={{ backgroundColor: '#e5e7eb', color: '#374151', padding: '10px 20px', borderRadius: '6px', textDecoration: 'none' }}>
            Retour
          </Link>
          {ecriture.statut !== 'validee' && ecriture.statut !== 'annulee' && (
            <button
              onClick={async () => {
                if (window.confirm('Valider cette écriture ?')) {
                  try {
                    await api.put(`/ecritures/${id}/valider`);
                    showToast('✅ Écriture validée avec succès', 'success');
                    // Recharger les données
                    const res = await api.get(`/ecritures/${id}`);
                    setEcriture(res.data);
                  } catch (err) {
                    console.error(err);
                    showToast('❌ Erreur lors de la validation', 'error');
                  }
                }
              }}
              style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              <FaCheck style={{ marginRight: '8px' }} /> Valider
            </button>
          )}
          {ecriture.statut !== 'annulee' && ecriture.statut !== 'validee' && (
            <button
              onClick={async () => {
                if (window.confirm('Annuler cette écriture ?')) {
                  try {
                    await api.put(`/ecritures/${id}/annuler`);
                    showToast('✅ Écriture annulée', 'success');
                    const res = await api.get(`/ecritures/${id}`);
                    setEcriture(res.data);
                  } catch (err) {
                    console.error(err);
                    showToast('❌ Erreur lors de l\'annulation', 'error');
                  }
                }
              }}
              style={{ backgroundColor: '#ef4444', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              <FaTimes style={{ marginRight: '8px' }} /> Annuler
            </button>
          )}
        </div>
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

export default EcritureDetail;