// src/pages/paramedical/SoinsList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaPlus, FaEye, FaEdit, FaTrash, FaFilter, FaHeartbeat } from 'react-icons/fa';

const SoinsList = () => {
  const [soins, setSoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('tous');
  const [searchTerm, setSearchTerm] = useState('');
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

  const fetchSoins = () => {
    setLoading(true);
    api.get('/soins')
      .then(res => {
        setSoins(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur chargement soins :', err);
        showToast('Erreur lors du chargement des soins', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSoins();
  }, []);

  // ? handleDelete avec gestion 403
  const handleDelete = async (id) => {
    if (!window.confirm('?? Supprimer dfinitivement ce soin ? Cette action est irrversible.')) return;
    try {
      await api.delete(`/soins/${id}`);
      setSoins(soins.filter(s => s.id !== id));
      showToast('Soin supprim avec succs');
    } catch (err) {
      console.error('Erreur suppression soin:', err);
      if (err.response?.status === 403) {
        showToast('? Seul un administrateur peut supprimer un soin.', 'error');
      } else {
        showToast('? Erreur lors de la suppression : ' + (err.response?.data?.error || err.message), 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

  const filteredSoins = soins.filter(s => {
    const matchStatus = filter === 'tous' || s.statut === filter;
    const matchSearch = 
      s.patient_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.type_soin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.prestataire?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const getStatusBadge = (statut) => {
    const configs = {
      'planifi': { bg: '#dbeafe', color: '#1e40af', label: '?? Planifi' },
      'en_cours': { bg: '#fef3c7', color: '#92400e', label: '? En cours' },
      'effectu': { bg: '#d1fae5', color: '#065f46', label: '? Effectu' },
      'annul': { bg: '#fee2e2', color: '#991b1b', label: '? Annul' },
    };
    const config = configs[statut] || configs['planifi'];
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '500',
        backgroundColor: config.bg,
        color: config.color
      }}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '24px' }}>? Chargement des soins...</div>
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
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaHeartbeat style={{ color: '#34d399' }} /> Gestion des soins
        </h1>
        <Link 
          to="/paramedical/soins/nouveau"
          style={{
            backgroundColor: '#34d399',
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
          <FaPlus /> Nouveau soin
        </Link>
      </div>

      {/* Filtres et recherche */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Rechercher un soin, patient, prestataire..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaFilter style={{ color: '#64748b' }} />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              padding: '10px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="tous">Tous les statuts</option>
            <option value="planifi">Planifi</option>
            <option value="en_cours">En cours</option>
            <option value="effectu">Effectu</option>
            <option value="annul">Annul</option>
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Patient</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Type de soin</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Date</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Prestataire</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Statut</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSoins.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Aucun soin trouv
                </td>
              </tr>
            ) : (
              filteredSoins.map((s, index) => (
                <tr 
                  key={s.id} 
                  style={{ 
                    borderBottom: index === filteredSoins.length - 1 ? 'none' : '1px solid #f1f5f9',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <td style={{ padding: '14px 20px', fontWeight: '500', color: '#0f172a' }}>
                    {s.patient_prenom} {s.patient_nom}
                  </td>
                  <td style={{ padding: '14px 20px', color: '#334155' }}>{s.type_soin}</td>
                  <td style={{ padding: '14px 20px', color: '#475569' }}>
                    {new Date(s.date_soin).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={{ padding: '14px 20px', color: '#475569' }}>{s.prestataire || '-'}</td>
                  <td style={{ padding: '14px 20px' }}>{getStatusBadge(s.statut)}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <Link 
                        to={`/paramedical/soins/${s.id}`}
                        style={{ color: '#3b82f6', textDecoration: 'none' }}
                        title="Voir"
                      >
                        <FaEye />
                      </Link>
                      <Link 
                        to={`/paramedical/soins/${s.id}/edit`}
                        style={{ color: '#f59e0b', textDecoration: 'none' }}
                        title="Modifier"
                      >
                        <FaEdit />
                      </Link>
                      {isAdmin ? (
                        <button
                          onClick={() => handleDelete(s.id)}
                          style={{ 
                            color: '#ef4444', 
                            background: 'none', 
                            border: 'none',
                            cursor: 'pointer'
                          }}
                          title="Supprimer dfinitivement (admin)"
                        >
                          <FaTrash />
                        </button>
                      ) : (
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

export default SoinsList;
