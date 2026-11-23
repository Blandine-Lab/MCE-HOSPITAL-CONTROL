import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../axios';
import { FaSyringe, FaLock, FaUserNurse, FaPills, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const DelivranceForm = () => {
  const { ordonnanceId } = useParams();
  const navigate = useNavigate();

  const [ordonnance, setOrdonnance] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [patients, setPatients] = useState([]);
  const [medicaments, setMedicaments] = useState([]);
  const [lots, setLots] = useState([]);
  const [preleveurs, setPreleveurs] = useState([]);
  const [selectedMedicament, setSelectedMedicament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

  // Formulaire pour le mode "libre" (sans ordonnance)
  const [form, setForm] = useState({
    patient_id: '',
    medicament_id: '',
    lot_id: '',
    quantite: 1,
    posologie: '',
    prescripteur_nom: '',
    retrieved_by: '',
  });

  const showToast = (message, type = 'success') => {
    setToast(message);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  // ============================================================
  // Chargement initial
  // ============================================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (ordonnanceId) {
          // ---- Mode ordonnance : charger l'ordonnance + toutes ses lignes + lots ----
          const [ordRes, lignesRes, preleveursRes] = await Promise.all([
            api.get(`/pharmacy/ordonnances/${ordonnanceId}`),
            api.get(`/pharmacy/ordonnances/${ordonnanceId}/lignes`),
            api.get('/pharmacy/preleveurs'),
          ]);

          setOrdonnance(ordRes.data);
          setPreleveurs(preleveursRes.data || []);

          // Pour chaque ligne, charger ses lots disponibles
          const lignesAvecLots = await Promise.all(
            (lignesRes.data || []).map(async (ligne) => {
              let lotsDispo = [];
              try {
                const lotsRes = await api.get(`/pharmacy/lots/disponibles/${ligne.medicament_id}`);
                lotsDispo = (lotsRes.data || []).filter(lot => lot.stock_actuel > 0);
              } catch (e) {
                lotsDispo = [];
              }
              const reste = Math.max(0, (ligne.quantite_prescrit || 0) - (ligne.quantite_delivree || 0));
              return {
                ...ligne,
                lots: lotsDispo,
                lot_id: lotsDispo[0]?.id || '',
                quantite_a_delivrer: reste,
              };
            })
          );
          setLignes(lignesAvecLots);
        } else {
          // ---- Mode libre : charger patients, médicaments, préleveurs ----
          const [patientsRes, medsRes, preleveursRes] = await Promise.all([
            api.get('/patients'),
            api.get('/pharmacy/medicaments'),
            api.get('/pharmacy/preleveurs'),
          ]);
          setPatients(patientsRes.data || []);
          setMedicaments(medsRes.data || []);
          setPreleveurs(preleveursRes.data || []);
        }
      } catch (err) {
        console.error('Erreur chargement :', err);
        showToast('Erreur chargement des données', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ordonnanceId]);

  // ============================================================
  // Mode libre : changement de médicament → charger les lots
  // ============================================================
  const handleMedicamentChange = async (medicamentId) => {
    setForm(prev => ({ ...prev, medicament_id: medicamentId, lot_id: '' }));
    if (!medicamentId) {
      setSelectedMedicament(null);
      setLots([]);
      return;
    }
    const med = medicaments.find(m => m.id === parseInt(medicamentId, 10));
    setSelectedMedicament(med);
    try {
      const res = await api.get(`/pharmacy/lots/disponibles/${medicamentId}`);
      const dispo = (res.data || []).filter(lot => lot.stock_actuel > 0);
      setLots(dispo);
      if (dispo.length === 1) {
        setForm(prev => ({ ...prev, lot_id: dispo[0].id }));
      }
    } catch (err) {
      console.error('Erreur chargement lots :', err);
      setLots([]);
      showToast('Erreur chargement des lots', 'error');
    }
  };

  // ============================================================
  // Mode ordonnance : mise à jour d'une ligne
  // ============================================================
  const handleLigneChange = (index, field, value) => {
    setLignes(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // ============================================================
  // Soumission
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password) {
      showToast('Le mot de passe de validation est obligatoire', 'error');
      return;
    }

    setSaving(true);
    try {
      if (ordonnanceId) {
        // ---- Mode ordonnance : délivrer chaque ligne via POST /pharmacy/delivrance ----
        const lignesAValider = lignes.filter(
          l => parseInt(l.quantite_a_delivrer, 10) > 0 && l.lot_id
        );

        if (lignesAValider.length === 0) {
          showToast('Aucune ligne à délivrer (quantité > 0 et lot sélectionné)', 'error');
          setSaving(false);
          return;
        }

        if (!form.retrieved_by) {
          showToast('Veuillez sélectionner la personne qui récupère les médicaments', 'error');
          setSaving(false);
          return;
        }

        // Vérification stock côté client (sécurise contre les erreurs serveur)
        for (const ligne of lignesAValider) {
          const lot = (ligne.lots || []).find(l => l.id === parseInt(ligne.lot_id, 10));
          if (!lot) {
            showToast(`Lot introuvable pour ${ligne.medicament_nom}`, 'error');
            setSaving(false);
            return;
          }
          if (parseInt(ligne.quantite_a_delivrer, 10) > lot.stock_actuel) {
            showToast(`Stock insuffisant pour ${ligne.medicament_nom} (dispo: ${lot.stock_actuel})`, 'error');
            setSaving(false);
            return;
          }
        }

        const medecinNom = ordonnance?.medecin_prenom
          ? `Dr. ${ordonnance.medecin_prenom} ${ordonnance.medecin_nom || ''}`.trim()
          : 'Médecin référent';

        // 1. Déclencher la délivrance de chaque ligne (décrémente le stock + met à jour ligne_ordonnances)
        for (const ligne of lignesAValider) {
          await api.post('/pharmacy/delivrance', {
            patient_id: parseInt(ordonnance.patient_id, 10),
            medicament_id: parseInt(ligne.medicament_id, 10),
            quantite: parseInt(ligne.quantite_a_delivrer, 10),
            posologie: ligne.posologie || null,
            prescripteur_nom: medecinNom,
            ligne_ordonnance_id: parseInt(ligne.id, 10),
            password,
          });
        }

        // 2. Finaliser l'ordonnance : statut + retrieved_by
        await api.put(`/pharmacy/ordonnances/${ordonnanceId}/serve`, {
          password,
          retrieved_by: parseInt(form.retrieved_by, 10),
        });

        showToast('✅ Délivrance effectuée — stock mis à jour', 'success');
        setTimeout(() => navigate('/pharmacy/dashboard'), 1500);
      } else {
        // ---- Mode libre : une seule délivrance sans ordonnance ----
        if (!form.patient_id || !form.medicament_id || !form.lot_id) {
          showToast('Patient, médicament et lot sont obligatoires', 'error');
          setSaving(false);
          return;
        }

        await api.post('/pharmacy/delivrance', {
          patient_id: parseInt(form.patient_id, 10),
          medicament_id: parseInt(form.medicament_id, 10),
          quantite: parseInt(form.quantite, 10),
          posologie: form.posologie || null,
          prescripteur_nom: form.prescripteur_nom || 'Médecin référent',
          ligne_ordonnance_id: null,
          password,
        });

        showToast('✅ Délivrance enregistrée — stock mis à jour', 'success');
        setTimeout(() => navigate('/pharmacy/dashboard'), 1500);
      }
    } catch (err) {
      console.error('Erreur délivrance :', err);
      let msg = err.response?.data?.error || err.message;
      if (err.response?.status === 403) {
        msg = 'Mot de passe incorrect. Veuillez réessayer.';
      }
      showToast(`❌ Erreur : ${msg}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // Styles
  // ============================================================
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f0fdf4',
    padding: '32px 16px',
    fontFamily: 'system-ui, sans-serif',
  };

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '800px',
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

  // ============================================================
  // Rendu
  // ============================================================
  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>⏳ Chargement…</div>;
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
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          animation: 'slideIn 0.3s ease-out',
        }}>
          {toast}
        </div>
      )}

      <div style={cardStyle}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#166534',
        }}>
          <FaSyringe /> Délivrance de médicaments
        </h1>

        {/* ===== En-tête ordonnance ===== */}
        {ordonnanceId && ordonnance && (
          <div style={{
            backgroundColor: '#f0f4ff',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            borderLeft: '4px solid #3b82f6',
          }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
              Ordonnance : {ordonnance.numero_ordonnance || `ORD-${String(ordonnance.id).padStart(4, '0')}`}
            </div>
            <div style={{ fontSize: '14px', color: '#475569' }}>
              Patient : <strong>{ordonnance.patient_prenom} {ordonnance.patient_nom}</strong>
            </div>
            <div style={{ fontSize: '14px', color: '#475569' }}>
              Médecin : <strong>Dr. {ordonnance.medecin_prenom} {ordonnance.medecin_nom}</strong>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* ============================================================ */}
          {/* MODE ORDONNANCE : liste des lignes                          */}
          {/* ============================================================ */}
          {ordonnanceId ? (
            <>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#374151' }}>
                💊 Médicaments à délivrer
              </h2>

              {lignes.length === 0 && (
                <div style={{ padding: '20px', backgroundColor: '#fef3c7', borderRadius: '8px', color: '#92400e', marginBottom: '20px' }}>
                  ⚠️ Cette ordonnance ne contient aucune ligne de médicament.
                </div>
              )}

              {lignes.map((ligne, index) => {
                const lotSelectionne = (ligne.lots || []).find(l => l.id === parseInt(ligne.lot_id, 10));
                const stockDispo = lotSelectionne?.stock_actuel || 0;
                const reste = Math.max(0, (ligne.quantite_prescrit || 0) - (ligne.quantite_delivree || 0));
                const dejaDelivre = reste === 0;

                return (
                  <div
                    key={ligne.id || index}
                    style={{
                      border: dejaDelivre ? '1px solid #d1fae5' : '1px solid #e5e7eb',
                      borderRadius: '10px',
                      padding: '16px',
                      marginBottom: '14px',
                      backgroundColor: dejaDelivre ? '#f0fdf4' : '#fafafa',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '15px', color: '#0f172a' }}>
                          {ligne.medicament_nom || `Médicament #${ligne.medicament_id}`}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                          Prescrit : <strong>{ligne.quantite_prescrit}</strong> · Déjà délivré : <strong>{ligne.quantite_delivree || 0}</strong> · Reste : <strong>{reste}</strong>
                        </div>
                      </div>
                      {dejaDelivre ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          backgroundColor: '#d1fae5', color: '#065f46',
                          padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600'
                        }}>
                          <FaCheckCircle size={10} /> Livré
                        </span>
                      ) : (
                        <span style={{
                          backgroundColor: '#fef3c7', color: '#92400e',
                          padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600'
                        }}>
                          En attente
                        </span>
                      )}
                    </div>

                    {!dejaDelivre && (
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ ...labelStyle, fontSize: '13px' }}>Lot *</label>
                          <select
                            value={ligne.lot_id}
                            onChange={(e) => handleLigneChange(index, 'lot_id', e.target.value)}
                            style={inputStyle}
                          >
                            <option value="">-- Choisir un lot --</option>
                            {(ligne.lots || []).map(lot => (
                              <option key={lot.id} value={lot.id}>
                                Lot {lot.numero_lot} (pér. {new Date(lot.date_peremption).toLocaleDateString('fr-FR')}, stock : {lot.stock_actuel})
                              </option>
                            ))}
                          </select>
                          {(ligne.lots || []).length === 0 && (
                            <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>
                              ⚠️ Aucun lot disponible — impossible de délivrer ce médicament.
                            </p>
                          )}
                        </div>
                        <div>
                          <label style={{ ...labelStyle, fontSize: '13px' }}>Quantité *</label>
                          <input
                            type="number"
                            min="0"
                            max={Math.min(reste, stockDispo || reste)}
                            value={ligne.quantite_a_delivrer}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 0;
                              handleLigneChange(index, 'quantite_a_delivrer', val);
                            }}
                            style={inputStyle}
                          />
                          {lotSelectionne && ligne.quantite_a_delivrer > lotSelectionne.stock_actuel && (
                            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                              ⚠️ Dépasse le stock du lot ({lotSelectionne.stock_actuel})
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Préleveur (infirmier ou médecin) */}
              <div style={{ marginBottom: '16px', marginTop: '20px' }}>
                <label style={labelStyle}>
                  Récupéré par <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  value={form.retrieved_by}
                  onChange={(e) => setForm({ ...form, retrieved_by: e.target.value })}
                  style={inputStyle}
                  required
                >
                  <option value="">-- Choisir --</option>
                  {preleveurs.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.prenom} {p.nom} — {p.role}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  <FaUserNurse /> Infirmier ou médecin qui retire les médicaments
                </div>
              </div>
            </>
          ) : (
            /* ============================================================ */
            /* MODE LIBRE : patient + médicament + lot                     */
            /* ============================================================ */
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Patient <span style={{ color: 'red' }}>*</span></label>
                <select
                  value={form.patient_id}
                  onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                  style={inputStyle}
                  required
                >
                  <option value="">-- Choisir un patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Médicament <span style={{ color: 'red' }}>*</span></label>
                <select
                  value={form.medicament_id}
                  onChange={(e) => handleMedicamentChange(e.target.value)}
                  style={inputStyle}
                  required
                >
                  <option value="">-- Choisir un médicament --</option>
                  {medicaments.map(m => (
                    <option key={m.id} value={m.id}>{m.nom} ({m.code})</option>
                  ))}
                </select>
              </div>

              {selectedMedicament && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Lot (péremption) <span style={{ color: 'red' }}>*</span></label>
                  <select
                    value={form.lot_id}
                    onChange={(e) => setForm({ ...form, lot_id: e.target.value })}
                    style={inputStyle}
                    required
                  >
                    <option value="">-- Choisir un lot --</option>
                    {lots.map(lot => (
                      <option key={lot.id} value={lot.id}>
                        Lot {lot.numero_lot} (pér. {new Date(lot.date_peremption).toLocaleDateString('fr-FR')}, stock : {lot.stock_actuel})
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
                <label style={labelStyle}>Quantité <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="number"
                  min="1"
                  value={form.quantite}
                  onChange={(e) => setForm({ ...form, quantite: parseInt(e.target.value, 10) || 1 })}
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
                  placeholder="Ex : 1 comprimé matin et soir pendant 7 jours"
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
            </>
          )}

          {/* ===== Mot de passe (commun) ===== */}
          <div style={{ marginBottom: '24px', marginTop: '8px' }}>
            <label style={labelStyle}>
              Mot de passe de validation <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
              placeholder="Saisissez votre mot de passe pour signer cette délivrance"
            />
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              <FaLock /> Votre mot de passe est requis pour signer cette délivrance
            </div>
          </div>

          {/* ===== Actions ===== */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate('/pharmacy/dashboard')}
              style={{
                backgroundColor: '#e5e7eb',
                color: '#374151',
                padding: '10px 18px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
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
                padding: '10px 22px',
                border: 'none',
                borderRadius: '8px',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {saving ? '⏳ Enregistrement…' : (<><FaSyringe /> Délivrer</>)}
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