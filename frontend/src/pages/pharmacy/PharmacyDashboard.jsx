import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../axios';
import {
  FaPrescriptionBottle,
  FaExclamationTriangle,
  FaBoxes,
  FaShoppingCart,
  FaSyringe,
  FaHistory,
  FaCheckCircle,
  FaClock,
  FaBoxOpen,
  FaArrowRight,
  FaPills,
  FaTrophy,
  FaMedal,
  FaStar
} from 'react-icons/fa';

// ============================================================
// Widget réutilisable
// ============================================================
const Widget = ({ icon, label, value, color, bgColor, onClick, loading }) => (
  <div
    onClick={onClick}
    style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '22px 24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #f1f5f9',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.25s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '18px',
      height: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}
    onMouseEnter={e => {
      if (onClick) {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)';
      }
    }}
    onMouseLeave={e => {
      if (onClick) {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
      }
    }}
  >
    <div style={{
      width: '56px',
      height: '56px',
      borderRadius: '14px',
      backgroundColor: bgColor || `${color}15`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      color: color,
      flexShrink: 0
    }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: 1.1 }}>
        {loading ? '…' : value}
      </div>
    </div>
  </div>
);

// ============================================================
// Badge de statut
// ============================================================
const StatutBadge = ({ statut }) => {
  const config = {
    en_attente: { bg: '#fef3c7', color: '#92400e', label: 'En attente' },
    delivree: { bg: '#d1fae5', color: '#065f46', label: 'Délivrée' },
    servie: { bg: '#d1fae5', color: '#065f46', label: 'Servie' },
    partiellement_delivree: { bg: '#dbeafe', color: '#1e40af', label: 'Partielle' }
  };
  const c = config[statut] || { bg: '#f1f5f9', color: '#475569', label: statut };
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: c.bg,
      color: c.color
    }}>
      {c.label}
    </span>
  );
};

