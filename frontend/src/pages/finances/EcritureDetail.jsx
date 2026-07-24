// src/pages/finances/EcritureDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaFileInvoice, FaCalendar, FaUser, FaCheck, FaTimes } from 'react-icons/fa';

const EcritureDetail = () => {
  const { id } = useParams();
  const [ecriture, setEcriture] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/ecritures/${id}`)
      .then(res => { setEcriture(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>⏳ Chargement...</div>;
  if (!ecriture) return <div style={{ textAlign: 'center', padding: '60px' }}>Écriture non trouvée</div>;

  return (
    <div>
      <Link to="/finance/ecritures" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none' }}>
        <FaArrowLeft /> Retour
      </Link>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0 }}>Écriture {ecriture.numero_piece}</h1>
            <p style={{ color: '#64748b' }}>{ecriture.libelle}</p>
          </div>
          <span style={{
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '500',
            backgroundColor: ecriture.statut === 'validé' ? '#d1fae5' : ecriture.statut === 'annulé' ? '#fee2e2' : '#fef3c7',
            color: ecriture.statut === 'validé' ? '#065f46' : ecriture.statut === 'annulé' ? '#991b1b' : '#92400e'
          }}>
            {ecriture.statut === 'validé' ? '✅ Validé' : ecriture.statut === 'annulé' ? '❌ Annulé' : '📝 Brouillon'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '20px' }}>
          <div><FaCalendar style={{ marginRight: '8px' }} /> <strong>Date :</strong> {new Date(ecriture.date_ecriture).toLocaleDateString('fr-FR')}</div>
          <div><FaFileInvoice style={{ marginRight: '8px' }} /> <strong>Journal :</strong> {ecriture.journal_nom}</div>
          <div><FaUser style={{ marginRight: '8px' }} /> <strong>Créé par :</strong> {ecriture.created_by_nom || '-'}</div>
        </div>

        <h3 style={{ marginTop: '24px' }}>Lignes d'écriture</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th style={{ padding: '10px', textAlign: 'left' }}>Compte</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Sens</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Montant</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {ecriture.lignes?.map((l, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px' }}>{l.compte_code} - {l.compte_nom}</td>
                <td style={{ padding: '8px' }}>{l.sens === 'debit' ? 'Débit' : 'Crédit'}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{Number(l.montant).toLocaleString('fr-FR')} FCFA</td>
                <td style={{ padding: '8px' }}>{l.description || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EcritureDetail;