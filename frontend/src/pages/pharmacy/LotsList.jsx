import { useEffect, useState } from 'react';
import api from '../../axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FaPlus, FaTrash } from 'react-icons/fa';

const LotsList = () => {
  const [searchParams] = useSearchParams();
  const medicamentId = searchParams.get('medicamentId');
  const navigate = useNavigate();
  const [medicament, setMedicament] = useState(null);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ numero_lot: '', date_peremption: '', quantite: 1 });
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [userRole, setUserRole] = useState(null);

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

  useEffect(() => {
    if (!medicamentId) {
      navigate('/medicaments');
      return;
    }
    fetchMedicament();
    fetchLots();
  }, [medicamentId]);

  const fetchMedicament = async () => {
    try {
      const res = await api.get('/pharmacy/medicaments');
      const found = res.data.find(m => m.id == medicamentId);
      setMedicament(found);
    } catch (err) {
      console.error('Erreur chargement médicament:', err);
    }
  };

  const fetchLots = async () => {
    try {
      const res = await api.get(`/pharmacy/lots/disponibles/${medicamentId}`);
      setLots(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Erreur chargement lots:', err);
      showToast('Erreur chargement lots', 'error');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/pharmacy/lots', {
        medicament_id: medicamentId,
        numero_lot: form.numero_lot,
        date_peremption: form.date_peremption,
        quantite: form.quantite
      });
      setShowForm(false);
      setForm({ numero_lot: '', date_peremption: '', quantite: 1 });
      fetchLots();
      showToast('✅ Lot ajouté');
    } catch (err) {
      console.error('Erreur ajout lot:', err);
      showToast('❌ Erreur lors de l\'ajout du lot', 'error');
    }
  };

  // ✅ handleDelete avec gestion 403
  const handleDelete = async (lotId) => {
    if (!window.confirm('⚠️ Supprimer définitivement ce lot ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/pharmacy/lots/${lotId}`);
      setLots(lots.filter(l => l.id !== lotId));
      showToast('Lot supprimé avec succès');
    } catch (err) {
      console.error('Erreur suppression lot:', err);
      if (err.response?.status === 403) {
        showToast('❌ Seul un administrateur peut supprimer un lot.', 'error');
      } else {
        showToast('❌ Erreur lors de la suppression : ' + (err.response?.data?.error || err.message), 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

  const containerStyle = { padding: '20px', fontFamily: 'system-ui' };
  const cardStyle = { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' };
  const tableStyle = { width: '100%', borderCollapse: 'collapse' };
  const thStyle = { backgroundColor: '#f3f4f6', padding: '10px', textAlign: 'left' };
  const tdStyle = { padding: '10px', borderBottom: '1px solid #e5e7eb' };

  if (loading) return <div>⏳ Chargement...</div>;
  if (!medicament) return <div>Médicament non trouvé</div>;

  return (
    <div style={containerStyle}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1>Gestion des lots - {medicament.nom}</h1>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2>Liste des lots</h2>
            <button
              onClick={() => setShowForm(true)}
              style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              <FaPlus /> Ajouter un lot
            </button>
          </div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Numéro lot</th>
                <th style={thStyle}>Date péremption</th>
                <th style={thStyle}>Quantité</th>
                <th style={thStyle}>Stock actuel</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lots.map(l => (
                <tr key={l.id}>
                  <td style={tdStyle}>{l.numero_lot}</td>
                  <td style={tdStyle}>{new Date(l.date_peremption).toLocaleDateString()}</td>
                  <td style={tdStyle}>{l.quantite}</td>
                  <td style={tdStyle}>{l.stock_actuel}</td>
                  <td style={tdStyle}>
                    {isAdmin ? (
                      <button
                        onClick={() => handleDelete(l.id)}
                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Supprimer définitivement (admin)"
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
        <button
          onClick={() => navigate('/medicaments')}
          style={{ marginTop: '20px', backgroundColor: '#6b7280', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Retour à la liste
        </button>
      </div>

      {showForm && (
        <div style={{
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
        }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '400px' }}>
            <h2>Ajouter un lot</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Numéro de lot"
                value={form.numero_lot}
                onChange={e => setForm({...form, numero_lot: e.target.value})}
                required
                style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }}
              />
              <input
                type="date"
                placeholder="Date de péremption"
                value={form.date_peremption}
                onChange={e => setForm({...form, date_peremption: e.target.value})}
                required
                style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }}
              />
              <input
                type="number"
                placeholder="Quantité"
                value={form.quantite}
                onChange={e => setForm({...form, quantite: parseInt(e.target.value) || 1})}
                required
                min="1"
                style={{ width: '100%', padding: '8px', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '6px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ backgroundColor: '#e5e7eb', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Annuler</button>
                <button type="submit" style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Ajouter</button>
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

export default LotsList;