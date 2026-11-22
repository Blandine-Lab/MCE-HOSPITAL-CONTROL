// src/pages/medical/ConsultationDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaPrint, FaEdit, FaUserMd, FaCalendar, FaStethoscope } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';

const ConsultationDetail = () => {
  // 🔧 Récupère l'hôpital courant depuis le contexte auth (multi-tenant)
  const { hopital } = useAuth();

  const { id } = useParams();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 🔧 Infos tenant-aware (fallback .env / valeurs par défaut si contexte vide)
  const HOPITAL_NOM =
    hopital?.nom || import.meta.env.VITE_HOPITAL_NOM || 'Hôpital';

  const HOPITAL_ADRESSE =
    hopital?.adresse || hopital?.address ||
    import.meta.env.VITE_HOPITAL_ADRESSE || '';

  const HOPITAL_VILLE =
    hopital?.ville || hopital?.city || '';

  // 🔧 Résout le logo (URL absolue, robuste à l'impression)
  const resolveLogoUrl = (rawLogo) => {
    if (!rawLogo) return `${window.location.origin}/logo.jpeg`;
    if (/^https?:\/\//i.test(rawLogo)) return rawLogo;
    const withSlash = rawLogo.startsWith('/') ? rawLogo : `/${rawLogo}`;
    return `${window.location.origin}${withSlash}`;
  };

  const LOGO_URL = resolveLogoUrl(hopital?.logo_url);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupérer la consultation par ID
        const res = await api.get(`/consultations/${id}`);
        const data = res.data;
        setConsultation(data);

        // Récupérer les infos du patient
        if (data.patient_id) {
          const patientRes = await api.get(`/patients/${data.patient_id}`);
          setPatient(patientRes.data);
        }
        setLoading(false);
      } catch (err) {
        console.error('Erreur chargement consultation:', err);
        setError('Consultation non trouvée');
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '24px' }}>⏳ Chargement...</div>
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ef4444' }}>
        <div style={{ fontSize: '20px' }}>{error || 'Consultation non trouvée'}</div>
        <Link to="/medical/patients" style={{ color: '#3b82f6', textDecoration: 'none' }}>Retour à la liste</Link>
      </div>
    );
  }

  return (
    <div id="consultation-detail-print" style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <Link
          to={`/medical/patients/${consultation.patient_id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#3b82f6',
            textDecoration: 'none',
            fontWeight: '500'
          }}
        >
          <FaArrowLeft /> Retour au dossier patient
        </Link>
        <div style={{ display: 'flex', gap: '12px' }} className="no-print">
          <button
            onClick={handlePrint}
            style={{
              backgroundColor: '#8b5cf6',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FaPrint /> Imprimer
          </button>
          <button
            onClick={() => navigate(`/consultation/edit/${consultation.id}`)}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FaEdit /> Modifier
          </button>
        </div>
      </div>

      {/* 🔧 En-tête tenant-aware de la fiche */}
      <div style={{
        textAlign: 'center',
        borderBottom: '2px solid #1e3a8a',
        paddingBottom: '12px',
        marginBottom: '20px'
      }}>
        <img
          src={LOGO_URL}
          alt={`Logo ${HOPITAL_NOM}`}
          style={{ height: '60px', width: 'auto', marginBottom: '8px' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>{HOPITAL_NOM}</h1>
        {HOPITAL_VILLE && (
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{HOPITAL_VILLE}</p>
        )}
        {HOPITAL_ADRESSE && (
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{HOPITAL_ADRESSE}</p>
        )}
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e3a8a', marginTop: '6px' }}>📋 FICHE DE CONSULTATION</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '4px' }}>
          <span><strong>N° :</strong> {consultation.numero_dossier || 'N/A'}</span>
          <span><strong>Date :</strong> {consultation.date ? new Date(consultation.date).toLocaleDateString('fr-FR') : 'N/A'}</span>
        </div>
      </div>

      {/* IDENTITE */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', marginBottom: '16px', backgroundColor: '#ffffff' }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#1e3a8a' }}>IDENTITE</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div><strong>Nom :</strong> {patient ? `${patient.nom} ${patient.prenom}` : 'N/A'}</div>
          <div><strong>Sexe / Âge :</strong> {patient ? `${patient.genre || 'N/C'} / ${patient.date_naissance ? new Date().getFullYear() - new Date(patient.date_naissance).getFullYear() : '?'} ans` : 'N/A'}</div>
          <div><strong>Poids :</strong> {consultation.poids || 'N/C'}</div>
          <div><strong>Taille :</strong> {consultation.taille || 'N/C'}</div>
          <div style={{ gridColumn: '1 / -1' }}><strong>Adresse :</strong> {patient?.adresse || 'N/C'}</div>
          <div><strong>Contact :</strong> {patient?.telephone || 'N/C'}</div>
        </div>
      </div>

      {/* Médecin consultant */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', marginBottom: '16px', backgroundColor: '#ffffff' }}>
        <strong>Nom du médecin consultant :</strong> {consultation.medecin_consultant || consultation.medecin_nom || 'Non renseigné'}
      </div>

      {/* Champs de la consultation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
        <DetailSection title="PLAINTE PRINCIPALE" content={consultation.plainte_principale} />
        <DetailSection title="HISTORIQUE" content={consultation.historique} />
        <DetailSection title="ANTECEDENT" content={consultation.antecedents} />
        <DetailSection title="COMPLEMENT D'ANAMNESE" content={consultation.complement_anamnese} />
        <DetailSection title="EXAMEN PHYSIQUE" content={consultation.examen_physique} />
        <DetailSection title="CCL (Conclusion)" content={consultation.ccl} />
        <DetailSection title="BILAN" content={consultation.bilan} />
        <DetailSection title="CAT (Conduite à tenir)" content={consultation.cat} />
      </div>

      {/* 🔧 Pied de page tenant-aware */}
      <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
        <p>Fait à {HOPITAL_VILLE || '________'}, le {new Date().toLocaleDateString('fr-FR')}</p>
        <p>Document généré par le système {HOPITAL_NOM}</p>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          #consultation-detail-print { padding: 10px !important; background: white !important; }
        }
      `}</style>
    </div>
  );
};

// Composant utilitaire pour afficher une section
const DetailSection = ({ title, content }) => (
  <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', backgroundColor: '#f9fafb' }}>
    <h4 style={{ margin: '0 0 4px 0', color: '#1e3a8a', fontWeight: 'bold' }}>{title}</h4>
    <p style={{ margin: '0', whiteSpace: 'pre-wrap' }}>{content || 'Non renseigné'}</p>
  </div>
);

export default ConsultationDetail;