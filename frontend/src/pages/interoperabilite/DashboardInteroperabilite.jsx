// frontend/src/pages/interoperabilite/DashboardInteroperabilite.jsx
import { useState, useEffect } from 'react';
import api from '../../axios';
import { 
  FaServer, FaExchangeAlt, FaHistory, FaPlug,  // ✅ FaPlug remplace FaWebhook
  FaCheckCircle, FaTimesCircle, FaClock, FaArrowUp, FaArrowDown,
  FaSync, FaExclamationTriangle 
} from 'react-icons/fa';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DashboardInteroperabilite = () => {
  const [stats, setStats] = useState({
    systemes: 0,
    systemesActifs: 0,
    flux: 0,
    fluxActifs: 0,
    logs: 0,
    logsSucces: 0,
    logsEchec: 0,
    webhooks: 0,
    webhooksActifs: 0
  });
  const [logsRecents, setLogsRecents] = useState([]);
  const [evolutionData, setEvolutionData] = useState(null);
  const [fluxDirectionData, setFluxDirectionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [systemesRes, fluxRes, logsRes, webhooksRes] = await Promise.all([
        api.get('/interoperabilite/systemes'),
        api.get('/interoperabilite/flux'),
        api.get('/interoperabilite/logs?limit=500'),
        api.get('/interoperabilite/webhooks')
      ]);

      const systemes = systemesRes.data || [];
      const flux = fluxRes.data || [];
      const logs = logsRes.data || [];
      const webhooks = webhooksRes.data || [];

      const systemesActifs = systemes.filter(s => s.actif).length;
      const fluxActifs = flux.filter(f => f.statut === 'actif').length;
      const logsSucces = logs.filter(l => l.status_code >= 200 && l.status_code < 300).length;
      const logsEchec = logs.filter(l => l.status_code >= 400 || l.status_code === 500).length;
      const webhooksActifs = webhooks.filter(w => w.actif).length;

      setStats({
        systemes: systemes.length,
        systemesActifs,
        flux: flux.length,
        fluxActifs,
        logs: logs.length,
        logsSucces,
        logsEchec,
        webhooks: webhooks.length,
        webhooksActifs
      });

      const sortedLogs = [...logs].sort((a, b) => new Date(b.date_action) - new Date(a.date_action));
      setLogsRecents(sortedLogs.slice(0, 10));

      const now = new Date();
      const dates = [];
      const successCounts = [];
      const errorCounts = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        dates.push(dateStr);
        const dayLogs = logs.filter(l => {
          const lDate = new Date(l.date_action).toISOString().split('T')[0];
          return lDate === dateStr;
        });
        const success = dayLogs.filter(l => l.status_code >= 200 && l.status_code < 300).length;
        const error = dayLogs.filter(l => l.status_code >= 400 || l.status_code === 500).length;
        successCounts.push(success);
        errorCounts.push(error);
      }

      setEvolutionData({
        labels: dates.map(d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })),
        datasets: [
          {
            label: 'Appels réussis',
            data: successCounts,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
          },
          {
            label: 'Appels en échec',
            data: errorCounts,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.4,
          }
        ]
      });

      const directions = {};
      flux.forEach(f => {
        const dir = f.type_flux || 'entrant';
        directions[dir] = (directions[dir] || 0) + 1;
      });
      setFluxDirectionData({
        labels: Object.keys(directions).map(d => d === 'entrant' ? 'Entrants' : 'Sortants'),
        datasets: [
          {
            data: Object.values(directions),
            backgroundColor: ['#3b82f6', '#f59e0b'],
            borderWidth: 0,
          }
        ]
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Erreur chargement dashboard interopérabilité:', err);
      setError('Impossible de charger les données du tableau de bord.');
      setStats({
        systemes: 0,
        systemesActifs: 0,
        flux: 0,
        fluxActifs: 0,
        logs: 0,
        logsSucces: 0,
        logsEchec: 0,
        webhooks: 0,
        webhooksActifs: 0
      });
      setLogsRecents([]);
      setEvolutionData(null);
      setFluxDirectionData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ icon: Icon, label, value, color, subtitle, trend }) => (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      transition: 'transform 0.2s',
      flex: '1 1 180px',
      minWidth: '160px',
      borderTop: `4px solid ${color}`
    }}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{value}</div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>{label}</div>
          {subtitle && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{subtitle}</div>}
        </div>
        <div style={{ backgroundColor: color, borderRadius: '12px', padding: '12px' }}>
          <Icon style={{ color: 'white', fontSize: '20px' }} />
        </div>
      </div>
    </div>
  );

  const LogItem = ({ log }) => {
    const isSuccess = log.status_code >= 200 && log.status_code < 300;
    const isError = log.status_code >= 400 || log.status_code === 500;
    const icon = isSuccess ? <FaCheckCircle color="#10b981" /> : isError ? <FaTimesCircle color="#ef4444" /> : <FaClock color="#f59e0b" />;
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid #f1f5f9',
        fontSize: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          {icon}
          <span style={{ fontWeight: '500', color: '#0f172a' }}>{log.flux_nom || 'N/C'}</span>
          <span style={{ color: '#64748b', fontSize: '12px' }}>
            {new Date(log.date_action).toLocaleString('fr-FR')}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '12px', backgroundColor: isSuccess ? '#d1fae5' : isError ? '#fee2e2' : '#fef3c7', color: isSuccess ? '#065f46' : isError ? '#991b1b' : '#92400e' }}>
            {log.status_code || 'N/A'}
          </span>
          <span style={{ color: '#64748b', fontSize: '12px' }}>{log.duree_ms ? `${log.duree_ms}ms` : ''}</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', padding: '20px' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ backgroundColor: '#f1f5f9', padding: '20px', borderRadius: '12px', height: '120px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px' }}>
        <FaExclamationTriangle style={{ marginRight: '8px' }} /> {error}
        <button onClick={fetchDashboardData} style={{ marginLeft: '16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}>
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaExchangeAlt style={{ color: '#3b82f6' }} />
          Tableau de bord Interopérabilité
        </h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Dernière mise à jour : {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button
            onClick={fetchDashboardData}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaSync /> Rafraîchir
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <StatCard icon={FaServer} label="Systèmes externes" value={stats.systemes} color="#3b82f6" subtitle={`${stats.systemesActifs} actifs`} />
        <StatCard icon={FaExchangeAlt} label="Flux" value={stats.flux} color="#8b5cf6" subtitle={`${stats.fluxActifs} actifs`} />
        <StatCard icon={FaHistory} label="Logs" value={stats.logs} color="#f59e0b" />
        <StatCard icon={FaPlug} label="Webhooks" value={stats.webhooks} color="#ec4899" subtitle={`${stats.webhooksActifs} actifs`} />
        <StatCard icon={FaCheckCircle} label="Appels réussis" value={stats.logsSucces} color="#10b981" />
        <StatCard icon={FaTimesCircle} label="Appels en échec" value={stats.logsEchec} color="#ef4444" />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '24px',
        marginBottom: '24px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 16px 0' }}>
            📈 Évolution des appels (30 derniers jours)
          </h3>
          {evolutionData ? (
            <Line
              data={evolutionData}
              options={{
                responsive: true,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              Données insuffisantes
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 16px 0' }}>
            🧩 Répartition des flux par direction
          </h3>
          {fluxDirectionData && fluxDirectionData.datasets[0].data.reduce((a, b) => a + b, 0) > 0 ? (
            <div style={{ maxWidth: '280px', margin: '0 auto' }}>
              <Doughnut
                data={fluxDirectionData}
                options={{
                  responsive: true,
                  plugins: { legend: { position: 'right' } }
                }}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              Aucun flux configuré
            </div>
          )}
        </div>
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 16px 0' }}>
          📋 Derniers logs d'interopérabilité
        </h3>
        {logsRecents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
            Aucun log disponible
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {logsRecents.map((log, idx) => (
              <LogItem key={idx} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardInteroperabilite;
