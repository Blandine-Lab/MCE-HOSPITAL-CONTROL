// src/pages/laboratoire-imagerie/TypesExamens.jsx
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../axios';
import { FaFlask, FaXRay, FaPlus, FaEdit, FaTrash, FaSearch, FaSave, FaTimes, FaExclamationTriangle } from 'react-icons/fa';

const TypesExamens = () => {
  const { user } = useAuth();
  const canManage = user?.permissions?.includes('manage_laboratory') || user?.role === 'admin';

  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [prestations, setPrestations] = useState([]);
  const [parametresDisponibles, setParametresDisponibles] = useState([]); // catalogue

  const [formData, setFormData] = useState({
    nom: '',
    categorie: 'laboratoire',
    description: '',
    duree_estimee: '',
    prix: '',
    preparation: '',
    prestation_id: '',
    parametres_ids: [] // tableau d'IDs des paramètres sélectionnés
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ text: '', type: '' });
  const [saving, setSaving] = useState(false);

  // Chargement initial
  useEffect(() => {
    fetchTypes();
    fetchPrestations();
    fetchParametres();
  }, []);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/types-examens');
      setTypes(res.data);
    } catch (err) {
      setMessage({ text: 'Erreur de chargement des types', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPrestations = async () => {
    try {
      const res = await api.get('/billing/prestations');
      setPrestations(res.data || []);
    } catch (err) {
      console.warn('Impossible de charger les prestations:', err);
    }
  };

  const fetchParametres = async () => {
    try {
      const res = await api.get('/parametres-references');
      setParametresDisponibles(res.data || []);
    } catch (err) {
      console.error('Erreur chargement paramètres:', err);
    }
  };

  const filteredTypes = useMemo(() => {
    return types.filter(t =>
      t.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.categorie?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [types, searchTerm]);

  const resetForm = () => {
    setFormData({
      nom: '',
      categorie: 'laboratoire',
      description: '',
      duree_estimee: '',
      prix: '',
      preparation: '',
      prestation_id: '',
      parametres_ids: []
    });
    setEditingType(null);
    setShowForm(false);
    setErrors({});
    setMessage({ text: '', type: '' });
    setSaving(false);
  };

  const handleEdit = (type) => {
    setEditingType(type);
    // Si le type a déjà des parametres_ids, on les utilise
    // Sinon, on essaie de parser l'ancienne colonne parametres_defaut (si elle existe)
    let ids = type.parametres_ids || [];
    if (!ids.length && type.parametres_defaut) {
      try {
        const parsed = JSON.parse(type.parametres_defaut);
        if (Array.isArray(parsed) && parsed.length) {
          // On essaie de faire correspondre par nom (à améliorer)
          ids = parsed.map(p => {
            const found = parametresDisponibles.find(pd => pd.nom === p.nom);
            return found ? found.id : null;
          }).filter(id => id !== null);
        }
      } catch (e) {}
    }
    setFormData({
      nom: type.nom || '',
      categorie: type.categorie || 'laboratoire',
      description: type.description || '',
      duree_estimee: type.duree_estimee || '',
      prix: type.prix || '',
      preparation: type.preparation || '',
      prestation_id: type.prestation_id || '',
      parametres_ids: ids
    });
    setShowForm(true);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nom.trim()) newErrors.nom = 'Le nom est requis';
    if (!formData.categorie) newErrors.categorie = 'La catégorie est requise';
    if (formData.duree_estimee && (isNaN(parseFloat(formData.duree_estimee)) || parseFloat(formData.duree_estimee) < 0)) {
      newErrors.duree_estimee = 'La durée doit être un nombre positif';
    }
    if (formData.prix) {
      const prixStr = formData.prix.toString().replace(',', '.');
      if (isNaN(parseFloat(prixStr)) || parseFloat(prixStr) < 0) {
        newErrors.prix = 'Le prix doit être un nombre positif';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const toggleParametre = (id) => {
    setFormData(prev => {
      const ids = prev.parametres_ids || [];
      if (ids.includes(id)) {
        return { ...prev, parametres_ids: ids.filter(i => i !== id) };
      } else {
        return { ...prev, parametres_ids: [...ids, id] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = { ...formData };

      // Conversion prix
      if (payload.prix) {
        const prixStr = payload.prix.toString().replace(',', '.');
        const prixNum = parseFloat(prixStr);
        if (!isNaN(prixNum)) payload.prix = prixNum;
        else delete payload.prix;
      } else {
        delete payload.prix;
      }

      if (payload.duree_estimee) {
        const duree = parseInt(payload.duree_estimee);
        if (!isNaN(duree) && duree > 0) payload.duree_estimee = duree;
        else delete payload.duree_estimee;
      } else {
        delete payload.duree_estimee;
      }

      if (!payload.prestation_id) delete payload.prestation_id;
      if (!payload.preparation) delete payload.preparation;
      if (!payload.description) delete payload.description;

      // On envoie les IDs des paramètres sélectionnés
      payload.parametres_ids = formData.parametres_ids || [];

      console.log('📦 Payload :', JSON.stringify(payload, null, 2));

      if (editingType) {
        await api.put(`/types-examens/${editingType.id}`, payload);
        setTypes(types.map(t => t.id === editingType.id ? { ...t, ...payload } : t));
        setMessage({ text: 'Type modifié avec succès', type: 'success' });
      } else {
        const res = await api.post('/types-examens', payload);
        setTypes([...types, res.data]);
        setMessage({ text: 'Type créé avec succès', type: 'success' });
      }
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      resetForm();
    } catch (err) {
      console.error('❌ Erreur:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Erreur inconnue';
      setMessage({ text: `Erreur : ${errorMsg}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce type ?')) return;
    try {
      const check = await api.get(`/types-examens/${id}/check`);
      if (check.data.used) {
        setMessage({ text: `Impossible de supprimer : ${check.data.count} examen(s) l'utilisent`, type: 'error' });
        return;
      }
      await api.delete(`/types-examens/${id}`);
      setTypes(types.filter(t => t.id !== id));
      setMessage({ text: 'Type supprimé', type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Erreur suppression', type: 'error' });
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>⏳ Chargement...</div>;

  return (
    <div>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaFlask style={{ color: '#f472b6' }} /> Types d'examens
        </h1>
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
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
            <FaPlus /> {showForm ? 'Fermer' : 'Nouveau type'}
          </button>
        )}
      </div>

      {message.text && (
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
          color: message.type === 'success' ? '#065f46' : '#991b1b'
        }}>
          {message.text}
        </div>
      )}

      {/* Recherche */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '4px 12px' }}>
          <FaSearch style={{ color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: 1, padding: '10px 12px', border: 'none', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
          />
        </div>
      </div>

      {/* Formulaire */}
      {showForm && canManage && (
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <h3 style={{ marginTop: 0 }}>{editingType ? 'Modifier' : 'Nouveau'} type d'examen</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Nom *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={e => setFormData({ ...formData, nom: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: `1px solid ${errors.nom ? '#ef4444' : '#e2e8f0'}`, borderRadius: '6px' }}
                />
                {errors.nom && <span style={{ color: '#ef4444', fontSize: '12px' }}>{errors.nom}</span>}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Catégorie *</label>
                <select
                  value={formData.categorie}
                  onChange={e => setFormData({ ...formData, categorie: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: `1px solid ${errors.categorie ? '#ef4444' : '#e2e8f0'}`, borderRadius: '6px' }}
                >
                  <option value="laboratoire">🧪 Laboratoire</option>
                  <option value="imagerie">🖥️ Imagerie</option>
                </select>
                {errors.categorie && <span style={{ color: '#ef4444', fontSize: '12px' }}>{errors.categorie}</span>}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Durée estimée (min)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.duree_estimee}
                  onChange={e => setFormData({ ...formData, duree_estimee: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: `1px solid ${errors.duree_estimee ? '#ef4444' : '#e2e8f0'}`, borderRadius: '6px' }}
                />
                {errors.duree_estimee && <span style={{ color: '#ef4444', fontSize: '12px' }}>{errors.duree_estimee}</span>}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Prix (FCFA)</label>
                <input
                  type="text"
                  value={formData.prix}
                  onChange={e => setFormData({ ...formData, prix: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: `1px solid ${errors.prix ? '#ef4444' : '#e2e8f0'}`, borderRadius: '6px' }}
                  placeholder="ex: 25000"
                />
                {errors.prix && <span style={{ color: '#ef4444', fontSize: '12px' }}>{errors.prix}</span>}
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows="2"
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Préparation nécessaire</label>
                <textarea
                  value={formData.preparation}
                  onChange={e => setFormData({ ...formData, preparation: e.target.value })}
                  rows="2"
                  placeholder="Jeûne, arrêt de médicaments..."
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#334155' }}>Prestation associée</label>
                <select
                  value={formData.prestation_id}
                  onChange={e => setFormData({ ...formData, prestation_id: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                >
                  <option value="">Aucune</option>
                  {prestations.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.libelle} ({p.prix_unitaire} FCFA)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Paramètres – Sélection depuis le catalogue */}
            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#334155' }}>
                Paramètres par défaut (sélectionnez dans la liste)
              </label>
              {parametresDisponibles.length === 0 ? (
                <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                  Aucun paramètre disponible. Créez-en d'abord dans "Paramètres du laboratoire".
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '6px' }}>
                  {parametresDisponibles.map(p => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={(formData.parametres_ids || []).includes(p.id)}
                        onChange={() => toggleParametre(p.id)}
                      />
                      {p.nom} {p.unite ? `(${p.unite})` : ''}
                      {p.ref_min && p.ref_max ? ` [${p.ref_min} - ${p.ref_max}]` : ''}
                    </label>
                  ))}
                </div>
              )}
              {errors.parametres && <div style={{ color: '#ef4444', fontSize: '12px' }}>{errors.parametres}</div>}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
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
                  opacity: saving ? 0.6 : 1
                }}
              >
                <FaSave /> {saving ? 'Enregistrement...' : (editingType ? 'Modifier' : 'Créer')}
              </button>
              <button
                type="button"
                onClick={resetForm}
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

      {/* Tableau des types */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Nom</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Catégorie</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Durée</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Prix</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Prestation</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Paramètres</th>
              {canManage && <th style={{ padding: '14px 20px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredTypes.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 7 : 6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Aucun type trouvé
                </td>
              </tr>
            ) : (
              filteredTypes.map((t, index) => (
                <tr key={t.id} style={{ borderBottom: index === filteredTypes.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 20px', fontWeight: '500', color: '#0f172a' }}>{t.nom}</td>
                  <td style={{ padding: '14px 20px', color: '#475569' }}>
                    {t.categorie === 'laboratoire' ? <FaFlask style={{ color: '#8b5cf6', marginRight: '6px' }} /> : <FaXRay style={{ color: '#3b82f6', marginRight: '6px' }} />}
                    {t.categorie === 'laboratoire' ? 'Laboratoire' : 'Imagerie'}
                  </td>
                  <td style={{ padding: '14px 20px', color: '#475569' }}>{t.duree_estimee ? `${t.duree_estimee} min` : '-'}</td>
                  <td style={{ padding: '14px 20px', color: '#475569' }}>{t.prix ? `${t.prix} FCFA` : '-'}</td>
                  <td style={{ padding: '14px 20px', color: '#475569' }}>
                    {t.prestation_libelle ? `${t.prestation_code || ''} - ${t.prestation_libelle}` : 'Non associée'}
                  </td>
                  <td style={{ padding: '14px 20px', color: '#475569' }}>
                    {t.parametres_ids && t.parametres_ids.length > 0 ? `${t.parametres_ids.length} paramètre(s)` : '-'}
                  </td>
                  {canManage && (
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button onClick={() => handleEdit(t)} style={{ color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <FaEdit />
                        </button>
                        <button onClick={() => handleDelete(t.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
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
    </div>
  );
};

export default TypesExamens;