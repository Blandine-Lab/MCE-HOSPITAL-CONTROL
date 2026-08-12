// src/pages/stock/ProduitForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa';

const ProduitForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    description: '',
    categorie_id: '',
    unite: '',
    prix_achat: '',
    prix_vente: '',
    seuil_alerte: '',
    quantite_initiale: 0, // toujours présent (en création et en modification)
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // Charger les catégories
    api.get('/produits/categories-produits')
      .then(res => setCategories(res.data))
      .catch(err => console.error('Erreur chargement catégories :', err));

    if (isEdit) {
      setLoading(true);
      api.get(`/produits/${id}`)
        .then(res => {
          const data = res.data;
          setFormData({
            code: data.code || '',
            nom: data.nom || '',
            description: data.description || '',
            categorie_id: data.categorie_id || '',
            unite: data.unite || '',
            prix_achat: data.prix_achat || '',
            prix_vente: data.prix_vente || '',
            seuil_alerte: data.seuil_alerte || '',
            quantite_initiale: 0, // en modification, on remet à 0 (ne pas pré-remplir)
          });
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError('Impossible de charger le produit');
          setLoading(false);
        });
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        code: formData.code,
        nom: formData.nom,
        description: formData.description,
        categorie_id: formData.categorie_id || null,
        unite: formData.unite,
        prix_achat: formData.prix_achat ? parseFloat(formData.prix_achat) : null,
        prix_vente: formData.prix_vente ? parseFloat(formData.prix_vente) : null,
        seuil_alerte: formData.seuil_alerte ? parseInt(formData.seuil_alerte, 10) : null,
      };

      let response;
      if (isEdit) {
        // Mise à jour du produit
        response = await api.put(`/produits/${id}`, payload);

        // ✅ Si une quantité est saisie en modification, on crée un mouvement d'entrée
        const qty = parseInt(formData.quantite_initiale, 10);
        if (qty > 0) {
          await api.post('/mouvements', {
            produit_id: parseInt(id, 10),
            type: 'entree',
            quantite: qty,
            reference: 'Ajustement stock',
            motif: 'Réapprovisionnement / correction',
            date_mouvement: new Date().toISOString().split('T')[0]
          });
          setToast({ type: 'success', message: `Produit modifié et ${qty} unité(s) ajoutée(s) au stock.` });
        } else {
          setToast({ type: 'success', message: 'Produit modifié avec succès.' });
        }
      } else {
        // Création du produit
        response = await api.post('/produits', payload);
        const qty = parseInt(formData.quantite_initiale, 10);
        if (qty > 0) {
          await api.post('/mouvements', {
            produit_id: response.data.id,
            type: 'entree',
            quantite: qty,
            reference: 'Stock initial',
            motif: 'Création du produit',
            date_mouvement: new Date().toISOString().split('T')[0]
          });
          setToast({ type: 'success', message: `Produit créé avec ${qty} unité(s) en stock.` });
        } else {
          setToast({ type: 'success', message: 'Produit créé (stock initial à 0).' });
        }
      }
      setTimeout(() => navigate('/stock/produits'), 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
      setLoading(false);
    }
  };

  if (loading && isEdit) return <div style={{ padding: 60, textAlign: 'center' }}>⏳ Chargement...</div>;

  return (
    <div>
      <Link to="/stock/produits" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#3b82f6', textDecoration: 'none' }}>
        <FaArrowLeft /> Retour
      </Link>

      <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 32, marginTop: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0 }}>{isEdit ? 'Modifier' : 'Nouveau'} produit</h2>
        {error && <div style={{ color: '#ef4444', padding: 12, backgroundColor: '#fee2e2', borderRadius: 8, marginBottom: 16 }}>{error}</div>}
        {toast && <div style={{ color: '#10b981', padding: 12, backgroundColor: '#d1fae5', borderRadius: 8, marginBottom: 16 }}>{toast.message}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Code *</label>
            <input type="text" name="code" value={formData.code} onChange={handleChange} required style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Nom *</label>
            <input type="text" name="nom" value={formData.nom} onChange={handleChange} required style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Catégorie</label>
            <select
              name="categorie_id"
              value={formData.categorie_id}
              onChange={handleChange}
              style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }}
            >
              <option value="">-- Sélectionner --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Unité</label>
            <input type="text" name="unite" value={formData.unite} onChange={handleChange} placeholder="ex: unité, boîte, kg, ml..." style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Prix d'achat (FC)</label>
            <input type="number" step="0.01" name="prix_achat" value={formData.prix_achat} onChange={handleChange} style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Prix de vente (FC)</label>
            <input type="number" step="0.01" name="prix_vente" value={formData.prix_vente} onChange={handleChange} style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Seuil d'alerte</label>
            <input type="number" name="seuil_alerte" value={formData.seuil_alerte} onChange={handleChange} style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }} />
          </div>

          {/* 👇 Champ visible EN CRÉATION ET EN MODIFICATION */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              {isEdit ? 'Ajouter au stock (quantité)' : 'Quantité initiale'}
            </label>
            <input
              type="number"
              name="quantite_initiale"
              value={formData.quantite_initiale}
              onChange={handleChange}
              min="0"
              step="1"
              placeholder="0"
              style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }}
            />
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              {isEdit
                ? 'Saisissez une quantité à AJOUTER au stock actuel (mouvement d\'entrée).'
                : 'Saisissez le stock de départ pour ce produit.'}
            </div>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows="3" style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }} />
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '10px 24px',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                opacity: loading ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <FaSave /> {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <Link
              to="/stock/produits"
              style={{
                backgroundColor: '#e5e7eb',
                color: '#0f172a',
                padding: '10px 24px',
                borderRadius: 6,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <FaTimes /> Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProduitForm;
