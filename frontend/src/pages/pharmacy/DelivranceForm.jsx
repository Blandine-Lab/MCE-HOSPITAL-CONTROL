import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../axios';
import { FaSyringe, FaLock, FaUserNurse } from 'react-icons/fa';

const DelivranceForm = () => {
  const { ordonnanceId } = useParams();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [medicaments, setMedicaments] = useState([]);
  const [lots, setLots] = useState([]);
  const [infirmiers, setInfirmiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

  const [form, setForm] = useState({
    patient_id: '',
    medicament_id: '',
    lot_id: '',
    quantite: 1,
    posologie: '',
    prescripteur_nom: '',
    ligne_ordonnance_id: '',
    retrieved_by: '',
  });
  const [password, setPassword] = useState('');
  const [selectedMedicament, setSelectedMedicament] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, medsRes, infirmiersRes] = await Promise.all([
          api.get('/patients'),
          api.get('/pharmacy/medicaments'),
          api.get('/pharmacy/infirmiers'), // ✅ nouvelle route
        ]);

        setPatients(patientsRes.data);
        setMedicaments(medsRes.data);
        setInfirmiers(infirmiersRes.data);

        if (ordonnanceId) {
          const ordRes = await api.get(`/pharmacy/ordonnances/${ordonnanceId}/lignes`);
          const ordData = ordRes.data;
          const firstLigne = ordData[0];
          if (firstLigne) {
            setForm({
              patient_id: firstLigne.patient_id || '',
              medicament_id: firstLigne.medicament_id || '',
              quantite: firstLigne.quantite_prescrit || 1,
              posologie: firstLigne.posologie || '',
              prescripteur_nom: firstLigne.prescripteur_nom || '',
              ligne_ordonnance_id: firstLigne.id || '',
              retrieved_by: '',
            });
            if (firstLigne.medicament_id) {
              const lotsRes = await api.get(`/pharmacy/lots/disponibles/${firstLigne.medicament_id}`);
              setLots(lotsRes.data);
              const med = medicaments.find(m => m.id === firstLigne.medicament_id);
              setSelectedMedicament(med);
            }
          }
        }
        setLoading(false);
      } catch (err) {
        console.error('Erreur chargement:', err);
        setToast('Erreur chargement des données');
        setToastType('error');
        setLoading(false);
        setTimeout(() => setToast(null), 3000);
      }
    };
    fetchData();
  }, [ordonnanceId]);

  const handlePatientChange = (e) => {
    setForm({ ...form, patient_id: e.target.value });
  };

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

    if (!form.patient_id || !form.medicament_id || !form.lot_id || form.quantite <= 0) {
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

    if (ordonnanceId && !form.retrieved_by) {
      setToast('Veuillez sélectionner l\'infirmier qui retire les médicaments');
      setToastType('error');
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setSaving(true);
    try {
      if (ordonnanceId) {
        await api.put(`/prescriptions/${ordonnanceId}/serve`, {
          password: password,
          retrieved_by: form.retrieved_by,
        });
        setToast('✅ Délivrance enregistrée avec succès');
        setToastType('success');
        setTimeout(() => setToast(null), 3000);
        navigate('/pharmacy/dashboard');
      } else {
        const payload = {
          patient_id: parseInt(form.patient_id),
          medicament_id: parseInt(form.medicament_id),
          lot_id: parseInt(form.lot_id),
          quantite: parseInt(form.quantite),
          posologie: form.posologie,
          prescripteur_nom: form.prescripteur_nom || 'Médecin référent',
          ligne_ordonnance_id: form.ligne_ordonnance_id || null,
          password: password,
        };
        await api.post('/pharmacy/delivrance', payload);
        setToast('✅ Délivrance enregistrée avec succès');
        setToastType('success');
        setTimeout(() => setToast(null), 3000);
        navigate('/pharmacy/dashboard');
      }
    } catch (err) {
      console.error('Erreur délivrance:', err);
      let msg = err.response?.data?.error || err.message;
      if (err.response?.status === 403) {
        msg = 'Mot de passe incorrect. Veuillez réessayer.';
      }
      setToast('❌ Erreur : ' + msg);
      setToastType('error');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Styles
  const containerStyle = {
    minHeight: '100vh', backgroundColor: '#f0fdf4', padding: '32px', fontFamily: 'system-ui'
  };
  const cardStyle = {
    backgroundColor: 'white', borderRadius: '16px', padding: '32px', maxWidth: '600px', margin: '0 auto', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
  };
  const labelStyle = { display: 'block', fontWeight: '500', marginBottom: '6px', color: '#374151' };
  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px' };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>⏳ Chargement...</div>;

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
          <FaSyringe /> Délivrance de médicaments
        </h1>
        {ordonnanceId && (
          <div style={{ backgroundColor: '#f0f4ff', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
            <strong>Ordonnance :</strong> ORD-{String(ordonnanceId).padStart(4, '0')}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          {/* Patient */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Patient *</label>
            <select
              value={form.patient_id}
              onChange={handlePatientChange}
              style={inputStyle}
              required
            >
              <option value="">-- Choisir --</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
            </select>
          </div>

          {/* Médicament */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Médicament *</label>
            <select
              value={form.medicament_id}
              onChange={(e) => handleMedicamentChange(e.target.value)}
              style={inputStyle}
              required
            >
              <option value="">-- Choisir --</option>
              {medicaments.map(m => <option key={m.id} value={m.id}>{m.nom} ({m.code})</option>)}
            </select>
          </div>

          {/* Lot */}
          {selectedMedicament && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Lot (péremption) *</label>
              <select
                value={form.lot_id}
                onChange={(e) => setForm({...form, lot_id: e.target.value})}
                style={inputStyle}
                required
              >
                <option value="">-- Choisir un lot --</option>
                {lots.map(l => (
                  <option key={l.id} value={l.id}>
                    Lot {l.numero_lot} (pér. {new Date(l.date_peremption).toLocaleDateString()}, stock {l.stock_actuel})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantité */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Quantité *</label>
            <input
              type="number"
              min="1"
              value={form.quantite}
              onChange={(e) => setForm({...form, quantite: parseInt(e.target.value) || 1})}
              style={inputStyle}
              required
            />
          </div>

          {/* Posologie */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Posologie / instructions</label>
            <textarea
              value={form.posologie}
              onChange={(e) => setForm({...form, posologie: e.target.value})}
              rows="3"
              style={inputStyle}
              placeholder="Ex: 1 comprimé matin et soir pendant 7 jours"
            />
          </div>

          {/* Prescripteur */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Prescripteur (nom du médecin)</label>
            <input
              type="text"
              value={form.prescripteur_nom}
              onChange={(e) => setForm({...form, prescripteur_nom: e.target.value})}
              style={inputStyle}
              placeholder="Dr. Nom du médecin"
            />
          </div>

          {/* Infirmier récupérant (visible uniquement pour les ordonnances) */}
          {ordonnanceId && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Infirmier récupérant *</label>
              <select
                value={form.retrieved_by}
                onChange={(e) => setForm({...form, retrieved_by: e.target.value})}
                style={inputStyle}
                required
              >
                <option value="">-- Choisir --</option>
                {infirmiers.map(i => (
                  <option key={i.id} value={i.id}>{i.prenom} {i.nom}</option>
                ))}
              </select>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                <FaUserNurse /> L'infirmier qui retire les médicaments
              </div>
            </div>
          )}

          {/* Mot de passe */}
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Mot de passe de validation *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
              placeholder="Saisissez votre mot de passe pour valider"
            />
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              <FaLock /> Votre mot de passe est requis pour signer cette délivrance
            </div>
          </div>

          {/* Boutons */}
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
              disabled={saving}
              style={{
                backgroundColor: '#16a34a',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Enregistrement...' : 'Délivrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DelivranceForm;