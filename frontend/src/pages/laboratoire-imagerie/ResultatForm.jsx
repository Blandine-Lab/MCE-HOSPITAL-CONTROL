// src/pages/laboratoire-imagerie/ResultatForm.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';
import {
  FaArrowLeft,
  FaSave,
  FaFileMedical,
  FaCheckCircle,
  FaPrint,
  FaExclamationTriangle,
  FaTimesCircle,
  FaMicroscope
} from 'react-icons/fa';

const ResultatForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [examen, setExamen] = useState(null);
  const [parametres, setParametres] = useState([]);
  const [commentaireGlobal, setCommentaireGlobal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const permissions = user?.permissions || [];
  const isBiologiste = permissions.includes('validate_laboratory') || user?.role === 'biologiste';

  // Chargement des donnes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // 1. Rcuprer l'examen
        const examenRes = await api.get(`/examens/${id}`);
        const examenData = examenRes.data;
        setExamen(examenData);

        // 2. Rcuprer les paramtres
        let params = [];

        // Si l'examen a dj des paramtres structurs (array non vide)
        if (examenData.parametres && Array.isArray(examenData.parametres) && examenData.parametres.length > 0) {
          params = examenData.parametres;
        } else if (examenData.type_examen_id) {
          // Sinon, charger depuis le type d'examen
          try {
            const typeRes = await api.get(`/types-examens/${examenData.type_examen_id}`);
            const defauts = typeRes.data.parametres_defaut;
            if (defauts && Array.isArray(defauts) && defauts.length > 0) {
              params = defauts.map(p => ({
                ...p,
                valeur: '',
                commentaire: '',
                interpretation: ''
              }));
            } else {
              console.warn('Le type d\'examen n\'a pas de paramtres dfinis.');
            }
          } catch (typeErr) {
            console.warn('Impossible de charger les paramtres du type d\'examen', typeErr);
          }
        } else {
          console.warn('Aucun type_examen_id dfini pour cet examen.');
        }

        setParametres(params);
        setCommentaireGlobal(examenData.commentaire_global || '');

      } catch (err) {
        console.error('Erreur chargement donnes :', err);
        setError('Erreur de chargement des donnes');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Gestion des changements de valeur
  const handleParamChange = (index, field, value) => {
    const newParams = [...parametres];
    newParams[index][field] = value;

    // Auto-interprtation si valeur, ref_min et ref_max sont dfinis
    if (field === 'valeur' && newParams[index].ref_min && newParams[index].ref_max) {
      const val = parseFloat(value);
      const min = parseFloat(newParams[index].ref_min);
      const max = parseFloat(newParams[index].ref_max);
      if (!isNaN(val) && !isNaN(min) && !isNaN(max)) {
        if (val < min) newParams[index].interpretation = 'bas';
        else if (val > max) newParams[index].interpretation = 'haut';
        else newParams[index].interpretation = 'normal';
      } else {
        newParams[index].interpretation = '';
      }
    }
    setParametres(newParams);
  };

  // Sauvegarde en brouillon
  const handleSaveDraft = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put(`/examens/${id}/resultats`, {
        parametres,
        statut: 'en_cours',
        commentaire_global: commentaireGlobal
      });
      setSuccess('? Brouillon sauvegard');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Erreur sauvegarde brouillon :', err);
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // ============ FINALISER LA SAISIE (avec logs) ============
  const handleFinalize = async () => {
    console.log('?? [handleFinalize] Dclench');
    console.log('?? Examen ID:', id);
    console.log('?? Paramtres:', parametres);
    console.log('?? Commentaire:', commentaireGlobal);

    if (!window.confirm('Confirmer la finalisation de la saisie ? Les rsultats seront transmis au biologiste pour validation.')) {
      console.log('?? [handleFinalize] Confirm annul');
      return;
    }
    console.log('?? [handleFinalize] Confirm accept');

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.put(`/examens/${id}/resultats`, {
        parametres,
        statut: 'termin',
        commentaire_global: commentaireGlobal
      });
      console.log('? [handleFinalize] Rponse serveur:', response);
      setSuccess('? Saisie finalise, en attente de validation');
      setTimeout(() => {
        navigate(`/laboratoire/examen/${id}`);
      }, 1500);
    } catch (err) {
      console.error('? [handleFinalize] Erreur:', err);
      console.error('? Dtails:', err.response?.data);
      setError(err.response?.data?.error || 'Erreur lors de la finalisation');
    } finally {
      setSaving(false);
    }
  };

  // Valider (biologiste)
  const handleValidate = async () => {
    if (!window.confirm('Confirmer la validation de ces rsultats ? Cette action est irrversible.')) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put(`/examens/${id}/validation`, {
        commentaire_validation: commentaireGlobal
      });
      setSuccess('? Rsultats valids !');
      setTimeout(() => {
        navigate(`/laboratoire/examen/${id}`);
      }, 1500);
    } catch (err) {
      console.error('Erreur validation :', err);
      setError(err.response?.data?.error || 'Erreur lors de la validation');
    } finally {
      setSaving(false);
    }
  };

  // Impression PDF ?FC? avec token encod dans l'URL
  const handlePrint = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Vous devez tre connect pour imprimer le PDF.');
      return;
    }
    const encodedToken = encodeURIComponent(token);
    window.open(`/api/examens/${id}/pdf?token=${encodedToken}`, '_blank');
  };

  // Vrifier s'il y a des valeurs critiques
  const hasCritical = useMemo(() => {
    return parametres.some(p => {
      const val = parseFloat(p.valeur);
      const min = parseFloat(p.ref_min);
      const max = parseFloat(p.ref_max);
      return !isNaN(val) && !isNaN(min) && !isNaN(max) && (val < min * 0.5 || val > max * 1.5);
    });
  }, [parametres]);

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

  const isSaisieTerminee = examen?.statut === 'termin' || examen?.statut === 'valide';
  const isValide = examen?.statut === 'valide';

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link
          to={`/laboratoire/examen/${id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#3b82f6',
            textDecoration: 'none',
            fontWeight: '500'
          }}
        >
          <FaArrowLeft /> Retour  l'examen
        </Link>
      </div>

      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        {/* En-tte */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaFileMedical style={{ fontSize: '32px', color: '#8b5cf6' }} />
            <div>
              <h2 style={{ margin: 0, color: '#0f172a' }}>Saisie des rsultats</h2>
              <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>
                {examen.type_examen} - {examen.patient_prenom} {examen.patient_nom}
                {hasCritical && (
                  <span style={{ color: '#dc2626', marginLeft: '12px' }}>
                    <FaExclamationTriangle /> Valeurs critiques dtectes
                  </span>
                )}
              </p>
            </div>
          </div>
          <div>
            <button
              onClick={handlePrint}
              style={{
                background: 'none',
                border: 'none',
                color: '#3b82f6',
                fontSize: '20px',
                cursor: 'pointer'
              }}
              title="Imprimer PDF"
            >
              <FaPrint />
            </button>
          </div>
        </div>

        {/* Messages */}
        {success && (
          <div
            style={{
              color: '#10b981',
              padding: '12px',
              backgroundColor: '#d1fae5',
              borderRadius: '8px',
              marginBottom: '16px'
            }}
          >
            {success}
          </div>
        )}
        {error && (
          <div
            style={{
              color: '#ef4444',
              padding: '12px',
              backgroundColor: '#fee2e2',
              borderRadius: '8px',
              marginBottom: '16px'
            }}
          >
            {error}
          </div>
        )}

        {/* Tableau des paramtres */}
        <form>
          {parametres.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>?? Aucun paramtre structur dfini pour ce type d'examen.</p>
              <p style={{ fontSize: '14px' }}>
                Vous pouvez saisir les rsultats dans la zone de commentaire ci-dessous.
                <br />
                <small>Si vous souhaitez structurer les paramtres, veuillez les dfinir dans le type d'examen depuis l'administration.</small>
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead style={{ backgroundColor: '#f1f5f9' }}>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Paramtre</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Valeur</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Unit</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Intervalle rfrence</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Interprtation</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {parametres.map((p, idx) => {
                  const val = parseFloat(p.valeur);
                  const min = parseFloat(p.ref_min);
                  const max = parseFloat(p.ref_max);
                  const isNormal = p.interpretation === 'normal';
                  const isAbnormal = p.interpretation === 'haut' || p.interpretation === 'bas';
                  const isCritical = !isNaN(val) && !isNaN(min) && !isNaN(max) && (val < min * 0.5 || val > max * 1.5);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontWeight: '500' }}>{p.nom || p.parametre_nom}</td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          step="any"
                          value={p.valeur || ''}
                          onChange={(e) => handleParamChange(idx, 'valeur', e.target.value)}
                          disabled={isSaisieTerminee}
                          style={{
                            width: '100px',
                            padding: '6px',
                            border: `2px solid ${isCritical ? '#dc2626' : isAbnormal ? '#f59e0b' : isNormal ? '#10b981' : '#e2e8f0'}`,
                            borderRadius: '4px',
                            fontSize: '14px'
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>{p.unite}</td>
                      <td style={{ padding: '8px' }}>{p.ref_min} - {p.ref_max}</td>
                      <td style={{ padding: '8px' }}>
                        {p.interpretation && (
                          <span
                            style={{
                              color: p.interpretation === 'normal' ? '#10b981' : p.interpretation === 'haut' ? '#ef4444' : '#f59e0b',
                              fontWeight: 'bold'
                            }}
                          >
                            {p.interpretation === 'normal' ? '? Normal' : p.interpretation === 'haut' ? '? Haut' : '? Bas'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          value={p.commentaire || ''}
                          onChange={(e) => handleParamChange(idx, 'commentaire', e.target.value)}
                          disabled={isSaisieTerminee}
                          style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Commentaire global */}
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#334155' }}>
              Commentaire global (pour le compte-rendu)
            </label>
            <textarea
              value={commentaireGlobal}
              onChange={(e) => setCommentaireGlobal(e.target.value)}
              rows="3"
              disabled={isValide}
              placeholder="Observations cliniques, notes pour le prescripteur..."
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                resize: 'vertical',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Boutons d'action */}
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {!isSaisieTerminee && (
              <>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  style={{
                    backgroundColor: '#94a3b8',
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
                  <FaSave /> {saving ? 'Sauvegarde...' : 'Sauvegarder brouillon'}
                </button>
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={saving}
                  style={{
                    backgroundColor: '#8b5cf6',
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
                  <FaCheckCircle /> {saving ? 'Finalisation...' : 'Finaliser la saisie'}
                </button>
              </>
            )}

            {isBiologiste && examen?.statut === 'termin' && !isValide && (
              <button
                type="button"
                onClick={handleValidate}
                disabled={saving}
                style={{
                  backgroundColor: '#10b981',
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
                <FaCheckCircle /> {saving ? 'Validation...' : 'Valider les rsultats'}
              </button>
            )}

            {isValide && (
              <span style={{ color: '#10b981', fontWeight: 'bold', padding: '10px 0' }}>
                ? Examen valid le{' '}
                {examen.date_validation
                  ? new Date(examen.date_validation).toLocaleDateString('fr-FR')
                  : 'date inconnue'}
              </span>
            )}

            {isSaisieTerminee && !isValide && (
              <span style={{ color: '#f59e0b', fontWeight: 'bold', padding: '10px 0' }}>
                ? En attente de validation
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResultatForm;
