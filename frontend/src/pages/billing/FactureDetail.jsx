import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../axios';
import { FaEuroSign, FaPrint, FaEnvelope, FaFilePdf, FaInfoCircle } from 'react-icons/fa';
import html2pdf from 'html2pdf.js';

const FactureDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [facture, setFacture] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [paiement, setPaiement] = useState({ montant: '', mode: 'carte', reference: '' });
  const [relances, setRelances] = useState([]);
  const [relanceMode, setRelanceMode] = useState('email');
  const [relanceComment, setRelanceComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchFacture();
    fetchRelances();
  }, [id]);

  const fetchFacture = async () => {
    try {
      const res = await api.get(`/billing/factures/${id}`);
      setFacture(res.data);
      setLignes(res.data.lignes || []);
      setLoading(false);
      setLoaded(true);
    } catch (err) {
      console.error('❌ Erreur chargement facture:', err);
      setLoading(false);
      setToast('Facture non trouvée ou erreur serveur');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const fetchRelances = async () => {
    try {
      const res = await api.get(`/billing/relances/facture/${id}`);
      setRelances(res.data);
    } catch (err) {
      console.error('❌ Erreur chargement relances:', err);
    }
  };

  const handlePaiement = async () => {
    if (!paiement.montant || paiement.montant <= 0) {
      setToast('Veuillez saisir un montant valide');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    try {
      await api.post('/billing/paiements', {
        facture_id: id,
        montant: parseFloat(paiement.montant),
        mode: paiement.mode,
        reference: paiement.reference
      });
      setToast('✅ Paiement enregistré');
      setTimeout(() => setToast(null), 3000);
      fetchFacture();
      setPaiement({ montant: '', mode: 'carte', reference: '' });
    } catch (err) {
      console.error('❌ Erreur paiement:', err);
      setToast('❌ Erreur lors du paiement');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleRelance = async () => {
    try {
      await api.post('/billing/relances', {
        facture_id: id,
        mode: relanceMode,
        commentaire: relanceComment
      });
      setToast('✅ Relance enregistrée');
      fetchRelances();
      setRelanceComment('');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('❌ Erreur relance:', err);
      setToast('❌ Erreur lors de la relance');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handlePrint = () => { window.print(); };
  const handleDownloadPDF = () => {
    const element = document.getElementById('facture-print');
    const opt = {
      margin: 0.5,
      filename: `facture_${facture.numero_facture || facture.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, letterRendering: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const getTypeLabel = (type) => {
    const labels = {
      mixte: 'Mixte',
      consultation: 'Consultation',
      laboratoire: 'Laboratoire',
      sejour: 'Séjour',
      pharmacie: 'Pharmacie'
    };
    return labels[type] || type || 'Mixte';
  };

  const containerStyle = {
    minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '32px', fontFamily: 'system-ui'
  };
  const titleStyle = {
    fontSize: '28px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '20px',
    opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(-20px)', transition: 'all 0.5s'
  };
  const cardStyle = { backgroundColor: 'white', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' };
  const badgeStyle = (statut) => {
    const colors = { impayee: '#ef4444', partielle: '#f59e0b', payee: '#10b981' };
    return { backgroundColor: colors[statut] || '#ef4444', color: 'white', padding: '4px 12px', borderRadius: '20px', display: 'inline-block' };
  };
  const resteAPayer = facture ? facture.montant_total - facture.montant_paye : 0;

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>⏳ Chargement...</div>;
  if (!facture) return <div style={{ textAlign: 'center', marginTop: '50px' }}>❌ Facture introuvable</div>;

  return (
    <div style={containerStyle}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toast.includes('✅') ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {toast}
        </div>
      )}
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <h1 style={titleStyle}>Facture n° {facture.numero_facture || facture.id}</h1>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={handlePrint} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              <FaPrint /> Imprimer
            </button>
            <button onClick={handleDownloadPDF} style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              <FaFilePdf /> PDF
            </button>
            <button onClick={() => navigate('/factures')} style={{ padding: '8px 16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              Retour
            </button>
          </div>
        </div>

        {/* Partie à imprimer / PDF */}
        <div id="facture-print">
          {/* En-tête de l'hôpital */}
          <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #1e3a8a', paddingBottom: '10px' }}>
            <img src="/logo.jpeg" alt="Logo Medical Center Elizabeth MCE" style={{ height: '60px', width: 'auto', marginBottom: '10px' }} />
            <h2 style={{ margin: 0, color: '#1e3a8a' }}>Medical Center Elizabeth MCE</h2>
            <p style={{ margin: '5px 0 0', color: '#4b5563' }}>Système intégré de gestion hospitalière</p>
          </div>

          {/* Infos facture */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div><strong>Patient :</strong> {facture.patient_nom} {facture.patient_prenom}</div>
              <div><strong>Date :</strong> {new Date(facture.date_emission).toLocaleDateString()}</div>
              <div><span style={badgeStyle(facture.statut)}>
                {facture.statut === 'impayee' ? 'Impayée' : facture.statut === 'partielle' ? 'Partielle' : 'Payée'}
              </span></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div><strong>Type :</strong> {getTypeLabel(facture.type_facture)}</div>
              <div><strong>Assurance :</strong> {facture.assurance_nom || 'Aucune'}</div>
              {facture.date_echeance && (
                <div><strong>Échéance :</strong> {new Date(facture.date_echeance).toLocaleDateString()}</div>
              )}
              {facture.tiers_payant && (
                <div><strong>Tiers payant :</strong> {facture.tiers_payant}</div>
              )}
              {facture.mode && (
                <div><strong>Mode :</strong> {facture.mode === 'hospitalisation' ? 'Hospitalisation' : 'Ambulatoire'}</div>
              )}
              {facture.sejour_id && (
                <div><strong>Séjour :</strong> #{facture.sejour_id}</div>
              )}
              {facture.consultation_id && (
                <div><strong>Consultation :</strong> #{facture.consultation_id}</div>
              )}
            </div>
            {facture.notes && (
              <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
                <strong>Notes :</strong> {facture.notes}
              </div>
            )}
          </div>

          {/* Détail des prestations */}
          <div style={cardStyle}>
            <h2 style={{ marginBottom: '16px' }}>Détail des prestations</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#e5e7eb' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Code</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Libellé</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Qté</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>PU (FC)</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Total (FC)</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map(l => (
                  <tr key={l.id}>
                    <td style={{ padding: '6px' }}>{l.code || '-'}</td>
                    <td style={{ padding: '6px' }}>{l.libelle || 'Prestation manuelle'}</td>
                    <td style={{ textAlign: 'center' }}>{l.quantite}</td>
                    <td style={{ textAlign: 'right' }}>{parseFloat(l.prix_unitaire).toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>{parseFloat(l.total_ligne).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: 'right', marginTop: '16px', fontSize: '18px', fontWeight: 'bold' }}>
              Total : {parseFloat(facture.montant_total).toFixed(2)} FC
            </div>
            <div style={{ textAlign: 'right' }}>
              Montant payé : {parseFloat(facture.montant_paye).toFixed(2)} FC
            </div>
            <div style={{ textAlign: 'right', color: resteAPayer > 0 ? '#dc2626' : '#10b981', fontWeight: 'bold' }}>
              Reste à payer : {resteAPayer.toFixed(2)} FC
            </div>
            {facture.remise > 0 && (
              <div style={{ textAlign: 'right', color: '#6b7280' }}>
                Remise appliquée : {facture.remise}%
              </div>
            )}
          </div>
        </div>

        {/* Paiement et relances (non inclus dans le PDF) */}
        {facture.statut !== 'payee' && (
          <div style={cardStyle}>
            <h2 style={{ marginBottom: '16px' }}>💳 Enregistrer un paiement</h2>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="number"
                step="0.01"
                placeholder="Montant"
                value={paiement.montant}
                onChange={e => setPaiement({ ...paiement, montant: e.target.value })}
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '8px', width: '150px' }}
              />
              <select
                value={paiement.mode}
                onChange={e => setPaiement({ ...paiement, mode: e.target.value })}
                style={{ padding: '8px', borderRadius: '8px' }}
              >
                <option value="carte">Carte bancaire</option>
                <option value="especes">Espèces</option>
                <option value="virement">Virement</option>
                <option value="cheque">Chèque</option>
              </select>
              <input
                type="text"
                placeholder="Référence"
                value={paiement.reference}
                onChange={e => setPaiement({ ...paiement, reference: e.target.value })}
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '8px', width: '200px' }}
              />
              <button
                onClick={handlePaiement}
                style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                <FaEuroSign /> Payer
              </button>
            </div>
          </div>
        )}

        <div style={cardStyle}>
          <h2 style={{ marginBottom: '16px' }}>📋 Historique des relances</h2>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={relanceMode}
              onChange={e => setRelanceMode(e.target.value)}
              style={{ padding: '8px', borderRadius: '8px' }}
            >
              <option value="email">Email</option>
              <option value="courrier">Courrier</option>
              <option value="telephone">Téléphone</option>
            </select>
            <input
              type="text"
              placeholder="Commentaire"
              value={relanceComment}
              onChange={e => setRelanceComment(e.target.value)}
              style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '8px', minWidth: '200px' }}
            />
            <button
              onClick={handleRelance}
              style={{ backgroundColor: '#f59e0b', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              <FaEnvelope /> Ajouter relance
            </button>
          </div>
          {relances.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#e5e7eb' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Mode</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {relances.map(r => (
                  <tr key={r.id}>
                    <td style={{ padding: '6px' }}>{new Date(r.date_relance).toLocaleString()}</td>
                    <td style={{ padding: '6px' }}>{r.mode}</td>
                    <td style={{ padding: '6px' }}>{r.commentaire || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#6b7280' }}>Aucune relance pour le moment.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FactureDetail;