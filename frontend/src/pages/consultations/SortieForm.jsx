import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaUser, FaCalendar, FaComment } from 'react-icons/fa';
import api from '../../axios'; // ? Utilisation de l'instance partage

const SortieForm = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [form, setForm] = useState({ patient_id: '', admission_id: '', mode_sortie: '', remarques: '' });
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/consultations/patients/hospitalises'), // ? Suppression de l'URL absolue
      api.get('/consultations/admissions/en_cours')
    ]).then(([patRes, admRes]) => {
      setPatients(patRes.data);
      setAdmissions(admRes.data);
      setLoading(false);
      setLoaded(true);
    }).catch(err => {
      console.error(err);
      setLoading(false);
      setToast('Erreur chargement des donnes');
      setTimeout(() => setToast(null), 3000);
    });
  }, []);

  const handlePatientChange = async (patientId) => {
    setForm({ ...form, patient_id: patientId, admission_id: '' });
    if (patientId) {
      try {
        const res = await api.get(`/consultations/admissions/patient/${patientId}`);
        setAdmissions(res.data);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/consultations/sorties', form);
      setToast('Sortie enregistre avec succs');
      setTimeout(() => setToast(null), 3000);
      setTimeout(() => navigate('/patients'), 1500);
    } catch (err) {
      setToast('Erreur lors de l?FC?enregistrement');
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Styles (inchangs)
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#fef2f2',
    padding: '32px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };
  const innerStyle = {
    maxWidth: '800px',
    margin: '0 auto',
  };
  const titleStyle = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: '24px',
    textAlign: 'center',
    opacity: loaded ? 1 : 0,
    transform: loaded ? 'translateY(0)' : 'translateY(-20px)',
    transition: 'all 0.5s',
  };
  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  };
  const labelStyle = {
    display: 'block',
    fontWeight: '500',
    marginBottom: '6px',
    color: '#374151',
  };
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  };
  const selectStyle = inputStyle;
  const textareaStyle = {
    ...inputStyle,
    resize: 'vertical',
  };
  const buttonStyle = {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };
  const cancelButtonStyle = {
    backgroundColor: '#e5e7eb',
    color: '#374151',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginRight: '12px',
    transition: 'background-color 0.2s',
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #dc2626', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
    </div>
  );

  return (
    <div style={containerStyle}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', backgroundColor: toast.includes('succs') ? '#10b981' : '#ef4444', color: 'white',
          padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 1000, animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}
      <div style={innerStyle}>
        <h1 style={titleStyle}>?? Sortie de patient</h1>
        <div style={cardStyle}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Patient hospitalis *</label>
              <select value={form.patient_id} onChange={e => handlePatientChange(e.target.value)} style={selectStyle} required>
                <option value="">-- Slectionner --</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom} (Lit {p.lit_numero})</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Admission *</label>
              <select value={form.admission_id} onChange={e => setForm({...form, admission_id: e.target.value})} style={selectStyle} required>
                <option value="">-- Choisir l'admission --</option>
                {admissions.map(a => <option key={a.id} value={a.id}>Admission du {new Date(a.date_admission).toLocaleDateString()} ({a.service_nom})</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Mode de sortie *</label>
              <select value={form.mode_sortie} onChange={e => setForm({...form, mode_sortie: e.target.value})} style={selectStyle} required>
                <option value="">-- Choisir --</option>
                <option value="gueri">Guri</option>
                <option value="transfert">Transfr</option>
                <option value="deces">Dcs</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Remarques</label>
              <textarea value={form.remarques} onChange={e => setForm({...form, remarques: e.target.value})} rows="3" style={textareaStyle} placeholder="Informations complmentaires..."></textarea>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" style={cancelButtonStyle} onClick={() => navigate('/consultations')} onMouseEnter={e => e.target.style.backgroundColor = '#d1d5db'} onMouseLeave={e => e.target.style.backgroundColor = '#e5e7eb'}>Annuler</button>
              <button type="submit" style={buttonStyle} onMouseEnter={e => e.target.style.backgroundColor = '#b91c1c'} onMouseLeave={e => e.target.style.backgroundColor = '#dc2626'}>Enregistrer la sortie</button>
            </div>
          </form>
        </div>
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

export default SortieForm;
