// src/pages/paramedical/ProtocolesList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaBook, FaPlus, FaEye, FaTrash } from 'react-icons/fa';

const ProtocolesList = () => {
  const [protocoles, setProtocoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [userRole, setUserRole] = useState(null);

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

  const fetchProtocoles = () => {
    setLoading(true);
    api.get('/protocoles')
      .then(res => {
        setProtocoles(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur chargement protocoles :', err);
        showToast('Erreur lors du chargement des protocoles', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProtocoles();
  }, []);

  // ? handleDelete avec gestion 403
  const handleDelete = async (id) => {
    if (!window.confirm('?? Supprimer dfinitivement ce protocole ? Cette action est irrversible.')) return;
    try {
      await api.delete(`/protocoles/${id}`);
      setProtocoles(protocoles.filter(p => p.id !== id));
      showToast('Protocole supprim avec succs');
    } catch (err) {
      console.error('Erreur suppression protocole:', err);
      if (err.response?.status === 403) {
        showToast('? Seul un administrateur peut supprimer un protocole.', 'error');
      } else {
        showToast('? Erreur lors de la suppression : ' + (err.response?.data?.error || err.message), 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

  if (loading) return <div style={{ textAlign: 'center', padding: '60px 20px' }}>? Chargement des protocoles...</div>;

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
          <FaBook style={{ color: '#3b82f6' }} /> Protocoles de soins
        </h1>
        <Link 
          to="/paramedical/protocoles/new"
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
          <FaPlus /> Nouveau protocole
        </Link>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Nom</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Description</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Version</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {protocoles.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Aucun protocole</td></tr>
            ) : (
              protocoles.map((p, index) => (
                <tr key={p.id} style={{ borderBottom: index === protocoles.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 20px', fontWeight: '500' }}>{p.nom}</td>
                  <td style={{ padding: '14px 20px', color: '#475569' }}>{p.description}</td>
                  <td style={{ padding: '14px 20px', color: '#475569' }}>{p.version || '1.0'}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
                      <Link to={`/paramedical/protocoles/${p.id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}><FaEye /> Voir</Link>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(p.id)}
                          style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                          title="Supprimer dfinitivement (admin)"
                        >
                          <FaTrash />
                        </button>
                      )}
                      {!isAdmin && (
                        <span style={{ color: '#94a3b8', fontSize: '14px' }} title="Rserv aux administrateurs">??</span>
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

export default ProtocolesList;
