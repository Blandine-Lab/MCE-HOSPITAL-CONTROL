import { useState, useEffect } from 'react';
import api from '../../axios';

const ConsultationForm = ({ patientId, medecinId, onSave }) => {
    const [consultation, setConsultation] = useState({
        numero_dossier: '',
        plainte_principale: '',
        historique: '',
        antecedents: '',
        complement_anamnese: '',
        examen_physique: '',
        ccl: '',
        bilan: '',
        cat: '',
        medecin_consultant: ''
    });
    const [signesVitaux, setSignesVitaux] = useState({
        temperature: '',
        poids: '',
        taille: '',
        tension_systolique: '',
        tension_diastolique: '',
        frequence_cardiaque: '',
        date: ''
    });
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    // Logo path (dans le dossier public)
    const logoUrl = '/logo.jpeg';

    useEffect(() => {
        const fetchData = async () => {
            try {
                const patientRes = await api.get(`/patients/${patientId}`);
                setPatient(patientRes.data);

                const svRes = await api.get(`/signes-vitaux/patient/${patientId}`);
                if (svRes.data && svRes.data.length > 0) {
                    const dernier = svRes.data[0];
                    setSignesVitaux({
                        temperature: dernier.temperature || '',
                        poids: dernier.poids || '',
                        taille: dernier.taille || '',
                        tension_systolique: dernier.tension_systolique || '',
                        tension_diastolique: dernier.tension_diastolique || '',
                        frequence_cardiaque: dernier.frequence_cardiaque || '',
                        date: dernier.date_enregistrement ? new Date(dernier.date_enregistrement).toLocaleDateString('fr-FR') : ''
                    });
                }

                const consRes = await api.get(`/consultations/patient/${patientId}`);
                if (consRes.data && consRes.data.id) {
                    const data = consRes.data;
                    setConsultation({
                        numero_dossier: data.numero_dossier || `CONS-${new Date().getFullYear()}-${String(patientId).padStart(4, '0')}`,
                        plainte_principale: data.plainte_principale || '',
                        historique: data.historique || '',
                        antecedents: data.antecedents || '',
                        complement_anamnese: data.complement_anamnese || '',
                        examen_physique: data.examen_physique || '',
                        ccl: data.ccl || '',
                        bilan: data.bilan || '',
                        cat: data.cat || '',
                        medecin_consultant: data.medecin_consultant || ''
                    });
                } else {
                    const now = new Date();
                    const year = now.getFullYear();
                    // Générer un numéro de dossier (pour l'instant on incrémente un compteur)
                    const count = await api.get(`/consultations/count/${patientId}`);
                    const num = (count.data || 0) + 1;
                    setConsultation(prev => ({
                        ...prev,
                        numero_dossier: `CONS-${year}-${String(num).padStart(4, '0')}`
                    }));
                }
                setLoading(false);
            } catch (err) {
                console.error('Erreur chargement données consultation:', err);
                setLoading(false);
            }
        };
        fetchData();
    }, [patientId]);

    const handleChange = (e) => {
        setConsultation({ ...consultation, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const payload = {
                patient_id: patientId,
                medecin_id: medecinId || null,
                numero_dossier: consultation.numero_dossier,
                plainte_principale: consultation.plainte_principale,
                historique: consultation.historique,
                antecedents: consultation.antecedents,
                complement_anamnese: consultation.complement_anamnese,
                examen_physique: consultation.examen_physique,
                ccl: consultation.ccl,
                bilan: consultation.bilan,
                cat: consultation.cat,
                medecin_consultant: consultation.medecin_consultant,
            };
            await api.post('/consultations', payload);
            setMessage({ type: 'success', text: '✅ Consultation enregistrée avec succès' });
            if (onSave) onSave();
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Erreur : ' + (err.response?.data?.error || err.message) });
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const inputStyle = {
        width: '100%',
        padding: '6px 10px',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        fontSize: '14px',
        fontFamily: 'inherit',
        marginTop: '2px',
        backgroundColor: '#f9fafb'
    };
    const textareaStyle = {
        ...inputStyle,
        resize: 'vertical',
        minHeight: '60px'
    };
    const labelStyle = {
        display: 'block',
        fontWeight: '600',
        marginBottom: '2px',
        color: '#1f2937',
        fontSize: '13px'
    };
    const sectionStyle = {
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '16px',
        backgroundColor: '#ffffff'
    };

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>⏳ Chargement de la fiche...</div>;

    return (
        <div id="consultation-print" style={{ padding: '10px', backgroundColor: 'white', fontFamily: 'serif' }}>
            {/* En-tête avec le logo */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', borderBottom: '2px solid #1e3a8a', paddingBottom: '8px', marginBottom: '16px' }}>
                <img
                    src={logoUrl}
                    alt="Logo MCE"
                    style={{ height: '60px', width: 'auto', objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; console.warn('Logo non trouvé, vérifiez le chemin :', logoUrl); }}
                />
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a', margin: 0, letterSpacing: '1px' }}>🏥 HÔPITAL MCE</h1>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Medical Center Elizabeth – Bukavu</p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Avenue BOBZO, Quartier NDENDERE, Commune d'IBANDA, SUD-KIVU/RDC</p>
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
                    borderRadius: '6px',
                    marginBottom: '12px'
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* IDENTITE */}
                <div style={sectionStyle}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#1e3a8a', fontWeight: 'bold' }}>IDENTITE</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                            <label style={labelStyle}>Nom :</label>
                            <input type="text" value={patient ? `${patient.nom} ${patient.prenom}` : ''} readOnly style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>Sexe / Âge :</label>
                            <input type="text" value={patient ? `${patient.genre || 'N/C'} / ${patient.date_naissance ? new Date().getFullYear() - new Date(patient.date_naissance).getFullYear() : '?'} ans` : ''} readOnly style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>Poids (kg) :</label>
                            <input type="text" value={signesVitaux.poids ? `${signesVitaux.poids} kg` : 'N/C'} readOnly style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>Taille (cm) :</label>
                            <input type="text" value={signesVitaux.taille ? `${signesVitaux.taille} cm` : 'N/C'} readOnly style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Adresse :</label>
                            <input type="text" value={patient?.adresse || 'N/C'} readOnly style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>État civil / Contact :</label>
                            <input type="text" value={patient?.telephone || 'N/C'} readOnly style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                        <div>
                            <label style={labelStyle}>Signes vitaux :</label>
                            <input type="text" value={`T°: ${signesVitaux.temperature || '?'}°C - TA: ${signesVitaux.tension_systolique || '?'}/${signesVitaux.tension_diastolique || '?'} - Fc: ${signesVitaux.frequence_cardiaque || '?'} bpm`} readOnly style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />
                        </div>
                    </div>
                </div>

                {/* NOM DU MEDECIN CONSULTANT */}
                <div style={sectionStyle}>
                    <label style={labelStyle}>Nom du médecin consultant :</label>
                    <input type="text" name="medecin_consultant" value={consultation.medecin_consultant} onChange={handleChange} style={inputStyle} placeholder="Dr. ..." />
                </div>

                {/* PLAINTE PRINCIPALE */}
                <div style={sectionStyle}>
                    <label style={labelStyle}>PLAINTE PRINCIPALE :</label>
                    <textarea name="plainte_principale" value={consultation.plainte_principale} onChange={handleChange} style={textareaStyle} rows="3" placeholder="Plainte principale du patient..." />
                </div>

                {/* HISTORIQUE */}
                <div style={sectionStyle}>
                    <label style={labelStyle}>HISTORIQUE :</label>
                    <textarea name="historique" value={consultation.historique} onChange={handleChange} style={textareaStyle} rows="3" placeholder="Historique de la maladie..." />
                </div>

                {/* ANTECEDENT */}
                <div style={sectionStyle}>
                    <label style={labelStyle}>ANTECEDENT :</label>
                    <textarea name="antecedents" value={consultation.antecedents} onChange={handleChange} style={textareaStyle} rows="3" placeholder="Antécédents médicaux..." />
                </div>

                {/* COMPLEMENT D'ANAMNESE */}
                <div style={sectionStyle}>
                    <label style={labelStyle}>COMPLEMENT D'ANAMNESE :</label>
                    <textarea name="complement_anamnese" value={consultation.complement_anamnese} onChange={handleChange} style={textareaStyle} rows="3" placeholder="Compléments d'anamnèse..." />
                </div>

                {/* EXAMEN PHYSIQUE */}
                <div style={sectionStyle}>
                    <label style={labelStyle}>EXAMEN PHYSIQUE :</label>
                    <textarea name="examen_physique" value={consultation.examen_physique} onChange={handleChange} style={textareaStyle} rows="3" placeholder="Examen clinique..." />
                </div>

                {/* CCL (Conclusion) */}
                <div style={sectionStyle}>
                    <label style={labelStyle}>CCL :</label>
                    <textarea name="ccl" value={consultation.ccl} onChange={handleChange} style={textareaStyle} rows="2" placeholder="Conclusion / diagnostic..." />
                </div>

                {/* BILAN */}
                <div style={sectionStyle}>
                    <label style={labelStyle}>BILAN :</label>
                    <textarea name="bilan" value={consultation.bilan} onChange={handleChange} style={textareaStyle} rows="2" placeholder="Examens complémentaires demandés..." />
                </div>

                {/* CAT (Conduite à tenir) */}
                <div style={sectionStyle}>
                    <label style={labelStyle}>CAT :</label>
                    <textarea name="cat" value={consultation.cat} onChange={handleChange} style={textareaStyle} rows="2" placeholder="Conduite à tenir, traitement..." />
                </div>

                {/* Boutons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }} className="no-print">
                    <button type="submit" disabled={saving} style={{
                        backgroundColor: '#2563eb',
                        color: 'white',
                        padding: '10px 24px',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        opacity: saving ? 0.6 : 1
                    }}>
                        {saving ? 'Enregistrement...' : '💾 Enregistrer la consultation'}
                    </button>
                    <button type="button" onClick={handlePrint} style={{
                        backgroundColor: '#8b5cf6',
                        color: 'white',
                        padding: '10px 24px',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}>
                        🖨️ Imprimer
                    </button>
                </div>
            </form>

            <style>{`
                @media print {
                    /* Cacher tout sauf la zone d'impression */
                    body * {
                        visibility: hidden !important;
                    }
                    #consultation-print,
                    #consultation-print * {
                        visibility: visible !important;
                    }
                    #consultation-print {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 20mm !important;
                        background: white !important;
                        box-shadow: none !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    #consultation-print input, 
                    #consultation-print textarea {
                        border: none !important;
                        resize: none !important;
                        background: transparent !important;
                        box-shadow: none !important;
                        padding: 2px 0 !important;
                    }
                    #consultation-print label {
                        font-size: 11px !important;
                        color: #374151 !important;
                    }
                    #consultation-print h1 { font-size: 18px !important; }
                    #consultation-print h2 { font-size: 16px !important; }
                    #consultation-print h3 { font-size: 14px !important; }
                    #consultation-print .no-print { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default ConsultationForm;