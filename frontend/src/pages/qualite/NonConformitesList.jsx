// src/pages/qualite/NonConformitesList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaTimes, FaPlus, FaEdit, FaFilter, FaTrash } from 'react-icons/fa';

const NonConformitesList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
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

  const fetchItems = () => {
    setLoading(true);
    const params = filter ? `?statut=${filter}` : '';
    api.get(`/non-conformites${params}`)
      .then(res => {
        setItems(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Erreur chargement non-conformits', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchItems();
  }, [filter]);

  // ? handleDelete avec gestion 403
  const handleDelete = async (id, numero) => {
    if (!window.confirm(`?? Voulez-vous vraiment supprimer la non-conformit n${numero} ? Cette action est irrversible.`)) return;
    try {
      await api.delete(`/non-conformites/${id}`);
      setItems(items.filter(item => item.id !== id));
      showToast('Non-conformit supprime avec succs');
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        showToast('? Seul un administrateur peut supprimer une non-conformit.', 'error');
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const getGraviteBadge = (gravite) => {
    const colors = { mineure: '#10b981', majeure: '#f59e0b', critique: '#ef4444' };
    return <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: colors[gravite] + '20', color: colors[gravite] }}>{gravite}</span>;
  };

  const isAdmin = userRole === 'admin';

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>? Chargement...</div>;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a' }}><FaTimes style={{ color: '#ef4444', marginRight: '12px' }} /> Non-conformits</h1>
        <Link to="/qualite/non-conformites/nouveau" style={{ backgroundColor: '#ef4444', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPlus /> Ajouter
        </Link>
      </div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <FaFilter style={{ color: '#64748b', alignSelf: 'center' }} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <option value="">Tous statuts</option>
          <option value="ouverte">Ouverte</option>
          <option value="en_cours">En cours</option>
          <option value="resolue">Rsolue</option>
          <option value="fermee">Ferme</option>
        </select>
      </div>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr><th>N NC</th><th>Source</th><th>Description</th><th>Gravit</th><th>Service</th><th>Statut</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
          </thead>
          <tbody>
            {items.map((nc, i) => (
              <tr key={nc.id} style={{ borderBottom: i === items.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 20px', fontWeight: '500' }}>{nc.numero_nc}</td>
                <td>{nc.source}</td>
                <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nc.description}</td>
                <td>{getGraviteBadge(nc.gravite)}</td>
                <td>{nc.service_nom || '-'}</td>
                <td>{nc.statut}</td>
                <td style={{ textAlign: 'center' }}>
                  <Link to={`/qualite/non-conformites/${nc.id}/edit`} style={{ color: '#f59e0b', marginRight: '12px' }}><FaEdit /></Link>
                  {isAdmin ? (
                    <button
                      onClick={() => handleDelete(nc.id, nc.numero_nc)}
                      style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                      title="Supprimer (admin)"
                    >
                      <FaTrash />
                    </button>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '14px' }} title="Rserv aux administrateurs">??</span>
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

export default NonConformitesList;
