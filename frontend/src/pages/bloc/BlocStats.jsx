import { useEffect, useState } from 'react';
import api from '../../axios';

const BlocStats = () => {
  const [stats, setStats] = useState({ aujourdhui: 0, en_cours: 0, total_prevues: 0, sept_derniers_jours: 0 });
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.get('/bloc/stats').then(res => {
      setStats(res.data);
      setLoaded(true);
      setLoading(false);
    }).catch(err => {
      setToast('Erreur chargement stats');
      setTimeout(() => setToast(null), 3000);
      setLoading(false);
    });
  }, []);

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    opacity: loaded ? 1 : 0,
    transform: loaded ? 'translateY(0)' : 'translateY(20px)',
    transition: 'all 0.5s 0.2s',
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
      <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #2563eb', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
    </div>
  );

  return (
    <div style={cardStyle}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', backgroundColor: '#ef4444', color: 'white',
          padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000, animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}

      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: '0 0 24px 0' }}>?? Statistiques du bloc opratoire</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#dbeafe', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e3a8a' }}>{stats.aujourdhui}</div>
          <div style={{ fontSize: '14px', color: '#1e3a8a' }}>Interventions aujourd'hui</div>
        </div>
        <div style={{ backgroundColor: '#fef3c7', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#92400e' }}>{stats.en_cours}</div>
          <div style={{ fontSize: '14px', color: '#92400e' }}>En cours actuellement</div>
        </div>
        <div style={{ backgroundColor: '#dcfce7', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#065f46' }}>{stats.total_prevues}</div>
          <div style={{ fontSize: '14px', color: '#065f46' }}>Total planifies</div>
        </div>
        <div style={{ backgroundColor: '#fce4ec', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#991b1b' }}>{stats.sept_derniers_jours}</div>
          <div style={{ fontSize: '14px', color: '#991b1b' }}>Ralises (7 derniers jours)</div>
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
      `}</style>
    </div>
  );
};

export default BlocStats;
