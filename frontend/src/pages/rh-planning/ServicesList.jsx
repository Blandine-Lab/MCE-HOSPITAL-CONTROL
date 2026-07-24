// src/pages/rh-planning/ServicesList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaBuilding, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

const ServicesList = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const fetchServices = () => {
    setLoading(true);
    api.get('/services')
      .then(res => {
        setServices(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Erreur chargement des services', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // ✅ handleDelete avec gestion 403
  const handleDelete = async (id, nom) => {
    if (!window.confirm(`⚠️ Voulez-vous vraiment supprimer le service "${nom}" ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/services/${id}`);
      setServices(services.filter(s => s.id !== id));
      showToast('Service supprimé avec succès');
    } catch (err) {
      console.error('Erreur suppression :', err);
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut supprimer un service.', 'error');
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

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
        <h1 style={{fontSize:28, color:'#0f172a'}}><FaBuilding style={{color:'#60a5fa', marginRight:12}} /> Services</h1>
        <Link to="/rh/services/nouveau" style={{backgroundColor:'#60a5fa', color:'white', padding:'10px 20px', borderRadius:8, textDecoration:'none', display:'flex', alignItems:'center', gap:8}}>
          <FaPlus /> Ajouter
        </Link>
      </div>
      <div style={{backgroundColor:'white', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', overflow:'hidden'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead style={{backgroundColor:'#f1f5f9'}}>
            <tr><th style={{padding:'14px 20px', textAlign:'left'}}>Nom</th><th>Responsable</th><th>Description</th><th style={{textAlign:'center'}}>Actions</th></tr>
          </thead>
          <tbody>
            {services.map((s,i) => (
              <tr key={s.id} style={{borderBottom: i===services.length-1 ? 'none' : '1px solid #f1f5f9'}}>
                <td style={{padding:'14px 20px', fontWeight:500}}>{s.nom}</td>
                <td style={{padding:'14px 20px'}}>{s.responsable_nom || '-'}</td>
                <td style={{padding:'14px 20px'}}>{s.description}</td>
                <td style={{padding:'14px 20px', textAlign:'center'}}>
                  <Link to={`/rh/services/${s.id}/edit`} style={{color:'#f59e0b', marginRight:12}}><FaEdit /></Link>
                  {isAdmin ? (
                    <button onClick={() => handleDelete(s.id, s.nom)} style={{color:'#ef4444', background:'none', border:'none', cursor:'pointer'}}><FaTrash /></button>
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

export default ServicesList;