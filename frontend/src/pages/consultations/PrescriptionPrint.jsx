import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../axios';

// Configuration (à harmoniser avec le backend)
// Vous pouvez placer ces valeurs dans un fichier .env : VITE_HOPITAL_NOM, VITE_HOPITAL_ADRESSE, etc.
const HOPITAL_CONFIG = {
  nom: import.meta.env.VITE_HOPITAL_NOM || 'Medical Center Elizabeth MCE',
  adresse: import.meta.env.VITE_HOPITAL_ADRESSE || "avenue BOBZO, Quartier NDENDERE, Commune d'IBANDA, SUD-KIVU/RDC",
  telephone: import.meta.env.VITE_HOPITAL_TELEPHONE || '+243 800000000',
  email: import.meta.env.VITE_HOPITAL_EMAIL || 'contact@medicalcenterelizabeth.org',
  site: import.meta.env.VITE_HOPITAL_SITE || 'www.medicalcenterelizabeth.org',
  logoUrl: '/logo.jpeg' // ou '/logo.png' selon votre fichier
};

const PrescriptionPrint = () => {
  const { id } = useParams();
  const [prescription, setPrescription] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ordRes = await api.get(`/pharmacy/ordonnances/${id}`);
        const lignesRes = await api.get(`/pharmacy/ordonnances/${id}/lignes`);
        setPrescription(ordRes.data);
        setLignes(lignesRes.data);
        setLoading(false);
        setTimeout(() => window.print(), 500);
      } catch (err) {
        console.error('Erreur chargement prescription :', err);
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>⏳ Chargement...</div>;
  if (!prescription) return <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>Prescription introuvable</div>;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

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
            .logo { width: 80px; height: auto; margin-right: 15px; }
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
          .logo {
            width: 80px;
            height: auto;
            margin-right: 15px;
          }
          .logo-placeholder {
            width: 80px;
            height: 80px;
            background: #eee;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            margin-right: 15px;
            font-size: 40px;
          }
        `}
      </style>

      <div className="print-content">
        {/* En-tête personnalisé avec logo et infos de l'hôpital */}
        <div className="header">
          <div className="header-left">
            {HOPITAL_CONFIG.logoUrl ? (
              <img src={HOPITAL_CONFIG.logoUrl} alt="Logo" className="logo" />
            ) : (
              <div className="logo-placeholder">🏥</div>
            )}
            <div>
              <div className="hospital-name">{HOPITAL_CONFIG.nom}</div>
              <div className="hospital-info">
                {HOPITAL_CONFIG.adresse} · Tél: {HOPITAL_CONFIG.telephone}
              </div>
              <div className="hospital-info">
                Email: {HOPITAL_CONFIG.email} · Site: {HOPITAL_CONFIG.site}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Prescription médicale</div>
            <div style={{ fontSize: '14px' }}>N° ORD-{String(prescription.id).padStart(4, '0')}</div>
          </div>
        </div>

        {/* Détails du patient et médecin */}
        <div className="details">
          <table>
            <tbody>
              <tr><td><strong>Patient :</strong> {prescription.patient_prenom} {prescription.patient_nom}</td></tr>
              <tr><td><strong>Médecin prescripteur :</strong> Dr. {prescription.medecin_prenom} {prescription.medecin_nom}</td></tr>
              <tr><td><strong>Date :</strong> {formatDate(prescription.date_creation)}</td></tr>
              {prescription.observations && (
                <tr><td><strong>Observations :</strong> {prescription.observations}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Tableau des médicaments */}
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
              <tr key={index}>
                <td>{ligne.medicament_nom}</td>
                <td>{ligne.quantite_prescrit}</td>
                <td>{ligne.posologie || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Emplacement signature */}
        <div className="signature">
          <p>Cachet et signature du médecin</p>
          <p style={{ marginTop: '20px' }}>___________________________</p>
        </div>
      </div>

      {/* Boutons d'action (non imprimés) */}
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