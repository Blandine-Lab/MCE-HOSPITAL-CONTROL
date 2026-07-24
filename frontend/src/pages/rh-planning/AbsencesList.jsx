// src/pages/rh-planning/AbsencesList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaClipboardList, FaPlus, FaEye, FaTrash, FaSearch, FaTimes } from 'react-icons/fa';

const AbsencesList = () => {
  const [absences, setAbsences] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Filtres
  const [filters, setFilters] = useState({
    employe: '',
    dateDebut: '',
    dateFin: '',
    justifiee: ''
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  useEffect(() => {
    fetchAbsences();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [absences, filters]);

  const fetchAbsences = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/absences');
      setAbsences(res.data);
    } catch (err) {
      console.error('Erreur chargement absences :', err);
      setError('Impossible de charger les absences');
      setToast({ type: 'error', message: 'Erreur de chargement' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...absences];
    if (filters.employe) {
      result = result.filter(a =>
        `${a.employe_nom} ${a.employe_prenom}`.toLowerCase().includes(filters.employe.toLowerCase())
      );
    }
    if (filters.dateDebut) {
      result = result.filter(a => new Date(a.date) >= new Date(filters.dateDebut));
    }
    if (filters.dateFin) {
      result = result.filter(a => new Date(a.date) <= new Date(filters.dateFin));
    }
    if (filters.justifiee !== '') {
      result = result.filter(a => a.justifiee === (filters.justifiee === 'true'));
    }
    setFiltered(result);
    setCurrentPage(1);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({ employe: '', dateDebut: '', dateFin: '', justifiee: '' });
  };

  // ✅ handleDelete avec gestion 403
  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Voulez-vous vraiment supprimer cette absence ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/absences/${id}`);
      setAbsences(absences.filter(a => a.id !== id));
      setToast({ type: 'success', message: 'Absence supprimée avec succès' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Erreur suppression :', err);
      if (err.response?.status === 403) {
        setToast({ type: 'error', message: '❌ Seul un administrateur peut supprimer une absence.' });
      } else {
        setToast({ type: 'error', message: 'Erreur lors de la suppression' });
      }
      setTimeout(() => setToast(null), 3000);
    }
  };

  const isAdmin = userRole === 'admin';

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>⏳ Chargement des absences...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>{error}</div>;

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          padding: '12px 24px',
          borderRadius: 8,
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 12 }}>
          <FaClipboardList style={{ color: '#60a5fa' }} /> Absences
        </h1>
        <Link
          to="/rh/absences/nouveau"
          style={{
            backgroundColor: '#60a5fa',
            color: 'white',
            padding: '10px 20px',
            borderRadius: 8,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <FaPlus /> Ajouter
        </Link>
      </div>

      {/* Filtres */}
      <div style={{
        backgroundColor: 'white',
        padding: '16px 20px',
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: 24,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'center'
      }}>
        <div style={{ flex: '1 1 180px' }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#4b5563', marginBottom: 4 }}>Employé</label>
          <input
            type="text"
            name="employe"
            value={filters.employe}
            onChange={handleFilterChange}
            placeholder="Nom ou prénom..."
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
          />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#4b5563', marginBottom: 4 }}>Du</label>
          <input
            type="date"
            name="dateDebut"
            value={filters.dateDebut}
            onChange={handleFilterChange}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
          />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#4b5563', marginBottom: 4 }}>Au</label>
          <input
            type="date"
            name="dateFin"
            value={filters.dateFin}
            onChange={handleFilterChange}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
          />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#4b5563', marginBottom: 4 }}>Justifiée</label>
          <select
            name="justifiee"
            value={filters.justifiee}
            onChange={handleFilterChange}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
          >
            <option value="">Toutes</option>
            <option value="true">✅ Justifiée</option>
            <option value="false">❌ Non justifiée</option>
          </select>
        </div>
        <button
          onClick={clearFilters}
          style={{
            backgroundColor: '#e5e7eb',
            color: '#374151',
            padding: '8px 16px',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 18
          }}
        >
          <FaTimes /> Réinitialiser
        </button>
        <div style={{ marginLeft: 'auto', fontSize: 14, color: '#6b7280' }}>
          {filtered.length} résultat(s)
        </div>
      </div>

      {/* Tableau */}
      <div style={{ backgroundColor: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {currentItems.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Aucune absence trouvée</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f1f5f9' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Employé</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Motif</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Justifiée</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: i === currentItems.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>{a.employe_nom} {a.employe_prenom}</td>
                  <td style={{ padding: '12px 16px' }}>{new Date(a.date).toLocaleDateString('fr-FR')}</td>
                  <td style={{ padding: '12px 16px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.motif || '-'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 13,
                      backgroundColor: a.justifiee ? '#d1fae5' : '#fee2e2',
                      color: a.justifiee ? '#065f46' : '#991b1b'
                    }}>
                      {a.justifiee ? '✅ Justifiée' : '❌ Non justifiée'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <Link to={`/rh/absences/${a.id}`} style={{ color: '#3b82f6', marginRight: 12 }}><FaEye /></Link>
                    {isAdmin ? (
                      <button onClick={() => handleDelete(a.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <FaTrash />
                      </button>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '14px' }} title="Réservé aux administrateurs">🔒</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '6px 14px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
              cursor: currentPage === 1 ? 'default' : 'pointer'
            }}
          >
            Préc.
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              style={{
                padding: '6px 14px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                backgroundColor: currentPage === i + 1 ? '#3b82f6' : 'white',
                color: currentPage === i + 1 ? 'white' : '#374151',
                cursor: 'pointer'
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
              borderRadius: 6,
              backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
              cursor: currentPage === totalPages ? 'default' : 'pointer'
            }}
          >
            Suiv.
          </button>
        </div>
      )}
    </div>
  );
};

export default AbsencesList;