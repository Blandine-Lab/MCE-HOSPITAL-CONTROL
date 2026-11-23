// src/pages/medical/ConsultationForm.jsx
import { useState, useEffect, useRef } from 'react';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';

// ─── Helpers ────────────────────────────────────────────────
const calcAge = (dateNaissance) => {
    if (!dateNaissance) return null;
    const d = new Date(dateNaissance);
    if (isNaN(d)) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
};

const calcIMC = (poids, tailleCm) => {
    const p = parseFloat(poids);
    const t = parseFloat(tailleCm) / 100;
    if (!p || !t || t <= 0) return null;
    return +(p / (t * t)).toFixed(1);
};

const imcCategorie = (imc) => {
    if (imc === null) return { label: '', color: '#6b7280' };
    if (imc < 18.5) return { label: 'Insuffisance pondérale', color: '#d97706' };
    if (imc < 25)   return { label: 'Normal', color: '#059669' };
    if (imc < 30)   return { label: 'Surpoids', color: '#d97706' };
    return { label: 'Obésité', color: '#dc2626' };
};

// Alertes valeurs vitales (P0)
const alerteVitale = {
    temperature: (v) => {
        const n = parseFloat(v);
        if (!n) return null;
        if (n >= 38) return { color: '#dc2626', label: 'Fièvre' };
        if (n <= 35.5) return { color: '#dc2626', label: 'Hypothermie' };
        return null;
    },
    tension: (sys, dia) => {
        const s = parseInt(sys, 10), d = parseInt(dia, 10);
        if (!s || !d) return null;
        if (s >= 140 || d >= 90) return { color: '#dc2626', label: 'HTA' };
        if (s <= 90 || d <= 60) return { color: '#dc2626', label: 'Hypotension' };
        return null;
    },
    fc: (v) => {
        const n = parseInt(v, 10);
        if (!n) return null;
        if (n > 100) return { color: '#dc2626', label: 'Tachycardie' };
        if (n < 60) return { color: '#dc2626', label: 'Bradycardie' };
        return null;
    },
    fr: (v) => {
        const n = parseInt(v, 10);
        if (!n) return null;
        if (n > 20) return { color: '#dc2626', label: 'Polypnée' };
        if (n < 12) return { color: '#dc2626', label: 'Bradypnée' };
        return null;
    },
    spo2: (v) => {
        const n = parseInt(v, 10);
        if (!n) return null;
        if (n < 94) return { color: '#dc2626', label: 'Hypoxémie' };
        return null;
    },
    glycemie: (v) => {
        const n = parseFloat(v);
        if (!n) return null;
        if (n > 1.26) return { color: '#dc2626', label: 'Hyperglycémie' };
        if (n < 0.6) return { color: '#dc2626', label: 'Hypoglycémie' };
        return null;
    },
};

