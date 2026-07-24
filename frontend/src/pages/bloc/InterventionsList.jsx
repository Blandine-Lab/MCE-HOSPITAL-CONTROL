import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaPlus, FaEdit, FaTrash, FaFilter } from 'react-icons/fa';

const InterventionsList = () => {
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState({ statut: '', date_debut: '', date_fin: '' });
  const [updatingId, setUpdatingId] = useState(null);
  const [userRole, setUserRole] = useState(null); // ✅ Rôle de l'utilisateur

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

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Date invalide';
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const loadInterventions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.statut) params.append('statut', filters.statut);
      if (filters.date_debut) params.append('date_debut', filters.date_debut);
      if (filters.date_fin) params.append('date_fin', filters.date_fin);
      const res = await api.get(`/bloc/interventions?${params.toString()}`);
      setInterventions(res.data || []);
      setLoaded(true);
    } catch (err) {
      setToast('Erreur chargement interventions');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInterventions();
  }, [filters]);

  // ✅ handleDelete avec gestion 403
  const handleDelete = async (id) => {
    if (window.confirm('⚠️ Confirmer l’annulation de cette intervention ? Cette action est irréversible.')) {
      try {
        await api.delete(`/bloc/interventions/${id}`);
        setToast('Intervention annulée');
        setTimeout(() => setToast(null), 3000);
        loadInterventions();
      } catch (err) {
        if (err.response?.status === 403) {
          setToast('❌ Seul un administrateur peut annuler/supprimer une intervention.');
        } else {
          setToast('Erreur lors de l’annulation');
        }
        setTimeout(() => setToast(null), 3000);
      }
    }
  };

  const handleStatusChange = async (id, newStatut) => {
    setUpdatingId(id);
    try {
      await api.put(`/bloc/interventions/${id}`, { statut: newStatut });
      setToast(`Statut mis à jour : ${getStatusLabel(newStatut)}`);
      setTimeout(() => setToast(null), 3000);
      loadInterventions();
    } catch (err) {
      setToast('Erreur lors de la mise à jour du statut');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (statut) => {
    const colors = {
      planifiee: '#3b82f6',
      en_cours: '#f59e0b',
      terminee: '#10b981',
      annulee: '#ef4444'
    };
    return colors[statut] || '#64748b';
  };

  const getStatusLabel = (statut) => {
    const labels = {
      planifiee: 'Planifiée',
      en_cours: 'En cours',
      terminee: 'Terminée',
      annulee: 'Annulée'
    };
    return labels[statut] || statut;
  };

  const getPriorityColor = (priorite) => {
    const colors = {
      urgente: '#ef4444',
      normale: '#3b82f6',
      elective: '#10b981'
    };
    return colors[priorite] || '#6b7280';
  };

  const isAdmin = userRole === 'admin';

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    opacity: loaded ? 1 : 0,
    transform: loaded ? 'translateY(0)' : 'translateY(20px)',
    transition: 'all 0.5s 0.2s',
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
      <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #2563eb', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
    </div>
  );

  return (
    <div style={cardStyle}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px',
          backgroundColor: toast.includes('Erreur') || toast.includes('❌') ? '#ef4444' : '#10b981',
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: 0 }}>📋 Interventions chirurgicales</h2>
        <Link to="/bloc/interventions/nouveau" style={{ backgroundColor: '#2563eb', color: 'white', padding: '8px 20px', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500', border: 'none', cursor: 'pointer' }}>
          <FaPlus /> Nouvelle intervention
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', alignItems: 'center' }}>
        <FaFilter style={{ color: '#6b7280' }} />
        <select value={filters.statut} onChange={(e) => setFilters({...filters, statut: e.target.value})} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white' }}>
          <option value="">Tous statuts</option>
          <option value="planifiee">Planifiée</option>
          <option value="en_cours">En cours</option>
          <option value="terminee">Terminée</option>
          <option value="annulee">Annulée</option>
        </select>
        <input
          type="date"
          value={filters.date_debut || ''}
          onChange={(e) => setFilters({...filters, date_debut: e.target.value})}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
        />
        <input
          type="date"
          value={filters.date_fin || ''}
          onChange={(e) => setFilters({...filters, date_fin: e.target.value})}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
        />
        <button onClick={() => setFilters({ statut: '', date_debut: '', date_fin: '' })} style={{ padding: '6px 16px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>
          Réinitialiser
        </button>
      </div>

      {interventions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <p>Aucune intervention trouvée pour ces critères.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ backgroundColor: '#f1f5f9' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Patient</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Type</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Salle</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Date / Heure</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Chirurgien</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Priorité</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Statut</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {interventions.map(inter => (
                <tr key={inter.id} style={{ borderBottom: '1px solid #f3f4f6' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '12px' }}><strong>{inter.patient_nom} {inter.patient_prenom}</strong></td>
                  <td style={{ padding: '12px' }}>{inter.type_intervention}</td>
                  <td style={{ padding: '12px' }}>{inter.salle_nom}</td>
                  <td style={{ padding: '12px' }}>{formatDate(inter.date_prevue)}</td>
                  <td style={{ padding: '12px' }}>{inter.chirurgien_nom}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ backgroundColor: getPriorityColor(inter.priorite), color: 'white', padding: '2px 12px', borderRadius: '12px', fontSize: '12px' }}>
                      {inter.priorite}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ backgroundColor: getStatusColor(inter.statut), color: 'white', padding: '2px 12px', borderRadius: '12px', fontSize: '12px' }}>
                      {getStatusLabel(inter.statut)}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <select
                      value={inter.statut}
                      onChange={(e) => handleStatusChange(inter.id, e.target.value)}
                      disabled={updatingId === inter.id}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        backgroundColor: 'white',
                        fontSize: '12px',
                        cursor: 'pointer',
                        marginRight: '8px'
                      }}
                    >
                      <option value="planifiee">Planifiée</option>
                      <option value="en_cours">En cours</option>
                      <option value="terminee">Terminée</option>
                      <option value="annulee">Annulée</option>
                    </select>
                    <Link to={`/bloc/interventions/${inter.id}/edit`}>
                      <FaEdit style={{ color: '#2563eb', marginRight: '12px', cursor: 'pointer' }} />
                    </Link>
                    {/* ✅ Bouton supprimer visible uniquement pour admin */}
                    {isAdmin ? (
                      <FaTrash style={{ color: '#ef4444', cursor: 'pointer' }} onClick={() => handleDelete(inter.id)} />
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '14px' }} title="Réservé aux administrateurs">🔒</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default InterventionsList;