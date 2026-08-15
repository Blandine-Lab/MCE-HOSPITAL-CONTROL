import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { 
  FaSearch, FaEdit, FaTrash, FaEye, FaHospitalUser,
  FaDownload, FaPlusCircle, FaFileExcel, FaPrint,
  FaCalendarDay, FaCalendarWeek, FaCalendarAlt,
  FaSort, FaSortUp, FaSortDown
} from 'react-icons/fa';
import api from '../../axios';

const PatientsList = () => {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('nom');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [userRole, setUserRole] = useState(null);

  const itemsPerPage = 10; // ← AJOUTÉ

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
    console.log('PatientsList monté - appel API');
    api.get('/patients')
      .then(res => {
        setPatients(res.data);
        setFilteredPatients(res.data);
        setLoading(false);
        setLoaded(true);
      })
      .catch(err => {
        console.error('Erreur chargement patients:', err);
        setLoading(false);
        setLoaded(true);
      });
  }, []);

  // Statistiques admissions
  const today = new Date(); today.setHours(0,0,0,0);
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate()-7);
  const monthAgo = new Date(today); monthAgo.setMonth(today.getMonth()-1);

  const admissionsToday = patients.filter(p => p.date_admission && new Date(p.date_admission).setHours(0,0,0,0) === today.getTime()).length;
  const admissionsWeek = patients.filter(p => p.date_admission && new Date(p.date_admission) >= weekAgo).length;
  const admissionsMonth = patients.filter(p => p.date_admission && new Date(p.date_admission) >= monthAgo).length;

  useEffect(() => {
    let data = patients.filter(p =>
      p.nom?.toLowerCase().includes(search.toLowerCase()) ||
      p.prenom?.toLowerCase().includes(search.toLowerCase()) ||
      p.ipp?.toLowerCase().includes(search.toLowerCase())
    );
    data.sort((a,b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    setFilteredPatients(data);
    setCurrentPage(1);
  }, [search, sortField, sortOrder, patients]);

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const start = (currentPage-1)*itemsPerPage;
  const paginated = filteredPatients.slice(start, start+itemsPerPage);

  const showToast = (msg, type='success') => {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  const exportToExcel = () => {
    try {
      const excelData = filteredPatients.map(p => ({
        'IPP': p.ipp || '',
        'Nom': p.nom || '',
        'Prénom': p.prenom || '',
        'Téléphone': p.telephone || '',
        'Email': p.email || '',
        'Adresse': p.adresse || '',
        'Personne à prévenir 1': `${p.personne_a_prevenir_nom1||''} ${p.personne_a_prevenir_tel1||''}`,
        'Personne à prévenir 2': `${p.personne_a_prevenir_nom2||''} ${p.personne_a_prevenir_tel2||''}`,
        'Antécédents': p.antecedents || '',
        'Allergies': p.allergies || '',
        'Traitements': p.traitements || '',
        'Consentement': p.consentements ? 'Oui' : 'Non'
      }));
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Patients');
      XLSX.writeFile(wb, `patients_${new Date().toISOString()}.xlsx`);
      showToast('Export Excel réussi');
    } catch(err) { showToast('Erreur export', 'error'); }
  };

  const exportToCSV = async () => {
    try {
      const csvRows = [['IPP','Nom','Prénom','Téléphone','Email','Adresse','Personne à prévenir 1','Personne à prévenir 2','Antécédents','Allergies','Traitements','Consentement']];
      for (const p of filteredPatients) {
        csvRows.push([
          p.ipp||'', p.nom||'', p.prenom||'', p.telephone||'', p.email||'', p.adresse||'',
          `${p.personne_a_prevenir_nom1||''} ${p.personne_a_prevenir_tel1||''}`,
          `${p.personne_a_prevenir_nom2||''} ${p.personne_a_prevenir_tel2||''}`,
          (p.antecedents||'').replace(/,/g,';'),
          (p.allergies||'').replace(/,/g,';'),
          (p.traitements||'').replace(/,/g,';'),
          p.consentements ? 'Oui' : 'Non'
        ]);
      }
      const blob = new Blob([csvRows.map(r => r.join(',')).join('\n')], {type:'text/csv'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patients_${new Date().toISOString()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Export CSV réussi');
      await api.post('/logs/download', { fileName: `patients_${new Date().toISOString()}.csv`, type: 'patients_csv' });
    } catch(err) { showToast('Erreur export', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer définitivement ce patient ? Cette action est irréversible.')) {
      return;
    }
    try {
      await api.delete(`/patients/${id}`);
      setPatients(patients.filter(p => p.id !== id));
      showToast('Patient supprimé avec succès');
    } catch (err) {
      if (err.response?.status === 403) {
        showToast('Seul un administrateur peut supprimer un patient.', 'error');
      } else {
        showToast('Erreur lors de la suppression : ' + (err.response?.data?.error || err.message), 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

  // Styles inline
  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)',
    padding: '32px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };
  const innerStyle = {
    maxWidth: '95%',
    margin: '0 auto',
  };
  const headerStyle = {
    backgroundColor: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(8px)',
    borderRadius: '24px',
    padding: '24px',
    marginBottom: '32px',
    textAlign: 'center',
    opacity: loaded ? 1 : 0,
    transform: loaded ? 'translateY(0)' : 'translateY(-20px)',
    transition: 'all 0.5s',
  };
  const titleStyle = {
    fontSize: '48px',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '8px',
  };
  const subtitleStyle = {
    fontSize: '20px',
    color: '#e2e8f0',
    marginBottom: '24px',
  };
  const statsRowStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '24px',
  };
  const statCardStyle = {
    backgroundColor: '#1e40af',
    borderRadius: '16px',
    padding: '12px 24px',
    textAlign: 'center',
    minWidth: '140px',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
  };
  const statNumberStyle = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
  };
  const statLabelStyle = {
    fontSize: '14px',
    color: '#bfdbfe',
  };
  const buttonGroupStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '16px',
  };
  const actionButtonStyle = (bgColor) => ({
    backgroundColor: bgColor,
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '12px',
    fontWeight: 'bold',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'transform 0.2s, background-color 0.2s',
  });
  const searchContainerStyle = {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: '20px',
    padding: '16px',
    marginBottom: '24px',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  };
  const searchInputStyle = {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    outline: 'none',
  };
  const resultBadgeStyle = {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    fontWeight: 'bold',
  };
  const tableContainerStyle = {
    backgroundColor: 'white',
    borderRadius: '20px',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
  };
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  };
  const thStyle = {
    backgroundColor: '#0f172a',
    color: 'white',
    padding: '12px 8px',
    textAlign: 'left',
    border: '1px solid #1e293b',
    cursor: 'pointer',
  };
  const tdStyle = {
    padding: '10px 8px',
    border: '1px solid #e2e8f0',
  };
  const paginationStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f1f5f9',
    borderTop: '1px solid #cbd5e1',
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <FaSort style={{ display: 'inline', marginLeft: '4px' }} />;
    return sortOrder === 'asc' ? <FaSortUp style={{ display: 'inline', marginLeft: '4px' }} /> : <FaSortDown style={{ display: 'inline', marginLeft: '4px' }} />;
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#1e3a8a' }}>
      <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3b82f6', borderRadius: '50%', width: '50px', height: '50px', animation: 'spin 1s linear infinite' }}></div>
    </div>
  );

  return (
    <div style={containerStyle}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 1000,
          backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
          color: 'white', padding: '12px 24px', borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
          animation: 'slideIn 0.3s ease-out',
        }}>
          {toast}
        </div>
      )}
      <div style={innerStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ backgroundColor: '#2563eb', padding: '16px', borderRadius: '50%' }}>
              <FaHospitalUser style={{ fontSize: '40px', color: 'white' }} />
            </div>
          </div>
          <h1 style={titleStyle}>Dossier Patient Unique (DPI)</h1>
          <p style={subtitleStyle}>📋 Gestion complète des dossiers médicaux — {filteredPatients.length} patients</p>
          <div style={statsRowStyle}>
            <div style={statCardStyle}>
              <FaCalendarDay style={{ fontSize: '24px', color: '#93c5fd', marginBottom: '8px' }} />
              <div style={statNumberStyle}>{admissionsToday}</div>
              <div style={statLabelStyle}>Admissions aujourd'hui</div>
            </div>
            <div style={statCardStyle}>
              <FaCalendarWeek style={{ fontSize: '24px', color: '#93c5fd', marginBottom: '8px' }} />
              <div style={statNumberStyle}>{admissionsWeek}</div>
              <div style={statLabelStyle}>Cette semaine</div>
            </div>
            <div style={statCardStyle}>
              <FaCalendarAlt style={{ fontSize: '24px', color: '#93c5fd', marginBottom: '8px' }} />
              <div style={statNumberStyle}>{admissionsMonth}</div>
              <div style={statLabelStyle}>Ce mois-ci</div>
            </div>
          </div>
          <div style={buttonGroupStyle}>
            <button style={actionButtonStyle('#16a34a')} onClick={exportToExcel} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}><FaFileExcel /> Excel</button>
            <button style={actionButtonStyle('#2563eb')} onClick={exportToCSV} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}><FaDownload /> CSV</button>
            <button style={actionButtonStyle('#9333ea')} onClick={()=>window.print()} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}><FaPrint /> Imprimer</button>
            <Link to="/patients/new" style={actionButtonStyle('#0891b2')} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}><FaPlusCircle /> Nouveau patient</Link>
          </div>
        </div>

        <div style={searchContainerStyle}>
          <div style={{ position: 'relative', flex: 1 }}>
            <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input type="text" placeholder="Rechercher par nom, prénom ou IPP..." value={search} onChange={e=>setSearch(e.target.value)} style={{ ...searchInputStyle, paddingLeft: '40px' }} />
          </div>
          <div style={resultBadgeStyle}>🔍 Résultats : {filteredPatients.length}</div>
        </div>

        <div style={tableContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {['ipp','nom','prenom','telephone','email','adresse','personne_a_prevenir_nom1','personne_a_prevenir_nom2','antecedents','allergies','traitements','consentements','actions'].map(field => (
                  <th key={field} style={thStyle} onClick={() => field !== 'actions' && (setSortField(field), setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'))}>
                    {field === 'ipp' ? 'IPP' : field === 'nom' ? 'Nom' : field === 'prenom' ? 'Prénom' : field === 'telephone' ? 'Téléphone' : field === 'email' ? 'Email' : field === 'adresse' ? 'Adresse' : field === 'personne_a_prevenir_nom1' ? 'Personne 1' : field === 'personne_a_prevenir_nom2' ? 'Personne 2' : field === 'antecedents' ? 'Antécédents' : field === 'allergies' ? 'Allergies' : field === 'traitements' ? 'Traitements' : field === 'consentements' ? 'Consent.' : 'Actions'}
                    {field !== 'actions' && <SortIcon field={field} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan="13" style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>📭 Aucun patient enregistré</td></tr>
              ) : (
                paginated.map((p, idx) => (
                  <tr key={p.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={tdStyle}>{p.ipp || '-'}</td>
                    <td style={{...tdStyle, fontWeight: 'bold'}}>{p.nom || '-'}</td>
                    <td style={tdStyle}>{p.prenom || '-'}</td>
                    <td style={tdStyle}>{p.telephone || '-'}</td>
                    <td style={tdStyle}>{p.email || '-'}</td>
                    <td style={tdStyle}>{p.adresse || '-'}</td>
                    <td style={tdStyle}>{p.personne_a_prevenir_nom1 && <>{p.personne_a_prevenir_nom1}<br/><span style={{fontSize:'12px'}}>{p.personne_a_prevenir_tel1}</span></>}</td>
                    <td style={tdStyle}>{p.personne_a_prevenir_nom2 && <>{p.personne_a_prevenir_nom2}<br/><span style={{fontSize:'12px'}}>{p.personne_a_prevenir_tel2}</span></>}</td>
                    <td style={tdStyle}>{p.antecedents || '-'}</td>
                    <td style={tdStyle}>{p.allergies || '-'}</td>
                    <td style={tdStyle}>{p.traitements || '-'}</td>
                    <td style={{...tdStyle, textAlign: 'center'}}>{p.consentements ? '✅' : '❌'}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <Link to={`/patients/${p.id}`} style={{ color: '#3b82f6' }} title="Voir"><FaEye /></Link>
                        <Link to={`/patients/edit/${p.id}`} style={{ color: '#22c55e' }} title="Modifier"><FaEdit /></Link>
                        {isAdmin ? (
                          <button onClick={() => handleDelete(p.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} title="Supprimer (admin)"><FaTrash /></button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }} title="Réservé aux administrateurs">🔒</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filteredPatients.length > 0 && (
            <div style={paginationStyle}>
              <span>Page {currentPage} / {totalPages} ({filteredPatients.length} lignes)</span>
              <div>
                <button onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1} style={{ padding: '4px 12px', marginRight: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>◀ Précédent</button>
                <button onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages} style={{ padding: '4px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>Suivant ▶</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media print {
          .fixed, [style*="fixed"] { display: none; }
        }
      `}</style>
    </div>
  );
};

export default PatientsList;