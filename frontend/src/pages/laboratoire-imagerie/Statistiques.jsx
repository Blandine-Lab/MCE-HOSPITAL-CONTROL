// src/pages/laboratoire-imagerie/Statistiques.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import {
  FaArrowLeft,
  FaFilePdf,
  FaCalendarAlt,
  FaFlask,
  FaUserMd,
  FaHospital,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaChartBar,
  FaSpinner
} from 'react-icons/fa';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

// Couleurs pour les graphiques
const COLORS = ['#f472b6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Statistiques = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('12'); // mois sur 12 derniers mois
  const [monthlyData, setMonthlyData] = useState([]);
  const [globalStats, setGlobalStats] = useState(null);
  const [statsByService, setStatsByService] = useState([]);
  const [statsByMedecin, setStatsByMedecin] = useState([]);

  // Chargement des données
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError('');
      try {
        const [monthlyRes, globalRes, serviceRes, medecinRes] = await Promise.all([
          api.get('/examens/stats/mensuelles', { params: { period } }),
          api.get('/examens/stats/globales'),
          api.get('/examens/stats/par-service'),
          api.get('/examens/stats/par-medecin')
        ]);
        setMonthlyData(monthlyRes.data || []);
        setGlobalStats(globalRes.data || {});
        setStatsByService(serviceRes.data || []);
        setStatsByMedecin(medecinRes.data || []);
      } catch (err) {
        console.error('Erreur chargement statistiques', err);
        setError('Impossible de charger les statistiques. Veuillez réessayer.');
        // Données de démonstration en cas d'erreur (pour le développement)
        setMonthlyData(generateDemoMonthlyData());
        setGlobalStats(generateDemoGlobalStats());
        setStatsByService(generateDemoServiceStats());
        setStatsByMedecin(generateDemoMedecinStats());
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [period]);

  // Génération de données de démo (si API non disponible)
  const generateDemoMonthlyData = () => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    return months.slice(-parseInt(period)).map((m, i) => ({
      mois: `2025-${String(i+1).padStart(2,'0')}`,
      total: Math.floor(Math.random() * 50) + 10,
      urgents: Math.floor(Math.random() * 10) + 1,
      realizes: Math.floor(Math.random() * 30) + 5,
      label: m
    }));
  };
  const generateDemoGlobalStats = () => ({
    total: 384,
    en_attente: 42,
    en_cours: 28,
    realise: 267,
    annule: 12,
    valide: 35,
    par_categorie: { laboratoire: 210, imagerie: 174 }
  });
  const generateDemoServiceStats = () => [
    { service: 'Cardiologie', total: 85 },
    { service: 'Neurologie', total: 62 },
    { service: 'Pédiatrie', total: 54 },
    { service: 'Orthopédie', total: 48 },
    { service: 'Gynécologie', total: 37 }
  ];
  const generateDemoMedecinStats = () => [
    { medecin: 'Dr. Dupont', total: 42 },
    { medecin: 'Dr. Martin', total: 38 },
    { medecin: 'Dr. Bernard', total: 35 },
    { medecin: 'Dr. Petit', total: 29 },
    { medecin: 'Dr. Robert', total: 24 }
  ];

  // Formatage des dates pour l'affichage
  const formatMonth = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  };

  // Export PDF (avec pdfmake)
  const handleExportPDF = async () => {
    // Importer pdfmake dynamiquement pour réduire le bundle initial
    const pdfMakeModule = await import('pdfmake/build/pdfmake');
    const pdfFonts = await import('pdfmake/build/vfs_fonts');
    const pdfMake = pdfMakeModule.default;
    pdfMake.vfs = pdfFonts.default.pdfMake.vfs;

    const docDefinition = {
      content: [
        { text: 'STATISTIQUES DES EXAMENS', style: 'header', alignment: 'center' },
        { text: `Période : ${period} derniers mois`, alignment: 'center', margin: [0, 0, 0, 20] },
        {
          table: {
            headerRows: 1,
            body: [
              [
                { text: 'Indicateur', style: 'tableHeader' },
                { text: 'Valeur', style: 'tableHeader' }
              ],
              ['Total examens', globalStats?.total || 0],
              ['En attente', globalStats?.en_attente || 0],
              ['En cours', globalStats?.en_cours || 0],
              ['Réalisés', globalStats?.realise || 0],
              ['Validés', globalStats?.valide || 0],
              ['Annulés', globalStats?.annule || 0],
              ['Laboratoire', globalStats?.par_categorie?.laboratoire || 0],
              ['Imagerie', globalStats?.par_categorie?.imagerie || 0]
            ]
          }
        },
        { text: 'Évolution mensuelle', style: 'subheader', margin: [0, 20, 0, 10] },
        {
          table: {
            headerRows: 1,
            body: [
              [
                { text: 'Mois', style: 'tableHeader' },
                { text: 'Total', style: 'tableHeader' },
                { text: 'Urgents', style: 'tableHeader' },
                { text: 'Réalisés', style: 'tableHeader' }
              ],
              ...monthlyData.map(item => [
                formatMonth(item.mois),
                item.total,
                item.urgents,
                item.realizes || 0
              ])
            ]
          }
        },
        { text: 'Par service', style: 'subheader', margin: [0, 20, 0, 10] },
        {
          table: {
            headerRows: 1,
            body: [
              [{ text: 'Service', style: 'tableHeader' }, { text: 'Nombre', style: 'tableHeader' }],
              ...statsByService.map(item => [item.service, item.total])
            ]
          }
        },
        { text: 'Par médecin prescripteur', style: 'subheader', margin: [0, 20, 0, 10] },
        {
          table: {
            headerRows: 1,
            body: [
              [{ text: 'Médecin', style: 'tableHeader' }, { text: 'Nombre', style: 'tableHeader' }],
              ...statsByMedecin.map(item => [item.medecin, item.total])
            ]
          }
        },
        { text: `Généré le ${new Date().toLocaleDateString('fr-FR')}`, alignment: 'center', margin: [0, 20, 0, 0] }
      ],
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
        subheader: { fontSize: 14, bold: true },
        tableHeader: { bold: true, fillColor: '#f1f5f9' }
      },
      defaultStyle: { fontSize: 10 }
    };

    pdfMake.createPdf(docDefinition).download('statistiques_examens.pdf');
  };

  // Gestion du chargement
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <FaSpinner className="spinner" style={{ fontSize: '48px', color: '#f472b6', animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: '20px', marginTop: '16px' }}>Chargement des statistiques...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ef4444' }}>
        <div style={{ fontSize: '24px' }}>⚠️ {error}</div>
        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: '16px', padding: '8px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Navigation */}
      <div style={{ marginBottom: '24px' }}>
        <Link to="/laboratoire" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: '#3b82f6',
          textDecoration: 'none',
          fontWeight: '500'
        }}>
          <FaArrowLeft /> Retour au laboratoire
        </Link>
      </div>

      {/* En-tête */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaChartBar style={{ color: '#f472b6' }} /> Statistiques
        </h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              padding: '8px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: 'white',
              fontSize: '14px'
            }}
          >
            <option value="6">6 derniers mois</option>
            <option value="12">12 derniers mois</option>
            <option value="24">24 derniers mois</option>
          </select>
          <button
            onClick={handleExportPDF}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            <FaFilePdf /> Exporter PDF
          </button>
        </div>
      </div>

      {/* Cartes de synthèse */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <StatCard label="Total examens" value={globalStats?.total || 0} icon={<FaFlask />} color="#f472b6" />
        <StatCard label="En attente" value={globalStats?.en_attente || 0} icon={<FaClock />} color="#3b82f6" />
        <StatCard label="En cours" value={globalStats?.en_cours || 0} icon={<FaClock />} color="#f59e0b" />
        <StatCard label="Réalisés" value={globalStats?.realise || 0} icon={<FaCheckCircle />} color="#10b981" />
        <StatCard label="Validés" value={globalStats?.valide || 0} icon={<FaCheckCircle />} color="#8b5cf6" />
        <StatCard label="Annulés" value={globalStats?.annule || 0} icon={<FaTimesCircle />} color="#ef4444" />
      </div>

      {/* Graphique d'évolution mensuelle */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <h3 style={{ marginTop: 0, color: '#0f172a' }}>Évolution mensuelle</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mois" tickFormatter={formatMonth} />
            <YAxis />
            <Tooltip formatter={(value) => `${value} examens`} />
            <Legend />
            <Bar dataKey="total" fill="#f472b6" name="Total" />
            <Bar dataKey="urgents" fill="#dc2626" name="Urgents" />
            <Bar dataKey="realizes" fill="#10b981" name="Réalisés" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Deux graphiques en ligne : par service et par médecin */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        marginBottom: '24px'
      }}>
        {/* Par service */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ marginTop: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaHospital /> Par service
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statsByService}
                dataKey="total"
                nameKey="service"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label
              >
                {statsByService.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Par médecin */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ marginTop: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaUserMd /> Par médecin prescripteur
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statsByMedecin} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="medecin" type="category" width={80} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#8b5cf6" name="Nombre" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tableau récapitulatif */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0, color: '#0f172a' }}>Détail mensuel</h3>
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f1f5f9' }}>
              <tr>
                <th style={{ padding: '10px', textAlign: 'left' }}>Mois</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Urgents</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Réalisés</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Taux d'urgents</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((item, idx) => {
                const taux = item.total > 0 ? ((item.urgents / item.total) * 100).toFixed(1) : 0;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px' }}>{formatMonth(item.mois)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{item.total}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{item.urgents}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{item.realizes || 0}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{taux}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Composant pour les cartes de statistiques
const StatCard = ({ label, value, icon, color }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    textAlign: 'center',
    borderLeft: `4px solid ${color}`
  }}>
    <div style={{ fontSize: '28px', color }}>{icon}</div>
    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{value}</div>
    <div style={{ fontSize: '14px', color: '#64748b' }}>{label}</div>
  </div>
);

export default Statistiques;