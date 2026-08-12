import { useEffect, useState } from 'react';
import { 
  FaUsers, FaUserPlus, FaUserMinus, FaAmbulance, FaHospital,
  FaBed, FaChartPie, FaEuroSign, FaMoneyBillWave, FaExclamationTriangle,
  FaWrench, FaUserMd, FaUserNurse, FaUserSlash, FaCalendarDay,
  FaCalendarWeek, FaCalendarAlt, FaCalendarCheck, FaSync, FaStethoscope,
  FaFileInvoice, FaCheckCircle, FaTimesCircle // ?? AMÉLIORATION
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
import api from '../../axios';
import { Link } from 'react-router-dom';

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

const Dashboard = () => {
  const [period, setPeriod] = useState('day');
  const [stats, setStats] = useState({
    patients: 0,
    admissions: 0,
    sorties: 0,
    urgences: 0,
    bloc: 0,
    litsOccupes: 0,
    totalLits: 0,
    tauxOccupation: 0,
    ca: 0,
    impayes: 0,
    medicCritiques: 0,
    medecins: 0,
    infirmiers: 0,
    absences: 0,
    equipementsPanne: 0,
  });
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayFacturesCount, setTodayFacturesCount] = useState(0); // ?? AMÉLIORATION
  const [todayPayeesCount, setTodayPayeesCount] = useState(0); // ?? AMÉLIORATION
  const [lastFactures, setLastFactures] = useState([]);
  const [occupationLits, setOccupationLits] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [consultationsJour, setConsultationsJour] = useState([]);
  const [evolutionData, setEvolutionData] = useState(null);
  const [motifsData, setMotifsData] = useState(null);
  const [consultationsEvolutionData, setConsultationsEvolutionData] = useState(null);
  const [dailyRevenueData, setDailyRevenueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Horloge
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getDateRange = (period) => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    end.setHours(23, 59, 59, 999);

    switch (period) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'year':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setHours(0, 0, 0, 0);
    }
    return { start, end };
  };

  const filterByPeriod = (items, dateField, period) => {
    const { start, end } = getDateRange(period);
    return items.filter(item => {
      const d = new Date(item[dateField]);
      return d >= start && d <= end;
    });
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { start, end } = getDateRange(period);
      const dateDebut = start.toISOString();
      const dateFin = end.toISOString();

      const [
        patientsRes,
        admissionsRes,
        litsRes,
        urgencesRes,
        facturesRes,
        medicamentsRes,
        employesRes,
        absencesRes,
        interventionsRes,
        rendezvousRes
      ] = await Promise.allSettled([
        api.get('/patients'),
        api.get('/consultations/admissions'),
        api.get('/consultations/lits/all'),
        api.get('/consultations/urgences'),
        api.get('/billing/factures'),
        api.get('/pharmacy/medicaments'),
        api.get('/employes'),
        api.get('/absences'),
        api.get('/bloc/interventions', { 
          params: { 
            date_debut: dateDebut,
            date_fin: dateFin
          }
        }),
        api.get('/consultations/rendezvous')
      ]);

      const patients = patientsRes.status === 'fulfilled' ? patientsRes.value.data || [] : [];
      const admissions = admissionsRes.status === 'fulfilled' ? admissionsRes.value.data || [] : [];
      const lits = litsRes.status === 'fulfilled' ? litsRes.value.data || [] : [];
      const urgences = urgencesRes.status === 'fulfilled' ? urgencesRes.value.data || [] : [];
      const factures = facturesRes.status === 'fulfilled' ? facturesRes.value.data || [] : [];
      const medicaments = medicamentsRes.status === 'fulfilled' ? medicamentsRes.value.data || [] : [];
      const employes = employesRes.status === 'fulfilled' ? employesRes.value.data || [] : [];
      const absences = absencesRes.status === 'fulfilled' ? absencesRes.value.data || [] : [];
      const interventionsData = interventionsRes.status === 'fulfilled' ? interventionsRes.value.data || [] : [];
      const rendezvous = rendezvousRes.status === 'fulfilled' ? rendezvousRes.value.data || [] : [];

      // --- Patients hospitalisés ---
      const patientsActifs = patients.filter(p => p.lit_id !== null && p.lit_id !== undefined).length;

      // --- Lits ---
      const totalLits = lits.length;
      const litsOccupes = lits.filter(l => l.disponible === false).length;
      const tauxOccupation = totalLits > 0 ? Math.round((litsOccupes / totalLits) * 100) : 0;

      // --- Admissions ---
      const filteredAdmissions = admissions.filter(a => {
        const d = new Date(a.date_admission);
        return d >= start && d <= end;
      });
      const admissionsCount = filteredAdmissions.length;

      // --- Sorties ---
      const sortiesCount = patients.filter(p => {
        if (!p.date_sortie) return false;
        const d = new Date(p.date_sortie);
        return d >= start && d <= end;
      }).length;

      // --- Urgences ---
      const filteredUrgences = filterByPeriod(urgences, 'heure_arrivee', period);
      const urgencesCount = filteredUrgences.length;

      // --- Factures ---
      const filteredFactures = filterByPeriod(factures, 'date_emission', period);
      const ca = filteredFactures.reduce((sum, f) => sum + (parseFloat(f.montant_total) || 0), 0);
      const impayes = factures
        .filter(f => f.statut !== 'payé' && f.statut !== 'payee')
        .reduce((sum, f) => sum + (parseFloat(f.montant_total) || 0), 0);

      // --- Compteurs du jour (factures totales et payées) --- ?? AMÉLIORATION
      const todayStr = new Date().toISOString().split('T')[0];
      const facturesAujourdhui = factures.filter(f => {
        const d = new Date(f.date_emission);
        return d.toISOString().split('T')[0] === todayStr;
      });
      setTodayFacturesCount(facturesAujourdhui.length);
      const payeesAujourdhui = facturesAujourdhui.filter(f => f.statut === 'payee' || f.statut === 'payé');
      setTodayPayeesCount(payeesAujourdhui.length);

      // --- Dernières factures (20 plus récentes) --- ?? AMÉLIORATION (20 au lieu de 10)
      const sortedFactures = [...factures].sort((a, b) => new Date(b.date_emission) - new Date(a.date_emission));
      setLastFactures(sortedFactures.slice(0, 20));

      // --- Facturation journalière (30 jours) ---
      const dailyTotals = {};
      let todayTotal = 0;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      factures.forEach(f => {
        const date = new Date(f.date_emission || f.date_creation);
        if (date >= thirtyDaysAgo) {
          const key = date.toISOString().split('T')[0];
          const montant = parseFloat(f.montant_total) || 0;
          dailyTotals[key] = (dailyTotals[key] || 0) + montant;
          if (key === todayStr) {
            todayTotal += montant;
          }
        }
      });
      setTodayRevenue(todayTotal);

      const sortedDates = Object.keys(dailyTotals).sort();
      const dailyLabels = sortedDates.map(d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
      const dailyValues = sortedDates.map(d => dailyTotals[d]);

      setDailyRevenueData({
        labels: dailyLabels,
        datasets: [
          {
            label: 'CA journalier (FC)',
            data: dailyValues,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.4,
          },
        ],
      });

      // --- Bloc ---
      const blocCount = interventionsData.length;

      // --- Médicaments critiques ---
      const medicCritiques = medicaments.filter(m => (m.stock || 0) < (m.seuil_alerte || 5)).length;

      // --- Personnel ---
      const medecins = employes.filter(e => e.role === 'medecin' || e.poste === 'Médecin').length;
      const infirmiers = employes.filter(e => e.role === 'infirmier' || e.poste === 'Infirmier').length;
      const absencesCount = absences.filter(a => a.statut === 'en_cours' || a.statut === 'approuvé').length;

      // --- Consultations du jour ---
      const consultationsToday = rendezvous.filter(rv => {
        const rvDate = new Date(rv.date_rdv).toISOString().split('T')[0];
        return rvDate === todayStr;
      });
      setConsultationsJour(consultationsToday);

      // --- Stats ---
      setStats({
        patients: patientsActifs,
        admissions: admissionsCount,
        sorties: sortiesCount,
        urgences: urgencesCount,
        bloc: blocCount,
        litsOccupes,
        totalLits,
        tauxOccupation,
        ca,
        impayes,
        medicCritiques,
        medecins,
        infirmiers,
        absences: absencesCount,
        equipementsPanne: 0,
      });

      // --- Occupation lits ---
      const litsParBatiment = {};
      lits.forEach(lit => {
        const batiment = lit.batiment || 'A';
        const etage = lit.etage || 'RDC';
        const key = `${batiment}-${etage}`;
        if (!litsParBatiment[key]) {
          litsParBatiment[key] = { batiment, etage, total: 0, occupes: 0 };
        }
        litsParBatiment[key].total++;
        if (lit.disponible === false) litsParBatiment[key].occupes++;
      });
      setOccupationLits(Object.values(litsParBatiment));

      setInterventions(interventionsData);

      // --- Graphique Évolution admissions/sorties (12 mois) ---
      const months = [];
      const admissionsCountByMonth = [];
      const sortiesCountByMonth = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleString('fr-FR', { month: 'short' });
        months.push(month);

        const startMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const countAdmissions = admissions.filter(a => {
          const d = new Date(a.date_admission);
          return d >= startMonth && d <= endMonth;
        }).length;
        admissionsCountByMonth.push(countAdmissions);

        const countSorties = patients.filter(p => {
          if (!p.date_sortie) return false;
          const d = new Date(p.date_sortie);
          return d >= startMonth && d <= endMonth;
        }).length;
        sortiesCountByMonth.push(countSorties);
      }

      setEvolutionData({
        labels: months,
        datasets: [
          {
            label: 'Admissions',
            data: admissionsCountByMonth,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
          },
          {
            label: 'Sorties',
            data: sortiesCountByMonth,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
          },
        ],
      });

      // --- Graphique Évolution des consultations (12 mois) ---
      const consultationsCountByMonth = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const startMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const count = rendezvous.filter(rv => {
          const d = new Date(rv.date_rdv);
          return d >= startMonth && d <= endMonth;
        }).length;
        consultationsCountByMonth.push(count);
      }

      setConsultationsEvolutionData({
        labels: months,
        datasets: [
          {
            label: 'Consultations',
            data: consultationsCountByMonth,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true,
            tension: 0.4,
          },
        ],
      });

      // --- Motifs d'admission (période) ---
      const motifs = {};
      filteredAdmissions.forEach(a => {
        const motif = a.motif || a.type || 'Autre';
        motifs[motif] = (motifs[motif] || 0) + 1;
      });
      const motifLabels = Object.keys(motifs);
      const motifValues = Object.values(motifs);
      const colors = ['#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6'];

      setMotifsData({
        labels: motifLabels,
        datasets: [
          {
            label: 'Motifs d\'admission',
            data: motifValues,
            backgroundColor: colors.slice(0, motifLabels.length),
            borderWidth: 0,
          },
        ],
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('? Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);
    return () => clearInterval(interval);
  }, [period]);

  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const StatCard = ({ icon: Icon, label, value, color, subtitle }) => (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        flex: '1 1 180px',
        minWidth: '160px',
        border: '1px solid #f1f5f9',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{value}</div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>{label}</div>
          {subtitle && (
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{subtitle}</div>
          )}
        </div>
        <div
          style={{
            backgroundColor: color,
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon style={{ color: 'white', fontSize: '20px' }} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3b82f6', borderRadius: '50%', width: '50px', height: '50px', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f0f4ff 0%, #e8edf5 100%)',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* En-tête */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
            ?? Tableau de bord hospitalier
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>
            Vue d'ensemble en temps réel
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            backgroundColor: 'white',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
              {formatDate(currentTime)}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              {formatTime(currentTime)}
            </div>
          </div>
          <button
            onClick={fetchDashboardData}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 'bold',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            <FaSync /> Rafraîchir
          </button>
        </div>
      </div>

      {/* Filtres temporels */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        backgroundColor: 'white',
        padding: '12px 20px',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        justifyContent: 'center',
      }}>
        <button
          onClick={() => setPeriod('day')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: period === 'day' ? '#3b82f6' : '#e2e8f0',
            color: period === 'day' ? 'white' : '#0f172a',
            fontWeight: period === 'day' ? 'bold' : 'normal',
          }}
        >
          <FaCalendarDay /> Aujourd'hui
        </button>
        <button
          onClick={() => setPeriod('week')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: period === 'week' ? '#3b82f6' : '#e2e8f0',
            color: period === 'week' ? 'white' : '#0f172a',
            fontWeight: period === 'week' ? 'bold' : 'normal',
          }}
        >
          <FaCalendarWeek /> Cette semaine
        </button>
        <button
          onClick={() => setPeriod('month')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: period === 'month' ? '#3b82f6' : '#e2e8f0',
            color: period === 'month' ? 'white' : '#0f172a',
            fontWeight: period === 'month' ? 'bold' : 'normal',
          }}
        >
          <FaCalendarAlt /> Ce mois
        </button>
        <button
          onClick={() => setPeriod('year')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: period === 'year' ? '#3b82f6' : '#e2e8f0',
            color: period === 'year' ? 'white' : '#0f172a',
            fontWeight: period === 'year' ? 'bold' : 'normal',
          }}
        >
          <FaCalendarCheck /> Cette année
        </button>
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#94a3b8' }}>
          Dernière mise à jour : {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* Grille des statistiques */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <StatCard icon={FaUsers} label="Patients présents" value={stats.patients} color="#3b82f6" />
        <StatCard icon={FaUserPlus} label="Admissions" value={stats.admissions} color="#10b981" />
        <StatCard icon={FaUserMinus} label="Sorties" value={stats.sorties} color="#8b5cf6" />
        <StatCard icon={FaAmbulance} label="Urgences" value={stats.urgences} color="#ef4444" />
        <StatCard icon={FaHospital} label="Bloc opératoire" value={stats.bloc} color="#f59e0b" />
        <StatCard 
          icon={FaBed} 
          label="Lits occupés" 
          value={`${stats.litsOccupes}/${stats.totalLits}`} 
          color="#14b8a6"
          subtitle={`Taux: ${stats.tauxOccupation}%`}
        />
        <StatCard icon={FaEuroSign} label="CA (période)" value={`${stats.ca.toLocaleString()} FC`} color="#22c55e" />
        <StatCard icon={FaMoneyBillWave} label="Impayés" value={`${stats.impayes.toLocaleString()} FC`} color="#ef4444" />
        <StatCard icon={FaEuroSign} label="CA aujourd'hui" value={`${todayRevenue.toFixed(2)} FC`} color="#22c55e" />
        {/* ?? AMÉLIORATION : nouvelles cartes factures */}
        <StatCard icon={FaFileInvoice} label="Factures aujourd'hui" value={todayFacturesCount} color="#3b82f6" />
        <StatCard icon={FaCheckCircle} label="Payées aujourd'hui" value={todayPayeesCount} color="#10b981" />
        <StatCard icon={FaExclamationTriangle} label="Médic. critiques" value={stats.medicCritiques} color="#f97316" />
        <StatCard icon={FaWrench} label="Équipements panne" value={stats.equipementsPanne || 0} color="#dc2626" />
        <StatCard icon={FaUserMd} label="Médecins présents" value={stats.medecins} color="#6366f1" />
        <StatCard icon={FaUserNurse} label="Infirmiers présents" value={stats.infirmiers} color="#ec4899" />
        <StatCard icon={FaUserSlash} label="Absences" value={stats.absences} color="#f43f5e" />
      </div>

      {/* Graphiques (inchangés) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '24px',
        marginBottom: '24px',
      }}>
        {/* ... vos graphiques existants ... */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 16px 0' }}>
            ?? Évolution admissions/sorties (12 mois)
          </h3>
          {evolutionData ? (
            <Line
              data={evolutionData}
              options={{
                responsive: true,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } },
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
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 16px 0' }}>
            ?? Motifs d'admission ({period === 'day' ? 'auj.' : period === 'week' ? 'cette semaine' : period === 'month' ? 'ce mois' : 'cette année'})
          </h3>
          {motifsData && motifsData.labels.length > 0 ? (
            <div style={{ maxWidth: '280px', margin: '0 auto' }}>
              <Doughnut
                data={motifsData}
                options={{
                  responsive: true,
                  plugins: { legend: { position: 'right' } },
                }}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              Aucune donnée
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 16px 0' }}>
            ?? Évolution des consultations (12 mois)
          </h3>
          {consultationsEvolutionData ? (
            <Line
              data={consultationsEvolutionData}
              options={{
                responsive: true,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } },
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
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 16px 0' }}>
            ?? Évolution de la facturation (30 derniers jours)
          </h3>
          {dailyRevenueData ? (
            <Line
              data={dailyRevenueData}
              options={{
                responsive: true,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              Données insuffisantes
            </div>
          )}
        </div>
      </div>

      {/* ?? AMÉLIORATION : Section des dernières factures (plus visible) */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        marginBottom: '24px',
        marginTop: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>
            ?? Dernières factures (20 plus récentes)
          </h3>
          <Link to="/factures" style={{ color: '#3b82f6', fontSize: '14px', textDecoration: 'none' }}>
            Voir toutes ?
          </Link>
        </div>
        {lastFactures.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
            Aucune facture trouvée
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>N°</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Patient</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Date émission</th>
                  <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Montant total</th>
                  <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Payé</th>
                  <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Statut</th>
                  <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {lastFactures.map((f, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px' }}>{f.numero_facture || f.id}</td>
                    <td style={{ padding: '10px' }}>{f.patient_nom} {f.patient_prenom}</td>
                    <td style={{ padding: '10px' }}>{new Date(f.date_emission).toLocaleDateString('fr-FR')}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{parseFloat(f.montant_total).toFixed(2)} FC</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{parseFloat(f.montant_paye || 0).toFixed(2)} FC</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: (f.statut === 'payee' || f.statut === 'payé') ? '#10b981' : '#ef4444',
                        color: 'white',
                        padding: '2px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                      }}>
                        {(f.statut === 'payee' || f.statut === 'payé') ? 'Payée' : 'Impayée'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <Link to={`/factures/${f.id}`} style={{ color: '#3b82f6' }}>
                        <FaFileInvoice /> Détail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Consultations du jour */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 16px 0' }}>
          ?? Consultations du jour ({new Date().toLocaleDateString('fr-FR')})
        </h3>
        {consultationsJour.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
            <FaStethoscope style={{ fontSize: '40px', marginBottom: '8px' }} />
            <p>Aucune consultation prévue aujourd'hui</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Patient</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Médecin</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Date / Heure</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Motif</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {consultationsJour.map((rv, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px' }}>
                      {rv.patient_nom} {rv.patient_prenom}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {rv.medecin_nom} {rv.medecin_prenom}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {new Date(rv.date_rdv).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td style={{ padding: '12px' }}>{rv.motif || 'N/C'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        backgroundColor: rv.statut === 'terminé' ? '#10b981' :
                                      rv.statut === 'annulé' ? '#ef4444' : '#3b82f6',
                        color: 'white',
                        padding: '2px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                      }}>
                        {rv.statut || 'Planifié'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interventions chirurgicales */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 16px 0' }}>
          ?? Interventions chirurgicales ({period === 'day' ? 'auj.' : period === 'week' ? 'cette semaine' : period === 'month' ? 'ce mois' : 'cette année'})
        </h3>
        {interventions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <FaHospital style={{ fontSize: '48px', marginBottom: '12px' }} />
            <p>Aucune intervention prévue pour cette période</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Patient</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Intervention</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Chirurgien</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {interventions.slice(0, 10).map((inter, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px' }}>{inter.patient_nom || inter.nom_patient || 'N/C'}</td>
                    <td style={{ padding: '12px' }}>{inter.type_intervention || inter.motif || 'N/C'}</td>
                    <td style={{ padding: '12px' }}>{inter.chirurgien_nom || inter.chirurgien || inter.medecin || 'N/C'}</td>
                    <td style={{ padding: '12px' }}>{new Date(inter.date_prevue || inter.date_intervention).toLocaleDateString('fr-FR')}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        backgroundColor: inter.statut === 'terminé' ? '#10b981' : 
                                      inter.statut === 'en_cours' ? '#f59e0b' : '#3b82f6',
                        color: 'white',
                        padding: '2px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                      }}>
                        {inter.statut || 'Planifié'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Occupation des lits */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 16px 0' }}>
          ?? Occupation détaillée des lits par bâtiment et étage
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Bâtiment</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Étage</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Total lits</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Occupés</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Taux</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Répartition</th>
              </tr>
            </thead>
            <tbody>
              {occupationLits.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                    Aucune donnée d'occupation des lits disponible
                  </td>
                </tr>
              ) : (
                occupationLits.map((item, index) => {
                  const taux = item.total > 0 ? Math.round((item.occupes / item.total) * 100) : 0;
                  const color = taux < 30 ? '#10b981' : taux < 70 ? '#f59e0b' : '#ef4444';
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px' }}>{item.batiment}</td>
                      <td style={{ padding: '12px' }}>{item.etage}</td>
                      <td style={{ padding: '12px' }}>{item.total}</td>
                      <td style={{ padding: '12px' }}>{item.occupes}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          backgroundColor: color, 
                          color: 'white', 
                          padding: '2px 10px', 
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}>
                          {taux}%
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{
                          width: '100%',
                          maxWidth: '200px',
                          height: '8px',
                          backgroundColor: '#e2e8f0',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${taux}%`,
                            height: '100%',
                            backgroundColor: color,
                            borderRadius: '4px',
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
