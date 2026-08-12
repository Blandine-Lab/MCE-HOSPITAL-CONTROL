import { useState, useEffect } from 'react';
import api from '../../axios';
import { FaShieldAlt, FaUsersCog, FaHistory, FaServer, FaUserLock } from 'react-icons/fa';

const DashboardSecurity = () => {
  const [stats, setStats] = useState({ roles: 0, logs: 0, sessions: 0, tentatives: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/security/roles'),
      api.get('/security/logs'),
      api.get('/security/sessions'),
      api.get('/security/tentatives-connexion')
    ]).then(([roles, logs, sessions, tentatives]) => {
      setStats({
        roles: roles.data.length,
        logs: logs.data.length,
        sessions: sessions.data.length,
        tentatives: tentatives.data.length
      });
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>⏳ Chargement...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '28px', color: '#0f172a', marginBottom: '24px' }}>
        <FaShieldAlt style={{ color: '#f59e0b', marginRight: '12px' }} /> Tableau de bord Sécurité
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <FaUsersCog style={{ fontSize: '28px', color: '#3b82f6' }} />
          <h2>{stats.roles}</h2>
          <p>Rôles</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <FaHistory style={{ fontSize: '28px', color: '#10b981' }} />
          <h2>{stats.logs}</h2>
          <p>Logs d'audit</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <FaServer style={{ fontSize: '28px', color: '#f59e0b' }} />
          <h2>{stats.sessions}</h2>
          <p>Sessions actives</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <FaUserLock style={{ fontSize: '28px', color: '#ef4444' }} />
          <h2>{stats.tentatives}</h2>
          <p>Tentatives échouées</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardSecurity;
