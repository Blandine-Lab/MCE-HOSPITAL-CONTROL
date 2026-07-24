// src/pages/reporting/ExportsList.jsx
import { useState, useEffect } from 'react';
import api from '../../axios';
import { 
  FaFileExport, FaFilePdf, FaFileCsv, FaFileExcel, 
  FaDownload, FaTrash, FaSpinner, FaCheckCircle,
  FaSync, FaCalendarAlt, FaFilter, FaTimes
} from 'react-icons/fa';

const ExportsList = () => {
  // États pour la liste des exports
  const [exports, setExports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // États pour le formulaire d'export
  const [showForm, setShowForm] = useState(false);
  const [exportType, setExportType] = useState('factures');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  // États pour les données disponibles (filtres dynamiques)
  const [services, setServices] = useState([]);
  const [statutsFacture, setStatutsFacture] = useState(['payee', 'impayee', 'partielle']);

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
    fetchExports();
    // Charger les options de filtrage
    api.get('/services').then(res => setServices(res.data)).catch(() => {});
  }, []);

  const fetchExports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bi/exports');
      setExports(res.data || []);
    } catch (err) {
      console.error('Erreur chargement exports:', err);
      // Données simulées pour l'exemple
      setExports([
        { 
          id: 1, 
          nom_fichier: 'factures_2026-06-21.pdf', 
          format: 'pdf', 
          taille: 1048576, 
          created_at: '2026-06-21T10:00:00Z', 
          statut: 'termine',
          type: 'factures',
          filtre: 'Toutes'
        },
        { 
          id: 2, 
          nom_fichier: 'patients_2026-06-20.csv', 
          format: 'csv', 
          taille: 524288, 
          created_at: '2026-06-20T14:30:00Z', 
          statut: 'termine',
          type: 'patients',
          filtre: 'Actifs'
        },
        { 
          id: 3, 
          nom_fichier: 'prescriptions_2026-06-19.xlsx', 
          format: 'excel', 
          taille: 2097152, 
          created_at: '2026-06-19T08:15:00Z', 
          statut: 'termine',
          type: 'prescriptions',
          filtre: 'Ce mois'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateExport = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setToast(null);

    try {
      const payload = {
        type: exportType,
        format: exportFormat,
        date_debut: dateDebut || undefined,
        date_fin: dateFin || undefined,
        filters: filters
      };

      const res = await api.post('/bi/exports', payload);
      
      // Ajouter le nouvel export à la liste
      const newExport = {
        id: res.data.id || Date.now(),
        nom_fichier: res.data.nom_fichier || `${exportType}_${new Date().toISOString().split('T')[0]}.${exportFormat}`,
        format: exportFormat,
        taille: 0,
        created_at: new Date().toISOString(),
        statut: 'en_cours',
        type: exportType,
        filtre: dateDebut ? `${dateDebut} → ${dateFin || 'auj.'}` : 'Toutes'
      };
      setExports([newExport, ...exports]);
      
      setToast({ type: 'success', message: 'Export généré avec succès !' });
      setShowForm(false);
      
      // Simuler la fin de l'export (pour l'exemple)
      setTimeout(() => {
        setExports(prev => prev.map(e => 
          e.id === newExport.id ? { ...e, statut: 'termine', taille: Math.floor(Math.random() * 2000000) + 500000 } : e
        ));
      }, 3000);
      
    } catch (err) {
      console.error('Erreur génération export:', err);
      setToast({ type: 'error', message: 'Erreur lors de la génération de l\'export' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (id, nomFichier) => {
    try {
      const response = await api.get(`/bi/exports/${id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nomFichier);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur téléchargement:', err);
      setToast({ type: 'error', message: 'Erreur lors du téléchargement' });
    }
  };

  // ✅ handleDeleteExport avec gestion 403
  const handleDeleteExport = async (id) => {
    if (!window.confirm('Supprimer cet export ?')) return;
    try {
      await api.delete(`/bi/exports/${id}`);
      setExports(prev => prev.filter(e => e.id !== id));
      setToast({ type: 'success', message: 'Export supprimé' });
    } catch (err) {
      console.error('Erreur suppression:', err);
      if (err.response?.status === 403) {
        setToast({ type: 'error', message: '❌ Seul un administrateur peut supprimer un export.' });
      } else {
        setToast({ type: 'error', message: 'Erreur lors de la suppression' });
      }
    }
  };

  const formatTaille = (octets) => {
    if (!octets) return '—';
    if (octets < 1024) return `${octets} o`;
    if (octets < 1048576) return `${(octets / 1024).toFixed(1)} Ko`;
    return `${(octets / 1048576).toFixed(1)} Mo`;
  };

  const getFormatIcon = (format) => {
    switch(format) {
      case 'pdf': return <FaFilePdf style={{ color: '#ef4444' }} />;
      case 'csv': return <FaFileCsv style={{ color: '#10b981' }} />;
      case 'excel': return <FaFileExcel style={{ color: '#3b82f6' }} />;
      default: return <FaFileExport style={{ color: '#6b7280' }} />;
    }
  };

  const getStatutBadge = (statut) => {
    if (statut === 'termine') {
      return <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '2px 10px', borderRadius: '20px', fontSize: '12px' }}><FaCheckCircle style={{ marginRight: '4px' }} /> Terminé</span>;
    } else if (statut === 'en_cours') {
      return <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: '20px', fontSize: '12px' }}><FaSpinner className="spin" style={{ marginRight: '4px' }} /> En cours</span>;
    } else if (statut === 'erreur') {
      return <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 10px', borderRadius: '20px', fontSize: '12px' }}>Erreur</span>;
    }
    return <span style={{ backgroundColor: '#e5e7eb', color: '#374151', padding: '2px 10px', borderRadius: '20px', fontSize: '12px' }}>{statut}</span>;
  };

  const isAdmin = userRole === 'admin';

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>⏳ Chargement des exports...</div>;

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
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaFileExport style={{ color: '#8b5cf6' }} />
          Exports
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={fetchExports}
            style={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FaSync /> Rafraîchir
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              backgroundColor: '#8b5cf6',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FaFileExport /> Nouvel export
          </button>
        </div>
      </div>

      {/* Formulaire de génération d'export */}
      {showForm && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Générer un export</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}><FaTimes /></button>
          </div>
          <form onSubmit={handleGenerateExport}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Type de données *</label>
                <select value={exportType} onChange={e => setExportType(e.target.value)} required style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <option value="factures">Factures</option>
                  <option value="patients">Patients</option>
                  <option value="prescriptions">Prescriptions</option>
                  <option value="consultations">Consultations</option>
                  <option value="stocks">Stocks</option>
                  <option value="employes">Employés</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Format *</label>
                <select value={exportFormat} onChange={e => setExportFormat(e.target.value)} required style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                  <option value="excel">Excel (.xlsx)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Période</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                  <span>→</span>
                  <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                </div>
              </div>
            </div>

            {/* Filtres avancés */}
            <div style={{ marginBottom: '16px' }}>
              <button type="button" onClick={() => setShowFilters(!showFilters)} style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaFilter /> {showFilters ? 'Masquer' : 'Afficher'} les filtres avancés
              </button>
              {showFilters && (
                <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  {exportType === 'factures' && (
                    <div>
                      <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Statut</label>
                      <select value={filters.statut || ''} onChange={e => setFilters({ ...filters, statut: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                        <option value="">Tous</option>
                        <option value="payee">Payée</option>
                        <option value="impayee">Impayée</option>
                        <option value="partielle">Partielle</option>
                      </select>
                    </div>
                  )}
                  {exportType === 'patients' && (
                    <div>
                      <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Statut patient</label>
                      <select value={filters.statut_patient || ''} onChange={e => setFilters({ ...filters, statut_patient: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                        <option value="">Tous</option>
                        <option value="hospitalise">Hospitalisé</option>
                        <option value="sorti">Sorti</option>
                        <option value="ambulatoire">Ambulatoire</option>
                      </select>
                    </div>
                  )}
                  {exportType === 'prescriptions' && (
                    <div>
                      <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Statut prescription</label>
                      <select value={filters.statut_prescription || ''} onChange={e => setFilters({ ...filters, statut_prescription: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                        <option value="">Tous</option>
                        <option value="pending">En attente</option>
                        <option value="served">Servie</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={generating}
                style={{
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: generating ? 0.6 : 1
                }}
              >
                {generating ? <FaSpinner className="spin" /> : <FaFileExport />}
                {generating ? 'Génération...' : 'Générer l\'export'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ backgroundColor: '#e5e7eb', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer' }}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des exports */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {exports.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <FaFileExport style={{ fontSize: '48px', marginBottom: '12px' }} />
            <p>Aucun export trouvé. Générez votre premier export !</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f1f5f9' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Fichier</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Format</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Taille</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Statut</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exports.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: i === exports.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontWeight: '500' }}>{e.nom_fichier}</span>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{e.filtre || 'Toutes'}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {getFormatIcon(e.format)} {e.format?.toUpperCase()}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{formatTaille(e.taille)}</td>
                  <td style={{ padding: '12px 16px' }}>{new Date(e.created_at).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}>{e.type || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>{getStatutBadge(e.statut)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleDownload(e.id, e.nom_fichier)}
                      disabled={e.statut !== 'termine'}
                      style={{
                        backgroundColor: e.statut === 'termine' ? '#3b82f6' : '#e5e7eb',
                        color: e.statut === 'termine' ? 'white' : '#94a3b8',
                        border: 'none',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        cursor: e.statut === 'termine' ? 'pointer' : 'default',
                        marginRight: '8px'
                      }}
                      title={e.statut === 'termine' ? 'Télécharger' : 'Export en cours'}
                    >
                      <FaDownload />
                    </button>
                    {isAdmin ? (
                      <button
                        onClick={() => handleDeleteExport(e.id)}
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#ef4444',
                          border: 'none',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <FaTrash />
                      </button>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '14px', marginLeft: '4px' }} title="Réservé aux administrateurs">🔒</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ExportsList;