const ConsultationForm = ({ patientId, medecinId, onSave }) => {
    const { hopital } = useAuth();
    const draftKey = `consultation_draft_${patientId}`;
    const draftTimer = useRef(null);

    const [consultation, setConsultation] = useState({
        numero_dossier: '',
        motif_consultation: '',
        plainte_principale: '',
        historique: '',
        // Antécédents : on conserve `antecedents` (compat) et on ajoute les sous-champs
        antecedents: '',
        antecedents_medicaux: '',
        antecedents_chirurgicaux: '',
        antecedents_familiaux: '',
        allergies: '',
        traitements_en_cours: '',
        complement_anamnese: '',
        examen_physique: '',
        // Diagnostic structuré
        diagnostic_cim10_code: '',
        diagnostic_cim10_libelle: '',
        ccl: '',
        bilan: '',
        cat: '',
        prochain_rdv: '',
        consentement: false,
        medecin_consultant: '',
    });

    const [signesVitaux, setSignesVitaux] = useState({
        temperature: '', poids: '', taille: '',
        tension_systolique: '', tension_diastolique: '',
        frequence_cardiaque: '', frequence_respiratoire: '',
        spo2: '', glycemie: '',
        date: '',
    });

    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [draftRestored, setDraftRestored] = useState(false);

    // ─── Tenant-aware header ─────────────────────────────────
    const HOPITAL_NOM = hopital?.nom || import.meta.env.VITE_HOPITAL_NOM || 'Hôpital';
    const HOPITAL_ADRESSE = hopital?.adresse || hopital?.address || import.meta.env.VITE_HOPITAL_ADRESSE || '';
    const HOPITAL_VILLE = hopital?.ville || hopital?.city || '';
    const resolveLogoUrl = (raw) => {
        if (!raw) return `${window.location.origin}/logo.jpeg`;
        if (/^https?:\/\//i.test(raw)) return raw;
        return `${window.location.origin}${raw.startsWith('/') ? raw : '/' + raw}`;
    };
    const LOGO_URL = resolveLogoUrl(hopital?.logo_url);

    // ─── Chargement initial ──────────────────────────────────
    useEffect(() => {
        const fetchData = async () => {
            try {
                const patientRes = await api.get(`/patients/${patientId}`);
                setPatient(patientRes.data);

                // Signes vitaux : dernier enregistrement
                const svRes = await api.get(`/signes-vitaux/patient/${patientId}`);
                if (svRes.data && svRes.data.length > 0) {
                    const d = svRes.data[0];
                    setSignesVitaux({
                        temperature: d.temperature ?? '',
                        poids: d.poids ?? '',
                        taille: d.taille ?? '',
                        tension_systolique: d.tension_systolique ?? '',
                        tension_diastolique: d.tension_diastolique ?? '',
                        frequence_cardiaque: d.frequence_cardiaque ?? '',
                        frequence_respiratoire: d.frequence_respiratoire ?? '',
                        spo2: d.spo2 ?? '',
                        glycemie: d.glycemie ?? '',
                        date: d.date_enregistrement
                            ? new Date(d.date_enregistrement).toLocaleDateString('fr-FR')
                            : '',
                    });
                }

                // Consultation existante du jour ou création
                const consRes = await api.get(`/consultations/patient/${patientId}`);
                if (consRes.data && consRes.data.id) {
                    const data = consRes.data;
                    setConsultation(prev => ({
                        ...prev,
                        numero_dossier: data.numero_dossier || prev.numero_dossier,
                        motif_consultation: data.motif_consultation || '',
                        plainte_principale: data.plainte_principale || '',
                        historique: data.historique || '',
                        antecedents: data.antecedents || '',
                        antecedents_medicaux: data.antecedents_medicaux || '',
                        antecedents_chirurgicaux: data.antecedents_chirurgicaux || '',
                        antecedents_familiaux: data.antecedents_familiaux || '',
                        allergies: data.allergies || '',
                        traitements_en_cours: data.traitements_en_cours || '',
                        complement_anamnese: data.complement_anamnese || '',
                        examen_physique: data.examen_physique || '',
                        diagnostic_cim10_code: data.diagnostic_cim10_code || '',
                        diagnostic_cim10_libelle: data.diagnostic_cim10_libelle || '',
                        ccl: data.ccl || '',
                        bilan: data.bilan || '',
                        cat: data.cat || '',
                        prochain_rdv: data.prochain_rdv ? String(data.prochain_rdv).slice(0, 10) : '',
                        consentement: !!data.consentement,
                        medecin_consultant: data.medecin_consultant || '',
                    }));
                } else {
                    const now = new Date();
                    const count = await api.get(`/consultations/count/${patientId}`);
                    const num = (count.data || 0) + 1;
                    setConsultation(prev => ({
                        ...prev,
                        numero_dossier: `CONS-${now.getFullYear()}-${String(num).padStart(4, '0')}`,
                    }));
                }

                // Restauration brouillon local (si présent et non sauvegardé)
                const rawDraft = localStorage.getItem(draftKey);
                if (rawDraft) {
                    try {
                        const draft = JSON.parse(rawDraft);
                        setConsultation(prev => ({ ...prev, ...draft }));
                        setDraftRestored(true);
                    } catch (_) { /* ignore */ }
                }

                setLoading(false);
            } catch (err) {
                console.error('Erreur chargement consultation:', err);
                setLoading(false);
            }
        };
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId]);

    // ─── Brouillon auto (localStorage, 1s après dernière frappe) ─
    useEffect(() => {
        if (loading) return;
        if (draftTimer.current) clearTimeout(draftTimer.current);
        draftTimer.current = setTimeout(() => {
            localStorage.setItem(draftKey, JSON.stringify(consultation));
        }, 1000);
        return () => draftTimer.current && clearTimeout(draftTimer.current);
    }, [consultation, draftKey, loading]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setConsultation(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    // ─── Soumission ──────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation P0
        if (!consultation.motif_consultation.trim()) {
            setMessage({ type: 'error', text: '⚠️ Le motif de consultation est obligatoire.' });
            return;
        }
        if (!consultation.consentement) {
            setMessage({ type: 'error', text: '⚠️ Le consentement du patient doit être obtenu avant enregistrement.' });
            return;
        }

        setSaving(true);
        setMessage(null);
        try {
            const payload = {
                patient_id: patientId,
                medecin_id: medecinId || null,
                numero_dossier: consultation.numero_dossier,
                motif_consultation: consultation.motif_consultation || null,
                plainte_principale: consultation.plainte_principale || null,
                historique: consultation.historique || null,
                antecedents: consultation.antecedents || null,
                antecedents_medicaux: consultation.antecedents_medicaux || null,
                antecedents_chirurgicaux: consultation.antecedents_chirurgicaux || null,
                antecedents_familiaux: consultation.antecedents_familiaux || null,
                allergies: consultation.allergies || null,
                traitements_en_cours: consultation.traitements_en_cours || null,
                complement_anamnese: consultation.complement_anamnese || null,
                examen_physique: consultation.examen_physique || null,
                diagnostic_cim10_code: consultation.diagnostic_cim10_code || null,
                diagnostic_cim10_libelle: consultation.diagnostic_cim10_libelle || null,
                ccl: consultation.ccl || null,
                bilan: consultation.bilan || null,
                cat: consultation.cat || null,
                prochain_rdv: consultation.prochain_rdv || null,
                consentement: !!consultation.consentement,
                medecin_consultant: consultation.medecin_consultant || null,
            };
            await api.post('/consultations', payload);
            localStorage.removeItem(draftKey); // brouillon plus nécessaire
            setMessage({ type: 'success', text: '✅ Consultation enregistrée avec succès' });
            if (onSave) onSave();
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Erreur : ' + (err.response?.data?.error || err.message) });
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = () => window.print();

    // ─── Styles ──────────────────────────────────────────────
    const inputStyle = {
        width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1',
        borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit',
        marginTop: '2px', backgroundColor: '#f9fafb',
    };
    const textareaStyle = { ...inputStyle, resize: 'vertical', minHeight: '60px' };
    const labelStyle = {
        display: 'block', fontWeight: '600', marginBottom: '2px',
        color: '#1f2937', fontSize: '13px',
    };
    const sectionStyle = {
        border: '1px solid #e5e7eb', borderRadius: '8px',
        padding: '12px', marginBottom: '16px', backgroundColor: '#ffffff',
    };
    const alertBox = (color) => ({
        display: 'inline-block', marginLeft: '8px', padding: '1px 8px',
        borderRadius: '10px', fontSize: '11px', fontWeight: '700',
        backgroundColor: `${color}22`, color, border: `1px solid ${color}55`,
    });

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>⏳ Chargement de la fiche...</div>;

    // ─── Calculs dérivés ─────────────────────────────────────
    const age = patient?.date_naissance ? calcAge(patient.date_naissance) : null;
    const imc = calcIMC(signesVitaux.poids, signesVitaux.taille);
    const imcCat = imcCategorie(imc);
    const aTemp = alerteVitale.temperature(signesVitaux.temperature);
    const aTA = alerteVitale.tension(signesVitaux.tension_systolique, signesVitaux.tension_diastolique);
    const aFC = alerteVitale.fc(signesVitaux.frequence_cardiaque);
    const aFR = alerteVitale.fr(signesVitaux.frequence_respiratoire);
    const aSpO2 = alerteVitale.spo2(signesVitaux.spo2);
    const aGly = alerteVitale.glycemie(signesVitaux.glycemie);

    const allergiesRenseignees = consultation.allergies?.trim() || patient?.allergies?.trim();

    return (
        <div id="consultation-print" style={{ padding: '10px', backgroundColor: 'white', fontFamily: 'serif' }}>
            {/* 🔴 BANDEAU ALLERGIES — toujours visible, non imprimable en mode "saisie" */}
            <div
                style={{
                    backgroundColor: allergiesRenseignees ? '#fef2f2' : '#7f1d1d',
                    color: allergiesRenseignees ? '#991b1b' : 'white',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    border: '2px solid #dc2626',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}
            >
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <span style={{ flex: 1 }}>
                    {allergiesRenseignees
                        ? <>ALLERGIES : <span style={{ fontWeight: 'normal' }}>{allergiesRenseignees}</span></>
                        : <>ALLERGIES NON RENSEIGNÉES — à vérifier avant toute prescription</>}
                </span>
            </div>

            {draftRestored && (
                <div style={{
                    backgroundColor: '#fef3c7', color: '#92400e', padding: '8px 12px',
                    borderRadius: '6px', marginBottom: '12px', fontSize: '13px',
                }}>
                    ℹ️ Un brouillon local a été restauré. Vérifiez les informations avant d'enregistrer.
                </div>
            )}

            {/* En-tête tenant-aware */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', borderBottom: '2px solid #1e3a8a', paddingBottom: '8px', marginBottom: '16px' }}>
                <img src={LOGO_URL} alt={`Logo ${HOPITAL_NOM}`}
                    style={{ height: '60px', width: 'auto', objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }} />
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a', margin: 0, letterSpacing: '1px' }}>{HOPITAL_NOM}</h1>
                    {HOPITAL_VILLE && <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{HOPITAL_VILLE}</p>}
                    {HOPITAL_ADRESSE && <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{HOPITAL_ADRESSE}</p>}
                </div>
            </div>

            <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', color: '#1e3a8a', marginTop: '0', marginBottom: '4px' }}>📋 FICHE DE CONSULTATION</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '4px' }}>
                <span><strong>N° :</strong> {consultation.numero_dossier || 'N/A'}</span>
                <span><strong>Date :</strong> {new Date().toLocaleDateString('fr-FR')}</span>
            </div>

            {message && (
                <div style={{
                    padding: '10px',
                    backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: message.type === 'success' ? '#166534' : '#991b1b',
                    borderRadius: '6px', marginBottom: '12px',
                }}>{message.text}</div>
            )}

            <form onSubmit={handleSubmit}>
                {/* ── IDENTITÉ ───────────────────────────────── */}
                <div style={sectionStyle}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#1e3a8a', fontWeight: 'bold' }}>IDENTITÉ</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                            <label style={labelStyle}>Nom complet :</label>
                            <input type="text" readOnly
                                value={patient ? `${patient.nom || ''} ${patient.prenom || ''}`.trim() : ''}
                                style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>Sexe / Âge :</label>
                            <input type="text" readOnly
                                value={`${patient?.genre || patient?.sexe || 'N/C'} / ${age !== null ? age + ' ans' : 'N/C'}`}
                                style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>Date de naissance :</label>
                            <input type="text" readOnly
                                value={patient?.date_naissance ? new Date(patient.date_naissance).toLocaleDateString('fr-FR') : 'N/C'}
                                style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>Contact / État civil :</label>
                            <input type="text" readOnly
                                value={[patient?.telephone, patient?.etat_civil].filter(Boolean).join(' · ') || 'N/C'}
                                style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Adresse :</label>
                            <input type="text" readOnly value={patient?.adresse || 'N/C'}
                                style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                    </div>
                </div>

                {/* ── SIGNES VITAUX STRUCTURÉS (P0) ───────────── */}
                <div style={sectionStyle}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#1e3a8a', fontWeight: 'bold' }}>SIGNES VITAUX {signesVitaux.date && <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#6b7280' }}>— relevés du {signesVitaux.date}</span>}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        <div>
                            <label style={labelStyle}>Température (°C) {aTemp && <span style={alertBox(aTemp.color)}>{aTemp.label}</span>}</label>
                            <input type="number" step="0.1" readOnly value={signesVitaux.temperature}
                                style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>TA systolique (mmHg) {aTA && <span style={alertBox(aTA.color)}>{aTA.label}</span>}</label>
                            <input type="number" readOnly value={signesVitaux.tension_systolique}
                                style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>TA diastolique (mmHg)</label>
                            <input type="number" readOnly value={signesVitaux.tension_diastolique}
                                style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>Fréq. cardiaque (bpm) {aFC && <span style={alertBox(aFC.color)}>{aFC.label}</span>}</label>
                            <input type="number" readOnly value={signesVitaux.frequence_cardiaque}
                                style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>Fréq. respiratoire (/min) {aFR && <span style={alertBox(aFR.color)}>{aFR.label}</span>}</label>
                            <input type="number" readOnly value={signesVitaux.frequence_respiratoire}
                                style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>SpO₂ (%) {aSpO2 && <span style={alertBox(aSpO2.color)}>{aSpO2.label}</span>}</label>
                            <input type="number" readOnly value={signesVitaux.spo2}
                                style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>Glycémie (g/L) {aGly && <span style={alertBox(aGly.color)}>{aGly.label}</span>}</label>
                            <input type="number" step="0.01" readOnly value={signesVitaux.glycemie}
                                style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>Poids / Taille :</label>
                            <input type="text" readOnly
                                value={`${signesVitaux.poids || '?'} kg / ${signesVitaux.taille || '?'} cm`}
                                style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>IMC (calculé) :</label>
                            <input type="text" readOnly
                                value={imc !== null ? `${imc} kg/m² — ${imcCat.label}` : 'N/C'}
                                style={{ ...inputStyle, backgroundColor: '#f3f4f6', color: imcCat.color, fontWeight: 'bold' }} />
                        </div>
                    </div>
                </div>

                {/* ── MOTIF (P0 — nouveau) ────────────────────── */}
                <div style={sectionStyle}>
                    <label style={labelStyle}>MOTIF DE CONSULTATION <span style={{ color: 'red' }}>*</span> :</label>
                    <input type="text" name="motif_consultation" value={consultation.motif_consultation}
                        onChange={handleChange} style={inputStyle} required
                        placeholder="Ex : Fièvre depuis 3 jours, céphalées…" />
                </div>

                {/* ── MÉDECIN CONSULTANT ──────────────────────── */}
                <div style={sectionStyle}>
                    <label style={labelStyle}>Médecin consultant :</label>
                    <input type="text" name="medecin_consultant" value={consultation.medecin_consultant}
                        onChange={handleChange} style={inputStyle} placeholder="Dr. ..." />
                </div>

                {/* ── PLAINTE PRINCIPALE ──────────────────────── */}
                <div style={sectionStyle}>
                    <label style={labelStyle}>PLAINTE PRINCIPALE :</label>
                    <textarea name="plainte_principale" value={consultation.plainte_principale}
                        onChange={handleChange} style={textareaStyle} rows="3"
                        placeholder="Description de la plainte selon le patient…" />
                </div>

                {/* ── HISTOIRE DE LA MALADIE ──────────────────── */}
                <div style={sectionStyle}>
                    <label style={labelStyle}>HISTOIRE DE LA MALADIE :</label>
                    <textarea name="historique" value={consultation.historique}
                        onChange={handleChange} style={textareaStyle} rows="3"
                        placeholder="Début, évolution, facteurs aggravants/améliorants…" />
                </div>

                {/* ── ANTÉCÉDENTS (P1 — séparés) ──────────────── */}
                <div style={sectionStyle}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#1e3a8a', fontWeight: 'bold' }}>ANTÉCÉDENTS</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                            <label style={labelStyle}>Médicaux :</label>
                            <textarea name="antecedents_medicaux" value={consultation.antecedents_medicaux}
                                onChange={handleChange} style={textareaStyle} rows="2"
                                placeholder="HTA, diabète, asthme…" />
                        </div>
                        <div>
                            <label style={labelStyle}>Chirurgicaux :</label>
                            <textarea name="antecedents_chirurgicaux" value={consultation.antecedents_chirurgicaux}
                                onChange={handleChange} style={textareaStyle} rows="2"
                                placeholder="Appendicectomie 2018…" />
                        </div>
                        <div>
                            <label style={labelStyle}>Familiaux :</label>
                            <textarea name="antecedents_familiaux" value={consultation.antecedents_familiaux}
                                onChange={handleChange} style={textareaStyle} rows="2"
                                placeholder="Père diabétique, mère HTA…" />
                        </div>
                        <div>
                            <label style={labelStyle}>Autres (libre) :</label>
                            <textarea name="antecedents" value={consultation.antecedents}
                                onChange={handleChange} style={textareaStyle} rows="2"
                                placeholder="Gynéco-obstétricaux, allergiques, etc." />
                        </div>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                        <label style={labelStyle}>Allergies (médicamenteuses / alimentaires / autres) :</label>
                        <input type="text" name="allergies" value={consultation.allergies}
                            onChange={handleChange} style={inputStyle}
                            placeholder="Ex : Pénicilline, arachides…" />
                    </div>
                    <div style={{ marginTop: '8px' }}>
                        <label style={labelStyle}>Traitements en cours :</label>
                        <textarea name="traitements_en_cours" value={consultation.traitements_en_cours}
                            onChange={handleChange} style={textareaStyle} rows="2"
                            placeholder="Nom du médicament, dose, fréquence…" />
                    </div>
                </div>

                {/* ── COMPLÉMENT D'ANAMNÈSE ───────────────────── */}
                <div style={sectionStyle}>
                    <label style={labelStyle}>COMPLÉMENT D'ANAMNÈSE :</label>
                    <textarea name="complement_anamnese" value={consultation.complement_anamnese}
                        onChange={handleChange} style={textareaStyle} rows="3"
                        placeholder="Interrogatoire complémentaire…" />
                </div>

                {/* ── EXAMEN PHYSIQUE ─────────────────────────── */}
                <div style={sectionStyle}>
                    <label style={labelStyle}>EXAMEN PHYSIQUE :</label>
                    <textarea name="examen_physique" value={consultation.examen_physique}
                        onChange={handleChange} style={textareaStyle} rows="4"
                        placeholder="Général, cardio, respi, abdo, neuro…" />
                </div>

                {/* ── DIAGNOSTIC CIM-10 (P1) ──────────────────── */}
                <div style={sectionStyle}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#1e3a8a', fontWeight: 'bold' }}>DIAGNOSTIC</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px' }}>
                        <div>
                            <label style={labelStyle}>Code CIM-10 :</label>
                            <input type="text" name="diagnostic_cim10_code"
                                value={consultation.diagnostic_cim10_code}
                                onChange={handleChange} style={inputStyle}
                                placeholder="Ex : B50.9" />
                        </div>
                        <div>
                            <label style={labelStyle}>Libellé :</label>
                            <input type="text" name="diagnostic_cim10_libelle"
                                value={consultation.diagnostic_cim10_libelle}
                                onChange={handleChange} style={inputStyle}
                                placeholder="Ex : Paludisme à Plasmodium falciparum" />
                        </div>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                        <label style={labelStyle}>Conclusion (CCL) :</label>
                        <textarea name="ccl" value={consultation.ccl}
                            onChange={handleChange} style={textareaStyle} rows="2"
                            placeholder="Synthèse diagnostique…" />
                    </div>
                </div>

                {/* ── BILAN ───────────────────────────────────── */}
                <div style={sectionStyle}>
                    <label style={labelStyle}>BILAN (examens complémentaires demandés) :</label>
                    <textarea name="bilan" value={consultation.bilan}
                        onChange={handleChange} style={textareaStyle} rows="2"
                        placeholder="NFS, goutte épaisse, écho…" />
                </div>

                {/* ── CAT ─────────────────────────────────────── */}
                <div style={sectionStyle}>
                    <label style={labelStyle}>CONDUITE À TENIR / TRAITEMENT :</label>
                    <textarea name="cat" value={consultation.cat}
                        onChange={handleChange} style={textareaStyle} rows="3"
                        placeholder="Traitement, recommandations, orientation…" />
                </div>

                {/* ── SUIVI + CONSENTEMENT ────────────────────── */}
                <div style={sectionStyle}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#1e3a8a', fontWeight: 'bold' }}>SUIVI</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                            <label style={labelStyle}>Prochain rendez-vous :</label>
                            <input type="date" name="prochain_rdv" value={consultation.prochain_rdv}
                                onChange={handleChange} style={inputStyle} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '6px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>
                                <input type="checkbox" name="consentement"
                                    checked={consultation.consentement} onChange={handleChange}
                                    style={{ width: '18px', height: '18px' }} />
                                Consentement éclairé du patient obtenu <span style={{ color: 'red' }}>*</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* ── ACTIONS ─────────────────────────────────── */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }} className="no-print">
                    <button type="submit" disabled={saving} style={{
                        backgroundColor: '#2563eb', color: 'white', padding: '10px 24px',
                        border: 'none', borderRadius: '8px', fontWeight: 'bold',
                        cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
                    }}>
                        {saving ? 'Enregistrement…' : '💾 Enregistrer la consultation'}
                    </button>
                    <button type="button" onClick={handlePrint} style={{
                        backgroundColor: '#8b5cf6', color: 'white', padding: '10px 24px',
                        border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
                    }}>
                        🖨️ Imprimer
                    </button>
                </div>
            </form>

            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #consultation-print, #consultation-print * { visibility: visible !important; }
                    #consultation-print {
                        position: absolute; left: 0; top: 0; width: 100%;
                        padding: 20mm !important; background: white !important; box-shadow: none !important;
                    }
                    .no-print { display: none !important; }
                    #consultation-print input, #consultation-print textarea {
                        border: none !important; resize: none !important;
                        background: transparent !important; box-shadow: none !important;
                        padding: 2px 0 !important;
                    }
                    #consultation-print label { font-size: 11px !important; color: #374151 !important; }
                    #consultation-print h1 { font-size: 18px !important; }
                    #consultation-print h2 { font-size: 16px !important; }
                    #consultation-print h3 { font-size: 14px !important; }
                }
            `}</style>
        </div>
    );
};

export default ConsultationForm;