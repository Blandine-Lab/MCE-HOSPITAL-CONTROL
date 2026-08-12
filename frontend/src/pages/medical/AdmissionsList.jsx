// src/pages/medical/AdmissionsList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaPlus, FaEye, FaEdit, FaTrash } from 'react-icons/fa';

const AdmissionsList = () => {
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [userRole, setUserRole] = useState(null);

  // ✅ Récupérer le rôle depuis le token JWT
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

  const fetchAdmissions = async () => {
    try {
      const res = await api.get('/consultations/admissions');
      console.log('✅ Données admissions :', res.data);
      setAdmissions(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Erreur chargement admissions :', err);
      setError('Impossible de charger la liste des admissions');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
  }, []);

  // ✅ handleDelete avec gestion 403
  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Supprimer définitivement cette admission ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/consultations/admissions/${id}`);
      setAdmissions(admissions.filter(a => a.id !== id));
      showToast('Admission supprimée avec succès');
    } catch (err) {
      console.error('Erreur suppression admission:', err);
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut supprimer une admission.', 'error');
      } else {
        showToast('❌ Erreur lors de la suppression : ' + (err.response?.data?.error || err.message), 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Chargement...</div>;
  if (error) return <div style={{ padding: '20px', color: '#ef4444' }}>{error}</div>;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#0f172a' }}>Liste des admissions</h2>
        <Link
          to="/medical/admissions/new"
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaPlus /> Nouvelle admission
        </Link>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Patient</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Service</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Médecin</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Motif</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admissions.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  Aucune admission enregistrée
                </td>
              </tr>
            ) : (
              admissions.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <Link to={`/patients/${a.patient_id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                      {a.patient_prenom} {a.patient_nom}
                    </Link>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{a.ipp}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{a.service_nom || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>{a.medecin_prenom} {a.medecin_nom}</td>
                  <td style={{ padding: '12px 16px' }}>{new Date(a.date_admission).toLocaleDateString('fr-FR')}</td>
                  <td style={{ padding: '12px 16px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.motif || '-'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <Link
                      to={`/medical/admissions/${a.id}`}
                      style={{ color: '#3b82f6', marginRight: '8px' }}
                      title="Voir le détail"
                    >
                      <FaEye />
                    </Link>
                    <Link
                      to={`/medical/admissions/edit/${a.id}`}
                      style={{ color: '#f59e0b', marginRight: '8px' }}
                      title="Modifier"
                    >
                      <FaEdit />
                    </Link>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(a.id)}
                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Supprimer définitivement (admin)"
                      >
                        <FaTrash />
                      </button>
                    )}
                    {!isAdmin && (
                      <span style={{ color: '#94a3b8', fontSize: '14px' }} title="Réservé aux administrateurs">🔒</span>
                    )}
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

export default AdmissionsList;
