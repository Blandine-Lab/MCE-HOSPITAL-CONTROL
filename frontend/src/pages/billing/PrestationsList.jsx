import { useEffect, useState } from 'react';
import api from '../../axios'; // ✅ Instance avec intercepteur
import { FaEdit, FaTrash, FaPlus, FaSave, FaTimes } from 'react-icons/fa';

const PrestationsList = () => {
  const [prestations, setPrestations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ code: '', libelle: '', prix_unitaire: '', categorie: '' });
  const [toast, setToast] = useState(null);
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

  useEffect(() => {
    fetchPrestations();
  }, []);

  const fetchPrestations = async () => {
    try {
      const res = await api.get('/billing/prestations');
      setPrestations(res.data);
      setLoading(false);
    } catch (err) {
      console.error('❌ Erreur chargement prestations:', err);
      setToast('❌ Erreur chargement');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/billing/prestations/${editingId}`, form);
        setToast('✅ Prestation modifiée');
      } else {
        await api.post('/billing/prestations', form);
        setToast('✅ Prestation ajoutée');
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ code: '', libelle: '', prix_unitaire: '', categorie: '' });
      fetchPrestations();
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      console.error('❌ Erreur:', err);
      setToast('❌ Erreur lors de l\'enregistrement');
      setTimeout(() => setToast(null), 3000);
    }
  };

  // ✅ handleDelete avec gestion 403
  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Supprimer définitivement cette prestation ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/billing/prestations/${id}`);
      fetchPrestations();
      setToast('✅ Prestation supprimée');
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      if (err.response?.status === 403) {
        setToast('❌ Seul un administrateur peut supprimer une prestation.');
      } else {
        setToast('❌ Erreur (peut-être utilisée dans des factures)');
      }
      setTimeout(() => setToast(null), 3000);
    }
  };

  const isAdmin = userRole === 'admin';

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    padding: '32px',
    fontFamily: 'system-ui'
  };
  const innerStyle = { maxWidth: '1200px', margin: '0 auto' };
  const titleStyle = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e3a8a',
    textAlign: 'center',
    marginBottom: '24px'
  };
  const btnPrimaryStyle = {
    backgroundColor: '#2563eb',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    marginBottom: '20px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px'
  };
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  };
  const thStyle = {
    backgroundColor: '#1e3a8a',
    color: 'white',
    padding: '12px',
    textAlign: 'left'
  };
  const tdStyle = {
    padding: '10px',
    borderBottom: '1px solid #e5e7eb'
  };
  const modalOverlay = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  };
  const modalContent = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    width: '500px',
    maxWidth: '90%'
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>⏳ Chargement...</div>;

  return (
    <div style={containerStyle}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toast.includes('✅') ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          zIndex: 1001
        }}>
          {toast}
        </div>
      )}
      <div style={innerStyle}>
        <h1 style={titleStyle}>Gestion des prestations (CCAM, NGAP...)</h1>
        <button style={btnPrimaryStyle} onClick={() => { setShowForm(true); setEditingId(null); setForm({ code: '', libelle: '', prix_unitaire: '', categorie: '' }); }}>
          <FaPlus /> Nouvelle prestation
        </button>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Libellé</th>
                <th style={thStyle}>Prix (FC)</th>
                <th style={thStyle}>Catégorie</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {prestations.map(p => (
                <tr key={p.id}>
                  <td style={tdStyle}>{p.code}</td>
                  <td style={tdStyle}>{p.libelle}</td>
                  <td style={tdStyle}>{parseFloat(p.prix_unitaire).toFixed(2)}</td>
                  <td style={tdStyle}>{p.categorie || '-'}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => { setEditingId(p.id); setForm(p); setShowForm(true); }}
                      style={{ marginRight: '8px', background: '#eab308', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      <FaEdit />
                    </button>
                    {/* ✅ Bouton supprimer visible uniquement pour admin */}
                    {isAdmin ? (
                      <button
                        onClick={() => handleDelete(p.id)}
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

      {showForm && (
        <div style={modalOverlay} onClick={() => setShowForm(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>{editingId ? 'Modifier' : 'Ajouter'} une prestation</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Code *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm({...form, code: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Libellé *</label>
                <input
                  type="text"
                  value={form.libelle}
                  onChange={e => setForm({...form, libelle: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Prix unitaire (FC) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.prix_unitaire}
                  onChange={e => setForm({...form, prix_unitaire: parseFloat(e.target.value)})}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Catégorie</label>
                <input
                  type="text"
                  value={form.categorie}
                  onChange={e => setForm({...form, categorie: e.target.value})}
                  placeholder="ex: consultation, examen, séjour..."
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ backgroundColor: '#e5e7eb', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  <FaTimes /> Annuler
                </button>
                <button type="submit" style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  <FaSave /> Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrestationsList;
