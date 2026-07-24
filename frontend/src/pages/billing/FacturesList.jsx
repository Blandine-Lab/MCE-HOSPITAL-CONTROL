import { useEffect, useState } from 'react';
import api from '../../axios'; // ✅ Instance avec intercepteur
import { Link } from 'react-router-dom';
import { FaEye, FaFileInvoice, FaEuroSign, FaCalendarAlt, FaPlusCircle, FaHospital, FaUserMd } from 'react-icons/fa';

const FacturesList = () => {
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

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
        <h1 style={titleStyle}>💳 Facturation & Tiers Payant</h1>
        <div style={headerStyle}>
          <input
            type="text"
            placeholder="Rechercher par patient, n° facture, tiers payant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={searchInputStyle}
          />
          <Link to="/factures/new" style={btnPrimaryStyle}><FaPlusCircle /> Nouvelle facture</Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>N° Facture</th>
                <th style={thStyle}>Patient</th>
                <th style={thStyle}>Date émission</th>
                <th style={thStyle}>Montant total</th>
                <th style={thStyle}>Montant payé</th>
                <th style={thStyle}>Statut</th>
                <th style={thStyle}>Assurance</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Tiers payant</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} style={{ backgroundColor: '#fff' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}>
                  <td style={tdStyle}>{f.numero_facture || f.id}</td>
                  <td style={tdStyle}>{f.patient_nom} {f.patient_prenom}</td>
                  <td style={tdStyle}>{new Date(f.date_emission).toLocaleDateString()}</td>
                  <td style={tdStyle}>{parseFloat(f.montant_total).toFixed(2)} €</td>
                  <td style={tdStyle}>{parseFloat(f.montant_paye).toFixed(2)} €</td>
                  <td style={tdStyle}>{getStatutBadge(f.statut)}</td>
                  <td style={tdStyle}>{f.assurance_nom || '-'}</td>
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
    </div>
  );
};

export default FacturesList;