// frontend/src/pages/Admin.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaPlus, FaSave, FaTimes, FaFlask, FaXRay } from 'react-icons/fa';
import DispositifsList from './DispositifsList';
import PharmacovigilanceList from './PharmacovigilanceList';
import RupturesSuggestions from './RupturesSuggestions';
import RecettesList from './RecettesList';
import HistoriqueExecutions from './HistoriqueExecutions';
import PharmacyDashboard from './PharmacyDashboard';
import OrdonnancesList from '../pharmacy/OrdonnancesList';

// ===================== COMPOSANT FOURNISSEURS (intégré) =====================
const FournisseursList = () => {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', contact_email: '', telephone: '', adresse: '', actif: true });
  const [editId, setEditId] = useState(null);

  const axiosAuth = axios.create({ baseURL: 'http://localhost:5000' });
  axiosAuth.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  const fetchFournisseurs = async () => {
    try {
      const res = await axiosAuth.get('/api/pharmacy/fournisseurs');
      setFournisseurs(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setToast('Erreur chargement fournisseurs');
      setTimeout(() => setToast(null), 3000);
    }
  };

  useEffect(() => {
    fetchFournisseurs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axiosAuth.put(`/api/pharmacy/fournisseurs/${editId}`, form);
        setToast('Fournisseur modifié');
      } else {
        await axiosAuth.post('/api/pharmacy/fournisseurs', form);
        setToast('Fournisseur ajouté');
      }
      setShowForm(false);
      setEditId(null);
      setForm({ nom: '', contact_email: '', telephone: '', adresse: '', actif: true });
      fetchFournisseurs();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error(err);
      setToast('Erreur lors de l\'enregistrement');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce fournisseur ?')) return;
    try {
      await axiosAuth.delete(`/api/pharmacy/fournisseurs/${id}`);
      fetchFournisseurs();
      setToast('Fournisseur supprimé');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast('Erreur suppression');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Chargement...</div>;

  return (
    <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
      {toast && <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: '#10b981', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 1000 }}>{toast}</div>}
      <h2 style={{ marginBottom: '20px' }}>🏢 Gestion des Fournisseurs</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div></div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ nom: '', contact_email: '', telephone: '', adresse: '', actif: true }); }}
          style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FaPlus /> Nouveau
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>ID</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Nom</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Email</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Téléphone</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Adresse</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Actif</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fournisseurs.map(f => (
              <tr key={f.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{f.id}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{f.nom}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{f.contact_email || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{f.telephone || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{f.adresse || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{f.actif ? '✅' : '❌'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  <button
                    onClick={() => { setEditId(f.id); setForm(f); setShowForm(true); }}
                    style={{ marginRight: '8px', background: '#eab308', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(f.id)}
                    style={{ background: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '500px', maxWidth: '90%' }}>
            <h2 style={{ marginBottom: '16px' }}>{editId ? 'Modifier' : 'Ajouter'} un fournisseur</h2>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Nom *" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <input type="email" placeholder="Email contact" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <input type="text" placeholder="Téléphone" value={form.telephone} onChange={e => setForm({...form, telephone: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <textarea placeholder="Adresse" value={form.adresse} onChange={e => setForm({...form, adresse: e.target.value})} rows="2" style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <input type="checkbox" checked={form.actif} onChange={e => setForm({...form, actif: e.target.checked})} />
                Actif
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ backgroundColor: '#e5e7eb', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><FaTimes /> Annuler</button>
                <button type="submit" style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><FaSave /> Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ===================== COMPOSANT : TYPES D'EXAMENS (ADMIN) - VERSION CORRIGÉE =====================
const TypesExamensAdmin = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    categorie: 'laboratoire',
    description: '',
    duree_estimee: '',
    prix: '',
    preparation: '',
    parametres_defaut: ''
  });
  const [editingId, setEditingId] = useState(null);
  const axiosAuth = axios.create({ baseURL: 'http://localhost:5000' });
  axiosAuth.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  const fetchTypes = async () => {
    try {
      // ✅ Correction : /api/types-examens au lieu de /types-examens
      const res = await axiosAuth.get('/api/types-examens');
      setTypes(res.data);
      setLoading(false);
    } catch (err) {
      setToast('Erreur chargement des types');
      setTimeout(() => setToast(null), 3000);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let params = formData.parametres_defaut;
      if (params) {
        try {
          JSON.parse(params);
        } catch {
          setToast('Le format des paramètres par défaut est invalide (JSON)');
          setTimeout(() => setToast(null), 3000);
          return;
        }
      } else {
        params = null;
      }
      const payload = { ...formData, parametres_defaut: params };
      if (editingId) {
        // ✅ Correction : /api/types-examens
        await axiosAuth.put(`/api/types-examens/${editingId}`, payload);
        setToast('Type modifié');
      } else {
        // ✅ Correction : /api/types-examens
        await axiosAuth.post('/api/types-examens', payload);
        setToast('Type ajouté');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ nom: '', categorie: 'laboratoire', description: '', duree_estimee: '', prix: '', preparation: '', parametres_defaut: '' });
      fetchTypes();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error(err);
      setToast('Erreur lors de l\'enregistrement');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce type d\'examen ?')) return;
    try {
      // ✅ Correction : /api/types-examens
      await axiosAuth.delete(`/api/types-examens/${id}`);
      fetchTypes();
      setToast('Type supprimé');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast('Erreur suppression');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleEdit = (type) => {
    setEditingId(type.id);
    setFormData({
      nom: type.nom || '',
      categorie: type.categorie || 'laboratoire',
      description: type.description || '',
      duree_estimee: type.duree_estimee || '',
      prix: type.prix || '',
      preparation: type.preparation || '',
      parametres_defaut: type.parametres_defaut ? JSON.stringify(type.parametres_defaut) : ''
    });
    setShowForm(true);
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
      {toast && <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: '#10b981', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 1000 }}>{toast}</div>}
      <h2 style={{ marginBottom: '20px' }}>🔬 Types d'examens</h2>
      <button
        onClick={() => { setShowForm(true); setEditingId(null); setFormData({ nom: '', categorie: 'laboratoire', description: '', duree_estimee: '', prix: '', preparation: '', parametres_defaut: '' }); }}
        style={{ marginBottom: '20px', padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        <FaPlus /> Nouveau type
      </button>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Nom</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Catégorie</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Durée</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Prix</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Préparation</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {types.map(t => (
              <tr key={t.id}>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{t.nom}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                  {t.categorie === 'laboratoire' ? <FaFlask style={{ color: '#8b5cf6' }} /> : <FaXRay style={{ color: '#3b82f6' }} />}
                  {t.categorie === 'laboratoire' ? ' Laboratoire' : ' Imagerie'}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{t.duree_estimee || '-'}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{t.prix ? `${t.prix} FCFA` : '-'}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{t.preparation || '-'}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                  <button
                    onClick={() => handleEdit(t)}
                    style={{ marginRight: '8px', background: '#eab308', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    style={{ background: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '600px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '16px' }}>{editingId ? 'Modifier' : 'Ajouter'} un type d'examen</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label>Nom *</label>
                <input type="text" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label>Catégorie *</label>
                <select value={formData.categorie} onChange={e => setFormData({...formData, categorie: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}>
                  <option value="laboratoire">Laboratoire</option>
                  <option value="imagerie">Imagerie</option>
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label>Durée estimée (minutes)</label>
                <input type="number" value={formData.duree_estimee} onChange={e => setFormData({...formData, duree_estimee: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label>Prix (FCFA)</label>
                <input type="number" value={formData.prix} onChange={e => setFormData({...formData, prix: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="2" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label>Préparation nécessaire</label>
                <input type="text" value={formData.preparation} onChange={e => setFormData({...formData, preparation: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label>Paramètres par défaut (JSON - optionnel)</label>
                <textarea
                  value={formData.parametres_defaut}
                  onChange={e => setFormData({...formData, parametres_defaut: e.target.value})}
                  rows="4"
                  placeholder='[{"nom":"Hémoglobine","unite":"g/dL","ref_min":"12","ref_max":"16"}]'
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', fontFamily: 'monospace' }}
                />
                <small style={{ color: '#6b7280' }}>Format JSON : tableau d'objets avec les champs nom, unite, ref_min, ref_max.</small>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ backgroundColor: '#e5e7eb', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><FaTimes /> Annuler</button>
                <button type="submit" style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><FaSave /> Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ===================== COMPOSANT PRINCIPAL ADMIN =====================
const Admin = () => {
  // États existants
  const [batiments, setBatiments] = useState([]);
  const [etages, setEtages] = useState([]);
  const [chambres, setChambres] = useState([]);
  const [lits, setLits] = useState([]);
  const [services, setServices] = useState([]);
  const [medecins, setMedecins] = useState([]);
  const [prestations, setPrestations] = useState([]);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('services');
  const [pharmacySubTab, setPharmacySubTab] = useState('medicaments');

  // États pour les utilisateurs
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [userForm, setUserForm] = useState({
    login: '',
    nom: '',
    prenom: '',
    email: '',
    role: '',
    password: '',
    actif: true
  });

  // Liste des rôles pour le select dynamique (onglet Utilisateurs)
  const [rolesList, setRolesList] = useState([]);

  // États pour la gestion des rôles (onglet Rôles)
  const [roles, setRoles] = useState([]);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [roleForm, setRoleForm] = useState({ id: null, nom: '' });
  const [editingRoleId, setEditingRoleId] = useState(null);

  // ========== NOUVEAUX ÉTATS POUR AUTORISATIONS ==========
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [modulesList, setModulesList] = useState([]);
  const [roleAuthorizations, setRoleAuthorizations] = useState([]);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [rolesListForAuth, setRolesListForAuth] = useState([]);

  // Formulaires existants
  const [newService, setNewService] = useState('');
  const [newMedecin, setNewMedecin] = useState({
    nom: '',
    prenom: '',
    specialite: '',
    email: '',
    login: '',
    password: ''
  });
  const [newBatiment, setNewBatiment] = useState({ nom: '' });
  const [newEtage, setNewEtage] = useState({ batiment_id: '', numero: '' });
  const [newChambre, setNewChambre] = useState({ nom: '', batiment_id: '', etage_id: '', type: 'public', capacite: 2 });
  const [newLit, setNewLit] = useState({ chambre_id: '', numero: '', statut: 'libre' });
  const [newPrestation, setNewPrestation] = useState({ code: '', libelle: '', prix_unitaire: '', categorie: '' });
  const [editPrestationId, setEditPrestationId] = useState(null);
  const [showPrestationModal, setShowPrestationModal] = useState(false);

  // États pour la pharmacie
  const [medicaments, setMedicaments] = useState([]);
  const [alertes, setAlertes] = useState({ stockCritique: [], peremptionProche: [] });
  const [showMedicamentForm, setShowMedicamentForm] = useState(false);
  const [medicamentForm, setMedicamentForm] = useState({
    code: "", nom: "", description: "", stock: 0, seuil_alerte: 10,
    unite: "boîte", prix_unitaire: 0, principe_actif: "", forme: "", dosage: "", est_stupefiant: false
  });
  const [editingMedicamentId, setEditingMedicamentId] = useState(null);
  const [selectedMedicamentId, setSelectedMedicamentId] = useState("");
  const [lots, setLots] = useState([]);
  const [showLotForm, setShowLotForm] = useState(false);
  const [lotForm, setLotForm] = useState({ numero_lot: "", date_peremption: "", quantite: 0, prix_achat: 0 });
  const [commandes, setCommandes] = useState([]);
  const [showCommandeForm, setShowCommandeForm] = useState(false);
  const [commandeLignes, setCommandeLignes] = useState([{ medicament_id: "", quantite_commandee: 0, prix_unitaire_ht: 0 }]);
  const [deliveryForm, setDeliveryForm] = useState({ medicament_id: "", quantite: 1, patient_id: "", posologie: "", prescripteur_nom: "" });
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [patients, setPatients] = useState([]);

  // Axios avec intercepteur
  const axiosAuth = axios.create({ baseURL: 'http://localhost:5000' });
  axiosAuth.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ========== CHARGEMENT DES DONNÉES EXISTANTES ==========
  const fetchData = async () => {
    try {
      const [batRes, etageRes, chambreRes, litRes, servRes, medRes, prestaRes] = await Promise.all([
        axios.get('http://localhost:5000/api/consultations/batiments'),
        axios.get('http://localhost:5000/api/consultations/etages'),
        axios.get('http://localhost:5000/api/consultations/chambres/list'),
        axios.get('http://localhost:5000/api/consultations/lits/all'),
        axios.get('http://localhost:5000/api/consultations/services/all'),
        axios.get('http://localhost:5000/api/consultations/medecins/all'),
        axios.get('http://localhost:5000/api/billing/prestations')
      ]);
      setBatiments(batRes.data);
      setEtages(etageRes.data);
      setChambres(chambreRes.data);
      setLits(litRes.data);
      setServices(servRes.data);
      setMedecins(medRes.data);
      setPrestations(prestaRes.data);
    } catch (err) {
      showToast('Erreur chargement données', 'error');
    }
  };

  // ========== CHARGEMENT PHARMACIE ==========
  const fetchMedicaments = async () => {
    try {
      const res = await axiosAuth.get('/api/pharmacy/medicaments');
      setMedicaments(res.data);
    } catch (err) { console.error(err); }
  };
  const fetchAlertes = async () => {
    try {
      const res = await axiosAuth.get('/api/pharmacy/alertes');
      setAlertes(res.data);
    } catch (err) { console.error(err); }
  };
  const fetchLots = async (medicamentId) => {
    if (!medicamentId) return;
    try {
      const res = await axiosAuth.get(`/api/pharmacy/lots/disponibles/${medicamentId}`);
      setLots(res.data);
    } catch (err) { console.error(err); }
  };
  const fetchCommandes = async () => {
    try {
      const res = await axiosAuth.get('/api/pharmacy/commandes');
      setCommandes(res.data);
    } catch (err) { console.error(err); }
  };
  const fetchPatients = async () => {
    try {
      const res = await axiosAuth.get('/admin/patients');
      setPatients(res.data);
    } catch (err) { console.error(err); }
  };

  // ========== CHARGEMENT DES UTILISATEURS ==========
  const fetchUtilisateurs = async () => {
    try {
      const res = await axiosAuth.get('/api/admin/utilisateurs');
      setUtilisateurs(res.data);
    } catch (err) {
      showToast('Erreur chargement des utilisateurs', 'error');
    }
  };

  // ===== CHARGEMENT DES RÔLES (pour le select utilisateur) =====
  const fetchRoles = async () => {
    try {
      const res = await axiosAuth.get('/api/security/roles');
      console.log('📦 Rôles reçus (brut) :', res.data);
      setRolesList(res.data);
    } catch (err) {
      console.error('❌ Erreur chargement rôles:', err);
    }
  };

  // ===== CHARGEMENT DES RÔLES (pour l'onglet Rôles) =====
  const fetchRolesList = async () => {
    try {
      const res = await axiosAuth.get('/api/security/roles');
      setRoles(res.data);
    } catch (err) {
      showToast('Erreur chargement des rôles', 'error');
    }
  };

  // ========== NOUVELLES FONCTIONS POUR AUTORISATIONS ==========
  const fetchRolesForAuth = async () => {
    try {
      const res = await axiosAuth.get('/api/security/roles');
      setRolesListForAuth(res.data);
    } catch (err) {
      showToast('Erreur chargement rôles', 'error');
    }
  };

  const fetchModules = async () => {
    try {
      const res = await axiosAuth.get('/api/security/modules');
      setModulesList(res.data);
    } catch (err) {
      showToast('Erreur chargement modules', 'error');
    }
  };

  const fetchRoleAuthorizations = async (roleId) => {
    if (!roleId) return;
    setLoadingAuth(true);
    try {
      const res = await axiosAuth.get(`/api/security/roles/${roleId}/authorizations`);
      setRoleAuthorizations(res.data);
    } catch (err) {
      showToast('Erreur chargement autorisations', 'error');
    } finally {
      setLoadingAuth(false);
    }
  };

  const saveAuthorizations = async () => {
    if (!selectedRoleId) return;
    try {
      await axiosAuth.put(`/api/security/roles/${selectedRoleId}/authorizations`, {
        authorizations: roleAuthorizations
      });
      showToast('Autorisations enregistrées');
    } catch (err) {
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  // ========== CRUD MÉDICAMENTS ==========
  const handleMedicamentSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMedicamentId) {
        await axiosAuth.put(`/api/pharmacy/medicaments/${editingMedicamentId}`, medicamentForm);
        showToast('Médicament modifié');
      } else {
        await axiosAuth.post('/api/pharmacy/medicaments', medicamentForm);
        showToast('Médicament ajouté');
      }
      setShowMedicamentForm(false);
      setEditingMedicamentId(null);
      setMedicamentForm({ code: "", nom: "", description: "", stock: 0, seuil_alerte: 10, unite: "boîte", prix_unitaire: 0, principe_actif: "", forme: "", dosage: "", est_stupefiant: false });
      fetchMedicaments();
      fetchAlertes();
    } catch (err) { showToast('Erreur', 'error'); }
  };
  const deleteMedicament = async (id) => {
    if (!window.confirm('Supprimer ce médicament ?')) return;
    try {
      await axiosAuth.delete(`/api/pharmacy/medicaments/${id}`);
      showToast('Médicament supprimé');
      fetchMedicaments();
      fetchAlertes();
    } catch (err) { showToast(err.response?.data?.error || 'Erreur', 'error'); }
  };
  const editMedicament = (med) => {
    setMedicamentForm(med);
    setEditingMedicamentId(med.id);
    setShowMedicamentForm(true);
  };

  // ========== CRUD UTILISATEURS ==========
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...userForm };
      if (!editUserId) {
        await axiosAuth.post('/api/admin/utilisateurs', payload);
        showToast('Utilisateur créé');
      } else {
        if (!payload.password) delete payload.password;
        await axiosAuth.put(`/api/admin/utilisateurs/${editUserId}`, payload);
        showToast('Utilisateur modifié');
      }
      setShowUserForm(false);
      setEditUserId(null);
      setUserForm({ login: '', nom: '', prenom: '', email: '', role: '', password: '', actif: true });
      fetchUtilisateurs();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur', 'error');
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Supprimer définitivement cet utilisateur ?')) return;
    try {
      await axiosAuth.delete(`/api/admin/utilisateurs/${id}`);
      showToast('Utilisateur supprimé');
      fetchUtilisateurs();
    } catch (err) {
      showToast('Erreur', 'error');
    }
  };

  const toggleActif = async (id, currentActif) => {
    try {
      await axiosAuth.patch(`/api/admin/utilisateurs/${id}/actif`, { actif: !currentActif });
      showToast(`Utilisateur ${!currentActif ? 'activé' : 'désactivé'}`);
      fetchUtilisateurs();
    } catch (err) {
      showToast('Erreur', 'error');
    }
  };

  // ========== CRUD RÔLES ==========
  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    if (!roleForm.nom.trim()) {
      showToast('Le nom du rôle est requis', 'error');
      return;
    }
    try {
      if (editingRoleId) {
        await axiosAuth.put(`/api/security/roles/${editingRoleId}`, { nom: roleForm.nom });
        showToast('Rôle modifié');
      } else {
        await axiosAuth.post('/api/security/roles', { nom: roleForm.nom });
        showToast('Rôle ajouté');
      }
      setShowRoleForm(false);
      setEditingRoleId(null);
      setRoleForm({ id: null, nom: '' });
      fetchRolesList();
      fetchRoles(); // met à jour le select utilisateur
      fetchRolesForAuth(); // met à jour le select autorisations
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur', 'error');
    }
  };

  const deleteRole = async (id) => {
    if (!window.confirm('Supprimer ce rôle ? Les utilisateurs avec ce rôle ne seront pas supprimés.')) return;
    try {
      await axiosAuth.delete(`/api/security/roles/${id}`);
      showToast('Rôle supprimé');
      fetchRolesList();
      fetchRoles();
      fetchRolesForAuth();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur', 'error');
    }
  };

  // ========== LOTS ==========
  const handleLotSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMedicamentId) return;
    try {
      await axiosAuth.post('/api/pharmacy/lots', {
        ...lotForm,
        medicament_id: selectedMedicamentId,
        quantite: parseInt(lotForm.quantite)
      });
      showToast('Lot ajouté');
      setShowLotForm(false);
      setLotForm({ numero_lot: "", date_peremption: "", quantite: 0, prix_achat: 0 });
      fetchLots(selectedMedicamentId);
      fetchMedicaments();
      fetchAlertes();
    } catch (err) { showToast(err.response?.data?.error || 'Erreur', 'error'); }
  };

  // ========== COMMANDES ==========
  const addCommandeLigne = () => {
    setCommandeLignes([...commandeLignes, { medicament_id: "", quantite_commandee: 0, prix_unitaire_ht: 0 }]);
  };
  const updateCommandeLigne = (idx, field, value) => {
    const newLignes = [...commandeLignes];
    newLignes[idx][field] = value;
    setCommandeLignes(newLignes);
  };
  const handleCommandeSubmit = async (e) => {
    e.preventDefault();
    const lignesValides = commandeLignes.filter(l => l.medicament_id && l.quantite_commandee > 0);
    if (lignesValides.length === 0) {
      showToast('Ajoutez au moins une ligne', 'error');
      return;
    }
    try {
      await axiosAuth.post('/api/pharmacy/commandes', { fournisseur_id: 1, lignes: lignesValides });
      showToast('Commande créée');
      setShowCommandeForm(false);
      setCommandeLignes([{ medicament_id: "", quantite_commandee: 0, prix_unitaire_ht: 0 }]);
      fetchCommandes();
    } catch (err) { showToast('Erreur', 'error'); }
  };

  // ========== DÉLIVRANCE ==========
  const handleDeliverySubmit = async (e) => {
    e.preventDefault();
    if (!deliveryForm.medicament_id || !deliveryForm.quantite || !deliveryForm.patient_id) {
      setDeliveryMessage('Veuillez remplir tous les champs');
      return;
    }
    try {
      await axiosAuth.post('/api/pharmacy/delivrance', deliveryForm);
      setDeliveryMessage('✅ Délivrance enregistrée');
      setDeliveryForm({ medicament_id: "", quantite: 1, patient_id: "", posologie: "", prescripteur_nom: "" });
      fetchMedicaments();
      fetchAlertes();
      if (selectedMedicamentId) fetchLots(selectedMedicamentId);
    } catch (err) {
      setDeliveryMessage('❌ Erreur : ' + (err.response?.data?.error || err.message));
    }
  };

  // ========== EFFETS ==========
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'pharmacy') {
      fetchMedicaments();
      fetchAlertes();
      fetchCommandes();
      fetchPatients();
    }
    if (activeTab === 'utilisateurs') {
      fetchUtilisateurs();
      fetchRoles();
    }
    if (activeTab === 'roles') {
      fetchRolesList();
    }
    if (activeTab === 'authorizations') {
      fetchRolesForAuth();
      fetchModules();
      if (selectedRoleId) {
        fetchRoleAuthorizations(selectedRoleId);
      }
    }
  }, [activeTab]);

  // Quand le rôle sélectionné change dans l'onglet autorisations
  useEffect(() => {
    if (selectedRoleId) {
      fetchRoleAuthorizations(selectedRoleId);
    }
  }, [selectedRoleId]);

  useEffect(() => {
    if (selectedMedicamentId) fetchLots(selectedMedicamentId);
  }, [selectedMedicamentId]);

  // ========== FONCTIONS CRUD EXISTANTES ==========
  const addService = async () => {
    if (!newService.trim()) return;
    try {
      await axios.post('http://localhost:5000/api/consultations/services', { nom: newService });
      setNewService('');
      fetchData();
      showToast('Service ajouté');
    } catch (err) { showToast('Erreur', 'error'); }
  };
  const deleteService = async (id) => {
    if (!window.confirm('Supprimer ce service ?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/consultations/services/${id}`);
      fetchData();
      showToast('Service supprimé');
    } catch (err) { showToast(err.response?.data?.error || 'Erreur', 'error'); }
  };

  const addMedecin = async () => {
    if (!newMedecin.nom || !newMedecin.prenom || !newMedecin.password) {
      showToast('Nom, prénom et mot de passe sont requis', 'error');
      return;
    }
    try {
      await axiosAuth.post('/api/consultations/medecins-avec-compte', {
        ...newMedecin,
        login: newMedecin.login || newMedecin.email
      });
      setNewMedecin({ nom: '', prenom: '', specialite: '', email: '', login: '', password: '' });
      fetchData();
      showToast('Médecin et compte créés avec succès');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de la création', 'error');
    }
  };

  const deleteMedecin = async (id) => {
    if (!window.confirm('Supprimer ce médecin ?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/consultations/medecins/${id}`);
      fetchData();
      showToast('Médecin supprimé');
    } catch (err) { showToast(err.response?.data?.error || 'Erreur', 'error'); }
  };
  const addBatiment = async () => {
    if (!newBatiment.nom) return;
    try {
      await axios.post('http://localhost:5000/api/consultations/batiments', newBatiment);
      setNewBatiment({ nom: '' });
      fetchData();
      showToast('Bâtiment ajouté');
    } catch (err) { showToast('Erreur', 'error'); }
  };
  const deleteBatiment = async (id) => {
    if (!window.confirm('Supprimer ce bâtiment ?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/consultations/batiments/${id}`);
      fetchData();
      showToast('Bâtiment supprimé');
    } catch (err) { showToast(err.response?.data?.error || 'Erreur', 'error'); }
  };
  const addEtage = async () => {
    if (!newEtage.batiment_id || !newEtage.numero) return;
    try {
      await axios.post('http://localhost:5000/api/consultations/etages', newEtage);
      setNewEtage({ batiment_id: '', numero: '' });
      fetchData();
      showToast('Étage ajouté');
    } catch (err) { showToast('Erreur', 'error'); }
  };
  const deleteEtage = async (id) => {
    if (!window.confirm('Supprimer cet étage ?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/consultations/etages/${id}`);
      fetchData();
      showToast('Étage supprimé');
    } catch (err) { showToast(err.response?.data?.error || 'Erreur', 'error'); }
  };
  const addChambre = async () => {
    if (!newChambre.nom || !newChambre.batiment_id || !newChambre.etage_id) return;
    try {
      await axios.post('http://localhost:5000/api/consultations/chambres', newChambre);
      setNewChambre({ nom: '', batiment_id: '', etage_id: '', type: 'public', capacite: 2 });
      fetchData();
      showToast('Chambre ajoutée');
    } catch (err) { showToast('Erreur', 'error'); }
  };
  const deleteChambre = async (id) => {
    if (!window.confirm('Supprimer cette chambre ?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/consultations/chambres/${id}`);
      fetchData();
      showToast('Chambre supprimée');
    } catch (err) { showToast(err.response?.data?.error || 'Erreur', 'error'); }
  };
  const addLit = async () => {
    if (!newLit.chambre_id || !newLit.numero) return;
    try {
      await axios.post('http://localhost:5000/api/consultations/lits', {
        chambre_id: parseInt(newLit.chambre_id),
        numero: newLit.numero,
        statut: newLit.statut
      });
      setNewLit({ chambre_id: '', numero: '', statut: 'libre' });
      fetchData();
      showToast('Lit ajouté');
    } catch (err) { showToast('Erreur', 'error'); }
  };
  const deleteLit = async (id) => {
    if (!window.confirm('Supprimer ce lit ?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/consultations/lits/${id}`);
      fetchData();
      showToast('Lit supprimé');
    } catch (err) { showToast('Erreur', 'error'); }
  };
  const handlePrestationSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editPrestationId) {
        await axios.put(`http://localhost:5000/api/billing/prestations/${editPrestationId}`, newPrestation);
        showToast('Prestation modifiée');
      } else {
        await axios.post('http://localhost:5000/api/billing/prestations', newPrestation);
        showToast('Prestation ajoutée');
      }
      setShowPrestationModal(false);
      setEditPrestationId(null);
      setNewPrestation({ code: '', libelle: '', prix_unitaire: '', categorie: '' });
      fetchData();
    } catch (err) { showToast('Erreur', 'error'); }
  };
  const deletePrestation = async (id) => {
    if (!window.confirm('Supprimer cette prestation ?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/billing/prestations/${id}`);
      fetchData();
      showToast('Prestation supprimée');
    } catch (err) { showToast('Erreur', 'error'); }
  };

  // ========== RENDU ==========
  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', padding: '10px 20px', backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444', color: 'white', borderRadius: '8px', zIndex: 1000 }}>
          {toast.msg}
        </div>
      )}
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Administration</h1>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('services')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'services' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Services</button>
        <button onClick={() => setActiveTab('medecins')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'medecins' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Médecins</button>
        <button onClick={() => setActiveTab('batiments')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'batiments' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Bâtiments</button>
        <button onClick={() => setActiveTab('etages')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'etages' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Étages</button>
        <button onClick={() => setActiveTab('chambres')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'chambres' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Chambres</button>
        <button onClick={() => setActiveTab('lits')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'lits' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Lits</button>
        <button onClick={() => setActiveTab('prestations')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'prestations' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Prestations (tarifs)</button>
        <button onClick={() => setActiveTab('pharmacy')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'pharmacy' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>💊 Pharmacie</button>
        <button onClick={() => setActiveTab('fournisseurs')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'fournisseurs' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🏢 Fournisseurs</button>
        <button onClick={() => setActiveTab('dispositifs')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'dispositifs' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🩺 Dispositifs</button>
        <button onClick={() => setActiveTab('pharmacovigilance')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'pharmacovigilance' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>⚠️ Pharmacovigilance</button>
        <button onClick={() => setActiveTab('ruptures')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'ruptures' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📉 Ruptures & Suggestions</button>
        <button onClick={() => setActiveTab('recettes')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'recettes' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🧪 Recettes</button>
        <button onClick={() => setActiveTab('historique')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'historique' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📋 Historique</button>
        <button onClick={() => setActiveTab('pharmadashboard')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'pharmadashboard' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📊 Dashboard Pharmacie</button>
        <button onClick={() => setActiveTab('ordonnances')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'ordonnances' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📋 Ordonnances</button>
        <button onClick={() => setActiveTab('utilisateurs')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'utilisateurs' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>👤 Utilisateurs</button>
        <button onClick={() => setActiveTab('roles')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'roles' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🔑 Rôles</button>
        <button onClick={() => setActiveTab('authorizations')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'authorizations' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🔓 Autorisations</button>
        {/* NOUVEAU BOUTON POUR LES TYPES D'EXAMENS */}
        <button onClick={() => setActiveTab('typesexamens')} style={{ padding: '8px 16px', backgroundColor: activeTab === 'typesexamens' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🔬 Types examens</button>
      </div>

      {/* SERVICES */}
      {activeTab === 'services' && (
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
          <h2>Services d'admission</h2>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input type="text" placeholder="Nom du service" value={newService} onChange={e => setNewService(e.target.value)} style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <button onClick={addService} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Ajouter</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>ID</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Nom</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {services.map(s => (
                <tr key={s.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{s.id}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{s.nom}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    <button onClick={() => deleteService(s.id)} style={{ backgroundColor: '#ef4444', color: 'white', padding: '4px 8px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MÉDECINS */}
      {activeTab === 'medecins' && (
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
          <h2>Médecins référents</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr auto', gap: '10px', marginBottom: '20px' }}>
            <input type="text" placeholder="Nom *" value={newMedecin.nom} onChange={e => setNewMedecin({ ...newMedecin, nom: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <input type="text" placeholder="Prénom *" value={newMedecin.prenom} onChange={e => setNewMedecin({ ...newMedecin, prenom: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <input type="text" placeholder="Spécialité" value={newMedecin.specialite} onChange={e => setNewMedecin({ ...newMedecin, specialite: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <input type="email" placeholder="Email" value={newMedecin.email} onChange={e => setNewMedecin({ ...newMedecin, email: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <input type="text" placeholder="Login (ou laisser vide)" value={newMedecin.login} onChange={e => setNewMedecin({ ...newMedecin, login: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <input type="password" placeholder="Mot de passe *" value={newMedecin.password} onChange={e => setNewMedecin({ ...newMedecin, password: e.target.value })} required style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <button onClick={addMedecin} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Ajouter</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>ID</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Nom</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Prénom</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Spécialité</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Email</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {medecins.map(m => (
                <tr key={m.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{m.id}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{m.nom}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{m.prenom}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{m.specialite}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{m.email}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    <button onClick={() => deleteMedecin(m.id)} style={{ backgroundColor: '#ef4444', color: 'white', padding: '4px 8px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* BÂTIMENTS */}
      {activeTab === 'batiments' && (
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
          <h2>Bâtiments</h2>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input type="text" placeholder="Nom du bâtiment" value={newBatiment.nom} onChange={e => setNewBatiment({ ...newBatiment, nom: e.target.value })} style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <button onClick={addBatiment} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Ajouter</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>ID</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Nom</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {batiments.map(b => (
                <tr key={b.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{b.id}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{b.nom}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    <button onClick={() => deleteBatiment(b.id)} style={{ backgroundColor: '#ef4444', color: 'white', padding: '4px 8px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ÉTAGES */}
      {activeTab === 'etages' && (
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
          <h2>Étages</h2>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <select value={newEtage.batiment_id} onChange={e => setNewEtage({ ...newEtage, batiment_id: e.target.value })} style={{ padding: '8px', flex: 1, border: '1px solid #ccc', borderRadius: '4px' }}>
              <option value="">Bâtiment</option>
              {batiments.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
            </select>
            <input type="number" placeholder="Numéro" value={newEtage.numero} onChange={e => setNewEtage({ ...newEtage, numero: e.target.value })} style={{ width: '100px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <button onClick={addEtage} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Ajouter</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>ID</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Bâtiment</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Numéro</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {etages.map(e => (
                <tr key={e.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{e.id}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{e.batiment_nom}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{e.numero}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    <button onClick={() => deleteEtage(e.id)} style={{ backgroundColor: '#ef4444', color: 'white', padding: '4px 8px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CHAMBRES */}
      {activeTab === 'chambres' && (
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
          <h2>Chambres</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: '10px', marginBottom: '20px' }}>
            <input type="text" placeholder="Nom" value={newChambre.nom} onChange={e => setNewChambre({ ...newChambre, nom: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <select value={newChambre.batiment_id} onChange={e => setNewChambre({ ...newChambre, batiment_id: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
              <option value="">Bâtiment</option>
              {batiments.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
            </select>
            <select value={newChambre.etage_id} onChange={e => setNewChambre({ ...newChambre, etage_id: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
              <option value="">Étage</option>
              {etages.map(e => <option key={e.id} value={e.id}>Étage {e.numero}</option>)}
            </select>
            <select value={newChambre.type} onChange={e => setNewChambre({ ...newChambre, type: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
              <option value="public">Public</option><option value="prive">Privé</option>
            </select>
            <input type="number" placeholder="Capacité" value={newChambre.capacite} onChange={e => setNewChambre({ ...newChambre, capacite: parseInt(e.target.value) })} style={{ width: '100px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <button onClick={addChambre} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Ajouter</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>ID</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Nom</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Bâtiment</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Étage</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Type</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Capacité</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {chambres.map(c => (
                <tr key={c.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{c.id}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{c.nom}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{c.batiment_nom}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{c.etage_numero}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{c.type}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{c.capacite}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    <button onClick={() => deleteChambre(c.id)} style={{ backgroundColor: '#ef4444', color: 'white', padding: '4px 8px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* LITS */}
      {activeTab === 'lits' && (
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
          <h2>Lits</h2>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <select value={newLit.chambre_id} onChange={e => setNewLit({ ...newLit, chambre_id: e.target.value })} style={{ flex: 2, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
              <option value="">Chambre</option>
              {chambres.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.batiment_nom} - Étage {c.etage_numero})</option>)}
            </select>
            <input type="text" placeholder="Numéro de lit" value={newLit.numero} onChange={e => setNewLit({ ...newLit, numero: e.target.value })} style={{ width: '120px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <select value={newLit.statut} onChange={e => setNewLit({ ...newLit, statut: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
              <option value="libre">Libre</option><option value="occupe">Occupé</option><option value="maintenance">Maintenance</option>
            </select>
            <button onClick={addLit} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Ajouter</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>ID</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Chambre</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Numéro</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Statut</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {lits.map(l => (
                <tr key={l.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{l.id}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{l.chambre_nom}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{l.numero}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{l.statut}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    <button onClick={() => deleteLit(l.id)} style={{ backgroundColor: '#ef4444', color: 'white', padding: '4px 8px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PRESTATIONS */}
      {activeTab === 'prestations' && (
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
          <h2>Grille tarifaire (CCAM, NGAP, etc.)</h2>
          <button onClick={() => { setEditPrestationId(null); setNewPrestation({ code: '', libelle: '', prix_unitaire: '', categorie: '' }); setShowPrestationModal(true); }} style={{ marginBottom: '20px', padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            <FaPlus /> Ajouter une prestation
          </button>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Code</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Libellé</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Prix (€)</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Catégorie</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {prestations.map(p => (
                <tr key={p.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{p.code}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{p.libelle}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{parseFloat(p.prix_unitaire).toFixed(2)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{p.categorie || '-'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    <button onClick={() => { setEditPrestationId(p.id); setNewPrestation(p); setShowPrestationModal(true); }} style={{ marginRight: '8px', background: '#eab308', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}><FaEdit /></button>
                    <button onClick={() => deletePrestation(p.id)} style={{ background: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', color: 'white' }}><FaTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PHARMACIE */}
      {activeTab === 'pharmacy' && (
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
          <h2>💊 Gestion de la Pharmacie</h2>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
            <button onClick={() => setPharmacySubTab('medicaments')} style={{ padding: '8px 16px', background: pharmacySubTab === 'medicaments' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Médicaments</button>
            <button onClick={() => setPharmacySubTab('lots')} style={{ padding: '8px 16px', background: pharmacySubTab === 'lots' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Lots & Péremption</button>
            <button onClick={() => setPharmacySubTab('commandes')} style={{ padding: '8px 16px', background: pharmacySubTab === 'commandes' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Commandes</button>
            <button onClick={() => setPharmacySubTab('delivrance')} style={{ padding: '8px 16px', background: pharmacySubTab === 'delivrance' ? '#3b82f6' : '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Délivrance</button>
          </div>

          {/* Médicaments */}
          {pharmacySubTab === 'medicaments' && (
            <div>
              {(alertes.stockCritique.length > 0 || alertes.peremptionProche.length > 0) && (
                <div style={{ background: '#fff3cd', borderLeft: '5px solid #ffc107', padding: '10px', marginBottom: '15px', borderRadius: '4px' }}>
                  {alertes.stockCritique.length > 0 && <p>⚠️ Stock critique : {alertes.stockCritique.map(m => m.nom).join(', ')}</p>}
                  {alertes.peremptionProche.length > 0 && <p>⚠️ Péremption proche : {alertes.peremptionProche.map(l => l.medicament_nom).join(', ')}</p>}
                </div>
              )}
              <button onClick={() => { setShowMedicamentForm(!showMedicamentForm); setEditingMedicamentId(null); setMedicamentForm({ code: "", nom: "", description: "", stock: 0, seuil_alerte: 10, unite: "boîte", prix_unitaire: 0, principe_actif: "", forme: "", dosage: "", est_stupefiant: false }); }} style={{ marginBottom: '20px', padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                <FaPlus /> Ajouter un médicament
              </button>
              {showMedicamentForm && (
                <form onSubmit={handleMedicamentSubmit} style={{ background: '#f1f9fe', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                  <input type="text" placeholder="Code" value={medicamentForm.code} onChange={e => setMedicamentForm({...medicamentForm, code: e.target.value})} required style={{ width: '100%', marginBottom: '8px', padding: '8px' }} />
                  <input type="text" placeholder="Nom" value={medicamentForm.nom} onChange={e => setMedicamentForm({...medicamentForm, nom: e.target.value})} required style={{ width: '100%', marginBottom: '8px', padding: '8px' }} />
                  <textarea placeholder="Description" value={medicamentForm.description} onChange={e => setMedicamentForm({...medicamentForm, description: e.target.value})} rows={2} style={{ width: '100%', marginBottom: '8px', padding: '8px' }} />
                  <input type="number" placeholder="Stock" value={medicamentForm.stock} onChange={e => setMedicamentForm({...medicamentForm, stock: parseInt(e.target.value) || 0})} style={{ width: '48%', marginRight: '4%', marginBottom: '8px', padding: '8px' }} />
                  <input type="number" placeholder="Seuil alerte" value={medicamentForm.seuil_alerte} onChange={e => setMedicamentForm({...medicamentForm, seuil_alerte: parseInt(e.target.value) || 0})} style={{ width: '48%', marginBottom: '8px', padding: '8px' }} />
                  <input type="text" placeholder="Unité" value={medicamentForm.unite} onChange={e => setMedicamentForm({...medicamentForm, unite: e.target.value})} style={{ width: '48%', marginRight: '4%', marginBottom: '8px', padding: '8px' }} />
                  <input type="number" step="0.01" placeholder="Prix unitaire" value={medicamentForm.prix_unitaire} onChange={e => setMedicamentForm({...medicamentForm, prix_unitaire: parseFloat(e.target.value) || 0})} style={{ width: '48%', marginBottom: '8px', padding: '8px' }} />
                  <input type="text" placeholder="Principe actif" value={medicamentForm.principe_actif} onChange={e => setMedicamentForm({...medicamentForm, principe_actif: e.target.value})} style={{ width: '100%', marginBottom: '8px', padding: '8px' }} />
                  <input type="text" placeholder="Forme" value={medicamentForm.forme} onChange={e => setMedicamentForm({...medicamentForm, forme: e.target.value})} style={{ width: '48%', marginRight: '4%', marginBottom: '8px', padding: '8px' }} />
                  <input type="text" placeholder="Dosage" value={medicamentForm.dosage} onChange={e => setMedicamentForm({...medicamentForm, dosage: e.target.value})} style={{ width: '48%', marginBottom: '8px', padding: '8px' }} />
                  <label><input type="checkbox" checked={medicamentForm.est_stupefiant} onChange={e => setMedicamentForm({...medicamentForm, est_stupefiant: e.target.checked})} /> Stupéfiant</label>
                  <div><button type="submit" style={{ marginTop: '10px', background: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Enregistrer</button></div>
                </form>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#3b82f6', color: 'white' }}>
                    <th>Code</th><th>Nom</th><th>Stock</th><th>Seuil</th><th>Prix</th><th>Stup</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {medicaments.map(m => (
                    <tr key={m.id}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{m.code}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{m.nom}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd', color: m.stock <= m.seuil_alerte ? 'red' : 'black' }}>{m.stock}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{m.seuil_alerte}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{m.prix_unitaire} €</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{m.est_stupefiant ? '✅' : '❌'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                        <button onClick={() => editMedicament(m)} style={{ color: '#eab308', background: 'none', border: 'none', cursor: 'pointer' }}><FaEdit /></button>
                        <button onClick={() => deleteMedicament(m.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><FaTrash /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Lots */}
          {pharmacySubTab === 'lots' && (
            <div>
              <select value={selectedMedicamentId} onChange={e => setSelectedMedicamentId(e.target.value)} style={{ marginBottom: '20px', padding: '8px', width: '100%' }}>
                <option value="">Choisir un médicament</option>
                {medicaments.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
              {selectedMedicamentId && (
                <>
                  <button onClick={() => setShowLotForm(!showLotForm)} style={{ marginBottom: '20px', padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><FaPlus /> Ajouter un lot</button>
                  {showLotForm && (
                    <form onSubmit={handleLotSubmit} style={{ background: '#f1f9fe', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                      <input type="text" placeholder="Numéro de lot" value={lotForm.numero_lot} onChange={e => setLotForm({...lotForm, numero_lot: e.target.value})} required style={{ width: '100%', marginBottom: '8px', padding: '8px' }} />
                      <input type="date" placeholder="Date péremption" value={lotForm.date_peremption} onChange={e => setLotForm({...lotForm, date_peremption: e.target.value})} required style={{ width: '48%', marginRight: '4%', marginBottom: '8px', padding: '8px' }} />
                      <input type="number" placeholder="Quantité" value={lotForm.quantite} onChange={e => setLotForm({...lotForm, quantite: parseInt(e.target.value) || 0})} required style={{ width: '48%', marginBottom: '8px', padding: '8px' }} />
                      <input type="number" step="0.01" placeholder="Prix achat" value={lotForm.prix_achat} onChange={e => setLotForm({...lotForm, prix_achat: parseFloat(e.target.value) || 0})} style={{ width: '100%', marginBottom: '8px', padding: '8px' }} />
                      <button type="submit" style={{ background: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Ajouter</button>
                    </form>
                  )}
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#3b82f6', color: 'white' }}>
                        <th>Lot</th><th>Péremption</th><th>Stock actuel</th><th>Prix achat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lots.map(lot => (
                        <tr key={lot.id}>
                          <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{lot.numero_lot}</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #ddd', color: new Date(lot.date_peremption) < new Date() ? 'red' : 'black' }}>{lot.date_peremption}</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{lot.stock_actuel}</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{lot.prix_achat} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

          {/* Commandes */}
          {pharmacySubTab === 'commandes' && (
            <div>
              <button onClick={() => setShowCommandeForm(!showCommandeForm)} style={{ marginBottom: '20px', padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><FaPlus /> Nouvelle commande</button>
              {showCommandeForm && (
                <form onSubmit={handleCommandeSubmit} style={{ background: '#f1f9fe', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                  <h4>Lignes de commande</h4>
                  {commandeLignes.map((ligne, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <select value={ligne.medicament_id} onChange={e => updateCommandeLigne(idx, 'medicament_id', e.target.value)} required style={{ flex: 2, padding: '6px' }}>
                        <option value="">Médicament</option>
                        {medicaments.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                      </select>
                      <input type="number" placeholder="Quantité" value={ligne.quantite_commandee} onChange={e => updateCommandeLigne(idx, 'quantite_commandee', parseInt(e.target.value) || 0)} required style={{ flex: 1, padding: '6px' }} />
                      <input type="number" step="0.01" placeholder="Prix HT" value={ligne.prix_unitaire_ht} onChange={e => updateCommandeLigne(idx, 'prix_unitaire_ht', parseFloat(e.target.value) || 0)} style={{ flex: 1, padding: '6px' }} />
                    </div>
                  ))}
                  <button type="button" onClick={addCommandeLigne} style={{ marginBottom: '10px', background: '#6c757d', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}>+ Ajouter ligne</button>
                  <div><button type="submit" style={{ background: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Créer commande</button></div>
                </form>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#3b82f6', color: 'white' }}>
                    <th>N° commande</th><th>Date</th><th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {commandes.map(cmd => (
                    <tr key={cmd.id}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{cmd.numero_commande}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{new Date(cmd.date_commande).toLocaleDateString()}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{cmd.statut}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Délivrance */}
          {pharmacySubTab === 'delivrance' && (
            <div>
              {deliveryMessage && <div style={{ background: '#d4edda', color: '#155724', padding: '8px', borderRadius: '4px', marginBottom: '15px' }}>{deliveryMessage}</div>}
              <form onSubmit={handleDeliverySubmit} style={{ background: '#f1f9fe', padding: '15px', borderRadius: '8px' }}>
                <select value={deliveryForm.medicament_id} onChange={e => setDeliveryForm({...deliveryForm, medicament_id: e.target.value})} required style={{ width: '100%', marginBottom: '8px', padding: '8px' }}>
                  <option value="">Médicament</option>
                  {medicaments.map(m => <option key={m.id} value={m.id}>{m.nom} (stock: {m.stock})</option>)}
                </select>
                <input type="number" placeholder="Quantité" value={deliveryForm.quantite} onChange={e => setDeliveryForm({...deliveryForm, quantite: parseInt(e.target.value) || 1})} required min="1" style={{ width: '100%', marginBottom: '8px', padding: '8px' }} />
                <select value={deliveryForm.patient_id} onChange={e => setDeliveryForm({...deliveryForm, patient_id: e.target.value})} required style={{ width: '100%', marginBottom: '8px', padding: '8px' }}>
                  <option value="">Patient</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                </select>
                <input type="text" placeholder="Posologie (ex: 1 comprimé matin)" value={deliveryForm.posologie} onChange={e => setDeliveryForm({...deliveryForm, posologie: e.target.value})} style={{ width: '100%', marginBottom: '8px', padding: '8px' }} />
                <input type="text" placeholder="Prescripteur (nom du médecin)" value={deliveryForm.prescripteur_nom} onChange={e => setDeliveryForm({...deliveryForm, prescripteur_nom: e.target.value})} style={{ width: '100%', marginBottom: '8px', padding: '8px' }} />
                <button type="submit" style={{ background: '#3b82f6', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Délivrer</button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* FOURNISSEURS */}
      {activeTab === 'fournisseurs' && <FournisseursList />}

      {/* DISPOSITIFS */}
      {activeTab === 'dispositifs' && <DispositifsList />}

      {/* PHARMACOVIGILANCE */}
      {activeTab === 'pharmacovigilance' && <PharmacovigilanceList />}
      
      {/* RupturesSuggestions */}
      {activeTab === 'ruptures' && <RupturesSuggestions />}

      {/* RecettesList */}
      {activeTab === 'recettes' && <RecettesList />}

      {/* HistoriqueExecutions */}
      {activeTab === 'historique' && <HistoriqueExecutions />}

      {/* PharmacyDashboard */}
      {activeTab === 'pharmadashboard' && <PharmacyDashboard />}

      {/* OrdonnancesList */}
      {activeTab === 'ordonnances' && <OrdonnancesList />}

      {/* ========== UTILISATEURS (avec select dynamique des rôles) ========== */}
      {activeTab === 'utilisateurs' && (
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
          <h2>👤 Gestion des utilisateurs</h2>
          <button
            onClick={() => { setEditUserId(null); setUserForm({ login: '', nom: '', prenom: '', email: '', role: '', password: '', actif: true }); setShowUserForm(true); }}
            style={{ marginBottom: '20px', padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            <FaPlus /> Nouvel utilisateur
          </button>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#3b82f6', color: 'white' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>ID</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Login</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Nom</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Prénom</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Email</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Rôle</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Actif</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {utilisateurs.map(u => (
                <tr key={u.id}>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{u.id}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{u.login}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{u.nom || '-'}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{u.prenom || '-'}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{u.email || '-'}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    <span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{u.role}</span>
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <button
                      onClick={() => toggleActif(u.id, u.actif)}
                      style={{
                        background: u.actif ? '#10b981' : '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {u.actif ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    <button
                      onClick={() => { setEditUserId(u.id); setUserForm(u); setShowUserForm(true); }}
                      style={{ marginRight: '8px', background: '#eab308', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => deleteUser(u.id)}
                      style={{ background: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ========== GESTION DES RÔLES ========== */}
      {activeTab === 'roles' && (
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
          <h2>🔑 Gestion des rôles</h2>
          <button
            onClick={() => { setEditingRoleId(null); setRoleForm({ id: null, nom: '' }); setShowRoleForm(true); }}
            style={{ marginBottom: '20px', padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            <FaPlus /> Nouveau rôle
          </button>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#3b82f6', color: 'white' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>ID</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Nom</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.id}>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{r.id}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{r.nom}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    <button
                      onClick={() => { setEditingRoleId(r.id); setRoleForm({ id: r.id, nom: r.nom }); setShowRoleForm(true); }}
                      style={{ marginRight: '8px', background: '#eab308', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => deleteRole(r.id)}
                      style={{ background: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ========== GESTION DES AUTORISATIONS ========== */}
      {activeTab === 'authorizations' && (
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
          <h2>🔓 Gestion des autorisations par rôle</h2>
          <div style={{ marginBottom: '20px' }}>
            <label>Rôle : </label>
            <select
              value={selectedRoleId}
              onChange={e => setSelectedRoleId(e.target.value)}
              style={{ padding: '8px', marginLeft: '10px', minWidth: '200px' }}
            >
              <option value="">Sélectionner un rôle</option>
              {rolesListForAuth.map(r => (
                <option key={r.id} value={r.id}>{r.nom}</option>
              ))}
            </select>
          </div>
          {loadingAuth && <p>Chargement...</p>}
          {!loadingAuth && selectedRoleId && (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#3b82f6', color: 'white' }}>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Module</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Niveau d'accès</th>
                  </tr>
                </thead>
                <tbody>
                  {modulesList.map(mod => {
                    const current = roleAuthorizations.find(a => a.module === mod.module);
                    const level = current ? current.level : 'none';
                    return (
                      <tr key={mod.module}>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{mod.module}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                          <select
                            value={level}
                            onChange={(e) => {
                              const newLevel = e.target.value;
                              setRoleAuthorizations(prev =>
                                prev.map(a => a.module === mod.module ? { ...a, level: newLevel } : a)
                              );
                            }}
                            style={{ padding: '4px 8px', borderRadius: '4px' }}
                          >
                            <option value="none">❌ Aucun</option>
                            <option value="read">👁️ Lecture</option>
                            <option value="write">✏️ Écriture</option>
                            <option value="full">✅ Complet</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button
                  onClick={saveAuthorizations}
                  style={{ padding: '8px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  💾 Enregistrer
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========== NOUVEL ONGLET : TYPES D'EXAMENS (corrigé) ========== */}
      {activeTab === 'typesexamens' && <TypesExamensAdmin />}

      {/* MODAL PRESTATIONS */}
      {showPrestationModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '500px', maxWidth: '90%' }}>
            <h2 style={{ marginBottom: '16px' }}>{editPrestationId ? 'Modifier' : 'Ajouter'} une prestation</h2>
            <form onSubmit={handlePrestationSubmit}>
              <div style={{ marginBottom: '12px' }}><label>Code *</label><input type="text" value={newPrestation.code} onChange={e => setNewPrestation({...newPrestation, code: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }} /></div>
              <div style={{ marginBottom: '12px' }}><label>Libellé *</label><input type="text" value={newPrestation.libelle} onChange={e => setNewPrestation({...newPrestation, libelle: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }} /></div>
              <div style={{ marginBottom: '12px' }}><label>Prix unitaire (€) *</label><input type="number" step="0.01" value={newPrestation.prix_unitaire} onChange={e => setNewPrestation({...newPrestation, prix_unitaire: parseFloat(e.target.value)})} required style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }} /></div>
              <div style={{ marginBottom: '20px' }}><label>Catégorie</label><input type="text" value={newPrestation.categorie} onChange={e => setNewPrestation({...newPrestation, categorie: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowPrestationModal(false)} style={{ backgroundColor: '#e5e7eb', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><FaTimes /> Annuler</button>
                <button type="submit" style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><FaSave /> Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UTILISATEURS */}
      {showUserForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '500px', maxWidth: '90%' }}>
            <h2 style={{ marginBottom: '16px' }}>{editUserId ? 'Modifier' : 'Nouvel'} utilisateur</h2>
            <form onSubmit={handleUserSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label>Login *</label>
                <input type="text" value={userForm.login} onChange={e => setUserForm({...userForm, login: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label>Nom</label>
                <input type="text" value={userForm.nom} onChange={e => setUserForm({...userForm, nom: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label>Prénom</label>
                <input type="text" value={userForm.prenom} onChange={e => setUserForm({...userForm, prenom: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label>Email</label>
                <input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label>Rôle *</label>
                <select
                  value={userForm.role || ''}
                  onChange={e => setUserForm({...userForm, role: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
                >
                  <option value="">Sélectionner un rôle</option>
                  {rolesList.length === 0 ? (
                    <option value="" disabled>Chargement des rôles...</option>
                  ) : (
                    rolesList.map(role => (
                      <option key={role.id} value={role.nom}>{role.nom}</option>
                    ))
                  )}
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label>{editUserId ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}</label>
                <input type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} required={!editUserId} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={userForm.actif} onChange={e => setUserForm({...userForm, actif: e.target.checked})} />
                  Compte actif
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowUserForm(false)} style={{ backgroundColor: '#e5e7eb', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><FaTimes /> Annuler</button>
                <button type="submit" style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><FaSave /> Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RÔLES */}
      {showRoleForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '400px', maxWidth: '90%' }}>
            <h2 style={{ marginBottom: '16px' }}>{editingRoleId ? 'Modifier' : 'Nouveau'} rôle</h2>
            <form onSubmit={handleRoleSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label>Nom du rôle *</label>
                <input
                  type="text"
                  value={roleForm.nom}
                  onChange={e => setRoleForm({ ...roleForm, nom: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowRoleForm(false)} style={{ backgroundColor: '#e5e7eb', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><FaTimes /> Annuler</button>
                <button type="submit" style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><FaSave /> Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;