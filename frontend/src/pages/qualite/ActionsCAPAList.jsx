// src/pages/qualite/ActionsCAPAList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaTasks, FaPlus, FaEye, FaEdit, FaFilter, FaSearch, FaTimes, FaTrash } from 'react-icons/fa';

const ActionsCAPAList = () => {
  const [actions, setActions] = useState([]);
  const [filteredActions, setFilteredActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  useEffect(() => {
    fetchActions();
  }, [filter]);

  useEffect(() => {
    applyFilters();
  }, [actions, search]);

  const fetchActions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filter ? `?statut=${filter}` : '';
      const res = await api.get(`/actions-capa${params}`);
      setActions(res.data || []);
    } catch (err) {
      console.error('Erreur chargement actions CAPA :', err);
      setError('Impossible de charger les actions CAPA');
      setToast({ type: 'error', message: 'Erreur de chargement' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...actions];
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(a =>
        (a.numero_action?.toLowerCase().includes(term)) ||
        (a.titre?.toLowerCase().includes(term)) ||
        (a.responsable_nom?.toLowerCase().includes(term)) ||
        (a.type?.toLowerCase().includes(term))
      );
    }
    setFilteredActions(result);
    setCurrentPage(1);
  };

  // ? handleDelete avec gestion 403
  const handleDelete = async (id, titre) => {
    if (!window.confirm(`?? Voulez-vous vraiment supprimer l'action "${titre}" ? Cette action est irrversible.`)) return;
    try {
      await api.delete(`/actions-capa/${id}`);
      setToast({ type: 'success', message: 'Action CAPA supprime' });
      setTimeout(() => setToast(null), 3000);
      fetchActions();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        setToast({ type: 'error', message: '? Seul un administrateur peut supprimer une action CAPA.' });
      } else {
        setToast({ type: 'error', message: 'Erreur lors de la suppression' });
      }
      setTimeout(() => setToast(null), 3000);
    }
  };

  const getStatusBadge = (statut) => {
    const configs = {
      ouverte: { bg: '#fef3c7', color: '#92400e', label: '?? Ouverte' },
      en_cours: { bg: '#dbeafe', color: '#1e40af', label: '? En cours' },
      realisee: { bg: '#d1fae5', color: '#065f46', label: '? Ralise' },
      verifiee: { bg: '#ede9fe', color: '#5b21b6', label: '? Vrifie' },
      cloturee: { bg: '#f1f5f9', color: '#475569', label: '?? Clture' }
    };
    const c = configs[statut] || configs.ouverte;
    return <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: c.bg, color: c.color }}>{c.label}</span>;
  };

  const getTypeBadge = (type) => {
    const colors = {
      corrective: { bg: '#fee2e2', color: '#991b1b', label: 'Corrective' },
      preventive: { bg: '#dbeafe', color: '#1e40af', label: 'Prventive' },
      amlioration: { bg: '#d1fae5', color: '#065f46', label: 'Amlioration' }
    };
    const c = colors[type] || colors.corrective;
    return <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '400', backgroundColor: c.bg, color: c.color }}>{c.label}</span>;
  };

  const isAdmin = userRole === 'admin';

  // Pagination
  const totalPages = Math.ceil(filteredActions.length / itemsPerPage);
  const paginatedActions = filteredActions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div style={{ display: 'grid', gap: '16px', padding: '20px' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ backgroundColor: '#f1f5f9', height: '40px', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
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
          padding: '12px 24px',
          borderRadius: '8px',
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaTasks style={{ color: '#8b5cf6' }} />
          Actions CAPA
          <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'normal', marginLeft: '8px' }}>
            ({filteredActions.length} actions)
          </span>
        </h1>
        <Link
          to="/qualite/actions-capa/nouveau"
          style={{
            backgroundColor: '#8b5cf6',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
        >
          <FaPlus /> Nouvelle action
        </Link>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          ?? {error}
        </div>
      )}

      {/* Barre de recherche et filtres */}
      <div style={{
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        alignItems: 'center'
      }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Rechercher par n, titre, responsable..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              outline: 'none',
              fontSize: '14px'
            }}
          />
          <FaSearch style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8'
          }} />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8'
              }}
            >
              <FaTimes />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <FaFilter style={{ color: '#64748b' }} />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: 'white',
              fontSize: '14px'
            }}
          >
            <option value="">Tous statuts</option>
            <option value="ouverte">Ouverte</option>
            <option value="en_cours">En cours</option>
            <option value="realisee">Ralise</option>
            <option value="verifiee">Vrifie</option>
            <option value="cloturee">Clture</option>
          </select>
        </div>

        <button
          onClick={fetchActions}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px'
          }}
        >
          <FaTasks /> Rafrachir
        </button>
      </div>

      {/* Tableau */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {paginatedActions.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <FaTasks style={{ fontSize: '48px', marginBottom: '12px', color: '#cbd5e1' }} />
            <p>Aucune action CAPA trouve.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f1f5f9' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>N Action</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Titre</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Type</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Responsable</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Date prvue</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Statut</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedActions.map((a, i) => (
                  <tr
                    key={a.id}
                    style={{
                      borderBottom: i === paginatedActions.length - 1 ? 'none' : '1px solid #f1f5f9',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: '500' }}>{a.numero_action || '#'+a.id}</td>
                    <td style={{ padding: '12px 16px' }}>{a.titre}</td>
                    <td style={{ padding: '12px 16px' }}>{getTypeBadge(a.type)}</td>
                    <td style={{ padding: '12px 16px' }}>{a.responsable_nom || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>{new Date(a.date_prevue).toLocaleDateString('fr-FR')}</td>
                    <td style={{ padding: '12px 16px' }}>{getStatusBadge(a.statut)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <Link
                          to={`/qualite/actions-capa/${a.id}`}
                          style={{ color: '#3b82f6', padding: '4px 8px', borderRadius: '4px', transition: 'background-color 0.2s' }}
                          title="Voir le dtail"
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <FaEye />
                        </Link>
                        <Link
                          to={`/qualite/actions-capa/${a.id}/edit`}
                          style={{ color: '#f59e0b', padding: '4px 8px', borderRadius: '4px', transition: 'background-color 0.2s' }}
                          title="Modifier"
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef3c7'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <FaEdit />
                        </Link>
                        {isAdmin ? (
                          <button
                            onClick={() => handleDelete(a.id, a.titre)}
                            style={{
                              color: '#ef4444',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              transition: 'background-color 0.2s'
                            }}
                            title="Supprimer (admin)"
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <FaTrash />
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '14px' }} title="Rserv aux administrateurs">??</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '6px 14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
              cursor: currentPage === 1 ? 'default' : 'pointer'
            }}
          >
            Prcdent
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              style={{
                padding: '6px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: currentPage === i + 1 ? '#8b5cf6' : 'white',
                color: currentPage === i + 1 ? 'white' : '#0f172a',
                cursor: 'pointer',
                fontWeight: currentPage === i + 1 ? 'bold' : 'normal'
              }}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '6px 14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
              cursor: currentPage === totalPages ? 'default' : 'pointer'
            }}
          >
            Suivant
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default ActionsCAPAList;
