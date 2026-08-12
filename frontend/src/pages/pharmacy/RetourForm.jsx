import { useEffect, useState } from 'react';
import api from '../../axios'; // ? Instance avec intercepteur
import { useNavigate } from 'react-router-dom';
import { FaUndoAlt, FaTrashAlt, FaLock } from 'react-icons/fa';

const RetourForm = () => {
  const navigate = useNavigate();
  const [medicaments, setMedicaments] = useState([]);
  const [lots, setLots] = useState([]);
  const [form, setForm] = useState({
    medicament_id: '',
    lot_id: '',
    quantite: 1,
    motif: '',
    type: 'retour', // 'retour' ou 'destruction'
    patient_id: '', // pour le retour patient
  });
  const [password, setPassword] = useState('');
  const [selectedMedicament, setSelectedMedicament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    api.get('/pharmacy/medicaments')
      .then(res => setMedicaments(res.data))
      .catch(err => {
        console.error('Erreur chargement mdicaments:', err);
        setToast('Erreur chargement mdicaments');
        setToastType('error');
        setTimeout(() => setToast(null), 3000);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleMedicamentChange = async (medicamentId) => {
    setForm({ ...form, medicament_id: medicamentId, lot_id: '' });
    if (medicamentId) {
      const med = medicaments.find(m => m.id == medicamentId);
      setSelectedMedicament(med);
      try {
        const res = await api.get(`/pharmacy/lots/disponibles/${medicamentId}`);
        setLots(res.data.filter(lot => lot.stock_actuel > 0));
      } catch (err) {
        console.error('Erreur chargement lots:', err);
        setLots([]);
      }
    } else {
      setSelectedMedicament(null);
      setLots([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.medicament_id || !form.lot_id || form.quantite <= 0) {
      setToast('Veuillez remplir tous les champs');
      setToastType('error');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (!password) {
      setToast('Veuillez saisir votre mot de passe pour valider');
      setToastType('error');
      setTimeout(() => setToast(null), 3000);
      return;
    }

    try {
      let endpoint = '';
      let payload = {};

      if (form.type === 'retour') {
        // Route retour patient
        endpoint = '/pharmacy/retour-patient';
        payload = {
          medicament_id: parseInt(form.medicament_id),
          lot_id: parseInt(form.lot_id),
          quantite: parseInt(form.quantite),
          motif: form.motif || 'Retour patient',
          patient_id: form.patient_id || null, // peut tre optionnel
          password: password
        };
      } else {
        // Route destruction
        endpoint = '/pharmacy/destruction';
        payload = {
          lot_id: parseInt(form.lot_id),
          quantite: parseInt(form.quantite),
          motif: form.motif || 'Destruction',
          procede: 'Incincration' // valeur par dfaut, peut tre paramtr
        };
        // La destruction utilise aussi le mot de passe ?FC? nous devons l'ajouter dans le payload
        // mais la route actuelle ne l'accepte peut-tre pas ; nous l'ajoutons quand mme.
        payload.password = password;
      }

      await api.post(endpoint, payload);
      setToast(form.type === 'retour' ? '? Retour enregistr' : '? Destruction enregistre');
      setToastType('success');
      setTimeout(() => setToast(null), 2000);
      setTimeout(() => navigate('/pharmacy/dashboard'), 1500);
    } catch (err) {
      console.error('Erreur:', err);
      let msg = err.response?.data?.error || err.message;
      if (err.response?.status === 403) {
        msg = 'Mot de passe incorrect. Veuillez ressayer.';
      }
      setToast('? Erreur : ' + msg);
      setToastType('error');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const containerStyle = {
    minHeight: '100vh', backgroundColor: '#f0fdf4', padding: '32px', fontFamily: 'system-ui'
  };
  const cardStyle = {
    backgroundColor: 'white', borderRadius: '16px', padding: '32px', maxWidth: '600px', margin: '0 auto', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
  };
  const labelStyle = { display: 'block', fontWeight: '500', marginBottom: '6px', color: '#374151' };
  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px' };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>? Chargement...</div>;

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
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {toast}
        </div>
      )}
      <div style={cardStyle}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {form.type === 'retour' ? <FaUndoAlt /> : <FaTrashAlt />}
          {form.type === 'retour' ? 'Retour patient' : 'Destruction'}
        </h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Type d'opration</label>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={inputStyle}>
              <option value="retour">Retour (patient)</option>
              <option value="destruction">Destruction</option>
            </select>
          </div>

          {form.type === 'retour' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Patient (optionnel)</label>
              <input
                type="number"
                placeholder="ID du patient"
                value={form.patient_id}
                onChange={e => setForm({...form, patient_id: e.target.value})}
                style={inputStyle}
              />
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Mdicament *</label>
            <select value={form.medicament_id} onChange={e => handleMedicamentChange(e.target.value)} style={inputStyle} required>
              <option value="">-- Choisir --</option>
              {medicaments.map(m => <option key={m.id} value={m.id}>{m.nom} ({m.code})</option>)}
            </select>
          </div>

          {selectedMedicament && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Lot *</label>
              <select value={form.lot_id} onChange={e => setForm({...form, lot_id: e.target.value})} style={inputStyle} required>
                <option value="">-- Choisir un lot --</option>
                {lots.map(l => <option key={l.id} value={l.id}>Lot {l.numero_lot} (pr. {new Date(l.date_peremption).toLocaleDateString()}, stock {l.stock_actuel})</option>)}
              </select>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Quantit *</label>
            <input
              type="number"
              min="1"
              value={form.quantite}
              onChange={e => setForm({...form, quantite: parseInt(e.target.value) || 1})}
              style={inputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Motif</label>
            <textarea
              value={form.motif}
              onChange={e => setForm({...form, motif: e.target.value})}
              rows="3"
              style={inputStyle}
              placeholder="Raison du retour / destruction"
            />
          </div>

          {/* Champ mot de passe */}
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Mot de passe de validation *</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={inputStyle}
              placeholder="Saisissez votre mot de passe pour valider"
            />
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              <FaLock /> Votre mot de passe est requis pour signer cette opration
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate('/pharmacy/dashboard')}
              style={{ backgroundColor: '#e5e7eb', color: '#374151', padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              Valider
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RetourForm;
