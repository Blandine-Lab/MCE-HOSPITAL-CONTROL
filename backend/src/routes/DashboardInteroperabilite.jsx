import { useState, useEffect } from 'react';
import api from '../../axios';
import { FaNetworkWired, FaServer, FaExchangeAlt, FaHistory, FaPlug } from 'react-icons/fa';

const DashboardInteroperabilite = () => {
  const [stats, setStats] = useState({ systemes: 0, flux: 0, logs: 0, webhooks: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/interoperabilite/systemes'),
      api.get('/interoperabilite/flux'),
      api.get('/interoperabilite/logs'),
      api.get('/interoperabilite/webhooks')
    ]).then(([sys, flux, logs, webhooks]) => {
      setStats({
        systemes: sys.data.length,
        flux: flux.data.length,
        logs: logs.data.length,
        webhooks: webhooks.data.length
      });
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>⏳ Chargement...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '28px', color: '#0f172a', marginBottom: '24px' }}>
        <FaNetworkWired style={{ color: '#3b82f6', marginRight: '12px' }} />
        Tableau de bord Interopérabilité
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <FaServer style={{ fontSize: '28px', color: '#3b82f6' }} />
          <h2>{stats.systemes}</h2>
          <p>Systèmes externes</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <FaExchangeAlt style={{ fontSize: '28px', color: '#10b981' }} />
          <h2>{stats.flux}</h2>
          <p>Flux</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <FaHistory style={{ fontSize: '28px', color: '#f59e0b' }} />
          <h2>{stats.logs}</h2>
          <p>Logs</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <FaPlug style={{ fontSize: '28px', color: '#8b5cf6' }} />
          <h2>{stats.webhooks}</h2>
          <p>Webhooks</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardInteroperabilite;