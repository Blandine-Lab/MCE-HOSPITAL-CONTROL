import { useNavigate, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const modules = [
  { id: 1, name: 'Patient (Dossier Patient Unique - DPI)', image: '/dossier.jpg', path: '/patients' },
  { id: 2, name: 'Consultations & Admissions', image: '/consultation11.jpeg', path: '/consultations' },
  { id: 3, name: 'Médical (DME)', image: '/dpi.jpg', path: '/medical' },
  { id: 4, name: 'Paramédical & Soins', image: '/para.jpg', path: '/paramedical' },
  { id: 5, name: 'Facturation & Tiers Payant', image: '/facturation.jpg', path: '/factures' },
  { id: 6, name: 'Laboratoire & Imagerie', image: '/labo.jpg', path: '/laboratory' },
  { id: 7, name: 'Pharmacie', image: '/pharmacie.jpg', path: '/medicaments' },
  { id: 8, name: 'Ressources Humaines & Planning', image: '/resource.jpg', path: '/hr' },
  { id: 9, name: 'Finances & Comptabilité', image: '/finance.jpg', path: '/finance' },
  { id: 10, name: 'Stock & Approvisionnement', image: '/stock.jpg', path: '/stock' },
  { id: 11, name: 'Gestion de la Qualité & Risques', image: '/quality.jpg', path: '/quality' },
  { id: 12, name: 'Reporting & Décisionnel (BI)', image: '/report.jpg', path: '/reporting' },
  { id: 13, name: 'Sécurité & Conformité', image: '/securite.jpg', path: '/security' },
  { id: 14, name: 'Interopérabilité', image: '/interoperabilite.jpg', path: '/interop' },
  { id: 15, name: 'Interface Utilisateur (UI/UX)', image: '/utilisateur.jpg', path: '/dashboard' },
  { id: 16, name: 'Demandes de congé & formation', image: '/Conge.jpg', path: '/demandes-conge' },
  { id: 17, name: 'Bibliothèque & Documentation', image: '/bobliotheque.png', path: '/library' }
];

const Home = () => {
  const navigate = useNavigate();
  const { user, hopital } = useAuth();

  const logoUrl = hopital?.logo_url || '/logo.jpeg';
  const nomHopital = hopital?.nom || 'Medical Center Elizabeth MCE';
  const couleur = hopital?.couleur || '#0ea5e9';

  if (user?.is_super_admin === true) {
    return <Navigate to="/super-admin" replace />;
  }

  return (
    <div style={{ padding: '2rem', background: 'linear-gradient(135deg, #f0f9ff 0%, #e6f2ff 100%)', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem', animation: 'fadeInDown 0.8s ease-out' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <img src={logoUrl} alt={`Logo ${nomHopital}`} style={{ height: '80px', width: 'auto', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }} />
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 'bold', margin: 0, background: `linear-gradient(135deg, #1e3a8a, ${couleur})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{nomHopital}</h1>
            <p style={{ color: '#4b5563', marginTop: '0.25rem' }}>Système intégré de gestion hospitalière</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.8rem', maxWidth: '1200px', margin: '0 auto' }}>
        {modules.map((mod, idx) => (
          <div key={mod.id} onClick={() => navigate(mod.path)} style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', animation: `fadeInUp 0.6s ease-out ${idx * 0.05}s both` }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}>
            <img src={mod.image} alt={mod.name} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
            <div style={{ padding: '1.2rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e3a8a', fontWeight: '600' }}>{mod.name}</h3>
              <p style={{ margin: '0.5rem 0 0', color: couleur, fontWeight: '500' }}>Accéder →</p>
            </div>
          </div>
        ))}
      </div>

      {/* ============================================================ */}
      {/* Message d'assistance GlobalMind                              */}
      {/* ============================================================ */}
      <div style={{
        maxWidth: '1200px',
        margin: '3rem auto 0',
        textAlign: 'center',
        padding: '1.2rem 1.5rem',
        background: 'white',
        borderRadius: '0.8rem',
        border: '1px solid #e5e7eb',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
        color: '#374151',
        fontSize: '0.95rem',
        lineHeight: 1.6
      }}>
        <p style={{ margin: 0, fontWeight: 600, color: '#1e3a8a' }}>
          💬 Besoin d'aide ? Contactez le service technique GlobalMind
        </p>
        <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: '#6b7280' }}>
          Assistance disponible <strong>24h/24 et 7j/7</strong> directement dans le chat.
          Le chat est propulsé par une <strong>IA</strong> : elle peut tout vous fournir
          pour n'importe quel besoin d'assistance, à tout moment.
        </p>
      </div>

      <footer style={{ textAlign: 'center', marginTop: '2rem', color: '#6b7280', fontSize: '0.9rem' }}>
        © 2025 {nomHopital} - Tous droits réservés
      </footer>

      <style>{`@keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } } @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

export default Home;