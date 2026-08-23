// src/pages/laboratoire-imagerie/ImpressionExamen.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../axios';

// Chemin vers le logo (fichier dans le dossier public)
const logoPath = '/logo.jpeg'; // ou '/logo.svg' selon votre format

const ImpressionExamen = () => {
  const { id } = useParams();
  const [examen, setExamen] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/examens/${id}`)
      .then(res => {
        const data = res.data;
        if (data.parametres && Array.isArray(data.parametres)) {
          data.parametres = data.parametres.map(p => ({
            ...p,
            nom: p.nom || p.parametre_nom || '',
            type_parametre: p.type_parametre || (p.ref_min || p.ref_max ? 'quantitatif' : 'qualitatif')
          }));
        }
        setExamen(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        alert('Erreur de chargement des données.');
      });
  }, [id]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>;
  if (!examen) return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>Examen introuvable</div>;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getUniqueParams = (params) => {
    if (!params) return [];
    const seen = new Set();
    return params.filter(p => {
      const key = p.nom || p.parametre_nom;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const uniqueParams = getUniqueParams(examen.parametres);

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      {/* En-tête avec logo et nom de l'hôpital */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #2563eb', paddingBottom: '10px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={logoPath} alt="Logo Hôpital" style={{ height: '60px', width: 'auto' }} />
          <div>
            <h1 style={{ margin: 0, color: '#1e3a8a', fontSize: '24px' }}>Medical Center Elizabeth MCE</h1>
            <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>Laboratoire & Imagerie Médicale</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
            <strong>Date d'édition :</strong> {new Date().toLocaleDateString('fr-FR')}
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
            Examen #{examen.id}
          </p>
        </div>
      </div>

      {/* Titre du document */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#0f172a' }}>COMPTE-RENDU D'EXAMEN</h2>
      </div>

      {/* Informations générales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
        <div>
          <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
            <strong>Patient :</strong> {examen.patient_prenom} {examen.patient_nom}
          </p>
          <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
            <strong>Date naissance :</strong> {examen.patient_date_naissance ? formatDate(examen.patient_date_naissance) : 'N/C'}
          </p>
          <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
            <strong>Examen :</strong> {examen.type_examen}
          </p>
          <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
            <strong>Catégorie :</strong> {examen.categorie === 'laboratoire' ? '🧪 Laboratoire' : '🖥️ Imagerie'}
          </p>
          <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
            <strong>Priorité :</strong> {examen.priorite === 'urgent' ? '⚠️ URGENT' : 'Normal'}
          </p>
        </div>
        <div>
          <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
            <strong>Service demandeur :</strong> {examen.service_nom || 'N/C'}
          </p>
          <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
            <strong>Médecin prescripteur :</strong> {examen.medecin_prescripteur || 'N/C'}
          </p>
          <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
            <strong>Date demande :</strong> {formatDateTime(examen.date_demande)}
          </p>
          <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
            <strong>Date prévue :</strong> {examen.date_prevue ? formatDate(examen.date_prevue) : 'N/C'}
          </p>
          {examen.type_prelevement && (
            <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
              <strong>Type prélèvement :</strong> {examen.type_prelevement}
            </p>
          )}
          {examen.date_prelevement && (
            <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
              <strong>Date prélèvement :</strong> {formatDate(examen.date_prelevement)}
            </p>
          )}
          {examen.preleveur_id && (
            <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
              <strong>Préleveur ID :</strong> {examen.preleveur_id}
            </p>
          )}
        </div>
      </div>

      {/* Description, instructions, notes */}
      {(examen.description || examen.instructions_preparation || examen.notes) && (
        <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          {examen.description && (
            <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
              <strong>Description / Motif :</strong> {examen.description}
            </p>
          )}
          {examen.instructions_preparation && (
            <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
              <strong>Instructions de préparation :</strong> {examen.instructions_preparation}
            </p>
          )}
          {examen.notes && (
            <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
              <strong>Notes internes :</strong> {examen.notes}
            </p>
          )}
        </div>
      )}

      {/* Résultats */}
      <h2 style={{ color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '10px' }}>
        Résultats
      </h2>
      {uniqueParams.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Paramètre</th>
              <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Valeur</th>
              <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Unité</th>
              <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Référence</th>
              <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Interprétation</th>
              <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Type</th>
            </tr>
          </thead>
          <tbody>
            {uniqueParams.map((p, idx) => {
              const isQuantitatif = p.type_parametre === 'quantitatif';
              const isNormal = p.interpretation === 'normal';
              const isAbnormal = p.interpretation === 'haut' || p.interpretation === 'bas';
              const valeur = p.valeur || '-';
              let reference = '-';
              if (isQuantitatif && p.ref_min && p.ref_max) {
                reference = `${p.ref_min} - ${p.ref_max}`;
              } else if (!isQuantitatif && p.valeurs_possibles) {
                reference = p.valeurs_possibles;
              }
              return (
                <tr key={idx}>
                  <td style={{ padding: '6px', border: '1px solid #e2e8f0' }}>{p.nom}</td>
                  <td style={{ padding: '6px', border: '1px solid #e2e8f0' }}>{valeur}</td>
                  <td style={{ padding: '6px', border: '1px solid #e2e8f0' }}>{isQuantitatif ? (p.unite || '-') : '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #e2e8f0' }}>{reference}</td>
                  <td style={{ padding: '6px', border: '1px solid #e2e8f0' }}>
                    {p.interpretation && (
                      <span style={{
                        color: isNormal ? '#10b981' : isAbnormal ? '#ef4444' : '#f59e0b',
                        fontWeight: 'bold'
                      }}>
                        {isNormal ? '✅ Normal' : isAbnormal ? (p.interpretation === 'haut' ? '⬆ Haut' : '⬇ Bas') : p.interpretation}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '6px', border: '1px solid #e2e8f0' }}>
                    {isQuantitatif ? '📊 Quant.' : '✏️ Qual.'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p style={{ color: '#94a3b8' }}>Aucun paramètre structuré.</p>
      )}

      {/* Commentaire global */}
      {examen.commentaire_global && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#0f172a' }}>Commentaire global</h3>
          <p style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>{examen.commentaire_global}</p>
        </div>
      )}

      {/* Pied de page */}
      <div style={{ marginTop: '40px', borderTop: '1px solid #e2e8f0', paddingTop: '10px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
        <p>Ce document est un compte-rendu officiel. Il est délivré sous la responsabilité du laboratoire.</p>
        <p>MCE - Hôpital Elizabeth</p>
        {examen.statut && (
          <p>
            Statut : {examen.statut === 'realise' ? '✅ Réalisé' :
              examen.statut === 'en_cours' ? '⏳ En cours' :
              examen.statut === 'en_attente' ? '📋 En attente' :
              examen.statut === 'annule' ? '❌ Annulé' :
              examen.statut}
          </p>
        )}
        {examen.date_validation && (
          <p>Date de validation : {formatDateTime(examen.date_validation)}</p>
        )}
        {examen.date_saisie && (
          <p>Date de saisie : {formatDateTime(examen.date_saisie)}</p>
        )}
      </div>

      {/* Boutons d'action (non imprimés) */}
      <div className="no-print" style={{ marginTop: '20px', textAlign: 'center' }}>
        <button onClick={() => window.print()} style={{ padding: '8px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          🖨️ Imprimer / PDF
        </button>
        <button onClick={() => window.close()} style={{ marginLeft: '12px', padding: '8px 24px', background: '#94a3b8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Fermer
        </button>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
};

export default ImpressionExamen;