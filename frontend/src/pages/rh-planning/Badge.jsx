// src/pages/rh-planning/Badge.jsx
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../axios';
import { FaPrint, FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';

const Badge = () => {
  const { hopital } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [employe, setEmploye] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [photoError, setPhotoError] = useState(false);
  const badgeRef = useRef();

  const HOPITAL_NOM = hopital?.nom || import.meta.env.VITE_HOPITAL_NOM || 'Hôpital';
  const HOPITAL_ADRESSE = hopital?.adresse || hopital?.address || '';
  const HOPITAL_VILLE = hopital?.ville || hopital?.city || 'Bukavu';
  const HOPITAL_PAYS = hopital?.pays || hopital?.country || 'RDC';
  const HOPITAL_EMAIL = hopital?.email || hopital?.email_contact || '';
  const HOPITAL_SITE = hopital?.site || hopital?.website || hopital?.site_web || '';

  const resolveLogoUrl = (rawLogo) => {
    if (!rawLogo) return `${window.location.origin}/logo.jpeg`;
    if (/^https?:\/\//i.test(rawLogo)) return rawLogo;
    const withSlash = rawLogo.startsWith('/') ? rawLogo : `/${rawLogo}`;
    return `${window.location.origin}${withSlash}`;
  };

  const LOGO_PATH =
    hopital?.logo_url && !/^https?:\/\//i.test(hopital.logo_url)
      ? hopital.logo_url.startsWith('/')
        ? hopital.logo_url
        : `/${hopital.logo_url}`
      : resolveLogoUrl(hopital?.logo_url);

  useEffect(() => {
    api.get(`/employes/${id}`)
      .then(res => {
        setEmploye(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Employé non trouvé');
        setLoading(false);
      });
  }, [id]);

  const handlePrint = () => window.print();

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Chargement...</div>;
  if (error) return <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>{error}</div>;
  if (!employe) return null;

  // ============================================================
  // ✅ Construction ROBUSTE de l'URL photo
  // ============================================================
  const buildPhotoUrl = (photo) => {
    if (!photo) return null;
    // Si déjà une URL absolue, on la garde
    if (/^https?:\/\//i.test(photo)) return photo;

    // Sinon, on préfixe avec le host backend (sans /api)
    const apiUrl = import.meta.env.VITE_API_URL;
    if (!apiUrl) {
      console.error(
        '❌ VITE_API_URL non défini au build — la photo ne pourra pas se charger.\n' +
        '   Définir VITE_API_URL=https://multi-hospital-backend.onrender.com/api sur Netlify, puis re-deploy.'
      );
      return null;
    }

    const backendOrigin = apiUrl.replace(/\/api\/?$/, '');   // retire /api final
    const cleanPath = photo.replace(/^\/+/, '');              // retire les / du début
    return `${backendOrigin}/${cleanPath}`;
  };

  const photoUrl = buildPhotoUrl(employe.photo);

  // Log de diagnostic (visible en Console F12)
  if (employe.photo) {
    console.log('🖼️ Photo debug :', {
      'employe.photo': employe.photo,
      'VITE_API_URL': import.meta.env.VITE_API_URL,
      'photoUrl construite': photoUrl,
    });
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={() => navigate('/rh/employes')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaArrowLeft /> Retour
        </button>
        <button onClick={handlePrint} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPrint /> Imprimer
        </button>
      </div>

      <div ref={badgeRef} className="badge-container">
        {/* ========== RECTO ========== */}
        <div className="badge-face recto" style={{
          backgroundColor: 'white', borderRadius: '16px', padding: '16px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb',
          maxWidth: '380px', margin: '0 auto 24px auto',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', borderBottom: '2px solid #2563eb', paddingBottom: '10px', marginBottom: '10px' }}>
            <img src={LOGO_PATH} alt={`Logo ${HOPITAL_NOM}`} style={{ height: '40px', width: 'auto', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a', margin: 0, letterSpacing: '1px' }}>{HOPITAL_NOM}</h2>
              <p style={{ fontSize: '9px', color: '#6b7280', margin: 0, letterSpacing: '0.5px' }}>BADGE D'IDENTIFICATION</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ flexShrink: 0 }}>
              {photoUrl && !photoError ? (
                <img
                  src={photoUrl}
                  alt="Photo"
                  style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #2563eb' }}
                  onError={(e) => {
                    console.error('❌ Échec chargement photo :', photoUrl);
                    setPhotoError(true);
                  }}
                />
              ) : (
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', color: '#6b7280', border: '3px solid #2563eb' }}>
                  {employe.prenom?.[0]}{employe.nom?.[0]}
                </div>
              )}
            </div>

            <div style={{ flex: 1, textAlign: 'left', fontSize: '12px', lineHeight: '1.5' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 2px 0', color: '#1f2937' }}>{employe.prenom} {employe.nom}</h3>
              <p style={{ margin: '0' }}><strong>Poste :</strong> {employe.poste || 'Non défini'}</p>
              <p style={{ margin: '0' }}><strong>Service :</strong> {employe.service_nom || employe.service || 'Non défini'}</p>
              <p style={{ margin: '0' }}><strong>Matricule :</strong> {employe.matricule || employe.id}</p>
              <p style={{ margin: '0' }}><strong>Email :</strong> {employe.email || '—'}</p>
              <p style={{ margin: '0' }}><strong>Tél :</strong> {employe.telephone || '—'}</p>
            </div>
          </div>

          <div style={{ marginTop: '8px', backgroundColor: '#e8f0fe', borderRadius: '10px', padding: '8px 12px', textAlign: 'center', border: '1px solid #b6d4fe', fontSize: '11px' }}>
            <p style={{ margin: '0', fontWeight: '600', color: '#1e3a8a' }}>🏥 {HOPITAL_NOM} — {HOPITAL_VILLE} {HOPITAL_PAYS}</p>
            {HOPITAL_ADRESSE && <p style={{ margin: '0', color: '#1e40af' }}>{HOPITAL_ADRESSE}</p>}
            {(HOPITAL_EMAIL || HOPITAL_SITE) && (
              <p style={{ margin: '0', color: '#1e40af' }}>{HOPITAL_EMAIL}{HOPITAL_EMAIL && HOPITAL_SITE && ' | '}{HOPITAL_SITE}</p>
            )}
            <p style={{ margin: '4px 0 0 0', color: '#1e3a8a', opacity: 0.8, fontSize: '10px' }}>En cas de perte, contactez les RH</p>
          </div>
        </div>

        {/* ========== VERSO ========== */}
        <div className="badge-face verso" style={{
          backgroundColor: 'white', borderRadius: '16px', padding: '16px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb',
          maxWidth: '380px', margin: '0 auto',
          fontFamily: 'system-ui, -apple-system, sans-serif', textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', borderBottom: '2px solid #2563eb', paddingBottom: '10px', marginBottom: '16px' }}>
            <img src={LOGO_PATH} alt={`Logo ${HOPITAL_NOM}`} style={{ height: '40px', width: 'auto', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a', margin: 0, letterSpacing: '1px' }}>LAISSEZ-PASSER</h2>
          </div>
          <div style={{ padding: '8px 12px' }}>
            <p style={{ fontSize: '14px', color: '#1f2937', fontWeight: '500', margin: '0 0 12px 0' }}>
              Les autorités tant civiles, policières que militaires sont priées d'apporter assistance au porteur de la présente en cas de nécessité.
            </p>
            <div style={{ marginTop: '20px', borderTop: '1px dashed #d1d5db', paddingTop: '12px' }}>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}><strong>Nom :</strong> {employe.prenom} {employe.nom}</p>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0' }}><strong>Matricule :</strong> {employe.matricule || employe.id}</p>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0' }}><strong>Service :</strong> {employe.service_nom || employe.service || 'Non défini'}</p>
              <p style={{ fontSize: '10px', color: '#9ca3af', margin: '6px 0 0' }}>Délivré le {new Date().toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .no-print { display: block; }
        @media print {
          body * { visibility: hidden; }
          .badge-container, .badge-container * { visibility: visible; }
          .badge-face { page-break-after: always; page-break-inside: avoid; margin: 0 auto !important; box-shadow: none !important; border: 1px solid #ccc !important; border-radius: 6px !important; padding: 4mm !important; }
          .recto { width: 85mm; height: 55mm; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
          .verso { width: 85mm; height: 55mm; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
          .badge-face img[alt="Photo"] { width: 35px !important; height: 35px !important; }
          .badge-face div[style*="borderRadius: 50%"] { width: 35px !important; height: 35px !important; font-size: 16px !important; }
          .badge-face h2 { font-size: 10px !important; letter-spacing: 0.3px !important; }
          .badge-face h3 { font-size: 9px !important; margin: 0 !important; }
          .badge-face p { font-size: 6.5px !important; margin: 0 !important; line-height: 1.2; }
          .badge-face div[style*="borderBottom: 2px solid #2563eb"] { padding-bottom: 2px !important; margin-bottom: 2px !important; }
          .badge-face div[style*="borderBottom: 2px solid #2563eb"] img { height: 18px !important; }
          .badge-face div[style*="backgroundColor: #e8f0fe"] { padding: 2px 6px !important; margin-top: 2px !important; }
          .badge-face div[style*="backgroundColor: #e8f0fe"] p { font-size: 6px !important; margin: 0 !important; }
          .badge-face > div:last-child { margin-top: 2px !important; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 15mm 10mm; }
          html, body { margin: 0 !important; padding: 0 !important; height: 100vh; display: flex; align-items: center; justify-content: center; }
          .badge-container { display: block; width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default Badge;