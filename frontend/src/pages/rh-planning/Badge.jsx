import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../axios';
import { FaPrint, FaArrowLeft } from 'react-icons/fa';

const Badge = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employe, setEmploye] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [photoError, setPhotoError] = useState(false);
  const badgeRef = useRef();

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

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Chargement...</div>;
  if (error) return <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>{error}</div>;
  if (!employe) return null;

  // Construction robuste de l'URL de la photo
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const baseUrl = apiBase.replace(/\/api$/, ''); // enlève le /api final
  const photoPath = employe.photo ? employe.photo.replace(/^\/+/, '') : ''; // enlève les slashs au début
  const photoUrl = photoPath ? `${baseUrl}/${photoPath}` : null;

  const logoUrl = '/logo.jpeg';

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Barre d'outils - masquée à l'impression */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={() => navigate('/rh/employes')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaArrowLeft /> Retour
        </button>
        <button onClick={handlePrint} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPrint /> Imprimer
        </button>
      </div>

      {/* Conteneur des deux faces */}
      <div ref={badgeRef} className="badge-container">

        {/* ========== RECTO ========== */}
        <div className="badge-face recto" style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
          border: '1px solid #e5e7eb',
          maxWidth: '380px',
          margin: '0 auto 24px auto',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          {/* En-tête */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', borderBottom: '2px solid #2563eb', paddingBottom: '10px', marginBottom: '10px' }}>
            <img src={logoUrl} alt="Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a', margin: 0, letterSpacing: '1px' }}>HÔPITAL</h2>
              <p style={{ fontSize: '9px', color: '#6b7280', margin: 0, letterSpacing: '0.5px' }}>BADGE D'IDENTIFICATION</p>
            </div>
          </div>

          {/* Corps : photo à gauche, infos à droite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            {/* Photo (à gauche) */}
            <div style={{ flexShrink: 0 }}>
              {photoUrl && !photoError ? (
                <img
                  src={photoUrl}
                  alt="Photo"
                  style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #2563eb' }}
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', color: '#6b7280', border: '3px solid #2563eb' }}>
                  {employe.prenom?.[0]}{employe.nom?.[0]}
                </div>
              )}
            </div>

            {/* Informations (à droite) */}
            <div style={{ flex: 1, textAlign: 'left', fontSize: '12px', lineHeight: '1.5' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 2px 0', color: '#1f2937' }}>{employe.prenom} {employe.nom}</h3>
              <p style={{ margin: '0' }}><strong>Poste :</strong> {employe.poste || 'Non défini'}</p>
              <p style={{ margin: '0' }}><strong>Service :</strong> {employe.service_nom || employe.service || 'Non défini'}</p>
              <p style={{ margin: '0' }}><strong>Matricule :</strong> {employe.matricule || employe.id}</p>
              <p style={{ margin: '0' }}><strong>Email :</strong> {employe.email || '—'}</p>
              <p style={{ margin: '0' }}><strong>Tél :</strong> {employe.telephone || '—'}</p>
            </div>
          </div>

          {/* Zone info avec adresse complète */}
          <div style={{
            marginTop: '8px',
            backgroundColor: '#e8f0fe',
            borderRadius: '10px',
            padding: '8px 12px',
            textAlign: 'center',
            border: '1px solid #b6d4fe',
            fontSize: '11px',
          }}>
            <p style={{ margin: '0', fontWeight: '600', color: '#1e3a8a' }}>
              🏥 MCE Localisation : Bukavu RDC
            </p>
            <p style={{ margin: '0', color: '#1e40af' }}>
              avenue BOBZO, Quartier NDENDERE, Commune d'IBANDA, SUD-KIVU/RDC.
            </p>
            <p style={{ margin: '0', color: '#1e40af' }}>
              contact@medicalcenterelizabeth.org | www.medicalcenterelizabeth.org
            </p>
            <p style={{ margin: '4px 0 0 0', color: '#1e3a8a', opacity: 0.8, fontSize: '10px' }}>
              En cas de perte, contactez les RH
            </p>
          </div>
        </div>

        {/* ========== VERSO ========== */}
        <div className="badge-face verso" style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
          border: '1px solid #e5e7eb',
          maxWidth: '380px',
          margin: '0 auto',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', borderBottom: '2px solid #2563eb', paddingBottom: '10px', marginBottom: '16px' }}>
            <img src={logoUrl} alt="Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a', margin: 0, letterSpacing: '1px' }}>LAISSEZ-PASSER</h2>
          </div>
          <div style={{ padding: '8px 12px' }}>
            <p style={{ fontSize: '14px', color: '#1f2937', fontWeight: '500', margin: '0 0 12px 0' }}>
              Les autorités tant civiles, policières que militaires sont priées d'apporter assistance au porteur de la présente en cas de nécessité.
            </p>
            <div style={{ marginTop: '20px', borderTop: '1px dashed #d1d5db', paddingTop: '12px' }}>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>
                <strong>Nom :</strong> {employe.prenom} {employe.nom}
              </p>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0' }}>
                <strong>Matricule :</strong> {employe.matricule || employe.id}
              </p>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0' }}>
                <strong>Service :</strong> {employe.service_nom || employe.service || 'Non défini'}
              </p>
              <p style={{ fontSize: '10px', color: '#9ca3af', margin: '6px 0 0' }}>
                Délivré le {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .no-print { display: block; }

        @media print {
          body * { visibility: hidden; }
          .badge-container, .badge-container * { visibility: visible; }

          .badge-face {
            page-break-after: always;
            page-break-inside: avoid;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: 1px solid #ccc !important;
            border-radius: 6px !important;
            padding: 4mm !important;
          }

          .recto {
            width: 85mm;
            height: 55mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
          }

          .verso {
            width: 85mm;
            height: 55mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
          }

          .badge-face img[alt="Photo"] {
            width: 35px !important;
            height: 35px !important;
          }
          .badge-face div[style*="borderRadius: 50%"] {
            width: 35px !important;
            height: 35px !important;
            font-size: 16px !important;
          }
          .badge-face h2 {
            font-size: 10px !important;
            letter-spacing: 0.3px !important;
          }
          .badge-face h3 {
            font-size: 9px !important;
            margin: 0 !important;
          }
          .badge-face p {
            font-size: 6.5px !important;
            margin: 0 !important;
            line-height: 1.2;
          }
          .badge-face div[style*="borderBottom: 2px solid #2563eb"] {
            padding-bottom: 2px !important;
            margin-bottom: 2px !important;
          }
          .badge-face div[style*="borderBottom: 2px solid #2563eb"] img {
            height: 18px !important;
          }
          .badge-face div[style*="backgroundColor: #e8f0fe"] {
            padding: 2px 6px !important;
            margin-top: 2px !important;
          }
          .badge-face div[style*="backgroundColor: #e8f0fe"] p {
            font-size: 6px !important;
            margin: 0 !important;
          }
          .badge-face > div:last-child {
            margin-top: 2px !important;
          }

          .no-print { display: none !important; }

          @page {
            size: A4;
            margin: 15mm 10mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .badge-container {
            display: block;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default Badge;