import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';

function readUserFromStorage() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function HospitalsList() {
  const navigate = useNavigate();
  const { user: ctxUser, logout } = useAuth();

  const [user, setUser] = useState(() => readUserFromStorage() || ctxUser || null);
  const [stats, setStats] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ctxUser) setUser(ctxUser);
  }, [ctxUser]);

  useEffect(() => {
    if (!user) return;
    if (user.is_super_admin !== true) {
      setError('Accès réservé au super administrateur.');
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      api.get('/platform/stats'),
      api.get('/platform/hospitals'),
      api.get('/platform/audit-logs?limit=50'),
    ])
      .then(([statsRes, hospitalsRes, logsRes]) => {
        setStats(statsRes.data);
        setHospitals(hospitalsRes.data);
        setLogs(logsRes.data);
        setError('');
      })
      .catch((err) => {
        setError(err.response?.data?.error || err.message || 'Erreur de chargement');
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <div style={{ padding: 40, fontFamily: 'Inter, sans-serif' }}>Chargement...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: 'Inter, sans-serif', color: '#b91c1c' }}>
        {error}
        <button onClick={() => navigate('/')} style={{ marginLeft: 16 }}>Retour</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, fontFamily: 'Inter, sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, color: '#234A81' }}>Super Admin — Hôpitaux</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b' }}>
            Gestion de la plateforme e-Santé RDC — connecté en tant que <b>{user?.login}</b>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/superadmin/hospitals/new')} style={{ ...btn, background: '#16a34a' }}>
            + Nouvel hôpital
          </button>
          <button onClick={() => { logout(); navigate('/login'); }} style={{ ...btn, background: '#dc2626' }}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* ===== STATS ===== */}
      <section style={section}>
        <h2 style={h2}>Statistiques plateforme</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Stat label="Total hôpitaux" value={stats?.total ?? hospitals.length} />
          <Stat label="Actifs" value={stats?.actifs ?? hospitals.filter(h => h.statut === 'actif').length} color="#16a34a" />
          <Stat label="En essai" value={stats?.essai ?? 0} color="#d97706" />
          <Stat label="Suspendus" value={stats?.suspendus ?? 0} color="#dc2626" />
        </div>
      </section>

      {/* ===== HÔPITAUX ===== */}
      <section style={section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ ...h2, margin: 0 }}>Hôpitaux ({hospitals.length})</h2>
          <button onClick={() => navigate('/superadmin/hospitals/new')} style={{ ...btn, background: '#16a34a', fontSize: 13, padding: '6px 12px' }}>
            + Nouvel hôpital
          </button>
        </div>

        {hospitals.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: 24 }}>
            Aucun hôpital. Cliquez sur + Nouvel hôpital pour en créer un.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={table}>
              <thead>
                <tr style={trHead}>
                  <th style={th}>Logo</th>
                  <th style={th}>Nom</th>
                  <th style={th}>Slug</th>
                  <th style={th}>Email admin</th>
                  <th style={th}>Statut</th>
                  <th style={th}>Plan</th>
                  <th style={th}>Créé le</th>
                </tr>
              </thead>
              <tbody>
                {hospitals.map((h) => (
                  <tr key={h.id} style={tr}>
                    <td style={td}>
                      {h.logo_url
                        ? <img src={h.logo_url} alt={h.nom} style={{ height: 26, objectFit: 'contain' }} />
                        : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td style={td}><b>{h.nom}</b></td>
                    <td style={td}>{h.slug}</td>
                    <td style={td}>{h.email_admin || '—'}</td>
                    <td style={td}><StatutBadge statut={h.statut} /></td>
                    <td style={td}>{h.plan || '—'}</td>
                    <td style={td}>{h.created_at ? new Date(h.created_at).toLocaleString('fr-FR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===== LOGS D'AUDIT ===== */}
      <section style={section}>
        <h2 style={h2}>Historique des connexions ({logs.length})</h2>
        {logs.length === 0 ? (
          <p style={{ color: '#64748b' }}>
            Aucun log pour l'instant. Les logs apparaîtront ici après chaque tentative de login
            (réussie ou échouée), une fois que la route <code>POST /auth/login</code> écrira dans la table <code>audit_logs</code>.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={table}>
              <thead>
                <tr style={trHead}>
                  <th style={th}>ID</th>
                  <th style={th}>Utilisateur</th>
                  <th style={th}>Action</th>
                  <th style={th}>Hôpital</th>
                  <th style={th}>IP</th>
                  <th style={th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} style={tr}>
                    <td style={td}>{l.id}</td>
                    <td style={td}>{l.utilisateur_id ?? '—'}</td>
                    <td style={td}><ActionBadge action={l.action} /></td>
                    <td style={td}>{l.hospital_id ? String(l.hospital_id).slice(0, 8) + '…' : '—'}</td>
                    <td style={td}>{l.ip_address || '—'}</td>
                    <td style={td}>{l.created_at ? new Date(l.created_at).toLocaleString('fr-FR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const btn = { padding: '8px 16px', background: '#234A81', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 };
const section = { background: 'white', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
const h2 = { margin: '0 0 16px', color: '#234A81', fontSize: 20 };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 14 };
const trHead = { background: '#f1f5f9', textAlign: 'left' };
const tr = { borderBottom: '1px solid #e2e8f0' };
const th = { padding: '10px 12px', fontWeight: 600, color: '#475569' };
const td = { padding: '10px 12px', color: '#334155' };

function Stat({ label, value, color = '#234A81' }) {
  return (
    <div style={{ flex: 1, minWidth: 140, background: '#f8fafc', padding: 16, borderRadius: 8, borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function StatutBadge({ statut }) {
  const colors = { actif: '#16a34a', essai: '#d97706', suspendu: '#dc2626' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: (colors[statut] || '#64748b') + '20', color: colors[statut] || '#64748b' }}>
      {statut}
    </span>
  );
}

function ActionBadge({ action }) {
  const ok = action === 'LOGIN_SUCCESS';
  const fail = action === 'LOGIN_FAILED';
  return (
    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: ok ? '#dcfce7' : fail ? '#fee2e2' : '#e0e7ff', color: ok ? '#16a34a' : fail ? '#dc2626' : '#4338ca' }}>
      {action}
    </span>
  );
}