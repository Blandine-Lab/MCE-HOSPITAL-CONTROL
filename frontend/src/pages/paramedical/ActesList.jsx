// src/pages/paramedical/ActesList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaUserMd, FaPlus, FaEye, FaTrash } from 'react-icons/fa';

const ActesList = () => {
  const [actes, setActes] = useState([]);
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

  const fetchActes = () => {
    setLoading(true);
    api.get('/actes')
      .then(res => {
        setActes(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur chargement actes :', err);
        showToast('Erreur lors du chargement des actes', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchActes();
  }, []);

  // handleDelete avec gestion 403
  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Supprimer définitivement cet acte ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/actes/${id}`);
      setActes(actes.filter(a => a.id !== id));
      showToast('Acte supprimé avec succès');
    } catch (err) {
      console.error('Erreur suppression acte:', err);
      if (err.response?.status === 403) {
        showToast('🔒 Seul un administrateur peut supprimer un acte.', 'error');
      } else {
        showToast('❌ Erreur lors de la suppression : ' + (err.response?.data?.error || err.message), 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

  if (loading) return <div style={{ textAlign: 'center', padding: '60px 20px' }}>⏳ Chargement des actes...</div>;

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
        <h1 style={{ fontSize: '28px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaUserMd style={{ color: '#3b82f6' }} /> Actes paramédicaux
        </h1>
        <Link 
          to="/paramedical/actes/new"
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
          <FaPlus /> Nouvel acte
        </Link>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Patient</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Acte</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Date</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Praticien</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {actes.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Aucun acte</td></tr>
            ) : (
              actes.map((a, index) => (
                <tr key={a.id} style={{ borderBottom: index === actes.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 20px', fontWeight: '500' }}>{a.patient_prenom} {a.patient_nom}</td>
                  <td style={{ padding: '14px 20px', color: '#334155' }}>{a.nom_acte}</td>
                  <td style={{ padding: '14px 20px', color: '#475569' }}>{new Date(a.date_realisation).toLocaleDateString('fr-FR')}</td>
                  <td style={{ padding: '14px 20px', color: '#475569' }}>{a.praticien || '-'}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
                      <Link to={`/paramedical/actes/${a.id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}><FaEye /> Voir</Link>
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

export default ActesList;