// src/pages/reporting/RapportsList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { 
  FaSave, FaPlus, FaTrash, FaDownload, FaEye, FaEdit, 
  FaFilePdf, FaFileExcel, FaFileCsv, FaPrint, FaCopy,
  FaCalendarAlt, FaFilter, FaSearch, FaTimes, FaSpinner,
  FaChartPie, FaChartBar, FaTable
} from 'react-icons/fa';

const RapportsList = () => {
  const [rapports, setRapports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [toast, setToast] = useState(null);
  const [userRole, setUserRole] = useState(null);
  
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    type: 'dashboard',
    categorie: 'general',
    date_debut: '',
    date_fin: '',
    config: {
      indicateurs: [],
      periodes: 'mensuel',
      format: 'pdf'
    }
  });

  const [categories, setCategories] = useState([
    'general', 'finances', 'activite', 'personnel', 'stock', 'pharmacie'
  ]);

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
    fetchRapports();
  }, []);

  const fetchRapports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bi/rapports');
      setRapports(res.data || []);
    } catch (err) {
      console.error('Erreur chargement rapports:', err);
      // Données simulées pour l'exemple
      setRapports([
        {
          id: 1,
          nom: 'Activité mensuelle - Juin 2026',
          description: 'Rapport complet de l\'activité du mois de juin',
          type: 'dashboard',
          categorie: 'activite',
          date_creation: '2026-06-30T14:00:00Z',
          created_by_nom: 'Admin',
          config: { periodes: 'mensuel', indicateurs: ['consultations', 'admissions'] },
          statut: 'disponible'
        },
        {
          id: 2,
          nom: 'Bilan financier - 2ème trimestre',
          description: 'Analyse des revenus et dépenses du trimestre',
          type: 'graphique',
          categorie: 'finances',
          date_creation: '2026-06-28T09:30:00Z',
          created_by_nom: 'Leyi',
          config: { periodes: 'trimestriel', indicateurs: ['ca', 'impayes'] },
          statut: 'disponible'
        },
        {
          id: 3,
          nom: 'Taux d\'occupation des lits',
          description: 'Occupation par service et tendances',
          type: 'tableau',
          categorie: 'general',
          date_creation: '2026-06-25T11:00:00Z',
          created_by_nom: 'Dr. Mathurin',
          config: { periodes: 'hebdomadaire', indicateurs: ['lits'] },
          statut: 'en_cours'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nom.trim()) {
      setToast({ type: 'error', message: 'Le nom du rapport est obligatoire' });
      return;
    }
    
    try {
      let response;
      if (editingId) {
        response = await api.put(`/bi/rapports/${editingId}`, formData);
        setToast({ type: 'success', message: 'Rapport modifié avec succès' });
      } else {
        response = await api.post('/bi/rapports', {
          ...formData,
          created_by: 'user-id' // à remplacer par l'utilisateur réel
        });
        setToast({ type: 'success', message: 'Rapport créé avec succès' });
      }
      
      fetchRapports();
      resetForm();
    } catch (err) {
      console.error('Erreur sauvegarde rapport:', err);
      setToast({ type: 'error', message: 'Erreur lors de la sauvegarde' });
    }
  };

  // ✅ handleDelete avec gestion 403
  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Supprimer définitivement ce rapport ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/bi/rapports/${id}`);
      setRapports(rapports.filter(r => r.id !== id));
      setToast({ type: 'success', message: 'Rapport supprimé avec succès' });
    } catch (err) {
      console.error('Erreur suppression:', err);
      if (err.response?.status === 403) {
        setToast({ type: 'error', message: '❌ Seul un administrateur peut supprimer un rapport.' });
      } else {
        setToast({ type: 'error', message: 'Erreur lors de la suppression' });
      }
    }
  };

  const handleExport = async (rapportId, format = 'pdf') => {
    try {
      setToast({ type: 'info', message: `Génération du rapport en ${format.toUpperCase()}...` });
      const res = await api.post('/bi/export', { 
        rapport_id: rapportId, 
        format: format 
      }, {
        responseType: 'blob'
      });
      
      // Télécharger le fichier
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport_${rapportId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setToast({ type: 'success', message: 'Export téléchargé avec succès' });
    } catch (err) {
      console.error('Erreur export:', err);
      setToast({ type: 'error', message: 'Erreur lors de l\'export' });
    }
  };

  const handleEdit = (rapport) => {
    setEditingId(rapport.id);
    setFormData({
      nom: rapport.nom || '',
      description: rapport.description || '',
      type: rapport.type || 'dashboard',
      categorie: rapport.categorie || 'general',
      date_debut: rapport.date_debut || '',
      date_fin: rapport.date_fin || '',
      config: rapport.config || { indicateurs: [], periodes: 'mensuel', format: 'pdf' }
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      nom: '',
      description: '',
      type: 'dashboard',
      categorie: 'general',
      date_debut: '',
      date_fin: '',
      config: { indicateurs: [], periodes: 'mensuel', format: 'pdf' }
    });
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'dashboard': return <FaChartPie style={{ color: '#8b5cf6' }} />;
      case 'graphique': return <FaChartBar style={{ color: '#10b981' }} />;
      case 'tableau': return <FaTable style={{ color: '#3b82f6' }} />;
      default: return <FaSave style={{ color: '#6b7280' }} />;
    }
  };

  const getTypeLabel = (type) => {
    switch(type) {
      case 'dashboard': return 'Tableau de bord';
      case 'graphique': return 'Graphique';
      case 'tableau': return 'Tableau';
      default: return type;
    }
  };

  const getCategorieLabel = (categorie) => {
    const labels = {
      general: 'Général',
      finances: 'Finances',
      activite: 'Activité',
      personnel: 'Personnel',
      stock: 'Stock',
      pharmacie: 'Pharmacie'
    };
    return labels[categorie] || categorie;
  };

  const getStatutBadge = (statut) => {
    if (statut === 'disponible') {
      return <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '2px 10px', borderRadius: '20px', fontSize: '12px' }}>Disponible</span>;
    } else if (statut === 'en_cours') {
      return <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: '20px', fontSize: '12px' }}><FaSpinner className="spin" style={{ marginRight: '4px' }} /> En cours</span>;
    } else if (statut === 'erreur') {
      return <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 10px', borderRadius: '20px', fontSize: '12px' }}>Erreur</span>;
    }
    return <span style={{ backgroundColor: '#e5e7eb', color: '#374151', padding: '2px 10px', borderRadius: '20px', fontSize: '12px' }}>{statut}</span>;
  };

  const isAdmin = userRole === 'admin';

  // Filtrage des rapports
  const filteredRapports = rapports.filter(r => {
    const matchSearch = r.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || r.type === filterType;
    return matchSearch && matchType;
  });

  const formatDate = (date) => {
    if (!date) return '�FC�';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>⏳ Chargement des rapports...</div>;

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 24px',
          borderRadius: '8px',
          backgroundColor: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#f59e0b',
          color: 'white',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaSave style={{ color: '#8b5cf6' }} />
          Rapports sauvegardés
          <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'normal', marginLeft: '8px' }}>
            ({filteredRapports.length} rapports)
          </span>
        </h1>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          style={{
            backgroundColor: '#8b5cf6',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
        >
          <FaPlus /> {showForm ? 'Fermer le formulaire' : 'Nouveau rapport'}
        </button>
      </div>

      {/* Formulaire de création/modification */}
      {showForm && (
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>{editingId ? 'Modifier' : 'Nouveau'} rapport</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
              <FaTimes />
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Nom *</label>
              <input
                type="text"
                value={formData.nom}
                onChange={e => setFormData({ ...formData, nom: e.target.value })}
                required
                placeholder="Nom du rapport..."
                style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              >
                <option value="dashboard">Tableau de bord</option>
                <option value="graphique">Graphique</option>
                <option value="tableau">Tableau</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Catégorie</label>
              <select
                value={formData.categorie}
                onChange={e => setFormData({ ...formData, categorie: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              >
                {categories.map(c => (
                  <option key={c} value={c}>{getCategorieLabel(c)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Format d'export</label>
              <select
                value={formData.config?.format || 'pdf'}
                onChange={e => setFormData({ 
                  ...formData, 
                  config: { ...formData.config, format: e.target.value } 
                })}
                style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Période (début)</label>
              <input
                type="date"
                value={formData.date_debut}
                onChange={e => setFormData({ ...formData, date_debut: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Période (fin)</label>
              <input
                type="date"
                value={formData.date_fin}
                onChange={e => setFormData({ ...formData, date_fin: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows="2"
                placeholder="Description du rapport..."
                style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              />
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                style={{
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  padding: '8px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FaSave /> {editingId ? 'Modifier' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '8px 24px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
            </div>
          </form>
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
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Rechercher un rapport..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              outline: 'none'
            }}
          />
          <FaSearch style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8'
          }} />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <FaFilter style={{ color: '#64748b' }} />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: 'white'
            }}
          >
            <option value="all">Tous les types</option>
            <option value="dashboard">Tableaux de bord</option>
            <option value="graphique">Graphiques</option>
            <option value="tableau">Tableaux</option>
          </select>
        </div>
        <button
          onClick={fetchRapports}
          style={{
            padding: '8px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <FaSave /> Rafraîchir
        </button>
      </div>

      {/* Tableau des rapports */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {filteredRapports.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <FaSave style={{ fontSize: '48px', marginBottom: '12px' }} />
            <p>Aucun rapport trouvé. Créez votre premier rapport !</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f1f5f9' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Nom</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Catégorie</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Créé le</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Créé par</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Statut</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRapports.map((r, i) => (
                  <tr key={r.id} style={{
                    borderBottom: i === filteredRapports.length - 1 ? 'none' : '1px solid #f1f5f9',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: '500' }}>{r.nom}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {getTypeIcon(r.type)} {getTypeLabel(r.type)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{getCategorieLabel(r.categorie)}</td>
                    <td style={{ padding: '12px 16px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.description || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatDate(r.date_creation || r.created_at)}</td>
                    <td style={{ padding: '12px 16px' }}>{r.created_by_nom || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>{getStatutBadge(r.statut)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleExport(r.id, r.config?.format || 'pdf')}
                          title="Exporter en PDF"
                          style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <FaFilePdf />
                        </button>
                        <button
                          onClick={() => handleExport(r.id, 'excel')}
                          title="Exporter en Excel"
                          style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <FaFileExcel />
                        </button>
                        <button
                          onClick={() => handleExport(r.id, 'csv')}
                          title="Exporter en CSV"
                          style={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <FaFileCsv />
                        </button>
                        <button
                          onClick={() => handleEdit(r)}
                          title="Modifier"
                          style={{
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <FaEdit />
                        </button>
                        {isAdmin ? (
                          <button
                            onClick={() => handleDelete(r.id)}
                            title="Supprimer (admin)"
                            style={{
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            <FaTrash />
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '14px' }} title="Réservé aux administrateurs">🔒</span>
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

      {/* Styles pour les animations */}
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default RapportsList;
