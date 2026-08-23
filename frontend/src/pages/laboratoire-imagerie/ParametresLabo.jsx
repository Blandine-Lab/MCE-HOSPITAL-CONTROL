// src/pages/laboratoire-imagerie/ParametresLabo.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';
import {
  FaArrowLeft,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSave,
  FaTimes,
  FaSpinner,
  FaExclamationTriangle
} from 'react-icons/fa';

const ParametresLabo = () => {
  const { user } = useAuth();

  // ✅ Vérification des droits (admin ou permission manage_laboratory)
  const isAdmin = user?.role === 'admin' || user?.permissions?.includes('manage_laboratory');

  const [parametres, setParametres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    unite: '',
    ref_min: '',
    ref_max: '',
    valeurs_possibles: '',
    seuil_critique_min: '',
    seuil_critique_max: '',
    type_parametre: 'quantitatif',
    categorie: 'laboratoire',
    commentaire: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });

  // Chargement des paramètres
  useEffect(() => {
    fetchParametres();
  }, []);

  const fetchParametres = async () => {
    setLoading(true);
    try {
      const res = await api.get('/parametres-references');
      setParametres(res.data);
      setError('');
    } catch (err) {
      console.error('Erreur chargement paramètres :', err);
      setError('Impossible de charger les paramètres');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  // ✅ Gestion du formulaire – réinitialisation sans toucher à showForm
  const resetForm = () => {
    setFormData({
      nom: '',
      unite: '',
      ref_min: '',
      ref_max: '',
      valeurs_possibles: '',
      seuil_critique_min: '',
      seuil_critique_max: '',
      type_parametre: 'quantitatif',
      categorie: 'laboratoire',
      commentaire: ''
    });
    setEditingId(null);
    setFormErrors({});
  };

  // ✅ Fonction d'ouverture du formulaire (création)
  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  // ✅ Fonction d'ouverture pour modification
  const handleEdit = (param) => {
    setEditingId(param.id);
    setFormData({
      nom: param.nom || '',
      unite: param.unite || '',
      ref_min: param.ref_min || '',
      ref_max: param.ref_max || '',
      valeurs_possibles: param.valeurs_possibles || '',
      seuil_critique_min: param.seuil_critique_min || '',
      seuil_critique_max: param.seuil_critique_max || '',
      type_parametre: param.type_parametre || 'quantitatif',
      categorie: param.categorie || 'laboratoire',
      commentaire: param.commentaire || ''
    });
    setShowForm(true);
  };

  // ✅ Fermeture du formulaire
  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.nom.trim()) errors.nom = 'Le nom est requis';
    if (formData.type_parametre === 'quantitatif') {
      if (formData.ref_min && isNaN(parseFloat(formData.ref_min))) errors.ref_min = 'Doit être un nombre';
      if (formData.ref_max && isNaN(parseFloat(formData.ref_max))) errors.ref_max = 'Doit être un nombre';
      if (formData.seuil_critique_min && isNaN(parseFloat(formData.seuil_critique_min))) errors.seuil_critique_min = 'Doit être un nombre';
      if (formData.seuil_critique_max && isNaN(parseFloat(formData.seuil_critique_max))) errors.seuil_critique_max = 'Doit être un nombre';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = { ...formData };
      // Convertir les champs numériques
      payload.ref_min = payload.ref_min ? parseFloat(payload.ref_min) : null;
      payload.ref_max = payload.ref_max ? parseFloat(payload.ref_max) : null;
      payload.seuil_critique_min = payload.seuil_critique_min ? parseFloat(payload.seuil_critique_min) : null;
      payload.seuil_critique_max = payload.seuil_critique_max ? parseFloat(payload.seuil_critique_max) : null;

      if (editingId) {
        await api.put(`/parametres-references/${editingId}`, payload);
        showToast('Paramètre modifié avec succès');
      } else {
        await api.post('/parametres-references', payload);
        showToast('Paramètre créé avec succès');
      }
      await fetchParametres();
      closeForm();
    } catch (err) {
      console.error('Erreur sauvegarde :', err);
      showToast(err.response?.data?.error || 'Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirmer la suppression de ce paramètre ?')) return;
    try {
      await api.delete(`/parametres-references/${id}`);
      showToast('Paramètre supprimé');
      await fetchParametres();
    } catch (err) {
      console.error('Erreur suppression :', err);
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <FaSpinner className="spinner" style={{ fontSize: '48px', color: '#f472b6', animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: '20px', marginTop: '16px' }}>Chargement des paramètres...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast.message && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast.message}
        </div>
      )}

      {/* Navigation */}
      <div style={{ marginBottom: '24px' }}>
        <Link to="/laboratoire" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: '#3b82f6',
          textDecoration: 'none',
          fontWeight: '500'
        }}>
          <FaArrowLeft /> Retour au laboratoire
        </Link>
      </div>

      {/* En-tête */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
          ⚙️ Paramètres du laboratoire
        </h1>
        {isAdmin ? (
          <button
            onClick={openCreateForm}
            style={{
              backgroundColor: '#f472b6',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            <FaPlus /> Nouveau paramètre
          </button>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: '14px' }}>
            ⚠️ Seuls les administrateurs peuvent gérer les paramètres
          </div>
        )}
      </div>

      {/* Formulaire d'ajout/modification */}
      {showForm && isAdmin && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px',
          border: '2px solid #f472b6' // Pour bien visualiser le formulaire
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: '#0f172a' }}>
              {editingId ? '✏️ Modifier le paramètre' : '➕ Nouveau paramètre'}
            </h3>
            <button
              onClick={closeForm}
              style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}
            >
              <FaTimes />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Nom *</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${formErrors.nom ? '#ef4444' : '#e2e8f0'}`,
                    borderRadius: '6px'
                  }}
                />
                {formErrors.nom && <span style={{ color: '#ef4444', fontSize: '12px' }}>{formErrors.nom}</span>}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Type</label>
                <select
                  name="type_parametre"
                  value={formData.type_parametre}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                >
                  <option value="quantitatif">Quantitatif</option>
                  <option value="qualitatif">Qualitatif</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Catégorie</label>
                <select
                  name="categorie"
                  value={formData.categorie}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                >
                  <option value="laboratoire">Laboratoire</option>
                  <option value="imagerie">Imagerie</option>
                </select>
              </div>
            </div>

            {formData.type_parametre === 'quantitatif' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginTop: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Unité</label>
                  <input
                    type="text"
                    name="unite"
                    value={formData.unite}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    placeholder="ex: g/dL"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Réf. min</label>
                  <input
                    type="number"
                    step="any"
                    name="ref_min"
                    value={formData.ref_min}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${formErrors.ref_min ? '#ef4444' : '#e2e8f0'}`,
                      borderRadius: '6px'
                    }}
                  />
                  {formErrors.ref_min && <span style={{ color: '#ef4444', fontSize: '12px' }}>{formErrors.ref_min}</span>}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Réf. max</label>
                  <input
                    type="number"
                    step="any"
                    name="ref_max"
                    value={formData.ref_max}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${formErrors.ref_max ? '#ef4444' : '#e2e8f0'}`,
                      borderRadius: '6px'
                    }}
                  />
                  {formErrors.ref_max && <span style={{ color: '#ef4444', fontSize: '12px' }}>{formErrors.ref_max}</span>}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Valeurs possibles (séparées par des virgules)</label>
                <input
                  type="text"
                  name="valeurs_possibles"
                  value={formData.valeurs_possibles}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                  placeholder="ex: Positif,Négatif,Indéterminé"
                />
              </div>
            )}

            {/* Seuils critiques */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Seuil critique min</label>
                <input
                  type="number"
                  step="any"
                  name="seuil_critique_min"
                  value={formData.seuil_critique_min}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${formErrors.seuil_critique_min ? '#ef4444' : '#e2e8f0'}`,
                    borderRadius: '6px'
                  }}
                  placeholder="ex: 0.5 * ref_min"
                />
                {formErrors.seuil_critique_min && <span style={{ color: '#ef4444', fontSize: '12px' }}>{formErrors.seuil_critique_min}</span>}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Seuil critique max</label>
                <input
                  type="number"
                  step="any"
                  name="seuil_critique_max"
                  value={formData.seuil_critique_max}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${formErrors.seuil_critique_max ? '#ef4444' : '#e2e8f0'}`,
                    borderRadius: '6px'
                  }}
                  placeholder="ex: 1.5 * ref_max"
                />
                {formErrors.seuil_critique_max && <span style={{ color: '#ef4444', fontSize: '12px' }}>{formErrors.seuil_critique_max}</span>}
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Commentaire</label>
              <textarea
                name="commentaire"
                value={formData.commentaire}
                onChange={handleChange}
                rows="2"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', resize: 'vertical' }}
                placeholder="Informations complémentaires..."
              />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  backgroundColor: '#f472b6',
                  color: 'white',
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {saving ? <FaSpinner className="spin" /> : <FaSave />}
                {editingId ? 'Modifier' : 'Créer'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                style={{
                  backgroundColor: '#e2e8f0',
                  color: '#475569',
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tableau des paramètres */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Nom</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Unité</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Référence</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Valeurs possibles</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Catégorie</th>
              {isAdmin && <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {parametres.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Aucun paramètre configuré
                </td>
              </tr>
            ) : (
              parametres.map((p, idx) => (
                <tr key={p.id} style={{ borderBottom: idx === parametres.length - 1 ? 'none' : '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '500', color: '#0f172a' }}>{p.nom}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>
                    {p.type_parametre === 'quantitatif' ? '📊 Quant.' : '✏️ Qual.'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{p.unite || '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>
                    {p.type_parametre === 'quantitatif'
                      ? (p.ref_min && p.ref_max ? `${p.ref_min} - ${p.ref_max}` : '-')
                      : (p.valeurs_possibles ? p.valeurs_possibles : '-')}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>
                    {p.type_parametre === 'qualitatif' ? (p.valeurs_possibles || '-') : '-'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>
                    {p.categorie === 'laboratoire' ? '🧪 Labo' : p.categorie === 'imagerie' ? '🖥️ Imagerie' : '-'}
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(p)}
                          style={{ color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer' }}
                          title="Modifier"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                          title="Supprimer"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ParametresLabo;