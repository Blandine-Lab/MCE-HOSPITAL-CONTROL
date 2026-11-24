// src/pages/billing/FactureForm.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../axios';
import { FaPlus, FaTrash, FaSave, FaTimes, FaFileInvoice, FaHospital, FaUserMd, FaPills, FaFlask, FaStethoscope, FaSearch, FaPrint } from 'react-icons/fa';

const FactureForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeFromUrl = searchParams.get('type') || 'mixte';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Patient
  const [patient, setPatient] = useState(null);
  const [patients, setPatients] = useState([]);

  const [typeFacture, setTypeFacture] = useState(typeFromUrl);
  const [mode, setMode] = useState('hospitalisation');
  const [sejours, setSejours] = useState([]);
  const [selectedSejourId, setSelectedSejourId] = useState('');
  const [consultations, setConsultations] = useState([]);
  const [selectedConsultationId, setSelectedConsultationId] = useState('');
  const [assurances, setAssurances] = useState([]);

  const [prestations, setPrestations] = useState([]);
  const [remise, setRemise] = useState(0);
  const [tiersPayant, setTiersPayant] = useState('');
  const [notes, setNotes] = useState('');
  const [assuranceId, setAssuranceId] = useState('');
  const [toast, setToast] = useState(null);

  // Examens
  const [examensDisponibles, setExamensDisponibles] = useState([]);
  const [selectedExamensIds, setSelectedExamensIds] = useState([]);

  // Consultations pour facturation - CORRIGÉ : un seul state, plus de doublon
  const [consultationsDisponibles, setConsultationsDisponibles] = useState([]);
  const [selectedConsultationsIds, setSelectedConsultationsIds] = useState([]);

  // Médicaments
  const [medicamentsDisponibles, setMedicamentsDisponibles] = useState([]);
  const [selectedMedicamentsIds, setSelectedMedicamentsIds] = useState([]);

  // Grille tarifaire
  const [prestationsList, setPrestationsList] = useState([]);
  const [selectedPrestationId, setSelectedPrestationId] = useState('');
  const [prestationSearch, setPrestationSearch] = useState('');

  // Impression thermique
  const [formatImpression, setFormatImpression] = useState('80'); // 58 ou 80
  const [lastFacture, setLastFacture] = useState(null);
  const hasAutoLoaded = useRef(false);

  // ========== Chargement grille tarifaire ==========
  useEffect(() => {
    api.get('/billing/prestations')
      .then(res => setPrestationsList(res.data))
      .catch(err => console.error('Erreur chargement prestations:', err));
  }, []);

  const filteredPrestations = prestationsList.filter(p =>
    p.code?.toLowerCase().includes(prestationSearch.toLowerCase()) ||
    p.libelle?.toLowerCase().includes(prestationSearch.toLowerCase())
  );

  const addPrestationFromList = () => {
    if (!selectedPrestationId) {
      setToast('Veuillez sélectionner une prestation');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const prestation = prestationsList.find(p => p.id === parseInt(selectedPrestationId));
    if (!prestation) return;

    const exists = prestations.some(p => p.libelle === prestation.libelle && p.prix_unitaire === parseFloat(prestation.prix_unitaire));
    if (exists) {
      setToast('Cette prestation est déjà dans la liste');
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setPrestations(prev => [...prev, {
      id: `presta-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      libelle: prestation.libelle,
      date: new Date().toISOString().split('T')[0],
      quantite: 1,
      prix_unitaire: parseFloat(prestation.prix_unitaire) || 0,
      total: parseFloat(prestation.prix_unitaire) || 0,
      origine: 'grille_tarifaire',
      reference_id: prestation.id,
      isManual: false,
      fromTarif: true,
    }]);
    setSelectedPrestationId('');
    setPrestationSearch('');
  };

  // Charger les patients
  useEffect(() => {
    api.get('/patients')
      .then(res => setPatients(res.data))
      .catch(err => {
        console.error('❌ Erreur chargement patients:', err);
        setToast('Erreur chargement patients');
        setTimeout(() => setToast(null), 3000);
      });
  }, []);

  // Charger les assurances
  useEffect(() => {
    api.get('/billing/assurances')
      .then(res => setAssurances(res.data))
      .catch(err => console.error('Erreur chargement assurances:', err));
  }, []);

  // Charger les séjours du patient
  useEffect(() => {
    if (patient && mode === 'hospitalisation') {
      api.get(`/consultations/admissions/patient/${patient.id}`)
        .then(res => {
          setSejours(res.data);
          if (res.data.length > 0) setSelectedSejourId(res.data[0].id);
          else setSelectedSejourId('');
        })
        .catch(err => console.error(err));
    } else {
      setSejours([]);
      setSelectedSejourId('');
    }
  }, [patient, mode]);

  // CORRIGÉ : UN SEUL appel pour les consultations (ambulatoire + facturation)
  useEffect(() => {
    if (patient && patient.id) {
      api.get(`/consultations/rendezvous/patient/${patient.id}`)
        .then(res => {
          setConsultations(res.data);
          setConsultationsDisponibles(res.data);
          if (mode === 'ambulatoire' && res.data.length > 0) setSelectedConsultationId(res.data[0].id);
          else if (mode !== 'ambulatoire') setSelectedConsultationId('');
        })
        .catch(err => console.error(err));
    } else {
      setConsultations([]);
      setConsultationsDisponibles([]);
      setSelectedConsultationsIds([]);
      setSelectedConsultationId('');
    }
  }, [patient, mode]);

  // Charger les prestations automatiquement - CORRIGÉ : n'écrase pas les lignes manuelles
  useEffect(() => {
    if (!patient) return;
    // Ne charger auto qu'une fois par patient/mode, sinon on perd les lignes manuelles
    if (hasAutoLoaded.current) return;

    const loadAuto = async () => {
      try {
        let res = null;
        if (mode === 'hospitalisation' && selectedSejourId) {
          res = await api.get(`/billing/sejour/${selectedSejourId}/prestations`);
        } else if (mode === 'ambulatoire' && selectedConsultationId) {
          res = await api.get(`/billing/consultation/${selectedConsultationId}/prestations`);
        }
        if (res) {
          const items = res.data.map((p, idx) => ({
            id: `auto-${Date.now()}-${idx}-${Math.random().toString(36).slice(2,7)}`,
            libelle: p.libelle,
            date: p.date || new Date().toISOString().split('T')[0],
            quantite: p.quantite || 1,
            prix_unitaire: p.prix_unitaire || 0,
            total: p.total || (p.quantite || 1) * (p.prix_unitaire || 0),
            origine: p.origine,
            reference_id: p.reference_id,
            isManual: false,
            fromTarif: false,
          }));
          setPrestations(prev => {
            // Ne pas dupliquer si déjà chargé
            if (prev.length > 0) return prev;
            return items;
          });
          hasAutoLoaded.current = true;
        }
      } catch (err) { console.error(err); }
    };
    loadAuto();
  }, [selectedSejourId, selectedConsultationId, mode, patient]);

  // Reset du flag quand on change de patient
  useEffect(() => {
    hasAutoLoaded.current = false;
    setPrestations([]);
    setSelectedExamensIds([]);
    setSelectedConsultationsIds([]);
  }, [patient?.id]);

  // Charger les examens
  useEffect(() => {
    if (patient && patient.id) {
      api.get(`/examens/patient/${patient.id}`)
        .then(res => setExamensDisponibles(res.data))
        .catch(err => console.error('Erreur chargement examens:', err));
    } else {
      setExamensDisponibles([]);
      setSelectedExamensIds([]);
    }
  }, [patient]);

  // Charger les médicaments non facturés
  useEffect(() => {
    if (patient && patient.id) {
      api.get(`/billing/medicaments/patient/${patient.id}`)
        .then(res => {
          setMedicamentsDisponibles(res.data);
          setSelectedMedicamentsIds(res.data.map(med => med.mouvement_id));
        })
        .catch(err => console.error('Erreur chargement médicaments:', err));
    } else {
      setMedicamentsDisponibles([]);
      setSelectedMedicamentsIds([]);
    }
  }, [patient]);

  const handleSelectPatient = (e) => {
    const patientId = parseInt(e.target.value);
    if (patientId) {
      const found = patients.find(p => p.id === patientId);
      setPatient(found);
    } else {
      setPatient(null);
    }
  };

  const toggleExamenSelection = (examenId) => {
    setSelectedExamensIds(prev => prev.includes(examenId) ? prev.filter(id => id !== examenId) : [...prev, examenId]);
  };
  const toggleConsultationSelection = (consultationId) => {
    setSelectedConsultationsIds(prev => prev.includes(consultationId) ? prev.filter(id => id !== consultationId) : [...prev, consultationId]);
  };
  const toggleMedicamentSelection = (medicamentId) => {
    setSelectedMedicamentsIds(prev => prev.includes(medicamentId) ? prev.filter(id => id !== medicamentId) : [...prev, medicamentId]);
  };

  // ========== CORRIGÉ : Calcul du total GÉNÉRAL (prestations + examens + consultations + médicaments) ==========
  const totalPrestations = prestations.reduce((sum, item) => sum + (item.total || 0), 0);
  const totalExamens = examensDisponibles
    .filter(ex => selectedExamensIds.includes(ex.id))
    .reduce((sum, ex) => sum + (parseFloat(ex.prix) || 0), 0);
  const totalConsultations = consultationsDisponibles
    .filter(c => selectedConsultationsIds.includes(c.id))
    .reduce((sum, c) => sum + (parseFloat(c.prix) || 50), 0);
  const totalMedicaments = medicamentsDisponibles
    .filter(m => selectedMedicamentsIds.includes(m.mouvement_id))
    .reduce((sum, m) => sum + (parseFloat(m.prix_unitaire) || 0) * (m.quantite || 1), 0);

  const totalGeneral = totalPrestations + totalExamens + totalConsultations + totalMedicaments;
  const remiseAmount = (totalGeneral * remise) / 100;
  const totalApresRemise = totalGeneral - remiseAmount;

  const addManualLine = () => {
    setPrestations(prev => [...prev, {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      libelle: '',
      date: new Date().toISOString().split('T')[0],
      quantite: 1,
      prix_unitaire: 0,
      total: 0,
      isManual: true,
      fromTarif: false,
    }]);
  };

  const updateLine = (index, field, value) => {
    const newLines = [...prestations];
    newLines[index][field] = value;
    if (field === 'quantite' || field === 'prix_unitaire') {
      const q = field === 'quantite' ? parseFloat(value) || 0 : newLines[index].quantite;
      const p = field === 'prix_unitaire' ? parseFloat(value) || 0 : newLines[index].prix_unitaire;
      newLines[index].total = q * p;
    }
    setPrestations(newLines);
  };

  const deleteLine = (index) => {
    if (prestations[index].isManual === false && !prestations[index].fromTarif) {
      if (!window.confirm('Cette ligne provient du séjour/consultation. La supprimer ne supprimera pas la prestation originale. Continuer ?')) return;
    }
    setPrestations(prev => prev.filter((_, i) => i !== index));
  };

  // ========== IMPRESSION THERMIQUE 58mm / 80mm ==========
  const buildThermalHTML = (facture) => {
    const width = formatImpression === '58' ? '58mm' : '80mm';
    const fontSize = formatImpression === '58' ? '11px' : '12px';
    const lignesHtml = prestations.filter(p => p.libelle).map(p => `
      <div style="display:flex;justify-content:space-between;">
        <span>${p.libelle} x${p.quantite}</span>
        <span>${p.total.toFixed(2)}</span>
      </div>
    `).join('');
    const examensHtml = examensDisponibles.filter(e => selectedExamensIds.includes(e.id)).map(e => `
      <div style="display:flex;justify-content:space-between;"><span>${e.type_examen || e.type_nom || 'Examen'}</span><span>${parseFloat(e.prix||0).toFixed(2)}</span></div>
    `).join('');
    const consultHtml = consultationsDisponibles.filter(c => selectedConsultationsIds.includes(c.id)).map(c => `
      <div style="display:flex;justify-content:space-between;"><span>Consultation ${c.motif||''}</span><span>${(parseFloat(c.prix)||50).toFixed(2)}</span></div>
    `).join('');
    const medHtml = medicamentsDisponibles.filter(m => selectedMedicamentsIds.includes(m.mouvement_id)).map(m => `
      <div style="display:flex;justify-content:space-between;"><span>${m.libelle} x${m.quantite}</span><span>${((parseFloat(m.prix_unitaire)||0)*(m.quantite||1)).toFixed(2)}</span></div>
    `).join('');

    return `
      <html><head><meta charset="utf-8"><style>
        @page { size: ${width} auto; margin: 0; }
        body { width: ${width}; margin:0; padding:8px; font-family: monospace, Arial; font-size:${fontSize}; color:#000; }
        .center { text-align:center; } .line { border-top:1px dashed #000; margin:6px 0; } .bold{font-weight:bold;}
        .row{display:flex;justify-content:space-between;}
      </style></head><body>
        <div class="center bold">GLOBALMIND E-SANTE</div>
        <div class="center">RDC - Kinshasa</div>
        <div class="center">Facture N° ${facture?.numero || facture?.id || '---'}</div>
        <div>Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
        <div>Patient: ${patient ? patient.prenom + ' ' + patient.nom : ''} ${patient?.ipp ? '(IPP:'+patient.ipp+')' : ''}</div>
        <div class="line"></div>
        ${lignesHtml}${examensHtml}${consultHtml}${medHtml}
        <div class="line"></div>
        <div class="row"><span>Total HT</span><span>${totalGeneral.toFixed(2)} FC</span></div>
        <div class="row"><span>Remise (${remise}%)</span><span>-${remiseAmount.toFixed(2)} FC</span></div>
        <div class="row bold"><span>TOTAL TTC</span><span>${totalApresRemise.toFixed(2)} FC</span></div>
        <div class="line"></div>
        <div class="center">Merci de votre confiance</div>
        <div class="center">*** Bon rétablissement ***</div>
        <br><br>
      </body></html>
    `;
  };

  const printThermal = (facture) => {
    const win = window.open('', '_blank', 'width=320,height=600');
    if (!win) { setToast('Autorisez les popups pour imprimer'); return; }
    win.document.write(buildThermalHTML(facture));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  // Soumission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patient) {
      setToast('Veuillez sélectionner un patient');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const hasPrestations = prestations.some(p => p.libelle);
    const hasExamens = selectedExamensIds.length > 0;
    const hasConsultations = selectedConsultationsIds.length > 0;
    const hasMedicaments = selectedMedicamentsIds.length > 0;
    if (!hasPrestations && !hasExamens && !hasConsultations && !hasMedicaments) {
      setToast('Ajoutez au moins une prestation, un examen, une consultation ou un médicament');
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        patient_id: patient.id,
        assurance_id: assuranceId || null,
        mode: mode,
        sejour_id: mode === 'hospitalisation' ? selectedSejourId : null,
        consultation_id: mode === 'ambulatoire' ? selectedConsultationId : null,
        date_emission: new Date().toISOString().split('T')[0],
        date_echeance: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        remise: remise,
        tiers_payant: tiersPayant || null,
        notes: notes,
        type_facture: typeFacture,
        // CORRIGÉ : prestation_id seulement si fromTarif
        lignes: prestations.filter(p => p.libelle).map(p => ({
          libelle: p.libelle,
          quantite: p.quantite,
          prix_unitaire: p.prix_unitaire,
          prestation_id: p.fromTarif ? p.reference_id : null,
          total_ligne: p.total,
        })),
        examens_ids: selectedExamensIds,
        consultations_ids: selectedConsultationsIds,
        medicament_ids: selectedMedicamentsIds,
        // Pour que le backend calcule le bon total si besoin
        total_calcule: totalApresRemise,
      };
      const res = await api.post('/billing/factures', payload);
      const created = res.data?.facture || res.data;
      setLastFacture(created);
      setToast('✅ Facture créée avec succès');
      setTimeout(() => {
        setToast(null);
        // Impression auto thermique - c'est la solution la plus fiable car le logiciel est conçu pour gérer cette contrainte de largeur dès le départ.
        if (window.confirm(`Facture créée ! Voulez-vous imprimer le reçu thermique ${formatImpression}mm ?`)) {
          printThermal(created);
        }
        navigate('/factures');
      }, 800);
    } catch (err) {
      console.error(err);
      setToast('❌ Erreur : ' + (err.response?.data?.error || err.message));
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Styles
  const containerStyle = { minHeight: '100vh', backgroundColor: '#f0fdf4', padding: '32px', fontFamily: 'system-ui' };
  const cardStyle = { backgroundColor: 'white', borderRadius: '16px', padding: '24px', maxWidth: '1200px', margin: '0 auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' };
  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px' };
  const labelStyle = { display: 'block', fontWeight: '500', marginBottom: '4px', color: '#374151' };

  return (
    <div style={containerStyle}>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: toast.includes('✅') ? '#10b981' : '#ef4444', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          {toast}
        </div>
      )}
      <div style={cardStyle}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaFileInvoice /> Nouvelle facture
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Patient *</label>
            <select value={patient ? patient.id : ''} onChange={handleSelectPatient} style={inputStyle} required>
              <option value="">Sélectionner un patient</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.nom} {p.prenom} {p.ipp ? `(IPP: ${p.ipp})` : ''}</option>
              ))}
            </select>
            {patient && (
              <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#d1fae5', borderRadius: '6px', color: '#065f46' }}>
                👤 Patient sélectionné : <strong>{patient.prenom} {patient.nom}</strong> {patient.ipp && `(IPP: ${patient.ipp})`}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Type de facture</label>
            <select value={typeFacture} onChange={e => setTypeFacture(e.target.value)} style={inputStyle}>
              <option value="mixte">Mixte (tout)</option>
              <option value="consultation">Consultation externe</option>
              <option value="laboratoire">Laboratoire / Imagerie</option>
              <option value="sejour">Séjour / Hospitalisation</option>
              <option value="pharmacie">Pharmacie (médicaments)</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Contexte de soin</label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="radio" value="hospitalisation" checked={mode === 'hospitalisation'} onChange={() => setMode('hospitalisation')} />
                <FaHospital /> Hospitalisation (séjour)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="radio" value="ambulatoire" checked={mode === 'ambulatoire'} onChange={() => setMode('ambulatoire')} />
                <FaUserMd /> Ambulatoire (consultation externe)
              </label>
            </div>
          </div>

          {patient && (
            <>
              {mode === 'hospitalisation' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Séjour</label>
                  <select value={selectedSejourId} onChange={e => setSelectedSejourId(e.target.value)} style={inputStyle} disabled={sejours.length === 0}>
                    <option value="">-- Choisir un séjour --</option>
                    {sejours.map(s => (
                      <option key={s.id} value={s.id}>{s.date_admission ? new Date(s.date_admission).toLocaleDateString() : 'Date inconnue'} - {s.service_nom || 'Service'}</option>
                    ))}
                  </select>
                  {sejours.length === 0 && <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Aucun séjour trouvé pour ce patient.</p>}
                </div>
              )}
              {mode === 'ambulatoire' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Consultation</label>
                  <select value={selectedConsultationId} onChange={e => setSelectedConsultationId(e.target.value)} style={inputStyle} disabled={consultations.length === 0}>
                    <option value="">-- Choisir une consultation --</option>
                    {consultations.map(c => (
                      <option key={c.id} value={c.id}>{c.date_rdv ? new Date(c.date_rdv).toLocaleDateString() : 'Date inconnue'} - {c.motif || 'Consultation'}</option>
                    ))}
                  </select>
                  {consultations.length === 0 && <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Aucune consultation trouvée pour ce patient.</p>}
                </div>
              )}
            </>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Assurance / Mutuelle</label>
            <select value={assuranceId} onChange={e => setAssuranceId(e.target.value)} style={inputStyle}>
              <option value="">-- Aucune --</option>
              {assurances.map(a => (<option key={a.id} value={a.id}>{a.nom}</option>))}
            </select>
          </div>

          {/* Format d'impression thermique */}
          <div style={{ marginBottom: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: '#fffbeb' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}><FaPrint /> Format d'impression</h4>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="radio" value="58" checked={formatImpression === '58'} onChange={() => setFormatImpression('58')} /> Ticket 58mm
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="radio" value="80" checked={formatImpression === '80'} onChange={() => setFormatImpression('80')} /> Ticket 80mm
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="radio" value="A4" checked={formatImpression === 'A4'} onChange={() => setFormatImpression('A4')} /> A4 classique
              </label>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>C'est la solution la plus fiable car le logiciel est conçu pour gérer cette contrainte de largeur dès le départ.</span>
            </div>
            {lastFacture && (
              <button type="button" onClick={() => printThermal(lastFacture)} style={{ marginTop: '10px', backgroundColor: '#f59e0b', color: 'white', padding: '8px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                <FaPrint /> Ré-imprimer le dernier reçu {formatImpression}mm
              </button>
            )}
          </div>

          {(typeFacture === 'mixte' || typeFacture === 'sejour' || typeFacture === 'consultation') && (
            <div style={{ marginBottom: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: '#f9fafb' }}>
              <h4 style={{ fontWeight: 'bold', marginBottom: '12px' }}>📋 Ajouter une prestation depuis la grille tarifaire</h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: '1 1 300px', position: 'relative' }}>
                  <input type="text" placeholder="Rechercher par code ou libellé..." value={prestationSearch} onChange={e => setPrestationSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: '32px' }} />
                  <FaSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                </div>
                <select value={selectedPrestationId} onChange={e => setSelectedPrestationId(e.target.value)} style={{ flex: '1 1 200px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                  <option value="">Choisir une prestation</option>
                  {filteredPrestations.map(p => (
                    <option key={p.id} value={p.id}>{p.code} - {p.libelle} ({parseFloat(p.prix_unitaire).toFixed(2)} FC)</option>
                  ))}
                </select>
                <button type="button" onClick={addPrestationFromList} style={{ backgroundColor: '#3b82f6', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaPlus /> Ajouter
                </button>
              </div>
              {filteredPrestations.length === 0 && prestationSearch && (
                <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Aucune prestation trouvée pour cette recherche.</p>
              )}
            </div>
          )}

          {(typeFacture === 'mixte' || typeFacture === 'sejour') && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontWeight: 'bold' }}>📋 Prestations facturées</h3>
                <button type="button" onClick={addManualLine} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaPlus /> Ajouter manuellement
                </button>
              </div>
              {prestations.length === 0 ? (
                <p style={{ color: '#6b7280' }}>Aucune prestation. Sélectionnez un patient et un séjour/consultation pour charger automatiquement, ou ajoutez depuis la grille tarifaire.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Libellé</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Quantité</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Prix unit.</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Total</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prestations.map((item, index) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '8px' }}>
                            <input type="text" value={item.libelle} onChange={e => updateLine(index, 'libelle', e.target.value)} style={{ ...inputStyle, minWidth: '150px' }} placeholder="Libellé" />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input type="date" value={item.date ? new Date(item.date).toISOString().split('T')[0] : ''} onChange={e => updateLine(index, 'date', e.target.value)} style={inputStyle} />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <input type="number" min="0" step="1" value={item.quantite} onChange={e => updateLine(index, 'quantite', e.target.value)} style={{ width: '70px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <input type="number" min="0" step="0.01" value={item.prix_unitaire} onChange={e => updateLine(index, 'prix_unitaire', e.target.value)} style={{ width: '100px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{(item.total || 0).toFixed(2)} FC</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <button type="button" onClick={() => deleteLine(index)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><FaTrash /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {(typeFacture === 'mixte' || typeFacture === 'laboratoire') && patient && (
            <div style={{ marginBottom: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: '#f9fafb' }}>
              <h4 style={{ fontWeight: 'bold', marginBottom: '12px' }}><FaFlask /> Examens de laboratoire disponibles</h4>
              {examensDisponibles.length === 0 ? (
                <p style={{ color: '#6b7280', fontStyle: 'italic' }}>Aucun examen trouvé pour ce patient (ou tous sont annulés).</p>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {examensDisponibles.map(ex => (
                      <label key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                        <input type="checkbox" checked={selectedExamensIds.includes(ex.id)} onChange={() => toggleExamenSelection(ex.id)} />
                        <span>{ex.type_examen || ex.type_nom || 'Examen'} <span style={{ fontSize: '12px', color: '#6b7280' }}>({ex.categorie})</span></span>
                        <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 'bold' }}>{ex.prix} FC</span>
                      </label>
                    ))}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '14px', color: '#4b5563' }}>{selectedExamensIds.length} examen(s) sélectionné(s) - Sous-total: {totalExamens.toFixed(2)} FC</div>
                </>
              )}
            </div>
          )}

          {(typeFacture === 'mixte' || typeFacture === 'consultation') && patient && (
            <div style={{ marginBottom: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: '#f9fafb' }}>
              <h4 style={{ fontWeight: 'bold', marginBottom: '12px' }}><FaStethoscope /> Consultations disponibles</h4>
              {consultationsDisponibles.length === 0 ? (
                <p style={{ color: '#6b7280', fontStyle: 'italic' }}>Aucune consultation trouvée pour ce patient.</p>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {consultationsDisponibles.map(c => (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                        <input type="checkbox" checked={selectedConsultationsIds.includes(c.id)} onChange={() => toggleConsultationSelection(c.id)} />
                        <span>{new Date(c.date_rdv).toLocaleDateString()} - {c.motif || 'Consultation'} <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>({c.type_consultation || 'générale'})</span></span>
                        <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 'bold' }}>{c.prix ? parseFloat(c.prix).toFixed(2) : '50.00'} FC</span>
                      </label>
                    ))}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '14px', color: '#4b5563' }}>{selectedConsultationsIds.length} consultation(s) sélectionnée(s) - Sous-total: {totalConsultations.toFixed(2)} FC</div>
                </>
              )}
            </div>
          )}

          {(typeFacture === 'mixte' || typeFacture === 'pharmacie') && patient && (
            <div style={{ marginBottom: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: '#f9fafb' }}>
              <h4 style={{ fontWeight: 'bold', marginBottom: '12px' }}><FaPills /> Médicaments délivrés (non facturés)</h4>
              {medicamentsDisponibles.length === 0 ? (
                <p style={{ color: '#6b7280', fontStyle: 'italic' }}>Aucun médicament non facturé trouvé pour ce patient.</p>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {medicamentsDisponibles.map(med => (
                      <label key={med.mouvement_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                        <input type="checkbox" checked={selectedMedicamentsIds.includes(med.mouvement_id)} onChange={() => toggleMedicamentSelection(med.mouvement_id)} />
                        <span>{med.libelle} <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>(x{med.quantite})</span></span>
                        <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 'bold' }}>{med.prix_unitaire ? parseFloat(med.prix_unitaire).toFixed(2) : '0.00'} FC</span>
                      </label>
                    ))}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '14px', color: '#4b5563' }}>{selectedMedicamentsIds.length} médicament(s) sélectionné(s) - Sous-total: {totalMedicaments.toFixed(2)} FC</div>
                </>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Remise (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={remise} onChange={e => setRemise(parseFloat(e.target.value) || 0)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Tiers payant</label>
              <input type="text" placeholder="Assurance, mutuelle, etc." value={tiersPayant} onChange={e => setTiersPayant(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="3" style={{ ...inputStyle, resize: 'vertical' }} placeholder="Informations complémentaires..." />
          </div>

          <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '20px', marginBottom: '20px', textAlign: 'right' }}>
            <div style={{ fontSize: '16px' }}>Prestations: {totalPrestations.toFixed(2)} FC | Examens: {totalExamens.toFixed(2)} FC | Consultations: {totalConsultations.toFixed(2)} FC | Médicaments: {totalMedicaments.toFixed(2)} FC</div>
            <div style={{ fontSize: '18px' }}><span style={{ fontWeight: 'bold' }}>Total HT :</span> {totalGeneral.toFixed(2)} FC</div>
            <div style={{ fontSize: '18px', color: '#ef4444' }}><span style={{ fontWeight: 'bold' }}>Remise ({remise}%) :</span> -{remiseAmount.toFixed(2)} FC</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}><span style={{ fontWeight: 'bold' }}>Total TTC :</span> {totalApresRemise.toFixed(2)} FC</div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
            <button type="button" onClick={() => navigate('/factures')} style={{ backgroundColor: '#e5e7eb', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              <FaTimes /> Annuler
            </button>
            <button type="submit" disabled={saving} style={{ backgroundColor: '#16a34a', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              <FaSave /> {saving ? 'Enregistrement...' : 'Créer la facture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FactureForm;