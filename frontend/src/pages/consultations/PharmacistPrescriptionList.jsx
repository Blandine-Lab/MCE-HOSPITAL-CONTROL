// frontend/src/pages/consultations/PharmacistPrescriptionList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios'; // ? Instance avec intercepteur
import { FaPills, FaCheckCircle, FaEye } from 'react-icons/fa';

const PharmacistPrescriptionList = () => {
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [userRole, setUserRole] = useState(null); // ? Prt pour l'avenir

  // ? Rcuprer le rle depuis le token JWT
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (e) {
        console.error('Erreur dcodage token', e);
      }
    }
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/prescriptions?status=pending'),
      api.get('/prescriptions')
    ])
      .then(([pendingRes, allRes]) => {
        setPending(pendingRes.data);
        setHistory(allRes.data.filter(p => p.status === 'served'));
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur chargement prescriptions:', err);
        showToast('Erreur chargement des donnes', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleServe = async (id) => {
    if (!window.confirm('? Confirmer la dlivrance de cette ordonnance ?')) return;
    try {
      await api.put(`/prescriptions/${id}/serve`);
      showToast('? Prescription servie avec succs !');
      fetchData();
    } catch (err) {
      const message = err.response?.data?.error || err.message;
      showToast('? Erreur : ' + message, 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '24px' }}>? Chargement...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)',
      padding: '32px'
    }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* En-tte */}
        <div style={{
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
        }}>
          <h1 style={{ 
            fontSize: '36px', 
            fontWeight: 'bold', 
            color: 'white',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <FaPills style={{ fontSize: '32px' }} />
            Ordonnances
          </h1>
          <div style={{ display: 'flex', gap: '24px', marginTop: '12px', flexWrap: 'wrap' }}>
            <span style={{ color: '#fbbf24', fontWeight: '500', fontSize: '18px' }}>
              ? En attente : {pending.length}
            </span>
            <span style={{ color: '#6ee7b7', fontWeight: '500', fontSize: '18px' }}>
              ? Servies : {history.length}
            </span>
          </div>
        </div>

        {/* Section en attente */}
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fbbf24', marginBottom: '16px' }}>
          ? Ordonnances  servir
        </h2>
        {pending.length === 0 ? (
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '40px'
          }}>
            <p style={{ color: '#e2e8f0', fontSize: '18px' }}>? Aucune ordonnance en attente.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '20px', marginBottom: '40px' }}>
            {pending.map((p) => (
              <div 
                key={p.id} 
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderLeft: '6px solid #f59e0b',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.01)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <p style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: '0 0 4px 0' }}>
                      {p.patient_prenom} {p.patient_nom}
                    </p>
                    <p style={{ fontSize: '15px', color: '#cbd5e1', margin: '4px 0' }}>
                      ???FC??? Mdecin : {p.doctor_prenom} {p.doctor_nom}
                    </p>
                    <p style={{ fontSize: '15px', color: '#94a3b8', margin: '4px 0' }}>
                      ?? {new Date(p.date_creation).toLocaleString('fr-FR')}
                    </p>
                    <p style={{ fontSize: '15px', color: '#e2e8f0', marginTop: '8px' }}>
                      ?? {p.items?.map(i => i.medicament).join(', ')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => handleServe(p.id)}
                      style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '12px 24px',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.6)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.4)';
                      }}
                    >
                      <FaCheckCircle /> Servir
                    </button>
                    <Link 
                      to={`/prescription/${p.id}`} 
                      style={{ 
                        color: '#93c5fd', 
                        textDecoration: 'none',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FaEye /> Dtails
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Historique */}
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#6ee7b7', marginBottom: '16px' }}>
          ?? Historique des ordonnances servies
        </h2>
        {history.length === 0 ? (
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <p style={{ color: '#e2e8f0', fontSize: '18px' }}>Aucune ordonnance servie pour le moment.</p>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ 
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  borderBottom: '2px solid rgba(255,255,255,0.1)'
                }}>
                  <th style={{ padding: '16px 24px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Patient</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Mdecin</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Servie le</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p, index) => (
                  <tr 
                    key={p.id} 
                    style={{ 
                      borderBottom: index === history.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                      backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)'
                    }}
                  >
                    <td style={{ padding: '14px 24px', color: 'white', fontWeight: '500' }}>
                      {p.patient_prenom} {p.patient_nom}
                    </td>
                    <td style={{ padding: '14px 24px', color: '#cbd5e1' }}>
                      {p.doctor_prenom} {p.doctor_nom}
                    </td>
                    <td style={{ padding: '14px 24px', color: '#cbd5e1' }}>
                      {p.date_served ? new Date(p.date_served).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td style={{ padding: '14px 24px' }}>
                      <Link 
                        to={`/prescription/${p.id}`} 
                        style={{ 
                          color: '#93c5fd', 
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <FaEye /> Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

export default PharmacistPrescriptionList;
