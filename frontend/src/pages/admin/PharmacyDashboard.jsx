import { useEffect, useState } from 'react';
import { FaPills, FaExclamationTriangle, FaShoppingCart, FaBoxes, FaClipboardList } from 'react-icons/fa';
import api from '../../axios'; // ✅ Utilisation de l'instance partagée

const PharmacyDashboard = () => {
  const [stats, setStats] = useState({
    totalMedicaments: 0,
    totalLots: 0,
    alertesStock: 0,
    alertesPeremption: 0,
    commandesEnCours: 0,
    delivrancesAujourdhui: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [meds, alertes, commandes] = await Promise.all([
          api.get('/pharmacy/medicaments'),
          api.get('/pharmacy/alertes'),
          api.get('/pharmacy/commandes')
        ]);
        
        // Compter les lots (on pourrait faire une requête dédiée, mais on utilise les données existantes)
        const lotsCount = meds.data.reduce((acc, m) => acc + (m.stock_reel_lots || 0), 0);
        
        setStats({
          totalMedicaments: meds.data.length,
          totalLots: lotsCount,
          alertesStock: alertes.data.stockCritique?.length || 0,
          alertesPeremption: alertes.data.peremptionProche?.length || 0,
          commandesEnCours: commandes.data.filter(c => c.statut === 'en_cours').length || 0,
          delivrancesAujourdhui: 0 // À compléter avec une requête dédiée si besoin
        });
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Chargement...</div>;

  const Card = ({ icon, title, value, color }) => (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      borderLeft: `4px solid ${color}`,
      flex: '1 1 200px',
      minWidth: '180px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <span style={{ fontSize: '24px', color }}>{icon}</span>
        <span style={{ fontSize: '14px', color: '#6b7280' }}>{title}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937' }}>{value}</div>
    </div>
  );

  return (
    <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
      <h2 style={{ marginBottom: '20px' }}>📊 Tableau de bord de la Pharmacie</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '30px' }}>
        <Card icon={<FaPills />} title="Médicaments" value={stats.totalMedicaments} color="#3b82f6" />
        <Card icon={<FaBoxes />} title="Total lots" value={stats.totalLots} color="#8b5cf6" />
        <Card icon={<FaExclamationTriangle />} title="Alertes stock" value={stats.alertesStock} color="#ef4444" />
        <Card icon={<FaExclamationTriangle />} title="Péremption proche" value={stats.alertesPeremption} color="#f59e0b" />
        <Card icon={<FaShoppingCart />} title="Commandes en cours" value={stats.commandesEnCours} color="#10b981" />
        <Card icon={<FaClipboardList />} title="Délivrances aujourd'hui" value={stats.delivrancesAujourdhui} color="#6366f1" />
      </div>
      <div style={{ padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          💡 Ce tableau de bord vous donne une vue d'ensemble de l'activité de la pharmacie.
          Les données sont mises à jour automatiquement.
        </p>
      </div>
    </div>
  );
};

export default PharmacyDashboard;