import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

const modules = [
  { id: 1, name: 'Patient (Dossier Patient Unique - DPI)', image: '/dossier.jpg', path: '/patients' },
  { id: 2, name: 'Consultations & Admissions', image: '/consultation.jpg', path: '/consultations' },
  { id: 3, name: 'Mdical (DME)', image: '/dpi.jpg', path: '/medical' },
  { id: 4, name: 'Paramdical & Soins', image: '/para.jpg', path: '/paramedical' },
  { id: 5, name: 'Facturation & Tiers Payant', image: '/facturation.jpg', path: '/factures' },
  { id: 6, name: 'Laboratoire & Imagerie', image: '/labo.jpg', path: '/laboratory' },
  { id: 7, name: 'Pharmacie', image: '/pharmacie.jpg', path: '/medicaments' },
  { id: 8, name: 'Ressources Humaines & Planning', image: '/resource.jpg', path: '/hr' },
  { id: 9, name: 'Finances & Comptabilit', image: '/finance.jpg', path: '/finance' },
  { id: 10, name: 'Stock & Approvisionnement', image: '/stock.jpg', path: '/stock' },
  { id: 11, name: 'Gestion de la Qualit & Risques', image: '/quality.jpg', path: '/quality' },
  { id: 12, name: 'Reporting & Dcisionnel (BI)', image: '/report.jpg', path: '/reporting' },
  { id: 13, name: 'Scurit & Conformit', image: '/securite.jpg', path: '/security' },
  { id: 14, name: 'Interoprabilit', image: '/interoperabilite.jpg', path: '/interop' },
  { id: 15, name: 'Interface Utilisateur (UI/UX pro)', image: '/utilisateur.jpg', path: '/dashboard' }
];

const Home = () => {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  return (
    <div style={{ padding: '2rem', background: 'linear-gradient(135deg, #f0f9ff 0%, #e6f2ff 100%)', minHeight: '100vh' }}>
      {/* En-tte anim */}
      <div style={{ textAlign: 'center', marginBottom: '3rem', animation: 'fadeInDown 0.8s ease-out' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <img 
            src="/logo.jpeg" 
            alt="Logo MCE" 
            style={{ height: '80px', width: 'auto', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))', transition: 'transform 0.3s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          />
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 'bold', margin: 0, background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              Medical Center Elizabeth MCE
            </h1>
            <p style={{ color: '#4b5563', marginTop: '0.25rem' }}>Systme intgr de gestion hospitalire</p>
          </div>
        </div>
      </div>

      {/* Grille avec animations d'apparition */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.8rem', maxWidth: '1200px', margin: '0 auto' }}>
        {modules.map((mod, idx) => (
          <div
            key={mod.id}
            onClick={() => navigate(mod.path)}
            style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
              cursor: 'pointer',
              overflow: 'hidden',
              transition: 'all 0.4s cubic-bezier(0.2, 0.9, 0.4, 1.1)',
              transform: loaded ? 'translateY(0)' : 'translateY(30px)',
              opacity: loaded ? 1 : 0,
              animation: loaded ? `fadeInUp 0.5s ease-out ${idx * 0.05}s both` : 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 25px 30px -12px rgba(0,0,0,0.25)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ overflow: 'hidden', height: '180px' }}>
              <img 
                src={mod.image} 
                alt={mod.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              />
            </div>
            <div style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1f2937' }}>{mod.name}</div>
              <div style={{ marginTop: '0.5rem', color: '#3b82f6', fontSize: '0.875rem', fontWeight: '500' }}>Accder ?</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pied de page */}
      <div style={{ textAlign: 'center', marginTop: '3rem', color: '#6b7280', fontSize: '0.8rem' }}>
         2025 Medical Center Elizabeth MCE - Tous droits rservs
      </div>

      {/* Animations CSS globales */}
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Home;
