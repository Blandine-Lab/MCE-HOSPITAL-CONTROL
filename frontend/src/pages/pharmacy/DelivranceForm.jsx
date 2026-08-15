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
  const [password, setPassword] = useState('');
  const [selectedMedicament, setSelectedMedicament] = useState(null);

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

  const showToast = (message, type = 'success') => {
    setToast(message);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, medsRes, infirmiersRes] = await Promise.all([
          api.get('/patients'),
          api.get('/pharmacy/medicaments'),
          api.get('/pharmacy/infirmiers'),
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
              const med = medsRes.data.find(m => m.id === firstLigne.medicament_id);
              setSelectedMedicament(med);
              if (lotsRes.data.length === 1) {
                setForm(prev => ({ ...prev, lot_id: lotsRes.data[0].id }));
              }
            }
          }
        }
        setLoading(false);
      } catch (err) {
        console.error('Erreur chargement des données :', err);
        showToast('Erreur chargement des données', 'error');
        setLoading(false);
      }
    };

    fetchData();
  }, [ordonnanceId]);

  const handleMedicamentChange = async (medicamentId) => {
    setForm(prev => ({ ...prev, medicament_id: medicamentId, lot_id: '' }));
    if (medicamentId) {
      const med = medicaments.find(m => m.id === parseInt(medicamentId));
      setSelectedMedicament(med);
      try {
        const res = await api.get(`/pharmacy/lots/disponibles/${medicamentId}`);
        setLots(res.data.filter(lot => lot.stock_actuel > 0));
        if (res.data.length === 1) {
          setForm(prev => ({ ...prev, lot_id: res.data[0].id }));
        }
      } catch (err) {
        console.error('Erreur chargement lots :', err);
        setLots([]);
        showToast('Erreur chargement des lots', 'error');
      }
    } else {
      setSelectedMedicament(null);
      setLots([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('📦 Valeurs du formulaire avant validation :', {
      patient_id: form.patient_id,
      medicament_id: form.medicament_id,
      lot_id: form.lot_id,
      quantite: form.quantite,
      retrieved_by: form.retrieved_by,
      password: password ? '****' : '',
    });

    const errors = [];
    if (!form.patient_id) errors.push('Patient');
    if (!form.medicament_id) errors.push('Médicament');
    if (!form.lot_id) errors.push('Lot');
    if (form.quantite <= 0) errors.push('Quantité');
    if (ordonnanceId && !form.retrieved_by) errors.push('Infirmier récupérant');
    if (!password) errors.push('Mot de passe');

    if (errors.length > 0) {
      showToast(`❌ Champs obligatoires manquants : ${errors.join(', ')}`, 'error');
      return;
    }

    setSaving(true);
    try {
      if (ordonnanceId) {
        // ✅ CORRECTION : utiliser la bonne route
        await api.put(`/pharmacy/ordonnances/${ordonnanceId}/serve`, {
          password,
          retrieved_by: form.retrieved_by,
        });
        showToast('✅ Délivrance enregistrée avec succès', 'success');
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
          password,
        };
        await api.post('/pharmacy/delivrance', payload);
        showToast('✅ Délivrance enregistrée avec succès', 'success');
        navigate('/pharmacy/dashboard');
      }
    } catch (err) {
      console.error('Erreur lors de la délivrance :', err);
      let msg = err.response?.data?.error || err.message;
      if (err.response?.status === 403) {
        msg = 'Mot de passe incorrect. Veuillez réessayer.';
      }
      showToast(`❌ Erreur : ${msg}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f0fdf4',
    padding: '32px',
    fontFamily: 'system-ui, sans-serif',
  };

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '600px',
    margin: '0 auto',
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
    padding: '8px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '14px',
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>⏳ Chargement...</div>;
  }

  return (
    <div style={containerStyle}>
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            zIndex: 1000,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          {toast}
        </div>
      )}

      <div style={cardStyle}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#166534',
          }}
        >
          <FaSyringe /> Délivrance de médicaments
        </h1>

        {ordonnanceId && (
          <div
            style={{
              backgroundColor: '#f0f4ff',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
            }}
          >
            <strong>Ordonnance :</strong> ORD-{String(ordonnanceId).padStart(4, '0')}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              Patient <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              value={form.patient_id}
              onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
              style={inputStyle}
              required
            >
              <option value="">-- Choisir un patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} {p.prenom}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              Médicament <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              value={form.medicament_id}
              onChange={(e) => handleMedicamentChange(e.target.value)}
              style={inputStyle}
              required
            >
              <option value="">-- Choisir un médicament --</option>
              {medicaments.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom} ({m.code})
                </option>
              ))}
            </select>
          </div>

          {selectedMedicament && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>
                Lot (péremption) <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                value={form.lot_id}
                onChange={(e) => {
                  console.log('🔄 Lot sélectionné :', e.target.value);
                  setForm({ ...form, lot_id: e.target.value });
                }}
                style={inputStyle}
                required
              >
                <option value="">-- Choisir un lot --</option>
                {lots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    Lot {lot.numero_lot} (pér. {new Date(lot.date_peremption).toLocaleDateString()}, stock {lot.stock_actuel})
                  </option>
                ))}
              </select>
              {lots.length === 0 && (
                <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>
                  ⚠️ Aucun lot disponible pour ce médicament.
                </p>
              )}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              Quantité <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="number"
              min="1"
              value={form.quantite}
              onChange={(e) =>
                setForm({ ...form, quantite: parseInt(e.target.value) || 1 })
              }
              style={inputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Posologie / Instructions</label>
            <textarea
              value={form.posologie}
              onChange={(e) => setForm({ ...form, posologie: e.target.value })}
              rows="3"
              style={inputStyle}
              placeholder="Ex: 1 comprimé matin et soir pendant 7 jours"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Prescripteur (nom du médecin)</label>
            <input
              type="text"
              value={form.prescripteur_nom}
              onChange={(e) => setForm({ ...form, prescripteur_nom: e.target.value })}
              style={inputStyle}
              placeholder="Dr. Nom du médecin"
            />
          </div>

          {ordonnanceId && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>
                Infirmier récupérant <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                value={form.retrieved_by}
                onChange={(e) => setForm({ ...form, retrieved_by: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="">-- Choisir --</option>
                {infirmiers.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.prenom} {i.nom}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                <FaUserNurse /> L'infirmier qui retire les médicaments
              </div>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>
              Mot de passe de validation <span style={{ color: 'red' }}>*</span>
            </label>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate('/pharmacy/dashboard')}
              style={{
                backgroundColor: '#e5e7eb',
                color: '#374151',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
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
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Enregistrement...' : 'Délivrer'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default DelivranceForm;