// src/pages/rh-planning/AbsencesList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaClipboardList, FaPlus, FaEye, FaTrash, FaTimes, FaPrint } from 'react-icons/fa';

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

  // Récupérer le rôle depuis le token JWT
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
      console.error('Erreur chargement des absences :', err);
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
        `${a.employe_nom || ''} ${a.employe_prenom || ''}`.toLowerCase().includes(filters.employe.toLowerCase()) ||
        `${a.nom || ''} ${a.prenom || ''}`.toLowerCase().includes(filters.employe.toLowerCase())
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

  // handleDelete avec gestion 403
  const handleDelete = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette absence ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/absences/${id}`);
      setAbsences(absences.filter(a => a.id !== id));
      setToast({ type: 'success', message: 'Absence supprimée avec succès' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Erreur suppression :', err);
      if (err.response?.status === 403) {
        setToast({ type: 'error', message: 'Seul un administrateur peut supprimer une absence.' });
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

  // Impression globale
  const handlePrintAll = () => {
    window.print();
  };

  // Impression d'une absence individuelle avec logo
  const printOneAbsence = (a) => {
    const printWindow = window.open('', '_blank', 'width=700,height=900');
    const statusLabel = a.statut === 'approuvée' ? 'Approuvée' : a.statut === 'refusée' ? 'Refusée' : 'En attente';
    const statusColor = a.statut === 'approuvée' ? '#10b981' : a.statut === 'refusée' ? '#ef4444' : '#f59e0b';
    const justifieLabel = a.justifiee ? 'Oui' : 'Non';
    const nomEmploye = a.employe_nom && a.employe_prenom ? `${a.employe_nom} ${a.employe_prenom}` :
                        (a.nom && a.prenom ? `${a.nom} ${a.prenom}` : 'Employé inconnu');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Absence</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 700px; margin: auto; }
          .header { text-align: center; margin-bottom: 30px; }
          .header img { max-height: 80px; margin-bottom: 10px; }
          .header h1 { color: #1e3a8a; margin: 0; font-size: 24px; }
          .header p { color: #4b5563; margin: 0; }
          .detail { margin-bottom: 12px; }
          .label { font-weight: bold; display: inline-block; width: 150px; }
          .value { display: inline-block; }
          .status { padding: 4px 12px; border-radius: 20px; font-weight: bold; color: white; background-color: ${statusColor}; display: inline-block; }
          .signature-section { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 30px; }
          .signature-block { display: inline-block; width: 45%; margin: 0 2%; }
          .signature-line { border-bottom: 1px solid #000; width: 80%; margin: 30px auto 10px auto; }
          .signature-label { text-align: center; font-size: 14px; color: #4b5563; }
          .footer { margin-top: 50px; font-size: 12px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/logo.jpeg" alt="Logo MCE" />
          <h1>Medical Center Elizabeth MCE</h1>
          <p><em>Absence - Document officiel</em></p>
        </div>
        <div class="detail"><span class="label">Employé :</span><span class="value">${nomEmploye}</span></div>
        <div class="detail"><span class="label">Date :</span><span class="value">${new Date(a.date).toLocaleDateString('fr-FR')}</span></div>
        <div class="detail"><span class="label">Type :</span><span class="value">${a.type || '-'}</span></div>
        <div class="detail"><span class="label">Motif :</span><span class="value">${a.motif || '-'}</span></div>
        <div class="detail"><span class="label">Justifiée :</span><span class="value">${justifieLabel}</span></div>
        <div class="detail"><span class="label">Statut :</span><span class="status">${statusLabel}</span></div>

        <div class="signature-section">
          <div style="text-align: center; margin-bottom: 20px; font-weight: bold; font-size: 16px;">Signatures</div>
          <div style="display: flex; justify-content: space-around; flex-wrap: wrap;">
            <div class="signature-block">
              <p style="text-align: center; font-weight: bold;">Employé</p>
              <div class="signature-line"></div>
              <div class="signature-label">Signature</div>
              <div style="margin-top: 10px; display: flex; justify-content: space-between;">
                <span>Nom : _________________________</span>
                <span>Date : ___/___/______</span>
              </div>
            </div>
            <div class="signature-block">
              <p style="text-align: center; font-weight: bold;">Responsable RH</p>
              <div class="signature-line"></div>
              <div class="signature-label">Signature</div>
              <div style="margin-top: 10px; display: flex; justify-content: space-between;">
                <span>Nom : _________________________</span>
                <span>Date : ___/___/______</span>
              </div>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; font-size: 13px; color: #4b5563;">
            <p><em>Lu et approuvé,</em></p>
            <p>Fait à ______________, le ___/___/______</p>
          </div>
        </div>

        <div class="footer">Document imprimé le ${new Date().toLocaleString('fr-FR')} - ${window.location.origin}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>Chargement des absences...</div>;
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h1 style={{ fontSize: 28, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 12 }}>
          <FaClipboardList style={{ color: '#60a5fa' }} /> Absences
        </h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handlePrintAll}
            style={{
              backgroundColor: '#6b7280',
              color: 'white',
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <FaPrint /> Imprimer tout
          </button>
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
            <option value="true">Justifiée</option>
            <option value="false">Non justifiée</option>
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
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Motif</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Justifiée</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: i === currentItems.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    {a.employe_nom && a.employe_prenom ? `${a.employe_nom} ${a.employe_prenom}` :
                      (a.nom && a.prenom ? `${a.nom} ${a.prenom}` : '—')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{new Date(a.date).toLocaleDateString('fr-FR')}</td>
                  <td style={{ padding: '12px 16px' }}>{a.type || '-'}</td>
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
                    <Link to={`/rh/absences/${a.id}`} style={{ color: '#3b82f6', marginRight: 8 }}><FaEye /></Link>
                    {isAdmin && (
                      <button onClick={() => handleDelete(a.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginRight: 8 }}>
                        <FaTrash />
                      </button>
                    )}
                    <button
                      onClick={() => printOneAbsence(a)}
                      style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer' }}
                      title="Imprimer cette absence"
                    >
                      <FaPrint />
                    </button>
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

      {/* Styles pour l'impression de tout le tableau */}
      <style>{`
        @media print {
          button, .no-print, input, select, .toast, .modal {
            display: none !important;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 1cm !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #ccc !important;
            padding: 8px !important;
            text-align: left !important;
          }
          thead {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .statut-badge {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Cacher la colonne Actions */
          th:last-child, td:last-child {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AbsencesList;