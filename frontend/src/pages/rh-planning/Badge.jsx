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

  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
  const photoUrl = employe.photo ? `${baseUrl}${employe.photo}` : null;
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

          {/* Corps */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {photoUrl ? (
              <img src={photoUrl} alt="Photo" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #2563eb', marginBottom: '8px' }} onError={(e) => e.target.style.display = 'none'} />
            ) : (
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', color: '#6b7280', marginBottom: '8px' }}>
                {employe.prenom?.[0]}{employe.nom?.[0]}
              </div>
            )}
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '2px 0', color: '#1f2937' }}>{employe.prenom} {employe.nom}</h3>
            <p style={{ fontSize: '12px', color: '#4b5563', margin: '1px 0' }}><strong>Poste :</strong> {employe.poste || 'Non défini'}</p>
            <p style={{ fontSize: '12px', color: '#4b5563', margin: '1px 0' }}><strong>Service :</strong> {employe.service_nom || employe.service || 'Non défini'}</p>
            <p style={{ fontSize: '12px', color: '#4b5563', margin: '1px 0' }}><strong>Matricule :</strong> {employe.id}</p>
            <p style={{ fontSize: '12px', color: '#4b5563', margin: '1px 0' }}><strong>Email :</strong> {employe.email || '?FC?'}</p>
            <p style={{ fontSize: '12px', color: '#4b5563', margin: '1px 0' }}><strong>Tél :</strong> {employe.telephone || '?FC?'}</p>
          </div>

          {/* Zone info avec adresse complète */}
          <div style={{
            marginTop: '12px',
            backgroundColor: '#e8f0fe',
            borderRadius: '10px',
            padding: '10px 12px',
            textAlign: 'center',
            border: '1px solid #b6d4fe',
          }}>
            <p style={{ fontSize: '12px', color: '#1e3a8a', margin: '0', fontWeight: '600' }}>
              🏥 MCE Localisation : Bukavu RDC
            </p>
            <p style={{ fontSize: '10px', color: '#1e40af', margin: '4px 0 0' }}>
              avenue BOBZO, Quartier NDENDERE, Commune d'IBANDA, SUD-KIVU/RDC.
            </p>
            <p style={{ fontSize: '10px', color: '#1e40af', margin: '2px 0 0' }}>
              contact@medicalcenterelizabeth.org | www.medicalcenterelizabeth.org
            </p>
            <p style={{ fontSize: '9px', color: '#1e3a8a', margin: '6px 0 0', opacity: 0.8 }}>
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
          {/* En-tête simplifié */}
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
                <strong>Matricule :</strong> {employe.id}
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
        /* Masquer les éléments non imprimables */
        .no-print { display: block; }

        @media print {
          body * { visibility: hidden; }
          .badge-container, .badge-container * { visibility: visible; }

          /* Forcer les pages séparées pour recto/verso */
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

          /* Ajustements typographiques pour l'impression */
          .badge-face img[alt="Photo"] {
            width: 45px !important;
            height: 45px !important;
            margin-bottom: 2px !important;
          }
          .badge-face h2 {
            font-size: 11px !important;
            letter-spacing: 0.5px !important;
          }
          .badge-face h3 {
            font-size: 10px !important;
            margin: 0 !important;
          }
          .badge-face p {
            font-size: 7.5px !important;
            margin: 0 !important;
            line-height: 1.2;
          }
          .badge-face div[style*="borderBottom: 2px solid #2563eb"] {
            padding-bottom: 2px !important;
            margin-bottom: 2px !important;
          }
          .badge-face div[style*="borderBottom: 2px solid #2563eb"] img {
            height: 22px !important;
          }
          .badge-face div[style*="backgroundColor: #e8f0fe"] {
            padding: 2px 6px !important;
            margin-top: 2px !important;
          }
          .badge-face div[style*="backgroundColor: #e8f0fe"] p {
            font-size: 6.5px !important;
            margin: 0 !important;
          }
          .badge-face > div:last-child {
            margin-top: 2px !important;
          }

          .no-print { display: none !important; }

          /* Supprimer les marges de page pour que chaque face tienne exactement */
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