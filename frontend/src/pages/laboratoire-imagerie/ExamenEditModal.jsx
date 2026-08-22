// src/pages/laboratoire-imagerie/ExamenEditModal.jsx
import { useState, useEffect } from 'react';
import api from '../../axios';
import { FaTimes, FaSave, FaSpinner } from 'react-icons/fa';

const ExamenEditModal = ({ examenId, onClose, onSuccess }) => {
  const [examen, setExamen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchExamen = async () => {
      try {
        const res = await api.get(`/examens/${examenId}`);
        setExamen(res.data);
        setLoading(false);
      } catch (err) {
        setError('Erreur chargement : ' + (err.response?.data?.error || err.message));
        setLoading(false);
      }
    };
    fetchExamen();
  }, [examenId]);

  const handleChange = (e) => {
    setExamen({ ...examen, [e.target.name]: e.target.value });
  };

  const handleParamChange = (index, field, value) => {
    const params = [...(examen.parametres || [])];
    params[index] = { ...params[index], [field]: value };
    setExamen({ ...examen, parametres: params });
  };

  const addParam = () => {
    const params = examen.parametres || [];
    params.push({ parametre_nom: '', valeur: '', unite: '', ref_min: '', ref_max: '', interpretation: '' });
    setExamen({ ...examen, parametres: params });
  };

  const removeParam = (index) => {
    const params = examen.parametres || [];
    params.splice(index, 1);
    setExamen({ ...examen, parametres: params });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      // Mise à jour des résultats (paramètres et statut)
      await api.put(`/examens/${examenId}/resultats`, {
        parametres: examen.parametres || [],
        statut: examen.statut || 'en_attente',
        commentaire_global: examen.commentaire_global || ''
      });
      setSuccessMessage('✅ Examen modifié avec succès');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err) {
      setError('❌ Erreur : ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Styles
  const overlayStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  };
  const modalStyle = {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    maxWidth: '900px',
    width: '95%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  };
  const inputStyle = {
    width: '100%',
    padding: '6px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '14px',
  };
  const labelStyle = {
    display: 'block',
    fontWeight: '500',
    marginBottom: '4px',
    color: '#374151',
  };
  const sectionStyle = {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
  };

  if (loading) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={{ textAlign: 'center', padding: '20px' }}>⏳ Chargement de l'examen...</div>
        </div>
      </div>
    );
  }

  if (error && !examen) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={{ color: '#ef4444' }}>{error}</div>
          <button onClick={onClose} style={{ marginTop: '12px', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Fermer</button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>✏️ Modifier l'examen</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>
            <FaTimes />
          </button>
        </div>

        {successMessage && (
          <div style={{ padding: '10px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '6px', marginBottom: '12px' }}>
            {successMessage}
          </div>
        )}
        {error && (
          <div style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '12px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Informations générales (lecture seule) */}
          <div style={{ ...sectionStyle, backgroundColor: '#f9fafb' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#6b7280' }}>Informations générales (lecture seule)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Patient</label>
                <input type="text" value={`${examen.patient_nom || ''} ${examen.patient_prenom || ''}`} readOnly style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
              </div>
              <div>
                <label style={labelStyle}>Type d'examen</label>
                <input type="text" value={examen.type_examen || examen.type_examen_nom || ''} readOnly style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
              </div>
              <div>
                <label style={labelStyle}>Date demande</label>
                <input type="text" value={examen.date_demande ? new Date(examen.date_demande).toLocaleDateString('fr-FR') : ''} readOnly style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
              </div>
              <div>
                <label style={labelStyle}>Médecin prescripteur</label>
                <input type="text" value={examen.medecin_prescripteur || ''} readOnly style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
              </div>
            </div>
          </div>

          {/* Champs modifiables */}
          <div style={sectionStyle}>
            <h4 style={{ margin: '0 0 8px 0' }}>Champs modifiables</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Catégorie</label>
                <select name="categorie" value={examen.categorie || ''} onChange={handleChange} style={inputStyle}>
                  <option value="">Sélectionner</option>
                  <option value="laboratoire">Laboratoire</option>
                  <option value="imagerie">Imagerie</option>
                  <option value="clinique">Clinique</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Date de prélèvement</label>
                <input type="date" name="date_prelevement" value={examen.date_prelevement ? new Date(examen.date_prelevement).toISOString().split('T')[0] : ''} onChange={handleChange} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Type de prélèvement</label>
                <input type="text" name="type_prelevement" value={examen.type_prelevement || ''} onChange={handleChange} style={inputStyle} placeholder="Ex: Sang, Urine, LCR..." />
              </div>
              <div>
                <label style={labelStyle}>Statut</label>
                <select name="statut" value={examen.statut || 'en_attente'} onChange={handleChange} style={inputStyle}>
                  <option value="en_attente">En attente</option>
                  <option value="en_cours">En cours</option>
                  <option value="realise">Réalisé</option>
                  <option value="annule">Annulé</option>
                </select>
              </div>
            </div>
          </div>

          {/* Paramètres / Résultats */}
          <div style={sectionStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0 }}>📊 Paramètres / Résultats</h4>
              <button type="button" onClick={addParam} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                + Ajouter un paramètre
              </button>
            </div>
            {examen.parametres && examen.parametres.length > 0 ? (
              examen.parametres.map((p, idx) => (
                <div key={idx} style={{ border: '1px solid #e5e7eb', padding: '12px', marginBottom: '10px', borderRadius: '6px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '500' }}>Paramètre</label>
                      <input type="text" value={p.parametre_nom || ''} onChange={e => handleParamChange(idx, 'parametre_nom', e.target.value)} style={inputStyle} placeholder="Nom" />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '500' }}>Valeur</label>
                      <input type="text" value={p.valeur || ''} onChange={e => handleParamChange(idx, 'valeur', e.target.value)} style={inputStyle} placeholder="Valeur" />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '500' }}>Unité</label>
                      <input type="text" value={p.unite || ''} onChange={e => handleParamChange(idx, 'unite', e.target.value)} style={inputStyle} placeholder="Unité" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '500' }}>Ref min</label>
                      <input type="text" value={p.ref_min || ''} onChange={e => handleParamChange(idx, 'ref_min', e.target.value)} style={inputStyle} placeholder="Ref min" />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '500' }}>Ref max</label>
                      <input type="text" value={p.ref_max || ''} onChange={e => handleParamChange(idx, 'ref_max', e.target.value)} style={inputStyle} placeholder="Ref max" />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '500' }}>Interprétation</label>
                      <input type="text" value={p.interpretation || ''} onChange={e => handleParamChange(idx, 'interpretation', e.target.value)} style={inputStyle} placeholder="Interprétation" />
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="text" value={p.commentaire || ''} onChange={e => handleParamChange(idx, 'commentaire', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="Commentaire du paramètre" />
                    <button type="button" onClick={() => removeParam(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <FaTimes />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: '#6b7280', fontStyle: 'italic' }}>Aucun paramètre. Cliquez sur "Ajouter un paramètre".</p>
            )}
          </div>

          {/* Commentaire global */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Commentaire global</label>
            <textarea name="commentaire_global" value={examen.commentaire_global || ''} onChange={handleChange} rows="3" style={{ ...inputStyle, resize: 'vertical' }} placeholder="Observations générales..." />
          </div>

          {/* Boutons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
            <button type="button" onClick={onClose} style={{ backgroundColor: '#e5e7eb', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Annuler
            </button>
            <button type="submit" disabled={saving} style={{ backgroundColor: '#3b82f6', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? <FaSpinner className="spin" /> : <FaSave />} Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExamenEditModal;