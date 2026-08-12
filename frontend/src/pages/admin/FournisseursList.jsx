import { useEffect, useState } from 'react';
import { FaEdit, FaTrash, FaPlus, FaSave, FaTimes } from 'react-icons/fa';
import api from '../../axios'; // ✅ Instance partagée (authentification + refresh)

const FournisseursList = () => {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', contact_email: '', telephone: '', adresse: '', actif: true });
  const [editId, setEditId] = useState(null);
  const [userRole, setUserRole] = useState(null); // ✅ Rôle de l'utilisateur

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

  const fetchFournisseurs = async () => {
    try {
      const res = await api.get('/pharmacy/fournisseurs');
      setFournisseurs(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      showToast('Erreur chargement fournisseurs', 'error');
    }
  };

  useEffect(() => {
    fetchFournisseurs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/pharmacy/fournisseurs/${editId}`, form);
        showToast('Fournisseur modifié');
      } else {
        await api.post('/pharmacy/fournisseurs', form);
        showToast('Fournisseur ajouté');
      }
      setShowForm(false);
      setEditId(null);
      setForm({ nom: '', contact_email: '', telephone: '', adresse: '', actif: true });
      fetchFournisseurs();
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  // ✅ handleDelete avec gestion 403
  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Supprimer définitivement ce fournisseur ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/pharmacy/fournisseurs/${id}`);
      fetchFournisseurs();
      showToast('Fournisseur supprimé');
    } catch (err) {
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut supprimer un fournisseur.', 'error');
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f0fdf4',
    padding: '32px',
    fontFamily: 'system-ui'
  };
  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '24px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  };
  const tableStyle = { width: '100%', borderCollapse: 'collapse' };
  const thStyle = { backgroundColor: '#e5e7eb', padding: '12px', textAlign: 'left' };
  const tdStyle = { padding: '10px', borderBottom: '1px solid #e5e7eb' };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Chargement...</div>;

  return (
    <div style={containerStyle}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px',
          backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
          color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 1000
        }}>
          {toast}
        </div>
      )}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#166534', marginBottom: '24px' }}>
          🏢 Gestion des Fournisseurs
        </h1>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2>Liste des fournisseurs</h2>
            <button
              onClick={() => { setShowForm(true); setEditId(null); setForm({ nom: '', contact_email: '', telephone: '', adresse: '', actif: true }); }}
              style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FaPlus /> Nouveau
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Nom</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Téléphone</th>
                  <th style={thStyle}>Adresse</th>
                  <th style={thStyle}>Actif</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {fournisseurs.map(f => (
                  <tr key={f.id}>
                    <td style={tdStyle}>{f.id}</td>
                    <td style={tdStyle}>{f.nom}</td>
                    <td style={tdStyle}>{f.contact_email || '-'}</td>
                    <td style={tdStyle}>{f.telephone || '-'}</td>
                    <td style={tdStyle}>{f.adresse || '-'}</td>
                    <td style={tdStyle}>{f.actif ? '✅' : '❌'}</td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => { setEditId(f.id); setForm(f); setShowForm(true); }}
                        style={{ marginRight: '8px', background: '#eab308', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        <FaEdit />
                      </button>
                      {/* ✅ Bouton supprimer visible uniquement pour admin */}
                      {isAdmin ? (
                        <button
                          onClick={() => handleDelete(f.id)}
                          style={{ background: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                        >
                          <FaTrash />
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '14px' }} title="Réservé aux administrateurs">🔒</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Formulaire (inchangé) */}
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

export default FournisseursList;
