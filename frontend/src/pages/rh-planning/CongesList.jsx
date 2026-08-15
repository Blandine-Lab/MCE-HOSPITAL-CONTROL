// src/pages/rh-planning/CongesList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaPlane, FaPlus, FaEye, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';

const CongesList = () => {
  const [conges, setConges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [userRole, setUserRole] = useState(null);

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

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchConges = () => {
    setLoading(true);
    api.get('/conges')
      .then(res => {
        setConges(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Erreur chargement des congés', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchConges();
  }, []);

  const handleStatus = (id, status) => {
    api.put(`/conges/${id}`, { statut: status })
      .then(() => {
        setConges(conges.map(c => c.id === id ? { ...c, statut: status } : c));
        showToast(`Congé ${status === 'approuvé' ? 'approuvé' : 'refusé'} avec succès`);
      })
      .catch(err => {
        console.error(err);
        showToast('Erreur lors du changement de statut', 'error');
      });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce congé ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/conges/${id}`);
      setConges(conges.filter(c => c.id !== id));
      showToast('Congé supprimé avec succès');
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        showToast('Seul un administrateur peut supprimer un congé.', 'error');
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
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24}}>
        <h1 style={{fontSize:28, color:'#0f172a'}}><FaPlane style={{color:'#60a5fa', marginRight:12}} /> Congés</h1>
        <Link to="/rh/conges/nouveau" style={{backgroundColor:'#60a5fa', color:'white', padding:'10px 20px', borderRadius:8, textDecoration:'none', display:'flex', alignItems:'center', gap:8}}>
          <FaPlus /> Ajouter
        </Link>
      </div>
      <div style={{backgroundColor:'white', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', overflow:'hidden'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead style={{backgroundColor:'#f1f5f9'}}>
            <tr>
              <th style={{padding:'14px 20px', textAlign:'left'}}>Employé</th>
              <th style={{padding:'14px 20px', textAlign:'left'}}>Type</th>
              <th style={{padding:'14px 20px', textAlign:'left'}}>Début</th>
              <th style={{padding:'14px 20px', textAlign:'left'}}>Fin</th>
              <th style={{padding:'14px 20px', textAlign:'left'}}>Statut</th>
              <th style={{padding:'14px 20px', textAlign:'center'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {conges.map((c,i) => (
              <tr key={c.id} style={{borderBottom: i===conges.length-1 ? 'none' : '1px solid #f1f5f9'}}>
                <td style={{padding:'14px 20px'}}>
                  {c.employe_nom && c.employe_prenom ? `${c.employe_nom} ${c.employe_prenom}` :
                    (c.nom && c.prenom ? `${c.nom} ${c.prenom}` : '—')}
                </td>
                <td style={{padding:'14px 20px'}}>{c.type}</td>
                <td style={{padding:'14px 20px'}}>{new Date(c.date_debut).toLocaleDateString('fr-FR')}</td>
                <td style={{padding:'14px 20px'}}>{new Date(c.date_fin).toLocaleDateString('fr-FR')}</td>
                <td style={{padding:'14px 20px'}}>
                  <span style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                    backgroundColor: c.statut === 'approuvé' ? '#d1fae5' : c.statut === 'refusé' ? '#fee2e2' : '#fef3c7',
                    color: c.statut === 'approuvé' ? '#065f46' : c.statut === 'refusé' ? '#991b1b' : '#92400e'
                  }}>
                    {c.statut === 'approuvé' ? 'Approuvé' : c.statut === 'refusé' ? 'Refusé' : 'En attente'}
                  </span>
                </td>
                <td style={{padding:'14px 20px', textAlign:'center'}}>
                  <Link to={`/rh/conges/${c.id}`} style={{color:'#3b82f6', marginRight:8}}><FaEye /></Link>
                  {c.statut === 'en_attente' && (
                    <>
                      <button onClick={() => handleStatus(c.id, 'approuvé')} style={{color:'#10b981', background:'none', border:'none', cursor:'pointer', marginRight:4}}><FaCheck /></button>
                      <button onClick={() => handleStatus(c.id, 'refusé')} style={{color:'#ef4444', background:'none', border:'none', cursor:'pointer', marginRight:4}}><FaTimes /></button>
                    </>
                  )}
                  {isAdmin ? (
                    <button onClick={() => handleDelete(c.id)} style={{color:'#ef4444', background:'none', border:'none', cursor:'pointer'}}><FaTrash /></button>
                  ) : (
                    <span style={{color:'#94a3b8', fontSize:'14px', marginLeft:'4px'}} title="Réservé aux administrateurs">🔒</span>
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

export default CongesList;