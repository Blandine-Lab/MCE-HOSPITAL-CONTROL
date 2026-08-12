// src/pages/security/SessionsList.jsx
import { useState, useEffect } from 'react';
import api from '../../axios';
import { FaServer, FaTrash } from 'react-icons/fa';

const SessionsList = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const fetchSessions = () => {
    setLoading(true);
    api.get('/security/sessions')
      .then(res => {
        setSessions(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Erreur chargement des sessions', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // ✅ handleDelete avec gestion 403 (révocation de session)
  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Voulez-vous vraiment déconnecter cette session ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/security/sessions/${id}`);
      setSessions(sessions.filter(s => s.id !== id));
      showToast('Session révoquée avec succès');
    } catch (err) {
      console.error('Erreur révocation :', err);
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut révoquer une session.', 'error');
      } else {
        showToast('Erreur lors de la révocation', 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>⏳ Chargement...</div>;

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 24px',
          borderRadius: 8,
          backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}
      <h1 style={{ fontSize: '28px', color: '#0f172a', marginBottom: '24px' }}><FaServer style={{ color: '#f59e0b', marginRight: '12px' }} /> Sessions actives</h1>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr><th>Utilisateur</th><th>IP</th><th>User Agent</th><th>Création</th><th>Expiration</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => (
              <tr key={s.id} style={{ borderBottom: i === sessions.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td>{s.prenom} {s.nom}</td>
                <td>{s.ip || '-'}</td>
                <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.user_agent || '-'}</td>
                <td>{new Date(s.date_creation).toLocaleString()}</td>
                <td>{new Date(s.date_expiration).toLocaleString()}</td>
                <td style={{ textAlign: 'center' }}>
                  {isAdmin ? (
                    <button onClick={() => handleDelete(s.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><FaTrash /></button>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '14px' }} title="Réservé aux administrateurs">🔒</span>
                  )}
                </td>
              </tr>
            ))}
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

export default SessionsList;