// ============================================================
// Composant principal
// ============================================================
const PharmacyDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ordonnances, setOrdonnances] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [topMedicaments, setTopMedicaments] = useState([]);
  const [alertes, setAlertes] = useState({ stockCritique: [], peremptionProche: [] });
  const [commandes, setCommandes] = useState([]);
  const [stats, setStats] = useState({
    enAttente: 0,
    alertesCount: 0,
    commandesEnCours: 0,
    medicamentsEnStock: 0
  });
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (message, type = 'success') => {
    setToast(message);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    try {
      const [statsRes, attenteRes, histRes, topRes, alertesRes, commandesRes] =
        await Promise.allSettled([
          api.get('/pharmacy/stats'),
          api.get('/pharmacy/ordonnances/en-attente'),
          api.get('/pharmacy/ordonnances/historique'),
          api.get('/pharmacy/medicaments/top?limit=10'),
          api.get('/pharmacy/alertes'),
          api.get('/pharmacy/commandes')
        ]);

      const statsData = statsRes.status === 'fulfilled' ? statsRes.value.data : {};
      const attente = attenteRes.status === 'fulfilled' ? attenteRes.value.data : [];
      const hist = histRes.status === 'fulfilled' ? histRes.value.data : [];
      const top = topRes.status === 'fulfilled' ? topRes.value.data : [];
      const alerts = alertesRes.status === 'fulfilled'
        ? alertesRes.value.data
        : { stockCritique: [], peremptionProche: [] };
      const cmds = commandesRes.status === 'fulfilled' ? commandesRes.value.data : [];

      setStats({
        enAttente: statsData.ordonnancesEnAttente ?? attente.length,
        alertesCount: statsData.alertesStock ?? (alerts.stockCritique?.length || 0),
        commandesEnCours: statsData.commandesEnCours ?? 0,
        medicamentsEnStock: statsData.medicamentsEnStock ?? 0
      });
      setOrdonnances(attente || []);
      setHistorique(hist || []);
      setTopMedicaments(top || []);
      setAlertes(alerts);
      setCommandes(cmds || []);
    } catch (err) {
      console.error('Erreur chargement du tableau de bord :', err);
      showToast('Erreur chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Médaille dynamique pour le top 3
  const getMedalIcon = (index) => {
    if (index === 0) return <FaTrophy style={{ color: '#eab308' }} />;
    if (index === 1) return <FaMedal style={{ color: '#94a3b8' }} />;
    if (index === 2) return <FaMedal style={{ color: '#b45309' }} />;
    return <span style={{ color: '#94a3b8', fontWeight: '600', fontSize: '14px' }}>#{index + 1}</span>;
  };

  const getMedalBg = (index) => {
    if (index === 0) return '#fef3c7';
    if (index === 1) return '#f1f5f9';
    if (index === 2) return '#fef2f2';
    return '#f8fafc';
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '32px 16px' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '14px 24px',
          borderRadius: '10px',
          zIndex: 1000,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          fontWeight: '500'
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* En-tête */}
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', margin: 0, marginBottom: '6px' }}>
              📊 Tableau de bord Pharmacie
            </h1>
            <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
              Vue d'ensemble de l'activité — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={fetchData}
            style={{
              backgroundColor: 'white', border: '1px solid #e2e8f0',
              padding: '10px 18px', borderRadius: '10px', cursor: 'pointer',
              fontSize: '14px', fontWeight: '500', color: '#475569',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            🔄 Actualiser
          </button>
        </div>

        {/* Widgets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '32px' }}>
          <Widget
            icon={<FaPrescriptionBottle />}
            label="Ordonnances en attente"
            value={stats.enAttente}
            color="#3b82f6"
            loading={loading}
            onClick={() => navigate('/pharmacist/prescriptions')}
          />
          <Widget
            icon={<FaExclamationTriangle />}
            label="Alertes stock"
            value={stats.alertesCount}
            color="#ef4444"
            loading={loading}
            onClick={() => navigate('/medicaments')}
          />
          <Widget
            icon={<FaShoppingCart />}
            label="Commandes en cours"
            value={stats.commandesEnCours}
            color="#f59e0b"
            loading={loading}
            onClick={() => navigate('/pharmacy/commandes')}
          />
          <Widget
            icon={<FaBoxOpen />}
            label="Médicaments en stock"
            value={stats.medicamentsEnStock}
            color="#10b981"
            loading={loading}
            onClick={() => navigate('/medicaments')}
          />
        </div>

        {/* ===== TOP MÉDICAMENTS DÉLIVRÉS ===== */}
        <div style={{
          backgroundColor: 'white', borderRadius: '16px', padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaTrophy style={{ color: '#eab308' }} />
              Top 10 des médicaments les plus délivrés
            </h2>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Basé sur l'historique des délivrances
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>⏳ Chargement…</div>
          ) : topMedicaments.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '42px', marginBottom: '12px' }}>📊</div>
              <div style={{ color: '#64748b', fontWeight: '500' }}>Aucune délivrance enregistrée</div>
              <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>Le classement apparaîtra après les premières délivrances.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topMedicaments.map((med, index) => {
                const maxTotal = topMedicaments[0]?.total_delivre || 1;
                const pct = Math.round((med.total_delivre / maxTotal) * 100);
                return (
                  <div
                    key={med.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '16px',
                      padding: '12px 16px', borderRadius: '10px',
                      backgroundColor: index < 3 ? getMedalBg(index) : '#fafafa',
                      border: '1px solid #f1f5f9',
                      transition: 'all 0.2s'
                    }}
                  >
                    {/* Rang / Médaille */}
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: 'white', fontSize: '18px', flexShrink: 0,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                    }}>
                      {getMedalIcon(index)}
                    </div>

                    {/* Nom + code */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '15px' }}>
                        {med.nom}
                        {med.forme && <span style={{ color: '#94a3b8', fontWeight: '400' }}> · {med.forme}</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                        {med.code || `MED${med.id}`} · {med.nb_delivrances} délivrance{med.nb_delivrances > 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Barre de progression */}
                    <div style={{
                      flex: '0 0 180px', height: '8px', backgroundColor: '#e5e7eb',
                      borderRadius: '4px', overflow: 'hidden', position: 'relative'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: index === 0 ? '#eab308' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#10b981',
                        borderRadius: '4px',
                        transition: 'width 0.6s ease'
                      }} />
                    </div>

                    {/* Total */}
                    <div style={{
                      minWidth: '80px', textAlign: 'right', fontWeight: '700',
                      color: index < 3 ? '#0f172a' : '#475569', fontSize: '16px'
                    }}>
                      {med.total_delivre}
                      <span style={{ fontWeight: '400', fontSize: '12px', color: '#94a3b8', marginLeft: '4px' }}>
                        unités
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ===== ORDONNANCES EN ATTENTE ===== */}
        <div style={{
          backgroundColor: 'white', borderRadius: '16px', padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaClock style={{ color: '#f59e0b' }} />
              Ordonnances en attente
              {stats.enAttente > 0 && (
                <span style={{
                  backgroundColor: '#fef3c7', color: '#92400e', fontSize: '12px',
                  padding: '3px 10px', borderRadius: '12px', fontWeight: '600'
                }}>{stats.enAttente}</span>
              )}
            </h2>
            {ordonnances.length > 0 && (
              <button
                onClick={() => navigate('/pharmacist/prescriptions')}
                style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Tout voir <FaArrowRight size={12} />
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>⏳ Chargement…</div>
          ) : ordonnances.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '42px', marginBottom: '12px' }}>✅</div>
              <div style={{ color: '#64748b', fontWeight: '500' }}>Aucune ordonnance en attente</div>
              <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>Toutes les ordonnances ont été traitées.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Patient</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Médecin</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ordonnances.map(ord => (
                    <tr key={ord.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '14px 8px', color: '#0f172a', fontWeight: '500' }}>
                        {ord.patient_prenom} {ord.patient_nom}
                      </td>
                      <td style={{ padding: '14px 8px', color: '#475569' }}>
                        Dr. {ord.medecin_prenom} {ord.medecin_nom}
                      </td>
                      <td style={{ padding: '14px 8px', color: '#64748b', fontSize: '14px' }}>
                        {ord.date_creation ? new Date(ord.date_creation).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                        <button
                          onClick={() => navigate(`/delivrance/${ord.id}`)}
                          style={{
                            background: '#3b82f6', color: 'white', border: 'none',
                            padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            fontSize: '13px', fontWeight: '500'
                          }}
                        >
                          <FaSyringe size={12} /> Délivrer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ===== HISTORIQUE ===== */}
        <div style={{
          backgroundColor: 'white', borderRadius: '16px', padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaHistory style={{ color: '#3b82f6' }} />
            Historique des ordonnances délivrées
          </h2>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>⏳ Chargement…</div>
          ) : historique.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '42px', marginBottom: '12px' }}>📭</div>
              <div style={{ color: '#64748b', fontWeight: '500' }}>Aucune ordonnance délivrée pour le moment</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>N° Ordonnance</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Patient</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Médecin</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Retiré par</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {historique.slice(0, 20).map(ord => (
                    <tr key={ord.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '14px 8px', color: '#3b82f6', fontWeight: '600', fontFamily: 'monospace', fontSize: '13px' }}>
                        {ord.numero_ordonnance || `ORD-${String(ord.id).padStart(4, '0')}`}
                      </td>
                      <td style={{ padding: '14px 8px', color: '#0f172a', fontWeight: '500' }}>
                        {ord.patient_prenom} {ord.patient_nom}
                      </td>
                      <td style={{ padding: '14px 8px', color: '#475569' }}>
                        Dr. {ord.medecin_prenom} {ord.medecin_nom}
                      </td>
                      <td style={{ padding: '14px 8px', color: '#64748b', fontSize: '14px' }}>
                        {ord.date_creation ? new Date(ord.date_creation).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td style={{ padding: '14px 8px', color: '#475569' }}>
                        {ord.retrieved_prenom ? `${ord.retrieved_prenom} ${ord.retrieved_nom}` : '—'}
                      </td>
                      <td style={{ padding: '14px 8px' }}>
                        <StatutBadge statut={ord.statut} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ===== ALERTES DE STOCK ===== */}
        <div style={{
          backgroundColor: 'white', borderRadius: '16px', padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaExclamationTriangle style={{ color: '#ef4444' }} />
            Alertes de stock
            {alertes.stockCritique?.length > 0 && (
              <span style={{
                backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '12px',
                padding: '3px 10px', borderRadius: '12px', fontWeight: '600'
              }}>{alertes.stockCritique.length}</span>
            )}
          </h2>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>⏳ Chargement…</div>
          ) : !alertes.stockCritique || alertes.stockCritique.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <FaCheckCircle style={{ fontSize: '42px', color: '#10b981', marginBottom: '12px' }} />
              <div style={{ color: '#64748b', fontWeight: '500' }}>Aucun stock critique</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {alertes.stockCritique.slice(0, 12).map(m => (
                <div
                  key={m.id}
                  style={{
                    padding: '14px 16px', backgroundColor: '#fef2f2',
                    borderRadius: '10px', border: '1px solid #fee2e2',
                    display: 'flex', alignItems: 'center', gap: '12px'
                  }}
                >
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    backgroundColor: '#fee2e2', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#dc2626', flexShrink: 0
                  }}>
                    <FaPills />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.nom}
                    </div>
                    <div style={{ fontSize: '12px', color: '#991b1b' }}>
                      Stock: {m.stock} / Seuil: {m.seuil_alerte || '—'}
                    </div>
                  </div>
                </div>
              ))}
              {alertes.stockCritique.length > 12 && (
                <div style={{ padding: '14px 16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  +{alertes.stockCritique.length - 12} autres médicaments en alerte
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PharmacyDashboard;