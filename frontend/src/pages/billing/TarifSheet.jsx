import { useEffect, useState } from 'react';
import api from '../../axios'; // ✅ Instance avec intercepteur
import { FaPrint, FaSearch, FaFileInvoice } from 'react-icons/fa';

const TarifSheet = () => {
  const [prestations, setPrestations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.get('/billing/prestations')
      .then(res => {
        setPrestations(res.data);
        const cats = [...new Set(res.data.map(p => p.categorie).filter(Boolean))];
        setCategories(cats);
        setLoading(false);
        setLoaded(true);
      })
      .catch(err => {
        console.error('❌ Erreur chargement tarifs:', err);
        setToast('Erreur chargement des prestations');
        setTimeout(() => setToast(null), 3000);
        setLoading(false);
      });
  }, []);

  const handlePrint = () => window.print();

  const filteredByCat = (cat) => {
    return prestations.filter(p => 
      p.categorie === cat && 
      (p.code?.toLowerCase().includes(search.toLowerCase()) || 
       p.libelle?.toLowerCase().includes(search.toLowerCase()))
    );
  };

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '32px',
    fontFamily: 'system-ui'
  };
  const titleStyle = {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#1e3a8a',
    textAlign: 'center',
    marginBottom: '8px',
    opacity: loaded ? 1 : 0,
    transform: loaded ? 'translateY(0)' : 'translateY(-20px)',
    transition: 'all 0.5s'
  };
  const subtitleStyle = {
    textAlign: 'center',
    color: '#4b5563',
    marginBottom: '24px'
  };
  const searchBarStyle = {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '32px'
  };
  const searchInputStyle = {
    padding: '10px 16px',
    width: '300px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    fontSize: '14px'
  };
  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '24px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  };
  const catTitleStyle = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#166534',
    borderLeft: '4px solid #16a34a',
    paddingLeft: '12px',
    marginBottom: '16px'
  };
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse'
  };
  const thStyle = {
    textAlign: 'left',
    padding: '10px',
    backgroundColor: '#f1f5f9',
    borderBottom: '2px solid #cbd5e1'
  };
  const tdStyle = {
    padding: '10px',
    borderBottom: '1px solid #e2e8f0'
  };
  const printButtonStyle = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    backgroundColor: '#2563eb',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '50px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    zIndex: 1000
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>⏳ Chargement...</div>;

  return (
    <div style={containerStyle}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#ef4444',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          zIndex: 1001
        }}>
          {toast}
        </div>
      )}
      <h1 style={titleStyle}>📄 Fiche tarifaire des prestations</h1>
      <p style={subtitleStyle}>Tarifs CCAM, NGAP et actes hospitaliers</p>
      <div style={searchBarStyle}>
        <input
          type="text"
          placeholder="Rechercher par code ou libellé..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={searchInputStyle}
        />
      </div>
      {categories.length === 0 && (
        <p style={{ textAlign: 'center', color: '#6b7280' }}>Aucune catégorie trouvée.</p>
      )}
      {categories.map(cat => {
        const filtered = filteredByCat(cat);
        if (filtered.length === 0) return null;
        return (
          <div key={cat} style={cardStyle}>
            <h2 style={catTitleStyle}>{cat}</h2>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Code</th>
                  <th style={thStyle}>Libellé</th>
                  <th style={thStyle}>Prix unitaire (FC)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={tdStyle}>{p.code}</td>
                    <td style={tdStyle}>{p.libelle}</td>
                    <td style={tdStyle}>{parseFloat(p.prix_unitaire).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
      <button style={printButtonStyle} onClick={handlePrint} className="print-button">
        <FaPrint /> Imprimer la fiche tarifaire
      </button>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #root, #root * {
            visibility: visible;
          }
          .print-button {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default TarifSheet;
