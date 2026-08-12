// src/pages/rh-planning/ContratPrint.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaPrint } from 'react-icons/fa';

const ContratPrint = () => {
  const { id } = useParams();
  const [contrat, setContrat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/contrats/${id}`)
      .then(res => {
        setContrat(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Contrat non trouvé');
        setLoading(false);
      });
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>Chargement...</div>;
  if (error) return <div style={{ padding: 60, color: 'red' }}>{error}</div>;
  if (!contrat) return null;

  // Récupération du logo – ajustez le chemin si nécessaire
  const logoUrl = '/logo.jpeg';

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Barre d'outils (masquée à l'impression) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Link to={`/rh/contrats/${contrat.id}`} style={{ color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaArrowLeft /> Retour
        </Link>
        <button onClick={handlePrint} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPrint /> Imprimer
        </button>
      </div>

      {/* Contenu imprimable */}
      <div id="contrat-print" style={{ 
        backgroundColor: 'white', 
        padding: '40px', 
        borderRadius: '12px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {/* En-tête avec logo */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '16px', 
          borderBottom: '3px solid #2563eb', 
          paddingBottom: '16px', 
          marginBottom: '24px' 
        }}>
          <img 
            src={logoUrl} 
            alt="Logo MCE" 
            style={{ height: '60px', width: 'auto', objectFit: 'contain' }} 
            onError={(e) => e.target.style.display = 'none'} 
          />
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a', margin: 0, letterSpacing: '2px' }}>HÔPITAL MCE</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Medical Center Elizabeth – Bukavu</p>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
              Avenue BOBZO, Quartier NDENDERE, Commune d'IBANDA, SUD-KIVU/RDC
            </p>
          </div>
        </div>

        <h2 style={{ textAlign: 'center', color: '#1e3a8a', marginBottom: '24px' }}>CONTRAT DE TRAVAIL</h2>

        {/* Informations générales */}
        <div style={{ 
          marginBottom: '20px', 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '8px 20px',
          backgroundColor: '#f8fafc',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <p><strong>Référence :</strong> {contrat.reference || 'N/A'}</p>
          <p><strong>Employé :</strong> {contrat.employe_prenom} {contrat.employe_nom}</p>
          <p><strong>Type :</strong> {contrat.type}</p>
          <p><strong>Statut :</strong> {contrat.statut}</p>
          <p><strong>Début :</strong> {new Date(contrat.date_debut).toLocaleDateString('fr-FR')}</p>
          <p><strong>Fin :</strong> {contrat.date_fin ? new Date(contrat.date_fin).toLocaleDateString('fr-FR') : 'Non définie'}</p>
          <p><strong>Salaire :</strong> {contrat.salaire ? `${parseFloat(contrat.salaire).toFixed(2)} FC` : 'Non défini'}</p>
          {contrat.commentaire && <p style={{ gridColumn: 'span 2' }}><strong>Commentaire :</strong> {contrat.commentaire}</p>}
        </div>

        <hr style={{ margin: '20px 0' }} />

        {/* Articles (clauses) */}
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#1e3a8a' }}>Clauses contractuelles</h3>
          {contrat.articles && contrat.articles.length > 0 ? (
            contrat.articles.map((art, idx) => (
              <div key={art.id || idx} style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '8px 0 4px 0', color: '#0f172a', fontSize: '15px' }}>
                  {art.titre || `Article ${idx + 1}`}
                </h4>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: '1.6' }}>
                  {art.contenu || 'Contenu non défini'}
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
              Aucun article défini pour ce contrat.
            </p>
          )}
        </div>

        {/* Pied de page */}
        <div style={{ 
          marginTop: '40px', 
          borderTop: '2px solid #e2e8f0', 
          paddingTop: '20px', 
          textAlign: 'center',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          <p style={{ margin: '4px 0' }}>
            Fait à Bukavu, le {new Date().toLocaleDateString('fr-FR')}
          </p>
          <p style={{ margin: '4px 0' }}>
            Cachet et signature de l'employeur
          </p>
          <p style={{ margin: '12px 0 0 0', fontSize: '10px', color: '#94a3b8' }}>
            Document généré par le système MCE
          </p>
        </div>
      </div>

      {/* Styles pour l'impression */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #contrat-print, #contrat-print * { visibility: visible; }
          #contrat-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm !important;
            background: white !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .no-print { display: none !important; }
          @page {
            size: A4;
            margin: 15mm;
          }
          /* Ajustements pour éviter les coupures */
          #contrat-print h1 { font-size: 20px !important; }
          #contrat-print h2 { font-size: 18px !important; }
          #contrat-print h3 { font-size: 16px !important; }
          #contrat-print p, #contrat-print div { font-size: 12px !important; }
          #contrat-print .grid { display: block; }
          #contrat-print .grid p { margin: 4px 0; }
        }
      `}</style>
    </div>
  );
};

export default ContratPrint;