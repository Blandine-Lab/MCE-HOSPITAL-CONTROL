// frontend/src/pages/consultations/DoctorPrescriptionList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaPrescriptionBottle, FaPlus, FaEye, FaUserMd } from 'react-icons/fa';

const DoctorPrescriptionList = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [medecins, setMedecins] = useState([]);
  const [filterMedecinId, setFilterMedecinId] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [userRole, setUserRole] = useState(null);

  // Récupérer le rôle depuis le token JWT
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (e) {
        console.error('Erreur décodage token', e);
      }
    }
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prescRes, medecinsRes] = await Promise.all([
          api.get('/prescriptions'),
          api.get('/consultations/medecins/all')
        ]);
        setPrescriptions(prescRes.data);
        setMedecins(medecinsRes.data);
        setLoading(false);
      } catch (err) {
        console.error('Erreur chargement :', err);
        showToast('Erreur lors du chargement des données', 'error');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtrer les prescriptions par médecin
  const filteredPrescriptions = filterMedecinId
    ? prescriptions.filter(p => p.medecin_id === parseInt(filterMedecinId))
    : prescriptions;

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '24px' }}>⏳ Chargement...</div>
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
        {/* En-tête */}
        <div style={{
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <h1 style={{
              fontSize: '36px',
              fontWeight: 'bold',
              color: 'white',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <FaPrescriptionBottle style={{ fontSize: '32px' }} />
              Mes prescriptions
            </h1>
            <p style={{ color: '#bfdbfe', marginTop: '8px', fontSize: '16px' }}>
              {filteredPrescriptions.length} prescription(s) affichée(s)
            </p>
          </div>
          <Link
            to="/prescriptions/new"
            style={{
              backgroundColor: '#16a34a',
              color: 'white',
              padding: '14px 28px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 15px rgba(22, 163, 74, 0.5)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(22, 163, 74, 0.6)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(22, 163, 74, 0.5)';
            }}
          >
            <FaPlus /> Nouvelle prescription
          </Link>
        </div>

        {/* Filtre par médecin */}
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(8px)',
          borderRadius: '12px',
          padding: '16px 24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <FaUserMd style={{ color: '#93c5fd', fontSize: '20px' }} />
          <label style={{ color: '#e2e8f0', fontWeight: '500' }}>Filtrer par médecin :</label>
          <select
            value={filterMedecinId}
            onChange={(e) => setFilterMedecinId(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              minWidth: '200px'
            }}
          >
            <option value="" style={{ color: '#1e293b' }}>Tous les médecins</option>
            {medecins.map(m => (
              <option key={m.id} value={m.id} style={{ color: '#1e293b' }}>
                {m.prenom} {m.nom} ({m.specialite || 'Généraliste'})
              </option>
            ))}
          </select>
        </div>

        {/* Liste */}
        {filteredPrescriptions.length === 0 ? (
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
            borderRadius: '20px',
            padding: '60px 20px',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <p style={{ fontSize: '20px', color: '#e2e8f0' }}>
              {filterMedecinId ? 'Aucune prescription pour ce médecin.' : 'Aucune prescription pour le moment.'}
            </p>
            {!filterMedecinId && (
              <Link to="/prescriptions/new" style={{ color: '#93c5fd', fontWeight: 'bold' }}>
                Commencer une prescription ?
              </Link>
            )}
          </div>
        ) : (
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(8px)',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  borderBottom: '2px solid rgba(255,255,255,0.1)'
                }}>
                  <th style={{ padding: '18px 24px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Patient</th>
                  <th style={{ padding: '18px 24px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Médecin</th>
                  <th style={{ padding: '18px 24px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Date</th>
                  <th style={{ padding: '18px 24px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Statut</th>
                  <th style={{ padding: '18px 24px', textAlign: 'left', color: '#e2e8f0', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrescriptions.map((p, index) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: index === filteredPrescriptions.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                      backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)'
                    }}
                  >
                    <td style={{ padding: '16px 24px', color: 'white', fontWeight: '500' }}>
                      {p.patient_prenom} {p.patient_nom}
                    </td>
                    <td style={{ padding: '16px 24px', color: '#cbd5e1' }}>
                      {p.medecin_prenom && p.medecin_nom ? `Dr. ${p.medecin_prenom} ${p.medecin_nom}` : '-'}
                    </td>
                    <td style={{ padding: '16px 24px', color: '#cbd5e1' }}>
                      {new Date(p.date_creation).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{
                        padding: '4px 16px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '600',
                        backgroundColor: p.statut === 'en_attente' ? '#f59e0b' : (p.statut === 'servie' ? '#10b981' : '#6b7280'),
                        color: 'white',
                        display: 'inline-block'
                      }}>
                        {p.statut === 'en_attente' ? '⏳ En attente' : p.statut === 'servie' ? '✅ Servie' : p.statut}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <Link
                        to={`/prescriptions/${p.id}`}
                        style={{
                          color: '#93c5fd',
                          textDecoration: 'none',
                          fontWeight: '500',
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

export default DoctorPrescriptionList;