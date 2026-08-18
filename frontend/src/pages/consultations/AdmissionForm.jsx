import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../axios';

const AdmissionForm = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [lits, setLits] = useState([]);
  const [services, setServices] = useState([]);
  const [medecins, setMedecins] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAdmissions, setLoadingAdmissions] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    patient_id: '',
    lit_id: '',
    service_id: '',
    motif: '',
    medecin_referent_id: ''
  });

  useEffect(() => {
    Promise.all([
      api.get('/patients'),
      api.get('/consultations/lits/disponibles'),
      api.get('/consultations/services'),
      api.get('/consultations/medecins')
    ])
      .then(([patRes, litRes, servRes, medRes]) => {
        console.log('Services reçus :', servRes.data);
        setPatients(patRes.data.filter(p => p.statut !== 'sorti'));
        setLits(litRes.data);
        setServices(servRes.data);
        setMedecins(medRes.data);
        setLoading(false);
        setLoaded(true);
      })
      .catch(err => {
        console.error('Erreur de chargement des données :', err);
        setLoading(false);
        setToast('Impossible de charger les données. Veuillez réessayer.');
        setTimeout(() => setToast(null), 4000);
      });
  }, []);

  // Chargement de l'historique des admissions
  useEffect(() => {
    api.get('/consultations/admissions')
      .then(res => {
        // On s'attend à ce que l'API retourne les données avec jointures (patient_nom, date_sortie, mode_sortie, etc.)
        setAdmissions(res.data);
        setLoadingAdmissions(false);
      })
      .catch(err => {
        console.error('Erreur chargement admissions :', err);
        setLoadingAdmissions(false);
      });
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/consultations/admissions', form);
      setToast('✅ Patient admis avec succès. Séjour créé.');
      setTimeout(() => setToast(null), 3000);
      setTimeout(() => navigate('/patients'), 1500);
    } catch (err) {
      console.error('Erreur lors de l\'admission :', err);
      setToast('❌ Erreur lors de l\'admission. Vérifiez les données.');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f0fdf4',
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
    color: '#166534',
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
  const textareaStyle = {
    ...inputStyle,
    resize: 'vertical',
  };
  const buttonStyle = {
    backgroundColor: '#16a34a',
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
        <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #16a34a', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', backgroundColor: '#10b981', color: 'white',
          padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000, animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}
      <div style={innerStyle}>
        <h1 style={titleStyle}>🏥 Admission / Hospitalisation</h1>
        <div style={cardStyle}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Patient *</label>
                <select name="patient_id" value={form.patient_id} onChange={handleChange} style={inputStyle} required>
                  <option value="">Choisir un patient</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom} (IPP: {p.ipp})</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Lit disponible *</label>
                <select name="lit_id" value={form.lit_id} onChange={handleChange} style={inputStyle} required>
                  <option value="">Choisir un lit</option>
                  {lits.map(l => (
                    <option key={l.id} value={l.id}>
                      Lit {l.numero} - Chambre {l.chambre_nom} (Serv. {l.service_nom})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Service d'admission *</label>
                <select name="service_id" value={form.service_id} onChange={handleChange} style={inputStyle} required>
                  <option value="">Choisir un service</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Médecin référent</label>
                <select name="medecin_referent_id" value={form.medecin_referent_id} onChange={handleChange} style={inputStyle}>
                  <option value="">Choisir un médecin</option>
                  {medecins.map(m => <option key={m.id} value={m.id}>{m.nom} {m.prenom}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Motif d'admission</label>
              <textarea name="motif" value={form.motif} onChange={handleChange} rows="3" style={textareaStyle} placeholder="Raison de l'hospitalisation..."></textarea>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" style={cancelButtonStyle} onClick={() => navigate('/consultations')} onMouseEnter={e => e.target.style.backgroundColor = '#d1d5db'} onMouseLeave={e => e.target.style.backgroundColor = '#e5e7eb'}>
                Annuler
              </button>
              <button type="submit" style={buttonStyle} onMouseEnter={e => e.target.style.backgroundColor = '#15803d'} onMouseLeave={e => e.target.style.backgroundColor = '#16a34a'}>
                Admettre le patient
              </button>
            </div>
          </form>

          {/* 🔽 NOUVEAU : Section Historique des hospitalisations */}
          <div style={{ marginTop: '40px', borderTop: '2px solid #e5e7eb', paddingTop: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#166534', marginBottom: '16px' }}>
              📋 Historique des hospitalisations
            </h2>
            {loadingAdmissions ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>Chargement...</div>
            ) : admissions.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280' }}>Aucune admission enregistrée</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <th style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'left' }}>Patient</th>
                      <th style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'left' }}>Date entrée</th>
                      <th style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'left' }}>Motif</th>
                      <th style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'left' }}>Date sortie</th>
                      <th style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'left' }}>Mode sortie</th>
                      <th style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'left' }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissions.map(adm => (
                      <tr key={adm.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '8px', border: '1px solid #d1d5db' }}>{adm.patient_nom || 'Patient inconnu'}</td>
                        <td style={{ padding: '8px', border: '1px solid #d1d5db' }}>{adm.date_admission ? new Date(adm.date_admission).toLocaleDateString() : '-'}</td>
                        <td style={{ padding: '8px', border: '1px solid #d1d5db' }}>{adm.motif || '-'}</td>
                        <td style={{ padding: '8px', border: '1px solid #d1d5db' }}>{adm.date_sortie ? new Date(adm.date_sortie).toLocaleDateString() : '-'}</td>
                        <td style={{ padding: '8px', border: '1px solid #d1d5db' }}>{adm.mode_sortie || '-'}</td>
                        <td style={{ padding: '8px', border: '1px solid #d1d5db' }}>
                          {adm.date_sortie ? '✅ Sorti(e)' : '🟡 En cours'}
                        </td>
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

export default AdmissionForm;