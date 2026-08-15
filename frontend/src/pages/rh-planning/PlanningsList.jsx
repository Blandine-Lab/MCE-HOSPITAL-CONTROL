// src/pages/rh-planning/PlanningsList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaCalendarAlt, FaPlus, FaEye, FaEdit, FaTrash } from 'react-icons/fa';

const PlanningsList = () => {
  const [plannings, setPlannings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
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

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPlannings = () => {
    setLoading(true);
    const params = filterDate ? `?date=${filterDate}` : '';
    api.get(`/plannings${params}`)
      .then(res => {
        setPlannings(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Erreur chargement des plannings', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPlannings();
  }, [filterDate]);

  const handleDelete = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce planning ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/plannings/${id}`);
      setPlannings(plannings.filter(p => p.id !== id));
      showToast('Planning supprimé avec succès');
    } catch (err) {
      console.error('Erreur suppression :', err);
      if (err.response?.status === 403) {
        showToast('Seul un administrateur peut supprimer un planning.', 'error');
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

  if (loading) return <div style={{textAlign:'center', padding:60}}>Chargement...</div>;

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 24px',
          borderRadius: 8,
          backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:16}}>
        <h1 style={{fontSize:28, color:'#0f172a'}}><FaCalendarAlt style={{color:'#60a5fa', marginRight:12}} /> Plannings</h1>
        <div style={{display:'flex', gap:12}}>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:6}} />
          <Link to="/rh/plannings/nouveau" style={{backgroundColor:'#60a5fa', color:'white', padding:'10px 20px', borderRadius:8, textDecoration:'none', display:'flex', alignItems:'center', gap:8}}>
            <FaPlus /> Ajouter
          </Link>
        </div>
      </div>
      <div style={{backgroundColor:'white', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', overflow:'hidden'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead style={{backgroundColor:'#f1f5f9'}}>
            <tr>
              <th style={{padding:'14px 20px', textAlign:'left'}}>Employé</th>
              <th style={{padding:'14px 20px', textAlign:'left'}}>Date</th>
              <th style={{padding:'14px 20px', textAlign:'left'}}>Horaire</th>
              <th style={{padding:'14px 20px', textAlign:'left'}}>Type</th>
              <th style={{padding:'14px 20px', textAlign:'center'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {plannings.map((p,i) => (
              <tr key={p.id} style={{borderBottom: i===plannings.length-1 ? 'none' : '1px solid #f1f5f9'}}>
                <td style={{padding:'14px 20px'}}>
                  {p.employe_nom && p.employe_prenom ? `${p.employe_nom} ${p.employe_prenom}` : '—'}
                </td>
                <td style={{padding:'14px 20px'}}>{new Date(p.date).toLocaleDateString('fr-FR')}</td>
                <td style={{padding:'14px 20px'}}>
                  {p.heure_debut ? p.heure_debut.substring(0,5) : '--'} - {p.heure_fin ? p.heure_fin.substring(0,5) : '--'}
                </td>
                <td style={{padding:'14px 20px'}}>{p.type}</td>
                <td style={{padding:'14px 20px', textAlign:'center'}}>
                  <Link to={`/rh/plannings/${p.id}`} style={{color:'#3b82f6', marginRight:12}}><FaEye /></Link>
                  <Link to={`/rh/plannings/${p.id}/edit`} style={{color:'#f59e0b', marginRight:12}}><FaEdit /></Link>
                  {isAdmin ? (
                    <button onClick={() => handleDelete(p.id)} style={{color:'#ef4444', background:'none', border:'none', cursor:'pointer'}}><FaTrash /></button>
                  ) : (
                    <span style={{color:'#94a3b8', fontSize:'14px'}} title="Réservé aux administrateurs">🔒</span>
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

export default PlanningsList;