import { useEffect, useState } from 'react';
import api from '../../axios';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

const SallesList = () => {
  const [salles, setSalles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '', numero: '', disponible: true });

  const loadSalles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bloc/salles');
      setSalles(res.data || []);
      setLoaded(true);
    } catch (err) {
      setToast('Erreur chargement salles');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalles();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/bloc/salles/${editing}`, form);
        setToast('Salle modifie');
      } else {
        await api.post('/bloc/salles', form);
        setToast('Salle ajoute');
      }
      setTimeout(() => setToast(null), 3000);
      setEditing(null);
      setForm({ nom: '', numero: '', disponible: true });
      loadSalles();
    } catch (err) {
      setToast('Erreur : ' + (err.response?.data?.error || err.message));
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cette salle ?')) {
      try {
        await api.delete(`/bloc/salles/${id}`);
        setToast('Salle supprime');
        setTimeout(() => setToast(null), 3000);
        loadSalles();
      } catch (err) {
        setToast('Erreur : ' + (err.response?.data?.error || err.message));
        setTimeout(() => setToast(null), 3000);
      }
    }
  };

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    opacity: loaded ? 1 : 0,
    transform: loaded ? 'translateY(0)' : 'translateY(20px)',
    transition: 'all 0.5s 0.2s',
  };

  const labelStyle = {
    display: 'block',
    fontWeight: '500',
    marginBottom: '4px',
    color: '#374151',
    fontSize: '14px',
  };

  const inputStyle = {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
      <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #2563eb', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
    </div>
  );

  return (
    <div style={cardStyle}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', backgroundColor: '#10b981', color: 'white',
          padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000, animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}

      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: '0 0 20px 0' }}>?? Gestion des salles</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', alignItems: 'flex-end' }}>
        <div>
          <label style={labelStyle}>Nom *</label>
          <input value={form.nom} onChange={(e) => setForm({...form, nom: e.target.value})} placeholder="Nom" required style={{ ...inputStyle, width: '180px' }} />
        </div>
        <div>
          <label style={labelStyle}>Numro</label>
          <input value={form.numero} onChange={(e) => setForm({...form, numero: e.target.value})} placeholder="Numro" style={{ ...inputStyle, width: '120px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '4px' }}>
          <input type="checkbox" checked={form.disponible} onChange={(e) => setForm({...form, disponible: e.target.checked})} />
          <span style={{ fontSize: '14px', color: '#374151' }}>Disponible</span>
        </div>
        <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
          {editing ? 'Modifier' : 'Ajouter'}
        </button>
        {editing && (
          <button onClick={() => { setEditing(null); setForm({ nom: '', numero: '', disponible: true }); }} type="button" style={{ backgroundColor: '#6b7280', color: 'white', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
            Annuler
          </button>
        )}
      </form>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Nom</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Numro</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Disponible</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Interventions prvues</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {salles.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Aucune salle enregistre</td></tr>
            ) : (
              salles.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '12px' }}><strong>{s.nom}</strong></td>
                  <td style={{ padding: '12px' }}>{s.numero}</td>
                  <td style={{ padding: '12px' }}>{s.disponible ? <span style={{ color: '#10b981' }}>? Disponible</span> : <span style={{ color: '#ef4444' }}>? Indisponible</span>}</td>
                  <td style={{ padding: '12px' }}>{s.interventions_prevues || 0}</td>
                  <td style={{ padding: '12px' }}>
                    <FaEdit style={{ color: '#2563eb', marginRight: '12px', cursor: 'pointer' }} onClick={() => { setEditing(s.id); setForm({ nom: s.nom, numero: s.numero, disponible: s.disponible }); }} />
                    <FaTrash style={{ color: '#ef4444', cursor: 'pointer' }} onClick={() => handleDelete(s.id)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SallesList;
