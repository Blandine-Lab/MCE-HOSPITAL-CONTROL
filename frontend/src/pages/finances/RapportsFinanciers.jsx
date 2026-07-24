// src/pages/finances/RapportsFinanciers.jsx
import { useState, useEffect } from 'react';
import api from '../../axios';
import { FaChartPie, FaFileInvoice, FaBook, FaDownload } from 'react-icons/fa';

const RapportsFinanciers = () => {
  const [activeTab, setActiveTab] = useState('bilan');
  const [bilan, setBilan] = useState([]);
  const [resultat, setResultat] = useState(null);
  const [grandLivre, setGrandLivre] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateDebut, setDateDebut] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [dateFin, setDateFin] = useState(new Date().toISOString().split('T')[0]);
  const [compteId, setCompteId] = useState('');
  const [comptes, setComptes] = useState([]);

  useEffect(() => {
    api.get('/comptes').then(res => setComptes(res.data)).catch(console.error);
  }, []);

  const loadBilan = () => {
    setLoading(true);
    const params = dateFin ? `?date=${dateFin}` : '';
    api.get(`/rapports-financiers/bilan${params}`)
      .then(res => { setBilan(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  };

  const loadResultat = () => {
    setLoading(true);
    api.get(`/rapports-financiers/resultat?date_debut=${dateDebut}&date_fin=${dateFin}`)
      .then(res => { setResultat(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  };

  const loadGrandLivre = () => {
    if (!compteId) { alert('Veuillez sélectionner un compte'); return; }
    setLoading(true);
    api.get(`/rapports-financiers/grand-livre?compte_id=${compteId}&date_debut=${dateDebut}&date_fin=${dateFin}`)
      .then(res => { setGrandLivre(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  };

  useEffect(() => {
    if (activeTab === 'bilan') loadBilan();
    else if (activeTab === 'resultat') loadResultat();
  }, [activeTab]);

  return (
    <div>
      <h1 style={{ fontSize: '28px', color: '#0f172a', marginBottom: '24px' }}>
        <FaChartPie style={{ color: '#f59e0b', marginRight: '12px' }} /> Rapports financiers
      </h1>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0' }}>
        {['bilan', 'resultat', 'grand-livre'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              borderBottom: activeTab === tab ? '3px solid #f59e0b' : '3px solid transparent',
              color: activeTab === tab ? '#0f172a' : '#64748b'
            }}
          >
            {tab === 'bilan' && '📊 Bilan'}
            {tab === 'resultat' && '📈 Compte de résultat'}
            {tab === 'grand-livre' && '📖 Grand livre'}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {loading && <div style={{ textAlign: 'center', padding: '40px' }}>⏳ Chargement...</div>}

      {activeTab === 'bilan' && !loading && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0 }}>Bilan comptable</h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <label>Au : <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></label>
              <button onClick={loadBilan} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '6px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Actualiser</button>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f1f5f9' }}>
              <tr><th style={{ padding: '10px', textAlign: 'left' }}>Type</th><th style={{ padding: '10px', textAlign: 'right' }}>Total Débit</th><th style={{ padding: '10px', textAlign: 'right' }}>Total Crédit</th><th style={{ padding: '10px', textAlign: 'right' }}>Solde</th></tr>
            </thead>
            <tbody>
              {bilan.map((b, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px', fontWeight: '500' }}>{b.type}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{Number(b.total_debit).toLocaleString('fr-FR')} FCFA</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{Number(b.total_credit).toLocaleString('fr-FR')} FCFA</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{Number(b.total_debit - b.total_credit).toLocaleString('fr-FR')} FCFA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'resultat' && !loading && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0 }}>Compte de résultat</h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <label>Du : <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></label>
              <label>Au : <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></label>
              <button onClick={loadResultat} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '6px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Actualiser</button>
            </div>
          </div>
          {resultat ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div style={{ padding: '20px', backgroundColor: '#d1fae5', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#065f46' }}>Produits</p>
                <h2>{Number(resultat.total_produits).toLocaleString('fr-FR')} FCFA</h2>
              </div>
              <div style={{ padding: '20px', backgroundColor: '#fee2e2', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#991b1b' }}>Charges</p>
                <h2>{Number(resultat.total_charges).toLocaleString('fr-FR')} FCFA</h2>
              </div>
              <div style={{ padding: '20px', borderRadius: '8px', textAlign: 'center', backgroundColor: resultat.resultat >= 0 ? '#dbeafe' : '#fef3c7' }}>
                <p style={{ margin: 0, color: resultat.resultat >= 0 ? '#1e40af' : '#92400e' }}>Résultat</p>
                <h2 style={{ color: resultat.resultat >= 0 ? '#1e40af' : '#991b1b' }}>{Number(resultat.resultat).toLocaleString('fr-FR')} FCFA</h2>
              </div>
            </div>
          ) : (
            <p>Aucune donnée</p>
          )}
        </div>
      )}

      {activeTab === 'grand-livre' && !loading && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ margin: 0 }}>Grand livre</h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={compteId} onChange={e => setCompteId(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', minWidth: '150px' }}>
                <option value="">Sélectionner un compte</option>
                {comptes.map(c => <option key={c.id} value={c.id}>{c.code} - {c.nom}</option>)}
              </select>
              <label>Du : <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></label>
              <label>Au : <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} /></label>
              <button onClick={loadGrandLivre} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '6px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Afficher</button>
            </div>
          </div>
          {grandLivre.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>Aucune écriture trouvée pour ce compte.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f1f5f9' }}>
                <tr><th>Date</th><th>N° Pièce</th><th>Libellé</th><th style={{ textAlign: 'right' }}>Montant</th><th>Sens</th></tr>
              </thead>
              <tbody>
                {grandLivre.map((l, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px' }}>{new Date(l.date_ecriture).toLocaleDateString('fr-FR')}</td>
                    <td style={{ padding: '10px', fontWeight: '500' }}>{l.numero_piece}</td>
                    <td style={{ padding: '10px' }}>{l.libelle}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{Number(l.montant).toLocaleString('fr-FR')} FCFA</td>
                    <td style={{ padding: '10px' }}>{l.sens === 'debit' ? 'Débit' : 'Crédit'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default RapportsFinanciers;