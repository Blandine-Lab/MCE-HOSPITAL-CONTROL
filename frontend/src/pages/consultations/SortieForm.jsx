import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../axios';

const SortieForm = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [sorties, setSorties] = useState([]);        // ⬅️ NOUVEAU : historique des sorties
  const [loadingSorties, setLoadingSorties] = useState(true); // ⬅️ NOUVEAU
  const [form, setForm] = useState({
    patient_id: '',
    admission_id: '',
    mode_sortie: '',
    remarques: ''
  });
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  // Chargement des patients, admissions en cours, ET historique des sorties
  useEffect(() => {
    Promise.all([
      api.get('/consultations/patients/hospitalises'),
      api.get('/consultations/admissions/en_cours'),
      api.get('/consultations/sorties')             // ⬅️ NOUVEAU : appel pour l'historique
    ])
      .then(([patRes, admRes, sortiesRes]) => {
        setPatients(patRes.data);
        setAdmissions(admRes.data);
        setSorties(sortiesRes.data);                // ⬅️ NOUVEAU
        setLoadingSorties(false);                   // ⬅️ NOUVEAU
        setLoading(false);
        setLoaded(true);
      })
      .catch(err => {
        console.error('Erreur chargement :', err);
        setLoading(false);
        setLoadingSorties(false);
        showToast('Erreur de chargement des données', 'error');
      });
  }, []);

  const handlePatientChange = async (patientId) => {
    setForm({ ...form, patient_id: patientId, admission_id: '' });
    if (patientId) {
      try {
        const res = await api.get(`/consultations/admissions/patient/${patientId}`);
        setAdmissions(res.data);
      } catch (err) {
        console.error('Erreur chargement admissions du patient :', err);
        setAdmissions([]);
        showToast('Erreur chargement des admissions', 'error');
      }
    } else {
      try {
        const res = await api.get('/consultations/admissions/en_cours');
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
      showToast('✅ Sortie enregistrée avec succès', 'success');

      // Recharger l'historique des sorties après l'enregistrement
      try {
        const res = await api.get('/consultations/sorties');
        setSorties(res.data);
      } catch (err) {
        console.error('Erreur recharge historique sorties', err);
      }

      setTimeout(() => navigate('/patients'), 1500);
    } catch (err) {
      console.error('Erreur sortie :', err);
      const msg = err.response?.data?.error || 'Erreur lors de l\'enregistrement';
      showToast('❌ ' + msg, 'error');
    }
  };

  // Styles (inchangés)
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#fef2f2',
    padding: '32px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };
  const innerStyle = {
    maxWidth: '1000px',
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #dc2626', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

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
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}
      <div style={innerStyle}>
        <h1 style={titleStyle}>🚪 Sortie de patient</h1>
        <div style={cardStyle}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Patient hospitalisé *</label>
              <select
                value={form.patient_id}
                onChange={e => handlePatientChange(e.target.value)}
                style={selectStyle}
                required
              >
                <option value="">-- Sélectionner --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nom} {p.prenom} (Lit {p.lit_numero || p.lit_id || 'N/A'})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Admission *</label>
              <select
                value={form.admission_id}
                onChange={e => setForm({ ...form, admission_id: e.target.value })}
                style={selectStyle}
                required
              >
                <option value="">-- Choisir l'admission --</option>
                {admissions.map(a => (
                  <option key={a.id} value={a.id}>
                    Admission du {new Date(a.date_admission).toLocaleDateString()} ({a.service_nom || 'Service non spécifié'})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Mode de sortie *</label>
              <select
                value={form.mode_sortie}
                onChange={e => setForm({ ...form, mode_sortie: e.target.value })}
                style={selectStyle}
                required
              >
                <option value="">-- Choisir --</option>
                <option value="gueri">Guéri</option>
                <option value="transfert">Transfert</option>
                <option value="deces">Décès</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Remarques</label>
              <textarea
                value={form.remarques}
                onChange={e => setForm({ ...form, remarques: e.target.value })}
                rows="3"
                style={textareaStyle}
                placeholder="Informations complémentaires..."
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                style={cancelButtonStyle}
                onClick={() => navigate('/consultations')}
                onMouseEnter={e => e.target.style.backgroundColor = '#d1d5db'}
                onMouseLeave={e => e.target.style.backgroundColor = '#e5e7eb'}
              >
                Annuler
              </button>
              <button
                type="submit"
                style={buttonStyle}
                onMouseEnter={e => e.target.style.backgroundColor = '#b91c1c'}
                onMouseLeave={e => e.target.style.backgroundColor = '#dc2626'}
              >
                Enregistrer la sortie
              </button>
            </div>
          </form>

          {/* 🔽 NOUVEAU : Section Historique des sorties */}
          <div style={{ marginTop: '40px', borderTop: '2px solid #e5e7eb', paddingTop: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#991b1b', marginBottom: '16px' }}>
              📜 Historique des sorties
            </h2>
            {loadingSorties ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>Chargement...</div>
            ) : sorties.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280' }}>Aucune sortie enregistrée</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <th style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'left' }}>Patient</th>
                      <th style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'left' }}>Date sortie</th>
                      <th style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'left' }}>Mode</th>
                      <th style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'left' }}>Remarques</th>
                      <th style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'left' }}>Admission ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorties.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '8px', border: '1px solid #d1d5db' }}>{s.patient_nom || 'Patient inconnu'}</td>
                        <td style={{ padding: '8px', border: '1px solid #d1d5db' }}>{s.date_sortie ? new Date(s.date_sortie).toLocaleDateString() : '-'}</td>
                        <td style={{ padding: '8px', border: '1px solid #d1d5db' }}>{s.mode_sortie || '-'}</td>
                        <td style={{ padding: '8px', border: '1px solid #d1d5db' }}>{s.remarques || '-'}</td>
                        <td style={{ padding: '8px', border: '1px solid #d1d5db' }}>{s.admission_id || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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