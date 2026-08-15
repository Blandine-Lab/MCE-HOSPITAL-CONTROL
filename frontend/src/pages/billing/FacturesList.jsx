import { useEffect, useState } from 'react';
import api from '../../axios';
import { Link } from 'react-router-dom';
import { FaEye, FaFileInvoice, FaEuroSign, FaCalendarAlt, FaPlusCircle, FaHospital, FaUserMd, FaFileAlt, FaPrint } from 'react-icons/fa';

const FacturesList = () => {
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [recapData, setRecapData] = useState(null);
  const [showRecapModal, setShowRecapModal] = useState(false);

  useEffect(() => {
    fetchFactures();
  }, []);

  const fetchFactures = async () => {
    try {
      const res = await api.get('/billing/factures');
      setFactures(res.data);
      setLoading(false);
      setLoaded(true);
    } catch (err) {
      console.error('❌ Erreur chargement factures:', err);
      setLoading(false);
      setToast('Erreur chargement factures');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const getStatutBadge = (statut) => {
    const styles = {
      impayee: { backgroundColor: '#ef4444', text: 'Impayée' },
      partielle: { backgroundColor: '#f59e0b', text: 'Partielle' },
      payee: { backgroundColor: '#10b981', text: 'Payée' }
    };
    const s = styles[statut] || styles.impayee;
    return <span style={{ backgroundColor: s.backgroundColor, color: 'white', padding: '4px 8px', borderRadius: '20px', fontSize: '12px' }}>{s.text}</span>;
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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map(f => f.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleRecap = async () => {
    if (selectedIds.length === 0) {
      setToast('Sélectionnez au moins une facture');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    try {
      const idsParam = selectedIds.join(',');
      const res = await api.get(`/billing/recap?facture_ids=${idsParam}`);
      setRecapData(res.data);
      setShowRecapModal(true);
    } catch (err) {
      console.error('❌ Erreur récapitulatif:', err);
      setToast('Erreur lors du récapitulatif');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handlePrintRecap = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const content = document.getElementById('recap-content').innerHTML;
    printWindow.document.write(`
      <html><head><title>Récapitulatif factures</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header img { max-height: 60px; }
        .header h1 { margin: 10px 0 5px; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        .table th { background: #f3f4f6; }
        .total { font-weight: bold; font-size: 18px; text-align: right; }
        .no-print { display: none; }
      </style>
      </head><body>
      ${content}
      <div style="text-align:center; margin-top:30px; color:#6b7280; font-size:12px;">
        Document généré le ${new Date().toLocaleString()}
      </div>
      <script>
        window.onload = function() { window.print(); }
      <\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const filtered = factures.filter(f => {
    const searchLower = search.toLowerCase();
    return (
      f.patient_nom?.toLowerCase().includes(searchLower) ||
      f.patient_prenom?.toLowerCase().includes(searchLower) ||
      f.numero_facture?.toLowerCase().includes(searchLower) ||
      f.tiers_payant?.toLowerCase().includes(searchLower) ||
      (f.mode === 'hospitalisation' ? 'hospitalisation' : 'ambulatoire').includes(searchLower) ||
      f.assurance_nom?.toLowerCase().includes(searchLower)
    );
  });

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    padding: '32px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };
  const innerStyle = { maxWidth: '1400px', margin: '0 auto' };
  const titleStyle = {
    fontSize: '36px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'center', marginBottom: '32px',
    opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(-20px)', transition: 'all 0.5s'
  };
  const headerStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px'
  };
  const searchInputStyle = {
    padding: '10px 16px', border: '1px solid #ccc', borderRadius: '8px', width: '300px', fontSize: '14px'
  };
  const btnPrimaryStyle = {
    backgroundColor: '#2563eb', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px'
  };
  const tableStyle = { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' };
  const thStyle = { backgroundColor: '#1e3a8a', color: 'white', padding: '12px', textAlign: 'left', border: '1px solid #1e40af' };
  const tdStyle = { padding: '10px', border: '1px solid #e2e8f0' };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>⏳ Chargement...</div>;

  return (
    <div style={containerStyle}>
      {toast && <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: '#ef4444', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 1000 }}>{toast}</div>}
      <div style={innerStyle}>
        <h1 style={titleStyle}>💰 Facturation & Tiers Payant</h1>
        <div style={headerStyle}>
          <input
            type="text"
            placeholder="Rechercher par patient, n° facture, tiers payant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={searchInputStyle}
          />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {selectedIds.length > 0 && (
              <button onClick={handleRecap} style={{ ...btnPrimaryStyle, backgroundColor: '#8b5cf6' }}>
                <FaFileAlt /> Récapitulatif ({selectedIds.length})
              </button>
            )}
            <Link to="/factures/new" style={btnPrimaryStyle}><FaPlusCircle /> Nouvelle facture</Link>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === filtered.length && filtered.length > 0} /></th>
                <th style={thStyle}>N° Facture</th>
                <th style={thStyle}>Patient</th>
                <th style={thStyle}>Date émission</th>
                <th style={thStyle}>Montant total</th>
                <th style={thStyle}>Montant payé</th>
                <th style={thStyle}>Statut</th>
                <th style={thStyle}>Assurance</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Mode</th>
                <th style={thStyle}>Tiers payant</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} style={{ backgroundColor: '#fff' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}>
                  <td style={tdStyle}><input type="checkbox" checked={selectedIds.includes(f.id)} onChange={() => handleSelectOne(f.id)} /></td>
                  <td style={tdStyle}>{f.numero_facture || f.id}</td>
                  <td style={tdStyle}>{f.patient_nom} {f.patient_prenom}</td>
                  <td style={tdStyle}>{new Date(f.date_emission).toLocaleDateString()}</td>
                  <td style={tdStyle}>{parseFloat(f.montant_total).toFixed(2)} FC</td>
                  <td style={tdStyle}>{parseFloat(f.montant_paye).toFixed(2)} FC</td>
                  <td style={tdStyle}>{getStatutBadge(f.statut)}</td>
                  <td style={tdStyle}>{f.assurance_nom || '-'}</td>
                  <td style={tdStyle}>
                    <span style={{ backgroundColor: '#e0f2fe', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                      {getTypeLabel(f.type_facture)}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {f.mode === 'hospitalisation' ? (
                      <span title="Hospitalisation"><FaHospital style={{ color: '#2563eb' }} /> Hosp.</span>
                    ) : f.mode === 'ambulatoire' ? (
                      <span title="Ambulatoire"><FaUserMd style={{ color: '#16a34a' }} /> Ambul.</span>
                    ) : '-'}
                  </td>
                  <td style={tdStyle}>{f.tiers_payant || '-'}</td>
                  <td style={tdStyle}>
                    <Link to={`/factures/${f.id}`} style={{ color: '#2563eb', marginRight: '8px' }}><FaEye /></Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Récapitulatif */}
      {showRecapModal && recapData && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div id="recap-content">
              <div className="header" style={{ textAlign: 'center', borderBottom: '2px solid #1e3a8a', paddingBottom: '10px', marginBottom: '20px' }}>
                <img src="/logo.jpeg" alt="Logo" style={{ height: '60px' }} />
                <h2 style={{ margin: '5px 0', color: '#1e3a8a' }}>Medical Center Elizabeth MCE</h2>
                <p style={{ margin: 0 }}>Récapitulatif des factures</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p><strong>Patient :</strong> {recapData.patient.nom} {recapData.patient.prenom}</p>
                <p><strong>Nombre de factures :</strong> {recapData.nombre_factures}</p>
              </div>

              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ border: '1px solid #ccc', padding: '8px' }}>N° Facture</th>
                    <th style={{ border: '1px solid #ccc', padding: '8px' }}>Date</th>
                    <th style={{ border: '1px solid #ccc', padding: '8px' }}>Montant</th>
                    <th style={{ border: '1px solid #ccc', padding: '8px' }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {recapData.factures.map(f => (
                    <tr key={f.id}>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>{f.numero}</td>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>{new Date(f.date).toLocaleDateString()}</td>
                      <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>{parseFloat(f.total).toFixed(2)} FC</td>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>{getTypeLabel(f.type_facture)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {recapData.par_type && Object.keys(recapData.par_type).length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4>Totaux par type :</h4>
                  <ul>
                    {Object.entries(recapData.par_type).map(([type, data]) => (
                      <li key={type}><strong>{getTypeLabel(type)} :</strong> {data.total.toFixed(2)} FC ({data.lignes.length} lignes)</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ textAlign: 'right', fontSize: '20px', fontWeight: 'bold', borderTop: '2px solid #1e3a8a', paddingTop: '10px' }}>
                Total général : {recapData.total_general.toFixed(2)} FC
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
              <button onClick={handlePrintRecap} style={{ backgroundColor: '#2563eb', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                <FaPrint /> Imprimer
              </button>
              <button onClick={() => setShowRecapModal(false)} style={{ backgroundColor: '#6b7280', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacturesList;