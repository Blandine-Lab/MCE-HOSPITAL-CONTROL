// src/pages/rh-planning/StatsRH.jsx
import { useState, useEffect } from 'react';
import api from '../../axios';
import { FaUsers, FaUserMd, FaCalendarAlt, FaPlane, FaChartPie } from 'react-icons/fa';

const StatsRH = () => {
  const [stats, setStats] = useState({ total:0, actifs:0, services:0, conges_en_attente:0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/employes'),
      api.get('/services'),
      api.get('/conges?statut=en_attente')
    ]).then(([empRes, servRes, congeRes]) => {
      const employes = empRes.data;
      setStats({
        total: employes.length,
        actifs: employes.filter(e => e.statut === 'actif').length,
        services: servRes.data.length,
        conges_en_attente: congeRes.data.length
      });
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) return <div style={{textAlign:'center', padding:60}}>⏳ Chargement...</div>;

  return (
    <div>
      <h1 style={{fontSize:28, color:'#0f172a', marginBottom:24}}><FaChartPie style={{color:'#60a5fa', marginRight:12}} /> Tableau de bord RH</h1>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:20}}>
        <div style={{backgroundColor:'white', padding:24, borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', textAlign:'center'}}>
          <FaUsers style={{fontSize:36, color:'#60a5fa'}} />
          <h2 style={{margin:'12px 0 4px'}}>{stats.total}</h2>
          <p style={{color:'#64748b'}}>Employés</p>
        </div>
        <div style={{backgroundColor:'white', padding:24, borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', textAlign:'center'}}>
          <FaUserMd style={{fontSize:36, color:'#34d399'}} />
          <h2 style={{margin:'12px 0 4px'}}>{stats.actifs}</h2>
          <p style={{color:'#64748b'}}>Actifs</p>
        </div>
        <div style={{backgroundColor:'white', padding:24, borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', textAlign:'center'}}>
          <FaCalendarAlt style={{fontSize:36, color:'#f59e0b'}} />
          <h2 style={{margin:'12px 0 4px'}}>{stats.services}</h2>
          <p style={{color:'#64748b'}}>Services</p>
        </div>
        <div style={{backgroundColor:'white', padding:24, borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', textAlign:'center'}}>
          <FaPlane style={{fontSize:36, color:'#8b5cf6'}} />
          <h2 style={{margin:'12px 0 4px'}}>{stats.conges_en_attente}</h2>
          <p style={{color:'#64748b'}}>Congés en attente</p>
        </div>
      </div>
    </div>
  );
};

export default StatsRH;
