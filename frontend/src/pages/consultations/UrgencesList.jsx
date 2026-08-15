import { useEffect, useState } from 'react';
import api from '../../axios';

const UrgencesList = () => {
  const [urgences, setUrgences] = useState([]);
  const [patients, setPatients] = useState([]);
  const [newUrgence, setNewUrgence] = useState({
    patient_id: '',
    niveau: 'Jaune',
    priorite: 3,
    motif: ''
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

  const fetchUrgences = async () => {
    try {
      const res = await api.get('/consultations/urgences');
      console.log('🔍 [fetchUrgences] Données reçues :', res.data);
      setUrgences(res.data);
    } catch (err) {
      console.error('Erreur fetch urgences:', err);
      showToast('Erreur chargement des urgences', 'error');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [urgRes, patRes] = await Promise.all([
          api.get('/consultations/urgences'),
          api.get('/patients')
        ]);
        console.log('🔍 [useEffect] Urgences reçues :', urgRes.data);
        console.log('🔍 [useEffect] Patients reçus :', patRes.data);
        setUrgences(urgRes.data);
        setPatients(patRes.data);
        setLoading(false);
        setLoaded(true);
      } catch (err) {
        console.error('Erreur chargement données:', err);
        showToast('Erreur de chargement des données', 'error');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();

    // Vérification côté frontend avant envoi
    const patientIdNum = Number(newUrgence.patient_id);
    if (!newUrgence.patient_id || isNaN(patientIdNum) || patientIdNum <= 0) {
      showToast('Veuillez sélectionner un patient valide.', 'error');
      return;
    }

    console.log('📤 Données envoyées :', newUrgence);

    try {
      await api.post('/consultations/urgences', {
        ...newUrgence,
        patient_id: patientIdNum // on envoie un nombre
      });
      setNewUrgence({ patient_id: '', niveau: 'Jaune', priorite: 3, motif: '' });
      await fetchUrgences();
      showToast('Urgence ajoutée avec succès');
    } catch (err) {
      console.error('Erreur ajout urgence:', err);
      const msg = err.response?.data?.error || 'Erreur lors de l\'ajout';
      showToast('❌ ' + msg, 'error');
    }
  };

  const handleTakeCharge = async (id) => {
    try {
      await api.put(`/consultations/urgences/${id}`, { statut: 'pris_en_charge' });
      await fetchUrgences();
      showToast('Patient pris en charge');
    } catch (err) {
      console.error('Erreur prise en charge:', err);
      const msg = err.response?.data?.error || 'Erreur lors de la prise en charge';
      showToast('❌ ' + msg, 'error');
    }
  };

  const getColor = (priorite) => {
    if (priorite === 1) return '#fee2e2';
    if (priorite === 2) return '#ffedd5';
    if (priorite === 3) return '#fef9c3';
    return '#dcfce7';
  };

  // Styles (inchangés)
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#fef2f2',
    padding: '32px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };
  const innerStyle = {
    maxWidth: '1400px',
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
  const formStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '32px',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    alignItems: 'flex-end',
  };
  const inputStyle = {
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    minWidth: '150px',
    flex: '1 1 150px',
  };
  const selectStyle = { ...inputStyle };
  const buttonStyle = {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    flex: '0 0 auto',
  };
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  };
  const thStyle = {
    backgroundColor: '#7f1d1d',
    color: 'white',
    padding: '12px 8px',
    textAlign: 'left',
    border: '1px solid #991b1b',
  };
  const tdStyle = {
    padding: '10px 8px',
    border: '1px solid #e2e8f0',
  };
  const badgeStyle = (niveau) => {
    const colors = {
      Rouge: { bg: '#fee2e2', text: '#991b1b' },
      Orange: { bg: '#ffedd5', text: '#9a3412' },
      Jaune: { bg: '#fef9c3', text: '#854d0e' },
      Vert: { bg: '#dcfce7', text: '#166534' },
    };
    const c = colors[niveau] || colors.Jaune;
    return { backgroundColor: c.bg, color: c.text, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block' };
  };
  const actionButtonStyle = {
    backgroundColor: '#16a34a',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
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
        <h1 style={titleStyle}>🚨 Service des urgences</h1>
        <form onSubmit={handleAdd} style={formStyle}>
          <select
            value={newUrgence.patient_id}
            onChange={e => setNewUrgence({ ...newUrgence, patient_id: e.target.value })}
            style={selectStyle}
            required
          >
            <option value="">-- Sélectionner un patient --</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>
            ))}
          </select>
          <select
            value={newUrgence.niveau}
            onChange={e => {
              const niveau = e.target.value;
              const priorite = niveau === 'Rouge' ? 1 : niveau === 'Orange' ? 2 : niveau === 'Jaune' ? 3 : 4;
              setNewUrgence({ ...newUrgence, niveau, priorite });
            }}
            style={selectStyle}
          >
            <option>Rouge</option>
            <option>Orange</option>
            <option>Jaune</option>
            <option>Vert</option>
          </select>
          <input
            type="text"
            placeholder="Motif"
            value={newUrgence.motif}
            onChange={e => setNewUrgence({ ...newUrgence, motif: e.target.value })}
            style={inputStyle}
          />
          <button
            type="submit"
            style={buttonStyle}
            onMouseEnter={e => e.target.style.backgroundColor = '#b91c1c'}
            onMouseLeave={e => e.target.style.backgroundColor = '#dc2626'}
          >
            ➕ Ajouter urgence
          </button>
        </form>

        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Priorité</th>
                <th style={thStyle}>Patient</th>
                <th style={thStyle}>Niveau</th>
                <th style={thStyle}>Heure arrivée</th>
                <th style={thStyle}>Motif</th>
                <th style={thStyle}>Statut</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {urgences.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    Aucune urgence enregistrée.
                  </td>
                </tr>
              ) : (
                urgences.map((u, idx) => (
                  <tr
                    key={u.id}
                    style={{
                      backgroundColor: idx % 2 === 0 ? getColor(u.priorite) : '#ffffff',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? getColor(u.priorite) : '#ffffff'}
                  >
                    <td style={tdStyle}>{u.priorite}</td>
                    <td style={tdStyle}>
                      {u.patient_nom && u.patient_prenom
                        ? `${u.patient_nom} ${u.patient_prenom}`
                        : u.patient_nom || u.patient_prenom || 'Inconnu'}
                    </td>
                    <td style={tdStyle}>
                      <span style={badgeStyle(u.niveau)}>{u.niveau}</span>
                    </td>
                    <td style={tdStyle}>
                      {new Date(u.heure_arrivee).toLocaleString()}
                    </td>
                    <td style={tdStyle}>{u.motif || '-'}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: u.statut === 'en_attente' ? '#fef9c3' : '#dcfce7',
                        color: u.statut === 'en_attente' ? '#854d0e' : '#166534'
                      }}>
                        {u.statut === 'en_attente' ? 'En attente' : 'Pris en charge'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {u.statut === 'en_attente' && (
                        <button
                          onClick={() => handleTakeCharge(u.id)}
                          style={actionButtonStyle}
                          onMouseEnter={e => e.target.style.opacity = 0.8}
                          onMouseLeave={e => e.target.style.opacity = 1}
                        >
                          Prendre en charge
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

export default UrgencesList;