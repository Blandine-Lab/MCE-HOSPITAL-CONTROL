import { useEffect, useState } from 'react';
import { FaEdit, FaTrash, FaPlus, FaSave, FaTimes, FaPlay } from 'react-icons/fa';
import api from '../../axios'; // ? Instance partage

const RecettesList = () => {
  const [recettes, setRecettes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nom: '',
    description: '',
    ingredients: '',
    etapes: ''
  });
  const [editId, setEditId] = useState(null);
  const [showExecuterModal, setShowExecuterModal] = useState(false);
  const [selectedRecette, setSelectedRecette] = useState(null);
  const [executionForm, setExecutionForm] = useState({
    patient_id: '',
    quantite_finale: 0,
    lot_id_medicament: ''
  });
  const [patients, setPatients] = useState([]);
  const [medicaments, setMedicaments] = useState([]);
  const [userRole, setUserRole] = useState(null); // ? Rle de l'utilisateur

  // ? Rcuprer le rle depuis le token JWT
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (e) {
        console.error('Erreur dcodage token', e);
      }
    }
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRecettes = async () => {
    try {
      const res = await api.get('/pharmacy/preparations/recettes');
      setRecettes(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      showToast('Erreur chargement recettes', 'error');
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await api.get('/admin/patients');
      setPatients(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMedicaments = async () => {
    try {
      const res = await api.get('/pharmacy/medicaments');
      setMedicaments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRecettes();
    fetchPatients();
    fetchMedicaments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nom: form.nom,
        description: form.description,
        ingredients: form.ingredients ? JSON.parse(form.ingredients) : {},
        etapes: form.etapes ? form.etapes.split('\n').filter(s => s.trim()) : []
      };
      if (editId) {
        await api.put(`/pharmacy/preparations/recettes/${editId}`, payload);
        showToast('Recette modifie');
      } else {
        await api.post('/pharmacy/preparations/recettes', payload);
        showToast('Recette ajoute');
      }
      setShowForm(false);
      setEditId(null);
      setForm({ nom: '', description: '', ingredients: '', etapes: '' });
      fetchRecettes();
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  // ? handleDelete avec gestion 403
  const handleDelete = async (id) => {
    if (!window.confirm('?? Supprimer dfinitivement cette recette ? Cette action est irrversible.')) return;
    try {
      await api.delete(`/pharmacy/preparations/recettes/${id}`);
      fetchRecettes();
      showToast('Recette supprime');
    } catch (err) {
      if (err.response?.status === 403) {
        showToast('? Seul un administrateur peut supprimer une recette.', 'error');
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const handleExecuter = async (e) => {
    e.preventDefault();
    try {
      await api.post('/pharmacy/preparations/executer', {
        recette_id: selectedRecette.id,
        patient_id: executionForm.patient_id,
        quantite_finale: parseFloat(executionForm.quantite_finale),
        lot_id_medicament: executionForm.lot_id_medicament || null
      });
      showToast('Prparation excute');
      setShowExecuterModal(false);
      setSelectedRecette(null);
      setExecutionForm({ patient_id: '', quantite_finale: 0, lot_id_medicament: '' });
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de l\'excution', 'error');
    }
  };

  const isAdmin = userRole === 'admin';

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>? Chargement...</div>;

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
      <h2 style={{ marginBottom: '20px' }}>?? Recettes de prparations magistrales</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div></div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ nom: '', description: '', ingredients: '', etapes: '' }); }}
          style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FaPlus /> Nouvelle recette
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>ID</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Nom</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Description</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Ingrdients</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>tapes</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recettes.map(r => (
              <tr key={r.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{r.id}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{r.nom}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{r.description || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {r.ingredients ? Object.entries(r.ingredients).map(([k, v]) => `${k}: ${v}`).join(', ') : '-'}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {r.etapes ? r.etapes.map((e, i) => <div key={i}>{i+1}. {e}</div>) : '-'}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  <button
                    onClick={() => { setEditId(r.id); setForm({ ...r, ingredients: JSON.stringify(r.ingredients || {}), etapes: (r.etapes || []).join('\n') }); setShowForm(true); }}
                    style={{ marginRight: '8px', background: '#eab308', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <FaEdit />
                  </button>
                  {/* ? Bouton supprimer visible uniquement pour admin */}
                  {isAdmin ? (
                    <button
                      onClick={() => handleDelete(r.id)}
                      style={{ marginRight: '8px', background: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                    >
                      <FaTrash />
                    </button>
                  ) : (
                    <span style={{ marginRight: '8px', color: '#94a3b8', fontSize: '14px' }} title="Rserv aux administrateurs">??</span>
                  )}
                  <button
                    onClick={() => { setSelectedRecette(r); setShowExecuterModal(true); }}
                    style={{ background: '#3b82f6', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                  >
                    <FaPlay /> Excuter
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Formulaire (inchang) */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '600px', maxWidth: '90%' }}>
            <h2 style={{ marginBottom: '16px' }}>{editId ? 'Modifier' : 'Ajouter'} une recette</h2>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Nom *" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows="2" style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <textarea placeholder="Ingrdients (format JSON, ex: { 'Paractamol': '500mg', 'Eau': '10ml' })" value={form.ingredients} onChange={e => setForm({...form, ingredients: e.target.value})} rows="3" style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <textarea placeholder="tapes (une par ligne)" value={form.etapes} onChange={e => setForm({...form, etapes: e.target.value})} rows="4" style={{ width: '100%', padding: '8px', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ backgroundColor: '#e5e7eb', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><FaTimes /> Annuler</button>
                <button type="submit" style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><FaSave /> Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Excuter (inchang) */}
      {showExecuterModal && selectedRecette && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '500px', maxWidth: '90%' }}>
            <h2 style={{ marginBottom: '16px' }}>Excuter la prparation : {selectedRecette.nom}</h2>
            <form onSubmit={handleExecuter}>
              <select value={executionForm.patient_id} onChange={e => setExecutionForm({...executionForm, patient_id: e.target.value})} required style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }}>
                <option value="">Patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>
              <input type="number" step="0.01" placeholder="Quantit finale" value={executionForm.quantite_finale} onChange={e => setExecutionForm({...executionForm, quantite_finale: e.target.value})} required style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <select value={executionForm.lot_id_medicament} onChange={e => setExecutionForm({...executionForm, lot_id_medicament: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '6px' }}>
                <option value="">Lot de mdicament (optionnel)</option>
                {medicaments.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowExecuterModal(false)} style={{ backgroundColor: '#e5e7eb', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><FaTimes /> Annuler</button>
                <button type="submit" style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><FaSave /> Excuter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecettesList;
