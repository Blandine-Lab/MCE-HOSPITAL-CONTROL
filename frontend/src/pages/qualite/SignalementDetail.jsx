// src/pages/qualite/SignalementDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaCalendar, FaUser, FaTag, FaEdit } from 'react-icons/fa';

const SignalementDetail = () => {
  const { id } = useParams();
  const [signalement, setSignalement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/signalements/${id}`)
      .then(res => { setSignalement(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, [id]);

  const getStatusBadge = (statut) => {
    const configs = {
      ouvert: { bg: '#fef3c7', color: '#92400e', label: '📋 Ouvert' },
      en_cours: { bg: '#dbeafe', color: '#1e40af', label: '⏳ En cours' },
      résolu: { bg: '#d1fae5', color: '#065f46', label: '✅ Résolu' },
      fermé: { bg: '#f1f5f9', color: '#475569', label: '🔒 Fermé' }
    };
    const c = configs[statut] || configs.ouvert;
    return <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: c.bg, color: c.color }}>{c.label}</span>;
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>⏳ Chargement...</div>;
  if (!signalement) return <div style={{ textAlign: 'center', padding: '60px' }}>Signalement non trouvé</div>;

  return (
    <div>
      <Link to="/qualite/signalements" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none' }}><FaArrowLeft /> Retour</Link>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <h1 style={{ margin: 0 }}>Signalement {signalement.numero_signalement}</h1>
          <Link to={`/qualite/signalements/${id}/edit`} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '6px 16px', borderRadius: '6px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><FaEdit /> Modifier</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' }}>
          <div><FaCalendar style={{ marginRight: '8px' }} /> <strong>Date événement :</strong> {new Date(signalement.date_evenement).toLocaleDateString('fr-FR')}</div>
          <div><FaTag style={{ marginRight: '8px' }} /> <strong>Catégorie :</strong> {signalement.categorie_nom || '-'}</div>
          <div><strong>Criticité :</strong> <span style={{ color: signalement.criticite_couleur }}>{signalement.criticite_nom || '-'}</span></div>
          <div><FaUser style={{ marginRight: '8px' }} /> <strong>Patient :</strong> {signalement.patient_prenom} {signalement.patient_nom}</div>
          <div><strong>Statut :</strong> {getStatusBadge(signalement.statut)}</div>
          <div><strong>Priorité :</strong> {signalement.priorite}</div>
        </div>
        <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          <strong>Description :</strong> <p>{signalement.description}</p>
        </div>
        {signalement.circonstances && <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}><strong>Circonstances :</strong> <p>{signalement.circonstances}</p></div>}
        {signalement.consequence_patient && <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}><strong>Conséquences patient :</strong> <p>{signalement.consequence_patient}</p></div>}
        {signalement.actions_immediates && <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}><strong>Actions immédiates :</strong> <p>{signalement.actions_immediates}</p></div>}
        {signalement.resolution_notes && <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#d1fae5', borderRadius: '8px' }}><strong>Résolution :</strong> <p>{signalement.resolution_notes}</p></div>}
      </div>
    </div>
  );
};

export default SignalementDetail;
