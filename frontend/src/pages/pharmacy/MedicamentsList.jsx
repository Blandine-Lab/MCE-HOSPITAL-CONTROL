import { useEffect, useState } from 'react';
import api from '../../axios';
import { Link, useNavigate } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaExclamationTriangle, FaBoxes, FaChartPie, FaPrescriptionBottle, FaEye, FaSearch } from 'react-icons/fa';
import PharmacyDashboard from './PharmacyDashboard';

const MedicamentsList = () => {
  const navigate = useNavigate();
  const [medicaments, setMedicaments] = useState([]);
  const [alertes, setAlertes] = useState({ stockCritique: [], peremptionProche: [] });
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '',
    nom: '',
    description: '',
    categorie_id: 1,
    unite: 'boïte',
    prix_achat: 0,
    prix_vente: 0,
    seuil_alerte: 10,
    quantite_initiale: 0
  });
  const [editId, setEditId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [categories, setCategories] = useState([]);
  const [categorieMedicamentId, setCategorieMedicamentId] = useState(1);
  const [produitsDisponibles, setProduitsDisponibles] = useState([]);
  const [selectedProduitId, setSelectedProduitId] = useState('');
  const [userRole, setUserRole] = useState(null);

  // ? Rïcupïrer le rïle depuis le token JWT
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (e) {
        console.error('Erreur dïcodage token', e);
      }
    }
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    api.get('/produits/categories-produits')
      .then(res => {
        setCategories(res.data);
        const medCat = res.data.find(c => c.id === 1);
        if (medCat) {
          setCategorieMedicamentId(1);
          setForm(prev => ({ ...prev, categorie_id: 1 }));
        }
      })
      .catch(console.error);

    fetchData();
    fetchPrescriptions();
    fetchProduitsDisponibles();
  }, []);

  const fetchData = async () => {
    try {
      const produitsRes = await api.get('/produits');
      const produits = produitsRes.data || [];
      const medicamentsFiltres = produits.filter(p => p.categorie_id === 1);

      const stocksRes = await api.get('/stocks');
      const stocks = stocksRes.data || [];

      const medicamentsAvecStock = medicamentsFiltres.map(p => {
        const stock = stocks.find(s => s.produit_id === p.id);
        return {
          ...p,
          stock: stock?.quantite || 0,
          date_peremption: stock?.date_peremption || null,
        };
      });

      setMedicaments(medicamentsAvecStock);

      const stockCritique = medicamentsAvecStock.filter(m => m.stock <= m.seuil_alerte && m.seuil_alerte > 0);
      setAlertes({ stockCritique, peremptionProche: [] });

      setLoading(false);
      setLoaded(true);
    } catch (err) {
      console.error(err);
      showToast('Erreur chargement', 'error');
      setLoading(false);
    }
  };

  const fetchProduitsDisponibles = async () => {
    try {
      const res = await api.get('/produits');
      const produits = res.data || [];
      const disponibles = produits.filter(p => p.categorie_id !== 1);
      setProduitsDisponibles(disponibles);
    } catch (err) {
      console.error('Erreur chargement produits disponibles :', err);
    }
  };

  const fetchPrescriptions = async () => {
    try {
      const res = await api.get('/prescriptions');
      setPrescriptions(res.data);
    } catch (err) {
      console.error('Erreur chargement prescriptions:', err);
    }
  };

  const handleSelectProduit = (produitId) => {
    if (!produitId) {
      setForm({
        code: '',
        nom: '',
        description: '',
        categorie_id: 1,
        unite: 'boïte',
        prix_achat: 0,
        prix_vente: 0,
        seuil_alerte: 10,
        quantite_initiale: 0
      });
      setSelectedProduitId('');
      return;
    }
    const produit = produitsDisponibles.find(p => p.id === parseInt(produitId));
    if (produit) {
      setForm({
        code: produit.code || '',
        nom: produit.nom || '',
        description: produit.description || '',
        categorie_id: 1,
        unite: produit.unite || 'boïte',
        prix_achat: produit.prix_achat || 0,
        prix_vente: produit.prix_vente || 0,
        seuil_alerte: produit.seuil_alerte || 10,
        quantite_initiale: 0
      });
      setSelectedProduitId(produitId);
      setEditId(produit.id);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        code: form.code,
        nom: form.nom,
        description: form.description,
        categorie_id: 1,
        unite: form.unite,
        prix_achat: parseFloat(form.prix_achat) || 0,
        prix_vente: parseFloat(form.prix_vente) || 0,
        seuil_alerte: parseInt(form.seuil_alerte) || 10,
      };

      let response;
      if (editId) {
        response = await api.put(`/produits/${editId}`, payload);
        showToast('Mïdicament modifiï');
      } else {
        response = await api.post('/produits', payload);
        const qty = parseInt(form.quantite_initiale) || 0;
        if (qty > 0) {
          await api.post('/mouvements', {
            produit_id: response.data.id,
            type: 'entree',
            quantite: qty,
            reference: 'Stock initial',
            motif: 'Crïation mïdicament',
            date_mouvement: new Date().toISOString().split('T')[0]
          });
        }
        showToast('Mïdicament ajoutï avec succïs');
      }

      setShowForm(false);
      setEditId(null);
      setSelectedProduitId('');
      setForm({
        code: '',
        nom: '',
        description: '',
        categorie_id: 1,
        unite: 'boïte',
        prix_achat: 0,
        prix_vente: 0,
        seuil_alerte: 10,
        quantite_initiale: 0
      });
      fetchData();
      fetchProduitsDisponibles();
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  // ? handleDelete avec gestion 403
  const handleDelete = async (id) => {
    if (!window.confirm('?? Supprimer dïfinitivement ce mïdicament ? Cette action est irrïversible.')) return;
    try {
      await api.delete(`/produits/${id}`);
      fetchData();
      fetchProduitsDisponibles();
      showToast('Mïdicament supprimï');
    } catch (err) {
      console.error('Erreur suppression mïdicament:', err);
      if (err.response?.status === 403) {
        showToast('? Seul un administrateur peut supprimer un mïdicament.', 'error');
      } else {
        showToast('Erreur suppression', 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

  const badgeStock = (stock, seuil) => {
    if (stock <= seuil) return <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '20px', fontSize: '12px' }}>Alerte</span>;
    return <span style={{ backgroundColor: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '20px', fontSize: '12px' }}>OK</span>;
  };

  const containerStyle = {
    minHeight: '100vh', backgroundColor: '#f0fdf4', padding: '32px', fontFamily: 'system-ui'
  };
  const titleStyle = {
    fontSize: '32px', fontWeight: 'bold', color: '#166534', textAlign: 'center', marginBottom: '24px',
    opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(-20px)', transition: 'all 0.5s'
  };
  const cardStyle = { backgroundColor: 'white', borderRadius: '16px', padding: '20px', marginBottom: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' };
  const alertCardStyle = { ...cardStyle, backgroundColor: '#fef3c7', borderLeft: '6px solid #f59e0b' };
  const tableStyle = { width: '100%', borderCollapse: 'collapse' };
  const thStyle = { backgroundColor: '#e5e7eb', padding: '12px', textAlign: 'left' };
  const tdStyle = { padding: '10px', borderBottom: '1px solid #e5e7eb' };
  const tabStyle = {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>? Chargement...</div>;

  return (
    <div style={containerStyle}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px',
          backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
          color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 1000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={titleStyle}>?? Pharmacie</h1>

        <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #e5e7eb', marginBottom: '24px' }}>
          <button onClick={() => setActiveTab('dashboard')} style={{ ...tabStyle, backgroundColor: activeTab === 'dashboard' ? '#3b82f6' : '#f3f4f6', color: activeTab === 'dashboard' ? 'white' : '#374151' }}><FaChartPie /> Tableau de bord</button>
          <button onClick={() => setActiveTab('prescriptions')} style={{ ...tabStyle, backgroundColor: activeTab === 'prescriptions' ? '#3b82f6' : '#f3f4f6', color: activeTab === 'prescriptions' ? 'white' : '#374151' }}><FaPrescriptionBottle /> Prescriptions</button>
          <button onClick={() => setActiveTab('medicaments')} style={{ ...tabStyle, backgroundColor: activeTab === 'medicaments' ? '#3b82f6' : '#f3f4f6', color: activeTab === 'medicaments' ? 'white' : '#374151' }}><FaBoxes /> Mïdicaments</button>
        </div>

        {activeTab === 'dashboard' && <PharmacyDashboard />}

        {activeTab === 'prescriptions' && (
          <div style={cardStyle}>
            <h2 style={{ marginBottom: '16px' }}>?? Liste des prescriptions</h2>
            {prescriptions.length === 0 ? <p>Aucune prescription trouvïe.</p> : (
              <table style={tableStyle}>
                <thead>
                  <tr><th style={thStyle}>Nï</th><th style={thStyle}>Patient</th><th style={thStyle}>Mïdecin</th><th style={thStyle}>Date</th><th style={thStyle}>Statut</th><th style={thStyle}>Actions</th></tr>
                </thead>
                <tbody>
                  {prescriptions.map(p => (
                    <tr key={p.id}>
                      <td style={tdStyle}>ORD-{String(p.id).padStart(4, '0')}</td>
                      <td style={tdStyle}>{p.patient_prenom} {p.patient_nom}</td>
                      <td style={tdStyle}>Dr. {p.doctor_prenom} {p.doctor_nom}</td>
                      <td style={tdStyle}>{new Date(p.date_creation).toLocaleDateString()}</td>
                      <td style={tdStyle}>
                        <span style={{ backgroundColor: p.status === 'pending' ? '#f59e0b' : p.status === 'served' ? '#10b981' : '#6b7280', color: 'white', padding: '2px 8px', borderRadius: '20px', fontSize: '12px' }}>
                          {p.status === 'pending' ? '? En attente' : p.status === 'served' ? '? Servie' : p.status}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <button onClick={() => navigate(`/prescription/${p.id}`)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}><FaEye /> Voir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'medicaments' && (
          <>
            {alertes.stockCritique.length > 0 && (
              <div style={alertCardStyle}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e' }}><FaExclamationTriangle /> Alertes</h2>
                {alertes.stockCritique.length > 0 && <p><strong>Stock faible :</strong> {alertes.stockCritique.map(m => m.nom).join(', ')}</p>}
              </div>
            )}

            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2>Liste des mïdicaments</h2>
                <button onClick={() => { setShowForm(true); setEditId(null); setSelectedProduitId(''); setForm({ code: '', nom: '', description: '', categorie_id: 1, unite: 'boïte', prix_achat: 0, prix_vente: 0, seuil_alerte: 10, quantite_initiale: 0 }); }} style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><FaPlus /> Nouveau</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Code</th>
                      <th style={thStyle}>Nom</th>
                      <th style={thStyle}>Stock</th>
                      <th style={thStyle}>Seuil</th>
                      <th style={thStyle}>Prix vente</th>
                      <th style={thStyle}>Alerte</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicaments.map(m => (
                      <tr key={m.id}>
                        <td style={tdStyle}>{m.code}</td>
                        <td style={tdStyle}>{m.nom}</td>
                        <td style={tdStyle}>{m.stock} {m.unite}</td>
                        <td style={tdStyle}>{m.seuil_alerte}</td>
                        <td style={tdStyle}>{parseFloat(m.prix_vente || 0).toFixed(2)} FC</td>
                        <td style={tdStyle}>{badgeStock(m.stock, m.seuil_alerte)}</td>
                        <td style={tdStyle}>
                          <button onClick={() => { setEditId(m.id); setForm({ ...m, categorie_id: 1 }); setSelectedProduitId(''); setShowForm(true); }} style={{ marginRight: '8px', background: '#eab308', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}><FaEdit /></button>
                          {isAdmin ? (
                            <button onClick={() => handleDelete(m.id)} style={{ background: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', color: 'white' }}><FaTrash /></button>
                          ) : (
                            <span style={{ marginRight: '8px', color: '#94a3b8', fontSize: '14px' }} title="Rïservï aux administrateurs">??</span>
                          )}
                          <Link to={`/stock?produit=${m.id}`} style={{ marginLeft: '8px', background: '#3b82f6', padding: '4px 8px', borderRadius: '4px', color: 'white', textDecoration: 'none' }}><FaBoxes /> Stock</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '600px', maxWidth: '90%' }}>
            <h2 style={{ marginBottom: '16px' }}>{editId ? 'Modifier' : 'Ajouter'} un mïdicament</h2>
            <form onSubmit={handleSubmit}>
              {!editId && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                    <FaSearch style={{ marginRight: '4px' }} /> Sïlectionner un produit existant (ou laisser vide pour crïer)
                  </label>
                  <select
                    value={selectedProduitId}
                    onChange={e => handleSelectProduit(e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
                  >
                    <option value="">-- Crïer un nouveau produit --</option>
                    {produitsDisponibles.map(p => (
                      <option key={p.id} value={p.id}>{p.code} - {p.nom} (cat. {p.categorie_id})</option>
                    ))}
                  </select>
                </div>
              )}

              <input type="text" placeholder="Code *" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <input type="text" placeholder="Nom *" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows="2" style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <input type="text" placeholder="Unitï (ex: boïte, comprimï...)" value={form.unite} onChange={e => setForm({...form, unite: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <input type="number" step="0.01" placeholder="Prix d'achat (FC)" value={form.prix_achat} onChange={e => setForm({...form, prix_achat: parseFloat(e.target.value) || 0})} style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <input type="number" step="0.01" placeholder="Prix de vente (FC)" value={form.prix_vente} onChange={e => setForm({...form, prix_vente: parseFloat(e.target.value) || 0})} style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <input type="number" placeholder="Seuil d'alerte" value={form.seuil_alerte} onChange={e => setForm({...form, seuil_alerte: parseInt(e.target.value) || 10})} style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              {!editId && !selectedProduitId && (
                <input type="number" placeholder="Quantitï initiale" value={form.quantite_initiale} onChange={e => setForm({...form, quantite_initiale: parseInt(e.target.value) || 0})} style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ backgroundColor: '#e5e7eb', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Annuler</button>
                <button type="submit" style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default MedicamentsList;
