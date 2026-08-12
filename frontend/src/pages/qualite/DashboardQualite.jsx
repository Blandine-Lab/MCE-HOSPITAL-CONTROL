// frontend/src/pages/qualite/DashboardQualite.jsx
import { useState, useEffect } from 'react';
import api from '../../axios';
import { 
  FaShieldAlt, FaExclamationTriangle, FaClipboardCheck, 
  FaTasks, FaTimes, FaChartLine, FaCalendarAlt, 
  FaFilter, FaSync, FaArrowUp, FaArrowDown 
} from 'react-icons/fa';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
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
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DashboardQualite = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('30d');

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/dashboard/qualite?periode=${period}`);
      setData(response.data);
    } catch (err) {
      console.error('Erreur chargement dashboard qualité :', err);
      setError('Impossible de charger les données. Vérifiez votre connexion.');
      // Données de fallback pour éviter écran vide (optionnel)
      setData({
        signalementsOuverts: 12,
        signalementsResolus: 8,
        signalementsTotal: 20,
        auditsEnCours: 3,
        capaEnCours: 5,
        nonConformites: 4,
        risquesCritiques: 2,
        evolution: [
          { date: 'J-6', count: 2 }, { date: 'J-5', count: 4 },
          { date: 'J-4', count: 1 }, { date: 'J-3', count: 3 },
          { date: 'J-2', count: 5 }, { date: 'J-1', count: 2 },
          { date: 'J', count: 4 }
        ],
        repartitionService: [
          { service: 'Urgences', count: 5 },
          { service: 'Médecine', count: 3 },
          { service: 'Chirurgie', count: 2 },
          { service: 'Pédiatrie', count: 1 }
        ],
        risquesCategorie: [
          { categorie: 'Infectieux', count: 3 },
          { categorie: 'Médicamenteux', count: 2 },
          { categorie: 'Chirurgical', count: 1 },
          { categorie: 'Organisationnel', count: 1 }
        ],
        alertes: [
          { id: 1, message: 'Signalement #45 non traité depuis 72h', priorite: 'haute' },
          { id: 2, message: 'Audit #12 en retard de 5 jours', priorite: 'moyenne' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 300000); // 5 min
    return () => clearInterval(interval);
  }, [period]);

  // Gestion des graphiques (utilisation de data)
  const evolutionChartData = {
    labels: data?.evolution?.map(item => item.date) || [],
    datasets: [{
      label: 'Signalements',
      data: data?.evolution?.map(item => item.count) || [],
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      fill: true,
      tension: 0.4,
    }]
  };

  const serviceChartData = {
    labels: data?.repartitionService?.map(item => item.service) || [],
    datasets: [{
      label: 'Signalements par service',
      data: data?.repartitionService?.map(item => item.count) || [],
      backgroundColor: ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'],
      borderWidth: 0,
    }]
  };

  const risksChartData = {
    labels: data?.risquesCategorie?.map(item => item.categorie) || [],
    datasets: [{
      data: data?.risquesCategorie?.map(item => item.count) || [],
      backgroundColor: ['#dc2626', '#f59e0b', '#3b82f6', '#8b5cf6'],
      borderWidth: 0,
    }]
  };

  // Composant TrendBadge (inchangé)
  const TrendBadge = ({ value, label }) => {
    const isPositive = value > 0;
    const isNegative = value < 0;
    const color = isPositive ? '#10b981' : isNegative ? '#ef4444' : '#6b7280';
    const Icon = isPositive ? FaArrowUp : isNegative ? FaArrowDown : null;
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        color: color,
        fontWeight: 'bold',
        backgroundColor: isPositive ? '#d1fae5' : isNegative ? '#fee2e2' : '#f3f4f6',
        padding: '2px 8px',
        borderRadius: '12px'
      }}>
        {Icon && <Icon style={{ fontSize: '10px' }} />}
        {Math.abs(value)}% {label}
      </span>
    );
  };

  // Composant StatCard (inchangé)
  const StatCard = ({ icon: Icon, label, value, color, trend, subtitle }) => (
    <div style={{
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      textAlign: 'center',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'pointer',
      borderTop: `4px solid ${color}`
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <Icon style={{ fontSize: '24px', color: color }} />
        {trend !== undefined && <TrendBadge value={trend} label="vs mois précédent" />}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{value}</div>
      <div style={{ fontSize: '14px', color: '#64748b' }}>{label}</div>
      {subtitle && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{subtitle}</div>}
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', padding: '20px' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ backgroundColor: '#f1f5f9', padding: '20px', borderRadius: '12px', height: '120px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>

      {/* En-tête */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaShieldAlt style={{ color: '#ef4444' }} />
          Tableau de bord Qualité & Risques
        </h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              background: 'white',
              fontSize: '14px'
            }}
          >
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
            <option value="90d">3 mois</option>
          </select>
          <button
            onClick={fetchDashboard}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FaSync /> Rafraîchir
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Alertes */}
      {data?.alertes?.length > 0 && (
        <div style={{
          backgroundColor: '#fef3c7',
          borderLeft: '4px solid #f59e0b',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', color: '#92400e' }}>
            <FaExclamationTriangle style={{ marginRight: '8px' }} /> Alertes qualité
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', listStyle: 'disc', color: '#78350f' }}>
            {data.alertes.map(a => (
              <li key={a.id}>
                {a.message} <span style={{
                  backgroundColor: a.priorite === 'haute' ? '#ef4444' : '#f59e0b',
                  color: 'white',
                  padding: '1px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  marginLeft: '8px'
                }}>
                  {a.priorite}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cartes de statistiques */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <StatCard
          icon={FaExclamationTriangle}
          label="Signalements ouverts"
          value={data?.signalementsOuverts || 0}
          color="#f59e0b"
          trend={12} // à calculer ou supprimer si pas de trend
        />
        <StatCard
          icon={FaClipboardCheck}
          label="Signalements résolus"
          value={data?.signalementsResolus || 0}
          color="#10b981"
          trend={0}
        />
        <StatCard
          icon={FaClipboardCheck}
          label="Audits en cours"
          value={data?.auditsEnCours || 0}
          color="#3b82f6"
          trend={8}
        />
        <StatCard
          icon={FaTasks}
          label="Actions CAPA en cours"
          value={data?.capaEnCours || 0}
          color="#8b5cf6"
          trend={-5}
        />
        <StatCard
          icon={FaTimes}
          label="Non-conformités"
          value={data?.nonConformites || 0}
          color="#ef4444"
        />
        <StatCard
          icon={FaExclamationTriangle}
          label="Risques critiques"
          value={data?.risquesCritiques || 0}
          color="#dc2626"
        />
      </div>

      {/* Graphiques */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '24px',
        marginBottom: '24px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>
            📈 Évolution des signalements
          </h3>
          <Line
            data={evolutionChartData}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }}
          />
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>
            🏥 Répartition par service
          </h3>
          <div style={{ maxWidth: '280px', margin: '0 auto' }}>
            <Doughnut
              data={serviceChartData}
              options={{
                responsive: true,
                plugins: { legend: { position: 'right' } }
              }}
            />
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>
            🧬 Risques par catégorie
          </h3>
          <div style={{ maxWidth: '280px', margin: '0 auto' }}>
            <Doughnut
              data={risksChartData}
              options={{
                responsive: true,
                plugins: { legend: { position: 'right' } }
              }}
            />
          </div>
        </div>
      </div>

      {/* Résumé des indicateurs clés */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginTop: 0, fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>
          📊 Indicateurs clés
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>Taux de résolution</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>
              {data?.signalementsTotal > 0
                ? Math.round((data.signalementsResolus / data.signalementsTotal) * 100)
                : 0}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>Délai moyen de traitement</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>4.2 jours</div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>Total signalements</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{data?.signalementsTotal || 0}</div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>Actions CAPA totales</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{data?.capaEnCours || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardQualite;
