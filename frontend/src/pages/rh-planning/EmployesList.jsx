// src/pages/rh-planning/EmployesList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaPlus, FaEye, FaEdit, FaTrash, FaUserMd, FaIdCard } from 'react-icons/fa';

const EmployesList = () => {
  const [employes, setEmployes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [userRole, setUserRole] = useState(null);

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

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchEmployes = () => {
    setLoading(true);
    api.get('/employes')
      .then(res => {
        setEmployes(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Erreur chargement des employés', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEmployes();
  }, []);

  // ✅ handleDelete avec gestion 403
  const handleDelete = async (id, nom, prenom) => {
    if (!window.confirm(`⚠️ Voulez-vous vraiment supprimer l'employé ${prenom} ${nom} ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/employes/${id}`);
      setEmployes(employes.filter(e => e.id !== id));
      showToast('Employé supprimé avec succès');
    } catch (err) {
      console.error('Erreur suppression :', err);
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut supprimer un employé.', 'error');
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

  const filtered = employes.filter(e =>
    `${e.nom} ${e.prenom}`.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase()) ||
    e.poste?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{textAlign:'center', padding:60}}>⏳ Chargement...</div>;

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
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24}}>
        <h1 style={{fontSize:28, color:'#0f172a', display:'flex', gap:12}}>
          <FaUserMd style={{color:'#60a5fa'}} /> Employés
        </h1>
        <Link to="/rh/employes/nouveau" style={{backgroundColor:'#60a5fa', color:'white', padding:'10px 20px', borderRadius:8, textDecoration:'none', display:'flex', alignItems:'center', gap:8}}>
          <FaPlus /> Ajouter
        </Link>
      </div>
      <div style={{marginBottom:20}}>
        <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{width:'100%', padding:'10px 14px', border:'1px solid #e2e8f0', borderRadius:8}} />
      </div>
      <div style={{backgroundColor:'white', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', overflow:'hidden'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead style={{backgroundColor:'#f1f5f9'}}>
            <tr>
              <th style={{padding:'14px 20px', textAlign:'left'}}>Nom</th>
              <th style={{padding:'14px 20px', textAlign:'left'}}>Prénom</th>
              <th style={{padding:'14px 20px', textAlign:'left'}}>Poste</th>
              <th style={{padding:'14px 20px', textAlign:'left'}}>Service</th>
              <th style={{padding:'14px 20px', textAlign:'left'}}>Statut</th>
              <th style={{padding:'14px 20px', textAlign:'center'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => (
              <tr key={e.id} style={{borderBottom: i===filtered.length-1 ? 'none' : '1px solid #f1f5f9'}}>
                <td style={{padding:'14px 20px', fontWeight:500}}>{e.nom}</td>
                <td style={{padding:'14px 20px'}}>{e.prenom}</td>
                <td style={{padding:'14px 20px'}}>{e.poste}</td>
                <td style={{padding:'14px 20px'}}>{e.service_nom || '-'}</td>
                <td style={{padding:'14px 20px'}}>
                  <span style={{padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:500, backgroundColor: e.statut === 'actif' ? '#d1fae5' : '#fee2e2', color: e.statut === 'actif' ? '#065f46' : '#991b1b'}}>
                    {e.statut === 'actif' ? '🟢 Actif' : '🔴 Inactif'}
                  </span>
                </td>
                <td style={{padding:'14px 20px', textAlign:'center'}}>
                  <Link to={`/badge/${e.id}`} style={{color:'#8b5cf6', marginRight:12, textDecoration:'none'}} title="Voir le badge">
                    <FaIdCard /> Badge
                  </Link>
                  <Link to={`/rh/employes/${e.id}`} style={{color:'#3b82f6', marginRight:12}}><FaEye /></Link>
                  <Link to={`/rh/employes/${e.id}/edit`} style={{color:'#f59e0b', marginRight:12}}><FaEdit /></Link>
                  {isAdmin ? (
                    <button onClick={() => handleDelete(e.id, e.nom, e.prenom)} style={{color:'#ef4444', background:'none', border:'none', cursor:'pointer'}}><FaTrash /></button>
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

export default EmployesList;