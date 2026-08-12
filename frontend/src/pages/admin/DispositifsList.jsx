import { useEffect, useState } from 'react';
import { FaEdit, FaTrash, FaPlus, FaSave, FaTimes, FaBoxes } from 'react-icons/fa';
import api from '../../axios'; // ✅ Utilisation de l'instance partagée

const DispositifsList = () => {
  const [dispositifs, setDispositifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '',
    nom: '',
    description: '',
    stock: 0,
    seuil_alerte: 10,
    prix_unitaire: 0,
    categorie: ''
  });
  const [editId, setEditId] = useState(null);
  const [showLotsModal, setShowLotsModal] = useState(false);
  const [lots, setLots] = useState([]);
  const [selectedDispositif, setSelectedDispositif] = useState(null);
  const [userRole, setUserRole] = useState(null); // ✅ État pour le rôle

  // ✅ Récupérer le rôle depuis le token JWT
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (e) {
        console.error('Erreur décodage token', e);
      }
    }
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchDispositifs = async () => {
    try {
      const res = await api.get('/pharmacy/dispositifs'); // ✅ chemin sans /api
      setDispositifs(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      showToast('Erreur chargement dispositifs', 'error');
    }
  };

  useEffect(() => {
    fetchDispositifs();
  }, []);

  const fetchLots = async (dispositifId) => {
    try {
      const res = await api.get(`/pharmacy/dispositifs/${dispositifId}/lots`);
      setLots(res.data);
      setShowLotsModal(true);
    } catch (err) {
      showToast('Erreur chargement lots', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/pharmacy/dispositifs/${editId}`, form);
        showToast('Dispositif modifié');
      } else {
        await api.post('/pharmacy/dispositifs', form);
        showToast('Dispositif ajouté');
      }
      setShowForm(false);
      setEditId(null);
      setForm({ code: '', nom: '', description: '', stock: 0, seuil_alerte: 10, prix_unitaire: 0, categorie: '' });
      fetchDispositifs();
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  // ✅ handleDelete modifié avec gestion 403
  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Supprimer définitivement ce dispositif ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/pharmacy/dispositifs/${id}`);
      fetchDispositifs();
      showToast('Dispositif supprimé');
    } catch (err) {
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut supprimer un dispositif.', 'error');
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Chargement...</div>;

  return (
    <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px',
          backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
          color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 1000
        }}>
          {toast}
        </div>
      )}
      <h2 style={{ marginBottom: '20px' }}>🩺 Gestion des Dispositifs Médicaux</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div></div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ code: '', nom: '', description: '', stock: 0, seuil_alerte: 10, prix_unitaire: 0, categorie: '' }); }}
          style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FaPlus /> Nouveau
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Code</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Nom</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Stock</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Seuil</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Prix (FC)</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Catégorie</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {dispositifs.map(d => (
              <tr key={d.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{d.code}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{d.nom}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{d.stock}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{d.seuil_alerte}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{parseFloat(d.prix_unitaire).toFixed(2)}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{d.categorie || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  <button
                    onClick={() => { setEditId(d.id); setForm(d); setShowForm(true); }}
                    style={{ marginRight: '8px', background: '#eab308', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <FaEdit />
                  </button>
                  {/* ✅ Bouton supprimer : visible uniquement pour admin */}
                  {isAdmin ? (
                    <button
                      onClick={() => handleDelete(d.id)}
                      style={{ marginRight: '8px', background: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                    >
                      <FaTrash />
                    </button>
                  ) : (
                    <span style={{ marginRight: '8px', color: '#94a3b8', fontSize: '14px' }} title="Réservé aux administrateurs">🔒</span>
                  )}
                  <button
                    onClick={() => { setSelectedDispositif(d); fetchLots(d.id); }}
                    style={{ background: '#3b82f6', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                  >
                    <FaBoxes /> Lots
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Formulaire (inchangé) */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '500px', maxWidth: '90%' }}>
            <h2 style={{ marginBottom: '16px' }}>{editId ? 'Modifier' : 'Ajouter'} un dispositif médical</h2>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Code *" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <input type="text" placeholder="Nom *" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows="2" style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <input type="text" placeholder="Catégorie" value={form.categorie} onChange={e => setForm({...form, categorie: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" placeholder="Stock" value={form.stock} onChange={e => setForm({...form, stock: parseInt(e.target.value)})} style={{ width: '50%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
                <input type="number" placeholder="Seuil alerte" value={form.seuil_alerte} onChange={e => setForm({...form, seuil_alerte: parseInt(e.target.value)})} style={{ width: '50%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              </div>
              <input type="number" step="0.01" placeholder="Prix unitaire (FC)" value={form.prix_unitaire} onChange={e => setForm({...form, prix_unitaire: parseFloat(e.target.value)})} style={{ width: '100%', padding: '8px', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ backgroundColor: '#e5e7eb', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><FaTimes /> Annuler</button>
                <button type="submit" style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><FaSave /> Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lots (inchangé) */}
      {showLotsModal && selectedDispositif && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '700px', maxWidth: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2>Lots du dispositif : {selectedDispositif.nom}</h2>
              <button onClick={() => setShowLotsModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>
            {lots.length === 0 ? (
              <p>Aucun lot pour ce dispositif.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Lot</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Péremption</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Stock actuel</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Prix achat</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map(l => (
                    <tr key={l.id}>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{l.numero_lot}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{l.date_peremption}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{l.stock_actuel}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{parseFloat(l.prix_achat).toFixed(2)} FC</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DispositifsList;
