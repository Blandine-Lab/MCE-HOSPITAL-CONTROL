// src/pages/laboratoire-imagerie/ExamensList.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';
import {
  FaPlus,
  FaEye,
  FaEdit,
  FaTrash,
  FaFilter,
  FaFlask,
  FaXRay,
  FaPrint,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaTimesCircle
} from 'react-icons/fa';

const ExamensList = ({ initialFilter = {} }) => {
  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const canManage = permissions.includes('manage_laboratory') || user?.role === 'laborantin';
  const canValidate = permissions.includes('validate_laboratory') || user?.role === 'biologiste';

  // ✅ Récupérer le rôle depuis le token JWT (pour la suppression définitive)
  const [userRole, setUserRole] = useState(null);
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

  const [examens, setExamens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [services, setServices] = useState([]);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sortField, setSortField] = useState('date_demande');
  const [sortOrder, setSortOrder] = useState('DESC');

  const [filters, setFilters] = useState({
    statut: 'tous',
    service_id: '',
    categorie: 'tous',
    priorite: initialFilter.priorite || 'tous',
    search: '',
    date_debut: '',
    date_fin: '',
    ...initialFilter
  });

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    api.get('/services')
      .then(res => setServices(res.data))
      .catch(err => console.error('Erreur services', err));
  }, []);

  useEffect(() => {
    const fetchExamens = async () => {
      setLoading(true);
      try {
        const params = {
          page,
          limit,
          sort: sortField,
          order: sortOrder,
          ...(filters.statut !== 'tous' && { statut: filters.statut }),
          ...(filters.service_id && { service_id: filters.service_id }),
          ...(filters.categorie !== 'tous' && { categorie: filters.categorie }),
          ...(filters.priorite !== 'tous' && { priorite: filters.priorite }),
          ...(filters.search && { search: filters.search }),
          ...(filters.date_debut && { date_debut: filters.date_debut }),
          ...(filters.date_fin && { date_fin: filters.date_fin })
        };
        const res = await api.get('/examens', { params });
        setExamens(res.data.rows || res.data);
        setTotal(res.data.total || res.data.length);
      } catch (err) {
        console.error('Erreur chargement examens', err);
        showToast('Erreur chargement examens', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchExamens();
  }, [page, limit, sortField, sortOrder, filters]);

  const stats = useMemo(() => {
    const totalCount = total;
    const demandes = examens.filter(e => e.statut === 'demandé').length;
    const encours = examens.filter(e => e.statut === 'en_cours').length;
    const termines = examens.filter(e => e.statut === 'terminé' || e.statut === 'valide').length;
    const valides = examens.filter(e => e.statut === 'valide').length;
    return { totalCount, demandes, encours, termines, valides };
  }, [examens, total]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortOrder('ASC');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  // ✅ Annulation (soft delete) – accessible à canManage
  const handleAnnuler = async (id) => {
    if (!window.confirm('Confirmer l\'annulation de cet examen ?')) return;
    try {
      await api.put(`/examens/${id}/annuler`);
      setPage(1);
      showToast('Examen annulé');
    } catch (err) {
      console.error('Erreur annulation', err);
      showToast('Erreur lors de l\'annulation', 'error');
    }
  };

  // ✅ Suppression définitive (hard delete) – réservée aux administrateurs
  const handleDeleteDefinitive = async (id) => {
    if (!window.confirm('⚠️ Supprimer définitivement cet examen ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/examens/${id}`);
      setExamens(examens.filter(e => e.id !== id));
      setTotal(total - 1);
      showToast('Examen supprimé définitivement');
    } catch (err) {
      console.error('Erreur suppression définitive:', err);
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut supprimer définitivement un examen.', 'error');
      } else {
        showToast('❌ Erreur lors de la suppression : ' + (err.response?.data?.error || err.message), 'error');
      }
    }
  };

  const handleImprimer = (id) => {
    window.open(`/api/examens/${id}/pdf`, '_blank');
  };

  const getStatusBadge = (statut) => {
    const configs = {
      'demandé': { bg: '#dbeafe', color: '#1e40af', icon: <FaClock />, label: 'Demandé' },
      'en_cours': { bg: '#fef3c7', color: '#92400e', icon: <FaClock />, label: 'En cours' },
      'terminé': { bg: '#d1fae5', color: '#065f46', icon: <FaCheckCircle />, label: 'Terminé' },
      'valide': { bg: '#ede9fe', color: '#5b21b6', icon: <FaCheckCircle />, label: 'Validé' },
      'annulé': { bg: '#fee2e2', color: '#991b1b', icon: <FaTimesCircle />, label: 'Annulé' },
    };
    const config = configs[statut] || configs['demandé'];
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '500',
        backgroundColor: config.bg,
        color: config.color,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        {config.icon} {config.label}
      </span>
    );
  };

  const isAdmin = userRole === 'admin';

  if (loading && examens.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '24px' }}>⏳ Chargement des examens...</div>
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
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaFlask style={{ color: '#f472b6' }} /> Examens
        </h1>
        {canManage && (
          <Link
            to="/laboratoire/examen/nouveau"
            style={{
              backgroundColor: '#f472b6',
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
            <FaPlus /> Nouvel examen
          </Link>
        )}
      </div>

      {/* Statistiques */}
      <div style={{
        display: 'flex',
        gap: '24px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        backgroundColor: 'white',
        padding: '16px 20px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <span><strong>Total :</strong> {stats.totalCount}</span>
        <span style={{ color: '#2563eb' }}>📋 Demandés : {stats.demandes}</span>
        <span style={{ color: '#d97706' }}>⏳ En cours : {stats.encours}</span>
        <span style={{ color: '#059669' }}>✅ Terminés/Validés : {stats.termines}</span>
        {canValidate && <span style={{ color: '#8b5cf6' }}>✓ Validés : {stats.valides}</span>}
      </div>

      {/* Filtres */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '24px',
        backgroundColor: 'white',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        alignItems: 'center'
      }}>
        <FaFilter style={{ color: '#64748b', marginRight: '4px' }} />
        <input
          type="text"
          placeholder="Rechercher (patient, type...)"
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', flex: '1 1 200px' }}
        />
        <select
          value={filters.statut}
          onChange={(e) => handleFilterChange('statut', e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
        >
          <option value="tous">Tous statuts</option>
          <option value="demandé">Demandé</option>
          <option value="en_cours">En cours</option>
          <option value="terminé">Terminé</option>
          <option value="valide">Validé</option>
          <option value="annulé">Annulé</option>
        </select>
        <select
          value={filters.categorie}
          onChange={(e) => handleFilterChange('categorie', e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
        >
          <option value="tous">Toutes catégories</option>
          <option value="laboratoire">Laboratoire</option>
          <option value="imagerie">Imagerie</option>
        </select>
        <select
          value={filters.priorite}
          onChange={(e) => handleFilterChange('priorite', e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
        >
          <option value="tous">Toutes priorités</option>
          <option value="normal">Normal</option>
          <option value="urgent">Urgent</option>
        </select>
        <select
          value={filters.service_id}
          onChange={(e) => handleFilterChange('service_id', e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
        >
          <option value="">Tous services</option>
          {services.map(s => (
            <option key={s.id} value={s.id}>{s.nom}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.date_debut}
          onChange={(e) => handleFilterChange('date_debut', e.target.value)}
          style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
        />
        <span style={{ color: '#94a3b8' }}>à</span>
        <input
          type="date"
          value={filters.date_fin}
          onChange={(e) => handleFilterChange('date_fin', e.target.value)}
          style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
        />
        <button
          onClick={() => setFilters({ statut: 'tous', service_id: '', categorie: 'tous', priorite: 'tous', search: '', date_debut: '', date_fin: '' })}
          style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Réinitialiser
        </button>
      </div>

      {/* Tableau */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#475569', cursor: 'pointer' }} onClick={() => handleSort('patient_nom')}>
                Patient {sortField === 'patient_nom' && (sortOrder === 'ASC' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#475569', cursor: 'pointer' }} onClick={() => handleSort('type_examen')}>
                Examen {sortField === 'type_examen' && (sortOrder === 'ASC' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Catégorie</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#475569', cursor: 'pointer' }} onClick={() => handleSort('priorite')}>
                Priorité {sortField === 'priorite' && (sortOrder === 'ASC' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Service</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Médecin</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#475569', cursor: 'pointer' }} onClick={() => handleSort('date_demande')}>
                Date demande {sortField === 'date_demande' && (sortOrder === 'ASC' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#475569', cursor: 'pointer' }} onClick={() => handleSort('date_prevue')}>
                Date prévue {sortField === 'date_prevue' && (sortOrder === 'ASC' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#475569', cursor: 'pointer' }} onClick={() => handleSort('statut')}>
                Statut {sortField === 'statut' && (sortOrder === 'ASC' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {examens.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Aucun examen trouvé
                </td>
              </tr>
            ) : (
              examens.map((e, index) => (
                <tr
                  key={e.id}
                  style={{
                    borderBottom: index === examens.length - 1 ? 'none' : '1px solid #f1f5f9',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={el => el.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={el => el.currentTarget.style.backgroundColor = 'white'}
                >
                  <td style={{ padding: '12px 16px', fontWeight: '500', color: '#0f172a' }}>
                    {e.patient_prenom} {e.patient_nom}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#334155' }}>{e.type_examen}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>
                    {e.categorie === 'laboratoire' ? <FaFlask style={{ color: '#8b5cf6', marginRight: '4px' }} /> : <FaXRay style={{ color: '#3b82f6', marginRight: '4px' }} />}
                    {e.categorie === 'laboratoire' ? 'Labo' : 'Imagerie'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {e.priorite === 'urgent' ? (
                      <span style={{ color: '#dc2626', fontWeight: 'bold' }}>🔴 Urgent</span>
                    ) : (
                      <span style={{ color: '#64748b' }}>⚪ Normal</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{e.service_nom || '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{e.medecin_prescripteur || '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>
                    {new Date(e.date_demande).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>
                    {e.date_prevue ? new Date(e.date_prevue).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(e.statut)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <Link
                        to={`/laboratoire/examen/${e.id}`}
                        style={{ color: '#3b82f6', textDecoration: 'none' }}
                        title="Voir"
                      >
                        <FaEye />
                      </Link>
                      {canManage && (e.statut === 'demandé' || e.statut === 'en_cours' || e.statut === 'terminé') && (
                        <Link
                          to={`/laboratoire/resultats/${e.id}`}
                          style={{ color: '#8b5cf6', textDecoration: 'none' }}
                          title="Saisir résultats"
                        >
                          <FaEdit />
                        </Link>
                      )}
                      {/* ✅ Bouton Annuler (soft delete) – accessible à canManage */}
                      {e.statut !== 'annulé' && e.statut !== 'valide' && canManage && (
                        <button
                          onClick={() => handleAnnuler(e.id)}
                          style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer' }}
                          title="Annuler l'examen"
                        >
                          <FaTimesCircle />
                        </button>
                      )}
                      {/* ✅ Bouton Supprimer définitivement (hard delete) – réservé aux administrateurs */}
                      {isAdmin && e.statut !== 'valide' && (
                        <button
                          onClick={() => handleDeleteDefinitive(e.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          title="Supprimer définitivement (admin)"
                        >
                          <FaTrash />
                        </button>
                      )}
                      {e.statut === 'valide' && (
                        <button
                          onClick={() => handleImprimer(e.id)}
                          style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }}
                          title="Imprimer PDF"
                        >
                          <FaPrint />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <span style={{ color: '#64748b', fontSize: '14px' }}>
          Affichage de {examens.length} sur {total} examens
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '6px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.5 : 1
            }}
          >
            Précédent
          </button>
          <span style={{ padding: '6px 14px', backgroundColor: '#f472b6', color: 'white', borderRadius: '6px' }}>
            {page}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={examens.length < limit}
            style={{
              padding: '6px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: examens.length < limit ? 'not-allowed' : 'pointer',
              opacity: examens.length < limit ? 0.5 : 1
            }}
          >
            Suivant
          </button>
        </div>
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

export default ExamensList;