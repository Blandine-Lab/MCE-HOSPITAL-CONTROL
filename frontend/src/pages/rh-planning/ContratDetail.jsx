// src/pages/rh-planning/ContratDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaEdit, FaTrash, FaPrint } from 'react-icons/fa';

const ContratDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contrat, setContrat] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/contrats/${id}`)
      .then(res => { 
        setContrat(res.data); 
        setLoading(false); 
      })
      .catch(err => { 
        console.error(err); 
        setLoading(false); 
      });
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Supprimer ce contrat ?')) return;
    try {
      await api.delete(`/contrats/${id}`);
      navigate('/rh/contrats');
    } catch (err) { 
      alert('Erreur suppression'); 
    }
  };

  // Fonction d'impression directe (alternative)
  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>Chargement...</div>;
  if (!contrat) return <div style={{ padding: 60, textAlign: 'center' }}>Contrat non trouvé</div>;

  return (
    <div>
      {/* Barre de navigation - masquée à l'impression */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Link to="/rh/contrats" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#3b82f6', textDecoration: 'none' }}>
          <FaArrowLeft /> Retour
        </Link>
      </div>

      {/* Contenu principal */}
      <div className="contrat-detail-print" style={{ backgroundColor: 'white', borderRadius: 12, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ margin: 0 }}>Contrat de {contrat.employe_prenom} {contrat.employe_nom}</h2>
          <div className="no-print" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link to={`/rh/contrats/print/${contrat.id}`} style={{ backgroundColor: '#10b981', color: 'white', padding: '8px 16px', borderRadius: 6, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FaPrint /> Imprimer
            </Link>
            <Link to={`/rh/contrats/edit/${contrat.id}`} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '8px 16px', borderRadius: 6, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FaEdit /> Modifier
            </Link>
            <button onClick={handleDelete} style={{ backgroundColor: '#ef4444', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FaTrash /> Supprimer
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
          <p><strong>Type :</strong> {contrat.type || '—'}</p>
          <p><strong>Statut :</strong> 
            <span style={{ 
              backgroundColor: contrat.statut === 'actif' ? '#d1fae5' : '#fee2e2', 
              padding: '2px 10px', 
              borderRadius: 20,
              marginLeft: '4px',
              display: 'inline-block'
            }}>
              {contrat.statut || '—'}
            </span>
          </p>
          <p><strong>Date début :</strong> {contrat.date_debut ? new Date(contrat.date_debut).toLocaleDateString('fr-FR') : '—'}</p>
          <p><strong>Date fin :</strong> {contrat.date_fin ? new Date(contrat.date_fin).toLocaleDateString('fr-FR') : '—'}</p>
          <p><strong>Salaire :</strong> {contrat.salaire ? `${parseFloat(contrat.salaire).toFixed(2)} FC` : '—'}</p>
          <p><strong>Commentaire :</strong> {contrat.commentaire || '—'}</p>
        </div>

        {/* Pied de page pour l'impression */}
        <div className="no-print" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
          Document généré via le système MCE - {new Date().toLocaleDateString('fr-FR')}
        </div>
      </div>

      <style>{`
        .no-print { display: block; }

        @media print {
          /* Masquer les éléments non imprimables */
          body * { visibility: hidden; }
          .contrat-detail-print, .contrat-detail-print * { visibility: visible; }
          .no-print { display: none !important; }

          /* Positionner le contrat sur la page */
          .contrat-detail-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm !important;
            background: white !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          /* Supprimer les marges de page */
          @page {
            size: A4;
            margin: 15mm;
          }

          /* Ajustements typographiques */
          .contrat-detail-print h2 {
            font-size: 18px !important;
          }
          .contrat-detail-print p {
            font-size: 12px !important;
            margin: 4px 0 !important;
          }
          .contrat-detail-print span[style*="background-color"] {
            font-size: 11px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ContratDetail;