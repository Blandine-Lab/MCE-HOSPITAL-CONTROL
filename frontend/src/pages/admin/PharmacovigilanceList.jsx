import { useEffect, useState } from 'react';
import { FaPlus, FaSave, FaTimes } from 'react-icons/fa';
import api from '../../axios'; // ✅ Instance partagée

const PharmacovigilanceList = () => {
  const [declarations, setDeclarations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    patient_id: '',
    medicament_id: '',
    effet: '',
    description: '',
    severite: 'leger',
    date_survenue: ''
  });
  const [patients, setPatients] = useState([]);
  const [medicaments, setMedicaments] = useState([]);
  const [userRole, setUserRole] = useState(null); // ✅ Pour future utilisation

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

  const fetchDeclarations = async () => {
    try {
      const res = await api.get('/pharmacy/pharmacovigilance/effets-indesirables');
      setDeclarations(res.data);
    } catch (err) {
      console.error('Erreur fetchDeclarations:', err);
      showToast('Erreur chargement déclarations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      // Cette route renvoie les patients avec des champs first_name / last_name
      const res = await api.get('/admin/patients');
      setPatients(res.data);
    } catch (err) {
      console.error('Erreur fetchPatients:', err);
    }
  };

  const fetchMedicaments = async () => {
    try {
      const res = await api.get('/pharmacy/medicaments');
      setMedicaments(res.data);
    } catch (err) {
      console.error('Erreur fetchMedicaments:', err);
    }
  };

  useEffect(() => {
    fetchDeclarations();
    fetchPatients();
    fetchMedicaments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/pharmacy/pharmacovigilance/effets-indesirables', form);
      showToast('Déclaration enregistrée');
      setShowForm(false);
      setForm({ patient_id: '', medicament_id: '', effet: '', description: '', severite: 'leger', date_survenue: '' });
      fetchDeclarations();
    } catch (err) {
      console.error('Erreur handleSubmit:', err);
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>⏳ Chargement...</div>;
  }

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
      <h2 style={{ marginBottom: '20px' }}>⚠️ Pharmacovigilance �FC� Effets indésirables</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div></div>
        <button
          onClick={() => { setShowForm(true); setForm({ patient_id: '', medicament_id: '', effet: '', description: '', severite: 'leger', date_survenue: '' }); }}
          style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FaPlus /> Déclarer un effet
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>ID</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Patient</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Médicament</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Effet</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Sévérité</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Date de survenue</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Déclaré par</th>
            </tr>
          </thead>
          <tbody>
            {declarations.map(d => (
              <tr key={d.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{d.id}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{d.patient_id || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{d.medicament_nom || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{d.effet}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  <span style={{
                    backgroundColor: d.severite === 'grave' ? '#ef4444' : d.severite === 'modere' ? '#f59e0b' : '#10b981',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    fontSize: '12px'
                  }}>
                    {d.severite}
                  </span>
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{d.date_survenue ? new Date(d.date_survenue).toLocaleDateString() : '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{d.declare_par_login || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '500px', maxWidth: '90%' }}>
            <h2 style={{ marginBottom: '16px' }}>Déclarer un effet indésirable</h2>
            <form onSubmit={handleSubmit}>
              <select value={form.patient_id} onChange={e => setForm({...form, patient_id: e.target.value})} required style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }}>
                <option value="">Patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>
              <select value={form.medicament_id} onChange={e => setForm({...form, medicament_id: e.target.value})} required style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }}>
                <option value="">Médicament</option>
                {medicaments.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
              <input type="text" placeholder="Effet *" value={form.effet} onChange={e => setForm({...form, effet: e.target.value})} required style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows="3" style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }} />
              <select value={form.severite} onChange={e => setForm({...form, severite: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '6px' }}>
                <option value="leger">Léger</option>
                <option value="modere">Modéré</option>
                <option value="grave">Grave</option>
                <option value="mortel">Mortel</option>
              </select>
              <input type="date" placeholder="Date de survenue" value={form.date_survenue} onChange={e => setForm({...form, date_survenue: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '6px' }} />
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

export default PharmacovigilanceList;
