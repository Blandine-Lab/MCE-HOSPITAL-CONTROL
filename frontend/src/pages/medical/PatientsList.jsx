// src/pages/medical/PatientsList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaUser, FaEye, FaPlus, FaTrash } from 'react-icons/fa';

const PatientsList = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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

  const fetchPatients = () => {
    setLoading(true);
    api.get('/patients')
      .then(res => {
        setPatients(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur chargement patients DME :', err);
        showToast('Erreur lors du chargement des patients', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // handleDelete avec gestion 403
  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Supprimer définitivement ce patient ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/patients/${id}`);
      setPatients(patients.filter(p => p.id !== id));
      showToast('Patient supprimé avec succès');
    } catch (err) {
      console.error('Erreur suppression patient:', err);
      if (err.response?.status === 403) {
        showToast('🔒 Seul un administrateur peut supprimer un patient.', 'error');
      } else {
        showToast('❌ Erreur lors de la suppression : ' + (err.response?.data?.error || err.message), 'error');
      }
    }
  };

  const filteredPatients = patients.filter(p =>
    `${p.nom} ${p.prenom}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAdmin = userRole === 'admin';

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '24px' }}>⏳ Chargement des patients...</div>
      </div>
    );
  }

  return (
    <div>
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a' }}>
          <FaUser style={{ marginRight: '12px', color: '#3b82f6' }} />
          Patients
        </h1>
        <Link 
          to="/medical/patients/new"
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '500'
          }}
        >
          <FaPlus /> Nouveau patient
        </Link>
      </div>

      {/* Barre de recherche */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Rechercher un patient..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '16px'
          }}
        />
      </div>

      {/* Tableau des patients */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Nom</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Prénom</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Date naissance</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Téléphone</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Aucun patient trouvé
                </td>
              </tr>
            ) : (
              filteredPatients.map((p, index) => (
                <tr 
                  key={p.id} 
                  style={{ 
                    borderBottom: index === filteredPatients.length - 1 ? 'none' : '1px solid #f1f5f9',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <td style={{ padding: '14px 20px', fontWeight: '500', color: '#0f172a' }}>{p.nom}</td>
                  <td style={{ padding: '14px 20px', color: '#334155' }}>{p.prenom}</td>
                  <td style={{ padding: '14px 20px', color: '#475569' }}>
                    {p.date_naissance ? new Date(p.date_naissance).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  <td style={{ padding: '14px 20px', color: '#475569' }}>{p.telephone || '-'}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
                      <Link 
                        to={`/medical/patients/${p.id}`}
                        style={{ 
                          color: '#3b82f6', 
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: '500'
                        }}
                      >
                        <FaEye /> Dossier
                      </Link>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(p.id)}
                          style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                          title="Supprimer définitivement (admin)"
                        >
                          <FaTrash />
                        </button>
                      )}
                      {!isAdmin && (
                        <span style={{ color: '#94a3b8', fontSize: '14px' }} title="Réservé aux administrateurs">🔒</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

export default PatientsList;