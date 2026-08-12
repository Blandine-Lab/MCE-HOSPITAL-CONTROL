// src/pages/finances/DashboardFinances.jsx
import { useState, useEffect } from 'react';
import api from '../../axios';
import { FaMoneyBillWave, FaFileInvoice, FaCreditCard, FaChartLine } from 'react-icons/fa';

const DashboardFinances = () => {
  const [stats, setStats] = useState({
    total_ecritures: 0,
    ecritures_validees: 0,
    total_debit: 0,
    total_credit: 0
  });
  const [loading, setLoading] = useState(true);
  const [dernieresEcritures, setDernieresEcritures] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/ecritures/stats/global'),
      api.get('/ecritures?limit=5')
    ]).then(([statsRes, ecrituresRes]) => {
      setStats(statsRes.data);
      setDernieresEcritures(ecrituresRes.data);
      setLoading(false);
    }).catch(err => {
      console.error('Erreur chargement stats financires :', err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>? Chargement...</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '28px', color: '#0f172a', marginBottom: '24px' }}>
        <FaChartLine style={{ color: '#f59e0b', marginRight: '12px' }} />
        Tableau de bord financier
      </h1>

      {/* Statistiques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <FaMoneyBillWave style={{ fontSize: '32px', color: '#10b981' }} />
          <p style={{ margin: '8px 0 4px', color: '#64748b' }}>Total Dbit</p>
          <h2 style={{ margin: 0, color: '#0f172a' }}>{Number(stats.total_debit || 0).toLocaleString('fr-FR')} FCFA</h2>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <FaCreditCard style={{ fontSize: '32px', color: '#ef4444' }} />
          <p style={{ margin: '8px 0 4px', color: '#64748b' }}>Total Crdit</p>
          <h2 style={{ margin: 0, color: '#0f172a' }}>{Number(stats.total_credit || 0).toLocaleString('fr-FR')} FCFA</h2>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <FaFileInvoice style={{ fontSize: '32px', color: '#3b82f6' }} />
          <p style={{ margin: '8px 0 4px', color: '#64748b' }}>Total critures</p>
          <h2 style={{ margin: 0, color: '#0f172a' }}>{stats.total_ecritures || 0}</h2>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <FaChartLine style={{ fontSize: '32px', color: '#8b5cf6' }} />
          <p style={{ margin: '8px 0 4px', color: '#64748b' }}>critures valides</p>
          <h2 style={{ margin: 0, color: '#0f172a' }}>{stats.ecritures_validees || 0}</h2>
        </div>
      </div>

      {/* Dernires critures */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px' }}>
        <h3 style={{ marginTop: 0, color: '#0f172a' }}>?? Dernires critures</h3>
        {dernieresEcritures.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>Aucune criture enregistre</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569' }}>N Pice</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569' }}>Date</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569' }}>Libell</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>Montant</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {dernieresEcritures.map((e, index) => (
                <tr key={e.id} style={{ borderBottom: index === dernieresEcritures.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px', fontWeight: '500' }}>{e.numero_piece}</td>
                  <td style={{ padding: '8px 12px' }}>{new Date(e.date_ecriture).toLocaleDateString('fr-FR')}</td>
                  <td style={{ padding: '8px 12px' }}>{e.libelle}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{Number(e.montant_total).toLocaleString('fr-FR')} FCFA</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: e.statut === 'valid' ? '#d1fae5' : e.statut === 'annul' ? '#fee2e2' : '#fef3c7',
                      color: e.statut === 'valid' ? '#065f46' : e.statut === 'annul' ? '#991b1b' : '#92400e'
                    }}>
                      {e.statut === 'valid' ? '? Valid' : e.statut === 'annul' ? '? Annul' : '?? Brouillon'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DashboardFinances;
