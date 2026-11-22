// src/pages/consultations/PrescriptionPrint.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';

// 🔧 FIX : le backend expose /prescriptions/:id (et non /pharmacy/ordonnances/:id)
const API_BASE = '/prescriptions';

const PrescriptionPrint = () => {
  // 🔧 Récupère l'hôpital courant depuis le contexte auth (multi-tenant)
  const { hopital } = useAuth();

  const { id } = useParams();
  const [prescription, setPrescription] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [readyToPrint, setReadyToPrint] = useState(false);

  // 🔧 Infos tenant-aware (fallback .env / valeurs par défaut si contexte vide)
  const HOPITAL_NOM =
    hopital?.nom || import.meta.env.VITE_HOPITAL_NOM || 'Hôpital';

  const HOPITAL_ADRESSE =
    hopital?.adresse || hopital?.address ||
    import.meta.env.VITE_HOPITAL_ADRESSE || '';

  const HOPITAL_TEL =
    hopital?.telephone || hopital?.phone ||
    import.meta.env.VITE_HOPITAL_TELEPHONE || '';

  const HOPITAL_EMAIL =
    hopital?.email || hopital?.email_contact ||
    import.meta.env.VITE_HOPITAL_EMAIL || '';

  const HOPITAL_SITE =
    hopital?.site || hopital?.website || hopital?.site_web ||
    import.meta.env.VITE_HOPITAL_SITE || '';

  // 🔧 Résout le logo :
  //  - URL absolue (https://...) → utilisée telle quelle
  //  - chemin relatif (/logo.jpeg) → préfixé par l'origine
  //  - fallback → /logo.jpeg
  const resolveLogoUrl = (rawLogo) => {
    if (!rawLogo) return `${window.location.origin}/logo.jpeg`;
    if (/^https?:\/\//i.test(rawLogo)) return rawLogo;
    const withSlash = rawLogo.startsWith('/') ? rawLogo : `/${rawLogo}`;
    return `${window.location.origin}${withSlash}`;
  };

  // ⚠️ Pour la fenêtre d'impression (popup), il FAUT une URL absolue
  //    car le popup n'a pas d'URL de base → /logo.jpeg ne se résout pas.
  const LOGO_URL = resolveLogoUrl(hopital?.logo_url);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        // 🔧 1 seul appel : GET /prescriptions/:id renvoie déjà { ..., items: [...], lignes: [...] }
        const ordRes = await api.get(`${API_BASE}/${id}`);
        if (cancelled) return;
        const ord = ordRes.data;
        setPrescription(ord);

        // 🔧 Récupère les lignes depuis la réponse (items OU lignes)
        let lignesData = ord.lignes || ord.items || ord.ligne_ordonnances;
        if (!lignesData) {
          // Fallback : endpoint dédié si un jour le backend change
          try {
            const lignesRes = await api.get(`${API_BASE}/${id}/lignes`);
            lignesData = lignesRes.data;
          } catch (e) {
            console.warn('⚠️ Endpoint lignes indisponible, on continue sans.');
            lignesData = [];
          }
        }
        if (cancelled) return;
        setLignes(Array.isArray(lignesData) ? lignesData : []);
        setReadyToPrint(true);
      } catch (err) {
        console.error('Erreur chargement prescription :', err);
        if (!cancelled) setError(err.response?.data?.error || err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [id]);

  // 🔧 Déclenche l'impression une fois les données prêtes ET le logo chargé
  useEffect(() => {
    if (!readyToPrint || !prescription) return;
    const img = document.querySelector('.print-logo');
    const doPrint = () => setTimeout(() => window.print(), 300);
    if (img && !img.complete) {
      img.addEventListener('load', doPrint, { once: true });
      img.addEventListener('error', doPrint, { once: true });
    } else {
      doPrint();
    }
  }, [readyToPrint, prescription]);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>⏳ Chargement...</div>;
  if (error) return (
    <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>
      ❌ Erreur : {error}
    </div>
  );
  if (!prescription) return (
    <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>Prescription introuvable</div>
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatNumero = (p) =>
    p?.numero_ordonnance || `ORD-${String(p?.id ?? '').padStart(4, '0')}`;

  const getMedicamentNom = (l) =>
    l.medicament_nom || l.medicament || l.nom ||
    (l.medicament_id ? `Médicament #${l.medicament_id}` : '—');

  const getQuantite = (l) => l.quantite_prescrit ?? l.quantite ?? 0;

  const datePrescription = prescription.created_at || prescription.date_creation;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <style>
        {`
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
            .print-content { padding: 20px; }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .header-left { display: flex; align-items: center; }
            .print-logo { width: 80px; height: auto; margin-right: 15px; }
            .hospital-name { font-size: 20px; font-weight: bold; }
            .hospital-info { font-size: 12px; color: #555; }
            .title { text-align: center; font-size: 18px; font-weight: bold; margin: 10px 0; }
            .details { margin-bottom: 20px; }
            .details table { width: 100%; border-collapse: collapse; }
            .details td { padding: 4px 8px; }
            .table-prescription { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .table-prescription th { background-color: #f2f2f2; border: 1px solid #333; padding: 8px; text-align: left; }
            .table-prescription td { border: 1px solid #333; padding: 8px; }
            .signature { margin-top: 30px; text-align: center; }
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #ccc;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .print-logo { width: 80px; height: auto; margin-right: 15px; }
          .logo-placeholder {
            width: 80px; height: 80px; background: #eee;
            display: flex; align-items: center; justify-content: center;
            border-radius: 8px; margin-right: 15px; font-size: 40px;
          }
        `}
      </style>

      <div className="print-content">
        {/* 🔧 En-tête tenant-aware */}
        <div className="header">
          <div className="header-left">
            <img
              src={LOGO_URL}
              alt={`Logo ${HOPITAL_NOM}`}
              className="print-logo"
              onError={(e) => {
                // Fallback : remplace l'img cassée par un placeholder 🏥
                const parent = e.target.parentNode;
                const placeholder = document.createElement('div');
                placeholder.className = 'logo-placeholder';
                placeholder.textContent = '🏥';
                parent.replaceChild(placeholder, e.target);
              }}
            />
            <div>
              <div className="hospital-name">{HOPITAL_NOM}</div>
              {(HOPITAL_ADRESSE || HOPITAL_TEL) && (
                <div className="hospital-info">
                  {HOPITAL_ADRESSE}
                  {HOPITAL_ADRESSE && HOPITAL_TEL && ' · '}
                  {HOPITAL_TEL && `Tél: ${HOPITAL_TEL}`}
                </div>
              )}
              {(HOPITAL_EMAIL || HOPITAL_SITE) && (
                <div className="hospital-info">
                  {HOPITAL_EMAIL && `Email: ${HOPITAL_EMAIL}`}
                  {HOPITAL_EMAIL && HOPITAL_SITE && ' · '}
                  {HOPITAL_SITE && `Site: ${HOPITAL_SITE}`}
                </div>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Prescription médicale</div>
            <div style={{ fontSize: '14px' }}>N° {formatNumero(prescription)}</div>
          </div>
        </div>

        <div className="details">
          <table>
            <tbody>
              <tr><td><strong>Patient :</strong> {prescription.patient_prenom} {prescription.patient_nom}</td></tr>
              <tr><td><strong>Médecin prescripteur :</strong> Dr. {prescription.medecin_prenom} {prescription.medecin_nom}</td></tr>
              <tr><td><strong>Date :</strong> {formatDate(datePrescription)}</td></tr>
              {prescription.observations && (
                <tr><td><strong>Observations :</strong> {prescription.observations}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <h3 style={{ marginBottom: '5px' }}>Médicaments prescrits</h3>
        <table className="table-prescription">
          <thead>
            <tr>
              <th>Médicament</th>
              <th>Quantité</th>
              <th>Posologie</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((ligne, index) => (
              <tr key={ligne.id ?? index}>
                <td>{getMedicamentNom(ligne)}</td>
                <td>{getQuantite(ligne)}</td>
                <td>{ligne.posologie || '-'}</td>
              </tr>
            ))}
            {lignes.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', fontStyle: 'italic', color: '#888' }}>
                  Aucun médicament dans cette ordonnance.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="signature">
          <p>Cachet et signature du médecin</p>
          <p style={{ marginTop: '20px' }}>___________________________</p>
        </div>
      </div>

      <div className="no-print" style={{ marginTop: '30px', textAlign: 'center' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginRight: '10px' }}>
          🖨️ Imprimer
        </button>
        <button onClick={() => window.close()} style={{ padding: '10px 20px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Fermer
        </button>
      </div>
    </div>
  );
};

export default PrescriptionPrint;