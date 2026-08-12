// src/pages/laboratoire-imagerie/ValidationForm.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaTimesCircle,
  FaMicroscope,
  FaUser,
  FaCalendar,
  FaFlask,
  FaXRay,
  FaExclamationTriangle,
  FaSave,
  FaPrint,
  FaClipboardCheck  // ? Ajout essentiel
} from 'react-icons/fa';

const ValidationForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [examen, setExamen] = useState(null);
  const [parametres, setParametres] = useState([]);
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Vrifier les permissions
  const permissions = user?.permissions || [];
  const canValidate = permissions.includes('validate_laboratory') || user?.role === 'biologiste' || user?.role === 'admin';

  // Chargement des donnes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/examens/${id}`);
        const data = res.data;
        setExamen(data);
        setParametres(data.parametres || []);
        setCommentaire(data.commentaire_global || '');
      } catch (err) {
        console.error('Erreur chargement examen :', err);
        setError('Impossible de charger l\'examen');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Gestion de la validation
  const handleValidate = async () => {
    if (!window.confirm('Confirmer la validation de cet examen ? Cette action est irrversible.')) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await api.put(`/examens/${id}/validation`, {
        commentaire_validation: commentaire
      });
      setSuccess('? Examen valid avec succs !');
      setTimeout(() => {
        navigate(`/laboratoire/examen/${id}`);
      }, 2000);
    } catch (err) {
      console.error('Erreur validation :', err);
      setError(err.response?.data?.error || 'Erreur lors de la validation');
      setSubmitting(false);
    }
  };

  // Gestion de la rouverture (annuler la validation)
  const handleReopen = async () => {
    if (!window.confirm('Confirmer la rouverture de cet examen ? Les rsultats repasseront en statut "termin".')) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await api.put(`/examens/${id}/reopen`);
      setSuccess('? Examen rouvert avec succs');
      setTimeout(() => {
        navigate(`/laboratoire/examen/${id}`);
      }, 2000);
    } catch (err) {
      console.error('Erreur rouverture :', err);
      setError(err.response?.data?.error || 'Erreur lors de la rouverture');
      setSubmitting(false);
    }
  };

  // ? Impression PDF avec token dans l'URL
  const handlePrint = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Vous devez tre connect pour imprimer le PDF.');
      return;
    }
    // Encoder le token pour viter les problmes de caractres spciaux
    const encodedToken = encodeURIComponent(token);
    window.open(`/api/examens/${id}/pdf?token=${encodedToken}`, '_blank');
  };

  // Rendu du statut
  const getStatusBadge = (statut) => {
    const configs = {
      'demand': { bg: '#dbeafe', color: '#1e40af', label: '?? Demand' },
      'en_cours': { bg: '#fef3c7', color: '#92400e', label: '? En cours' },
      'termin': { bg: '#d1fae5', color: '#065f46', label: '? Termin' },
      'valide': { bg: '#ede9fe', color: '#5b21b6', label: '? Valid' },
      'annul': { bg: '#fee2e2', color: '#991b1b', label: '? Annul' },
    };
    const config = configs[statut] || configs['demand'];
    return (
      <span style={{
        padding: '6px 16px',
        borderRadius: '20px',
        fontSize: '16px',
        fontWeight: '500',
        backgroundColor: config.bg,
        color: config.color
      }}>
        {config.label}
      </span>
    );
  };

  // Gestion des erreurs d'autorisation
  if (!canValidate) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#ef4444' }}>
        <h2>? Accs non autoris</h2>
        <p>Vous n'avez pas les droits ncessaires pour valider des examens.</p>
        <Link to="/laboratoire" style={{ color: '#3b82f6', textDecoration: 'none', marginTop: '16px', display: 'inline-block' }}>
          <FaArrowLeft /> Retour au laboratoire
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '24px' }}>? Chargement...</div>
      </div>
    );
  }

  if (error && !examen) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ef4444' }}>
        <div style={{ fontSize: '20px' }}>{error}</div>
        <Link to="/laboratoire" style={{ color: '#3b82f6', textDecoration: 'none', marginTop: '16px', display: 'inline-block' }}>
          <FaArrowLeft /> Retour au laboratoire
        </Link>
      </div>
    );
  }

  // Si l'examen est dj valid
  if (examen.statut === 'valide') {
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <Link to={`/laboratoire/examen/${id}`} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#3b82f6',
            textDecoration: 'none',
            fontWeight: '500'
          }}>
            <FaArrowLeft /> Retour  l'examen
          </Link>
        </div>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <FaCheckCircle style={{ fontSize: '64px', color: '#10b981' }} />
          <h2 style={{ color: '#0f172a' }}>Cet examen est dj valid</h2>
          <p style={{ color: '#64748b' }}>Valid le {new Date(examen.date_validation).toLocaleDateString('fr-FR')}</p>
          {user?.role === 'admin' && (
            <button
              onClick={handleReopen}
              disabled={submitting}
              style={{
                marginTop: '20px',
                backgroundColor: '#f59e0b',
                color: 'white',
                padding: '10px 24px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaTimesCircle /> Rouvrir l'examen
            </button>
          )}
        </div>
      </div>
    );
  }

  // Si l'examen n'est pas en statut "termin" (saisi)
  if (examen.statut !== 'termin') {
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <Link to={`/laboratoire/examen/${id}`} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#3b82f6',
            textDecoration: 'none',
            fontWeight: '500'
          }}>
            <FaArrowLeft /> Retour  l'examen
          </Link>
        </div>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <FaExclamationTriangle style={{ fontSize: '64px', color: '#f59e0b' }} />
          <h2 style={{ color: '#0f172a' }}>Examen non saisissable</h2>
          <p style={{ color: '#64748b' }}>
            Cet examen doit avoir un statut <strong>"Termin"</strong> pour tre valid.
            <br />Statut actuel : {getStatusBadge(examen.statut)}
          </p>
          <Link to={`/laboratoire/resultats/${id}`} style={{
            marginTop: '20px',
            display: 'inline-block',
            backgroundColor: '#8b5cf6',
            color: 'white',
            padding: '10px 24px',
            borderRadius: '8px',
            textDecoration: 'none'
          }}>
            Aller saisir les rsultats
          </Link>
        </div>
      </div>
    );
  }

  // Affichage principal du formulaire de validation
  return (
    <div>
      {/* Navigation */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to={`/laboratoire/examen/${id}`} style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: '#3b82f6',
          textDecoration: 'none',
          fontWeight: '500'
        }}>
          <FaArrowLeft /> Retour  l'examen
        </Link>
        <button
          onClick={handlePrint}
          style={{
            background: 'none',
            border: 'none',
            color: '#3b82f6',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <FaPrint /> Imprimer
        </button>
      </div>

      {/* En-tte */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FaClipboardCheck style={{ color: '#8b5cf6' }} /> Validation des rsultats
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>
              {examen.type_examen} - {examen.patient_prenom} {examen.patient_nom}
            </p>
          </div>
          <div>{getStatusBadge(examen.statut)}</div>
        </div>

        {/* Informations patient */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px',
          marginTop: '20px',
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px'
        }}>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}><FaUser /> Patient</p>
            <p style={{ margin: '4px 0 0 0', fontWeight: '500' }}>{examen.patient_prenom} {examen.patient_nom}</p>
          </div>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}><FaCalendar /> Date demande</p>
            <p style={{ margin: '4px 0 0 0', fontWeight: '500' }}>{new Date(examen.date_demande).toLocaleDateString('fr-FR')}</p>
          </div>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}><FaMicroscope /> Service</p>
            <p style={{ margin: '4px 0 0 0', fontWeight: '500' }}>{examen.service_nom || '-'}</p>
          </div>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              {examen.categorie === 'laboratoire' ? <FaFlask /> : <FaXRay />} Catgorie
            </p>
            <p style={{ margin: '4px 0 0 0', fontWeight: '500' }}>
              {examen.categorie === 'laboratoire' ? 'Laboratoire' : 'Imagerie'}
            </p>
          </div>
        </div>
      </div>

      {/* Rsultats  valider */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <h3 style={{ marginTop: 0, color: '#0f172a' }}>Rsultats  valider</h3>

        {error && (
          <div style={{
            color: '#ef4444',
            padding: '12px',
            backgroundColor: '#fee2e2',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            color: '#10b981',
            padding: '12px',
            backgroundColor: '#d1fae5',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            {success}
          </div>
        )}

        {parametres.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
            Aucun paramtre structur. Rsultats textuels :
            <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'left' }}>
              {examen.resultats || 'Non renseigns'}
            </div>
          </div>
        ) : (
          <div style={{ overflow: 'auto' }}>
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
                {parametres.map((p, idx) => {
                  const isNormal = p.interpretation === 'normal';
                  const isAbnormal = p.interpretation === 'haut' || p.interpretation === 'bas';
                  const isCritical = parseFloat(p.valeur) < parseFloat(p.ref_min) * 0.5 ||
                                     parseFloat(p.valeur) > parseFloat(p.ref_max) * 1.5;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontWeight: '500' }}>{p.parametre_nom}</td>
                      <td style={{ padding: '8px', fontWeight: isCritical ? 'bold' : 'normal', color: isCritical ? '#dc2626' : 'inherit' }}>
                        {p.valeur} {isCritical && '??'}
                      </td>
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
          </div>
        )}

        {/* Commentaire de validation */}
        <div style={{ marginTop: '24px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
            Commentaire de validation (optionnel)
          </label>
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            rows="3"
            placeholder="Observations, remarques pour le prescripteur..."
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '16px',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Boutons d'action */}
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleValidate}
            disabled={submitting}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '12px 32px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaCheckCircle /> {submitting ? 'Validation...' : 'Valider les rsultats'}
          </button>
          <Link
            to={`/laboratoire/examen/${id}`}
            style={{
              backgroundColor: '#e2e8f0',
              color: '#475569',
              padding: '12px 32px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaTimesCircle /> Annuler
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ValidationForm;
