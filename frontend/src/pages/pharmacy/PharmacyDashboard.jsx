import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../axios';
import { FaPrescriptionBottle, FaExclamationTriangle, FaBoxes, FaShoppingCart, FaSyringe } from 'react-icons/fa';

const PharmacyDashboard = () => {
  const navigate = useNavigate();
  const [ordonnances, setOrdonnances] = useState([]);
  const [alertes, setAlertes] = useState({ stockCritique: [], peremptionProche: [] });
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ enAttente: 0, alertesCount: 0 });
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (message, type = 'success') => {
    setToast(message);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordonnancesRes, alertesRes, commandesRes] = await Promise.all([
          api.get('/pharmacy/ordonnances/en-attente'),
          api.get('/pharmacy/alertes'),
          api.get('/pharmacy/commandes')
        ]);
        setOrdonnances(ordonnancesRes.data);
        setAlertes(alertesRes.data);
        setCommandes(commandesRes.data);
        setStats({
          enAttente: ordonnancesRes.data.length,
          alertesCount: alertesRes.data.stockCritique?.length || 0
        });
        setLoading(false);
      } catch (err) {
        console.error('Erreur chargement du tableau de bord :', err);
        showToast('Erreur chargement des données', 'error');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>⏳ Chargement...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0fdf4', padding: '32px' }}>
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
          animation: 'slideIn 0.3s ease-out',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#166534', marginBottom: '24px' }}>
          📊 Tableau de bord - Pharmacie
        </h1>

        {/* Widgets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <Widget
            icon={<FaPrescriptionBottle />}
            label="Ordonnances en attente"
            value={stats.enAttente}
            color="#3b82f6"
            onClick={() => navigate('/pharmacist/prescriptions')}
          />
          <Widget
            icon={<FaExclamationTriangle />}
            label="Alertes stock"
            value={stats.alertesCount}
            color="#ef4444"
            onClick={() => window.location.href = '/medicaments'}
          />
          <Widget
            icon={<FaShoppingCart />}
            label="Commandes en cours"
            value={commandes.filter(c => c.statut === 'en_cours').length}
            color="#f59e0b"
            onClick={() => navigate('/pharmacy/commandes')}
          />
          <Widget
            icon={<FaBoxes />}
            label="Médicaments en stock"
            value="-"
            color="#10b981"
            onClick={() => window.location.href = '/medicaments'}
          />
        </div>

        {/* Ordonnances en attente */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
            📋 Ordonnances en attente
          </h2>
          {ordonnances.length === 0 ? (
            <p style={{ color: '#6b7280' }}>Aucune ordonnance en attente.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Patient</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Médecin</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ordonnances.map(ord => (
                  <tr key={ord.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px' }}>{ord.patient_prenom} {ord.patient_nom}</td>
                    <td style={{ padding: '10px' }}>
                      {ord.date_creation ? new Date(ord.date_creation).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: '10px' }}>Dr. {ord.medecin_prenom} {ord.medecin_nom}</td>
                    <td style={{ padding: '10px' }}>
                      <button
                        onClick={() => navigate(`/delivrance/${ord.id}`)}
                        style={{
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <FaSyringe /> Délivrer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

// Composant Widget réutilisable
const Widget = ({ icon, label, value, color, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        borderLeft: `4px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        height: '100%'
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{ fontSize: '32px', color }}>{icon}</div>
      <div>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>{label}</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937' }}>{value}</div>
      </div>
    </div>
  );
};

export default PharmacyDashboard;