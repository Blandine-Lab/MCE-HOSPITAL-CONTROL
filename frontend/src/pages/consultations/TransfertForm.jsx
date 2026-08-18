import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaExchangeAlt, FaBed, FaStethoscope, FaClipboardList, FaSave, FaHistory } from 'react-icons/fa';
import api from '../../axios';

const TransfertForm = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [litsDispo, setLitsDispo] = useState([]);
  const [services, setServices] = useState([]);
  const [transferts, setTransferts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTransferts, setLoadingTransferts] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [form, setForm] = useState({
    patient_id: '',
    nouveau_lit_id: '',
    nouveau_service_id: '',
    motif: ''
  });

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  const loadTransferts = async () => {
    try {
      const res = await api.get('/consultations/transferts');
      setTransferts(res.data);
    } catch (err) {
      console.error('Erreur chargement historique des transferts:', err);
      showToast('Erreur chargement historique', 'error');
    } finally {
      setLoadingTransferts(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get('/consultations/patients/hospitalises'),
      api.get('/consultations/lits/disponibles'),
      api.get('/consultations/services'),
      api.get('/consultations/transferts')
    ])
      .then(([patRes, litRes, servRes, transRes]) => {
        setPatients(patRes.data);
        setLitsDispo(litRes.data);
        setServices(servRes.data);
        setTransferts(transRes.data);
        setLoading(false);
        setLoaded(true);
        setLoadingTransferts(false);
      })
      .catch(err => {
        console.error('Erreur chargement :', err);
        setLoading(false);
        setLoadingTransferts(false);
        showToast('Erreur de chargement des données', 'error');
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/consultations/transferts', form);
      showToast('✅ Transfert effectué avec succès', 'success');
      // Recharger l'historique après un transfert réussi
      await loadTransferts();
      // Réinitialiser le formulaire (sauf patient)
      setForm({
        ...form,
        nouveau_lit_id: '',
        nouveau_service_id: '',
        motif: ''
      });
      setTimeout(() => navigate('/patients'), 1500);
    } catch (err) {
      console.error('Erreur transfert :', err);
      const msg = err.response?.data?.error || 'Erreur lors du transfert';
      showToast('❌ ' + msg, 'error');
    }
  };

  // Styles
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f0f9ff',
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
    color: '#1e3a8a',
    marginBottom: '24px',
    textAlign: 'center',
    opacity: loaded ? 1 : 0,
    transform: loaded ? 'translateY(0)' : 'translateY(-20px)',
    transition: 'all 0.5s',
  };
  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '32px',
    marginBottom: '32px',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  };
  const labelStyle = {
    display: 'block',
    fontWeight: '500',
    marginBottom: '8px',
    color: '#1f2937',
    fontSize: '14px',
  };
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: 'white',
  };
  const textareaStyle = {
    ...inputStyle,
    resize: 'vertical',
  };
  const buttonStyle = {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '12px',
    fontWeight: 'bold',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.1s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  };
  const cancelButtonStyle = {
    backgroundColor: '#e5e7eb',
    color: '#374151',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '12px',
    fontWeight: 'bold',
    fontSize: '16px',
    cursor: 'pointer',
    marginRight: '12px',
    transition: 'background-color 0.2s',
  };
  const tableContainerStyle = {
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  };
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  };
  const thStyle = {
    backgroundColor: '#f1f5f9',
    padding: '12px 8px',
    textAlign: 'left',
    borderBottom: '2px solid #e2e8f0',
    fontWeight: 'bold',
  };
  const tdStyle = {
    padding: '10px 8px',
    borderBottom: '1px solid #e2e8f0',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3b82f6', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
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
        <h1 style={titleStyle}>🔄 Transfert de patient</h1>

        {/* Formulaire */}
        <div style={cardStyle}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Patient hospitalisé *</label>
              <select
                value={form.patient_id}
                onChange={e => setForm({ ...form, patient_id: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="">-- Sélectionner un patient --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nom} {p.prenom} (Lit {p.lit_numero || p.lit_id || 'N/A'} - {p.chambre_nom || 'Sans chambre'})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Nouveau lit *</label>
              <select
                value={form.nouveau_lit_id}
                onChange={e => setForm({ ...form, nouveau_lit_id: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="">-- Choisir un lit disponible --</option>
                {litsDispo.map(l => (
                  <option key={l.id} value={l.id}>
                    Lit {l.numero} - Chambre {l.chambre_nom || l.chambre} (Service {l.service_nom})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Nouveau service *</label>
              <select
                value={form.nouveau_service_id}
                onChange={e => setForm({ ...form, nouveau_service_id: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="">-- Choisir un service --</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Motif du transfert</label>
              <textarea
                value={form.motif}
                onChange={e => setForm({ ...form, motif: e.target.value })}
                rows="3"
                style={textareaStyle}
                placeholder="Raison du changement de lit/service..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                style={cancelButtonStyle}
                onClick={() => navigate('/consultations')}
              >
                Annuler
              </button>
              <button
                type="submit"
                style={buttonStyle}
              >
                <FaExchangeAlt /> Transférer
              </button>
            </div>
          </form>
        </div>

        {/* Historique des transferts */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaHistory /> Historique des transferts
          </h2>
          {loadingTransferts ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>Chargement...</div>
          ) : transferts.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280' }}>Aucun transfert enregistré</div>
          ) : (
            <div style={tableContainerStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Patient</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Ancien lit</th>
                    <th style={thStyle}>Nouveau lit</th>
                    <th style={thStyle}>Ancien service</th>
                    <th style={thStyle}>Nouveau service</th>
                    <th style={thStyle}>Motif</th>
                  </tr>
                </thead>
                <tbody>
                  {transferts.map((t, idx) => (
                    <tr key={t.admission_id || idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={tdStyle}>{t.patient_nom || 'N/A'}</td>
                      <td style={tdStyle}>{t.date_transfert ? new Date(t.date_transfert).toLocaleDateString('fr-FR') : 'N/A'}</td>
                      <td style={tdStyle}>{t.ancien_lit_numero || 'N/A'}</td>
                      <td style={tdStyle}>{t.nouveau_lit_numero || 'N/A'}</td>
                      <td style={tdStyle}>{t.ancien_service_nom || 'N/A'}</td>
                      <td style={tdStyle}>{t.nouveau_service_nom || 'N/A'}</td>
                      <td style={tdStyle}>{t.motif || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default TransfertForm;