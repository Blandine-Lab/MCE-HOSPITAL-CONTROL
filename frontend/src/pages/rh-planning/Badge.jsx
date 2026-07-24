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

  const photoUrl = employe.photo ? `http://localhost:5000${employe.photo}` : null;
  const logoUrl = '/logo.jpeg';

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

      {/* Badge imprimable – version écran (inchangée) */}
      <div ref={badgeRef} className="badge-print" style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
        border: '1px solid #e5e7eb',
        maxWidth: '380px',
        margin: '0 auto',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {/* Entête */}
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
          <p style={{ fontSize: '12px', color: '#4b5563', margin: '1px 0' }}><strong>Email :</strong> {employe.email || '—'}</p>
          <p style={{ fontSize: '12px', color: '#4b5563', margin: '1px 0' }}><strong>Tél :</strong> {employe.telephone || '—'}</p>
        </div>

        {/* Zone info */}
        <div style={{
          marginTop: '12px',
          backgroundColor: '#e8f0fe',
          borderRadius: '10px',
          padding: '10px 12px',
          textAlign: 'center',
          border: '1px solid #b6d4fe',
        }}>
          <p style={{ fontSize: '12px', color: '#1e3a8a', margin: '0', fontWeight: '600' }}>📍 MCE Localisation: Bukavu RDC</p>
          <p style={{ fontSize: '10px', color: '#1e40af', margin: '4px 0 0' }}>contact@medicalcenterelizabeth.org | www.medicalcenterelizabeth.org</p>
          <p style={{ fontSize: '9px', color: '#1e3a8a', margin: '6px 0 0', opacity: 0.8 }}>En cas de perte, contactez les RH</p>
        </div>
      </div>

      <style>{`
        @media print {
          /* Masquer tout sauf le badge */
          body * { visibility: hidden; }
          .badge-print, .badge-print * { visibility: visible; }

          /* Page A4 avec marges réduites */
          @page {
            size: A4;                /* 210mm × 297mm */
            margin: 15mm;           /* marges confortables */
          }

          /* Le badge occupe toute la zone imprimable, centré */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .badge-print {
            /* Dimensions du badge : 85mm de large, 55mm de haut (carte standard) */
            width: 85mm;
            height: 55mm;
            padding: 4mm !important;
            margin: 0 !important;
            box-sizing: border-box;
            background: white !important;
            border: 1px solid #ccc !important;
            border-radius: 6px !important;
            box-shadow: none !important;
            display: flex;
            flex-direction: column;
            justify-content: center;   /* centrage vertical interne */
            overflow: hidden !important; /* sécurité */
            page-break-after: avoid;
            page-break-inside: avoid;
          }

          /* --- Ajustements pour que tout rentre --- */
          .badge-print img[alt="Photo"] {
            width: 45px !important;
            height: 45px !important;
            margin-bottom: 2px !important;
          }
          .badge-print h2 {
            font-size: 11px !important;
            letter-spacing: 0.5px !important;
          }
          .badge-print h3 {
            font-size: 10px !important;
            margin: 0 !important;
          }
          .badge-print p {
            font-size: 7.5px !important;
            margin: 0 !important;
            line-height: 1.2;
          }
          .badge-print div[style*="borderBottom: 2px solid #2563eb"] {
            padding-bottom: 2px !important;
            margin-bottom: 2px !important;
          }
          .badge-print div[style*="borderBottom: 2px solid #2563eb"] img {
            height: 22px !important;
          }
          .badge-print div[style*="backgroundColor: #e8f0fe"] {
            padding: 2px 6px !important;
            margin-top: 2px !important;
          }
          .badge-print div[style*="backgroundColor: #e8f0fe"] p {
            font-size: 6.5px !important;
            margin: 0 !important;
          }
          .badge-print > div:last-child {
            margin-top: 2px !important;
          }

          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default Badge;