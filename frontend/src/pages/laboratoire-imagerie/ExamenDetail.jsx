// src/pages/laboratoire-imagerie/ExamenDetail.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';
import {
  FaArrowLeft,
  FaUser,
  FaCalendar,
  FaFlask,
  FaXRay,
  FaEdit,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaPrint,
  FaHistory,
  FaTrash,
  FaStethoscope,
  FaHospital,
  FaMicroscope,
  FaFileMedical,
  FaDownload
} from 'react-icons/fa';

const ExamenDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [examen, setExamen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historique, setHistorique] = useState([]);
  const [showHistorique, setShowHistorique] = useState(false);
  const [loadingHistorique, setLoadingHistorique] = useState(false);

  const permissions = user?.permissions || [];
  // ? Le laborantin peut grer (saisir, annuler) mme sans permission explicite
  const canManage = permissions.includes('manage_laboratory') || user?.role === 'laborantin';
  const canValidate = permissions.includes('validate_laboratory') || user?.role === 'biologiste';

  // Chargement des donnes
  useEffect(() => {
    const fetchExamen = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/examens/${id}`);
        setExamen(res.data);
        setError('');
      } catch (err) {
        console.error('Erreur chargement dtail :', err);
        setError('Impossible de charger l\'examen');
      } finally {
        setLoading(false);
      }
    };
    fetchExamen();
  }, [id]);

  // Chargement de l'historique (optionnel)
  const handleLoadHistorique = async () => {
    if (showHistorique) {
      setShowHistorique(false);
      return;
    }
    setLoadingHistorique(true);
    try {
      const res = await api.get(`/examens/${id}/historique`);
      setHistorique(res.data);
      setShowHistorique(true);
    } catch (err) {
      console.error('Erreur historique', err);
    } finally {
      setLoadingHistorique(false);
    }
  };

  // ? Impression PDF avec fetch + token dans le header
  const handleImprimer = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Vous devez tre connect pour imprimer le PDF.');
      return;
    }
    try {
      const response = await fetch(`/api/examens/${id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        alert('Erreur : ' + (errorData.error || 'Impossible de gnrer le PDF'));
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `examen_${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur impression PDF :', err);
      alert('Erreur lors de l\'impression du PDF');
    }
  };

  // Annulation
  const handleAnnuler = async () => {
    if (!window.confirm('Confirmer l\'annulation de cet examen ?')) return;
    try {
      await api.put(`/examens/${id}/annuler`);
      const res = await api.get(`/examens/${id}`);
      setExamen(res.data);
    } catch (err) {
      console.error('Erreur annulation', err);
      setError('Erreur lors de l\'annulation');
    }
  };

  // Timeline des tapes
  const getTimeline = useMemo(() => {
    if (!examen) return [];
    const events = [];
    events.push({
      date: examen.date_demande,
      label: 'Demande',
      description: `Par ${examen.medecin_prescripteur || 'mdecin'}`,
      icon: <FaClock />,
      color: '#3b82f6'
    });
    if (examen.date_prelevement) {
      events.push({
        date: examen.date_prelevement,
        label: 'Prlvement',
        description: `Type: ${examen.type_prelevement || 'non spcifi'}`,
        icon: <FaMicroscope />,
        color: '#8b5cf6'
      });
    }
    if (examen.statut === 'en_cours' || examen.statut === 'termin' || examen.statut === 'valide') {
      events.push({
        date: examen.date_debut_analyse || examen.date_demande,
        label: 'Analyse en cours',
        description: 'Technicien affect',
        icon: <FaFlask />,
        color: '#f59e0b'
      });
    }
    if (examen.statut === 'termin' || examen.statut === 'valide') {
      events.push({
        date: examen.date_resultats,
        label: 'Rsultats saisis',
        description: 'En attente de validation',
        icon: <FaFileMedical />,
        color: '#10b981'
      });
    }
    if (examen.statut === 'valide') {
      events.push({
        date: examen.date_validation,
        label: 'Valid',
        description: `Par ${examen.biologiste_nom || 'biologiste'}`,
        icon: <FaCheckCircle />,
        color: '#10b981'
      });
    }
    if (examen.statut === 'annul') {
      events.push({
        date: examen.date_annulation,
        label: 'Annul',
        description: examen.motif_annulation || '',
        icon: <FaTimesCircle />,
        color: '#ef4444'
      });
    }
    return events.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [examen]);

  // Rendu du statut avec icne
  const getStatusBadge = (statut) => {
    const configs = {
      'demand': { bg: '#dbeafe', color: '#1e40af', icon: <FaClock />, label: 'Demand' },
      'en_cours': { bg: '#fef3c7', color: '#92400e', icon: <FaClock />, label: 'En cours' },
      'termin': { bg: '#d1fae5', color: '#065f46', icon: <FaCheckCircle />, label: 'Termin' },
      'valide': { bg: '#ede9fe', color: '#5b21b6', icon: <FaCheckCircle />, label: 'Valid' },
      'annul': { bg: '#fee2e2', color: '#991b1b', icon: <FaTimesCircle />, label: 'Annul' },
    };
    const config = configs[statut] || configs['demand'];
    return (
      <span style={{
        padding: '6px 16px',
        borderRadius: '20px',
        fontSize: '16px',
        fontWeight: '500',
        backgroundColor: config.bg,
        color: config.color,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {config.icon} {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '24px' }}>? Chargement...</div>
      </div>
    );
  }

  if (error || !examen) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ef4444' }}>
        <div style={{ fontSize: '20px' }}>{error || 'Examen non trouv'}</div>
      </div>
    );
  }

  return (
    <div>
      {/* Navigation */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/laboratoire" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: '#3b82f6',
          textDecoration: 'none',
          fontWeight: '500'
        }}>
          <FaArrowLeft /> Retour  la liste
        </Link>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleImprimer}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '8px'
            }}
            title="Imprimer PDF"
          >
            <FaPrint />
          </button>
          <button
            onClick={handleLoadHistorique}
            style={{
              background: 'none',
              border: 'none',
              color: '#8b5cf6',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '8px'
            }}
            title="Historique"
          >
            <FaHistory />
          </button>
          {examen.statut !== 'annul' && canManage && (
            <button
              onClick={handleAnnuler}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '8px'
              }}
              title="Annuler"
            >
              <FaTrash />
            </button>
          )}
        </div>
      </div>

      {/* En-tte */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', color: '#0f172a' }}>
              {examen.type_examen}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
              <span style={{ color: '#64748b' }}>
                Examen #{examen.id} - {examen.categorie === 'laboratoire' ? '?? Laboratoire' : '?? Imagerie'}
              </span>
              {examen.priorite === 'urgent' && (
                <span style={{ color: '#dc2626', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaExclamationTriangle /> Urgent
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {getStatusBadge(examen.statut)}
            {(examen.statut === 'demand' || examen.statut === 'en_cours') && canManage && (
              <Link
                to={`/laboratoire/resultats/${examen.id}`}
                style={{
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '500'
                }}
              >
                <FaEdit /> Saisir rsultats
              </Link>
            )}
            {examen.statut === 'termin' && canValidate && (
              <Link
                to={`/laboratoire/validation/${examen.id}`}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '500'
                }}
              >
                <FaClipboardCheck /> Valider
              </Link>
            )}
          </div>
        </div>

        {/* Informations principales */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          <InfoBlock icon={<FaUser />} label="Patient" value={`${examen.patient_prenom} ${examen.patient_nom}`} />
          <InfoBlock icon={<FaStethoscope />} label="Mdecin" value={examen.medecin_prescripteur || 'Non renseign'} />
          <InfoBlock icon={<FaHospital />} label="Service" value={examen.service_nom || 'Non spcifi'} />
          <InfoBlock icon={<FaCalendar />} label="Date demande" value={new Date(examen.date_demande).toLocaleDateString('fr-FR')} />
          <InfoBlock icon={<FaCalendar />} label="Date prvue" value={examen.date_prevue ? new Date(examen.date_prevue).toLocaleDateString('fr-FR') : 'Non spcifie'} />
          {examen.type_prelevement && (
            <InfoBlock icon={<FaMicroscope />} label="Type prlvement" value={examen.type_prelevement} />
          )}
          {examen.date_prelevement && (
            <InfoBlock icon={<FaCalendar />} label="Date prlvement" value={new Date(examen.date_prelevement).toLocaleDateString('fr-FR')} />
          )}
          {examen.instructions_preparation && (
            <InfoBlock icon={<FaFileMedical />} label="Instructions" value={examen.instructions_preparation} />
          )}
        </div>

        {examen.description && (
          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Description / Motif</p>
            <p style={{ margin: '8px 0 0 0', color: '#0f172a' }}>{examen.description}</p>
          </div>
        )}
      </div>

      {/* Rsultats (s'il y en a) */}
      {examen.resultats && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <h3 style={{ marginTop: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaClipboardCheck style={{ color: '#10b981' }} /> Rsultats
          </h3>
          {examen.parametres && examen.parametres.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f1f5f9' }}>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Paramtre</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Valeur</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Unit</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Rfrence</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Interprtation</th>
                </tr>
              </thead>
              <tbody>
                {examen.parametres.map((p, idx) => {
                  const isNormal = p.interpretation === 'normal';
                  const isAbnormal = p.interpretation === 'haut' || p.interpretation === 'bas';
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontWeight: '500' }}>{p.nom}</td>
                      <td style={{ padding: '8px' }}>{p.valeur}</td>
                      <td style={{ padding: '8px' }}>{p.unite}</td>
                      <td style={{ padding: '8px' }}>{p.ref_min} - {p.ref_max}</td>
                      <td style={{ padding: '8px' }}>
                        {p.interpretation && (
                          <span style={{
                            color: isNormal ? '#10b981' : isAbnormal ? '#ef4444' : '#f59e0b',
                            fontWeight: 'bold'
                          }}>
                            {isNormal ? '? Normal' : isAbnormal ? (p.interpretation === 'haut' ? '? Haut' : '? Bas') : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#64748b' }}>{examen.resultats}</p>
          )}
          {examen.compte_rendu && (
            <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#ede9fe', borderRadius: '8px', border: '1px solid #8b5cf6' }}>
              <p style={{ color: '#5b21b6', margin: 0, fontSize: '14px', fontWeight: 'bold' }}>? Compte-rendu mdical</p>
              <p style={{ margin: '8px 0 0 0', color: '#0f172a' }}>{examen.compte_rendu}</p>
            </div>
          )}
          {examen.notes && (
            <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
              <p style={{ color: '#92400e', margin: 0, fontSize: '14px' }}>Notes</p>
              <p style={{ margin: '8px 0 0 0', color: '#0f172a' }}>{examen.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {getTimeline.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <h3 style={{ marginTop: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaHistory style={{ color: '#8b5cf6' }} /> Chronologie
          </h3>
          <div style={{ position: 'relative', paddingLeft: '30px' }}>
            {getTimeline.map((event, idx) => (
              <div key={idx} style={{ position: 'relative', marginBottom: '20px' }}>
                <div style={{
                  position: 'absolute',
                  left: '-30px',
                  top: '4px',
                  color: event.color,
                  fontSize: '18px'
                }}>
                  {event.icon}
                </div>
                <div style={{
                  borderLeft: '2px solid #e2e8f0',
                  paddingLeft: '16px'
                }}>
                  <div style={{ fontWeight: '500', color: '#0f172a' }}>{event.label}</div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>
                    {new Date(event.date).toLocaleString('fr-FR')}
                  </div>
                  {event.description && (
                    <div style={{ fontSize: '14px', color: '#475569', marginTop: '2px' }}>{event.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historique (affichage conditionnel) */}
      {showHistorique && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <h3 style={{ marginTop: 0, color: '#0f172a' }}>Historique des modifications</h3>
          {loadingHistorique ? (
            <p>Chargement...</p>
          ) : historique.length === 0 ? (
            <p style={{ color: '#64748b' }}>Aucune modification enregistre</p>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {historique.map((h, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <span>{h.champ} : {h.ancienne_valeur} ? {h.nouvelle_valeur}</span>
                  <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                    {new Date(h.date_modification).toLocaleString()} par {h.utilisateur}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Composant InfoBlock rutilisable
const InfoBlock = ({ icon, label, value }) => (
  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
    <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
      {icon} {label}
    </p>
    <p style={{ fontWeight: '500', fontSize: '18px', margin: '4px 0 0 0', color: '#0f172a' }}>
      {value || '-'}
    </p>
  </div>
);

export default ExamenDetail;
