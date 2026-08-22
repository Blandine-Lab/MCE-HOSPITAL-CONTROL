import React, { useState, useEffect, useRef } from 'react';
import api from '../../axios';
import { FaSave, FaPrint, FaArrowLeft } from 'react-icons/fa';

const FicheConsultation = ({ patientId, consultationId = null, onClose }) => {
    const [form, setForm] = useState({
        plainte_principale: '',
        historique_maladie: '',
        antecedents: '',
        complement_anamnese: '',
        examen_physique: '',
        conclusion: '',
        traitement_prescrit: '',
        recommandations: '',
        motif: '',
        type_consultation: 'Générale',
        statut: 'en_cours'
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [consultation, setConsultation] = useState(null);
    const printRef = useRef();

    // Charger les données si consultationId existe
    useEffect(() => {
        if (consultationId) {
            setLoading(true);
            api.get(`/consultations/${consultationId}`)
                .then(res => {
                    setConsultation(res.data);
                    setForm(prev => ({
                        ...prev,
                        ...res.data,
                        motif: res.data.motif || '',
                        type_consultation: res.data.type_consultation || 'Générale',
                        statut: res.data.statut || 'en_cours'
                    }));
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Erreur chargement consultation:', err);
                    setLoading(false);
                });
        }
    }, [consultationId]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                patient_id: patientId,
                medecin_id: JSON.parse(atob(localStorage.getItem('token').split('.')[1])).id,
                date: new Date().toISOString(),
                ...form
            };

            let res;
            if (consultationId) {
                res = await api.put(`/consultations/${consultationId}`, payload);
            } else {
                res = await api.post('/consultations', payload);
            }
            setConsultation(res.data);
            alert('✅ Consultation sauvegardée avec succès');
            if (onClose) onClose();
        } catch (err) {
            console.error('Erreur sauvegarde:', err);
            alert('❌ Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const styles = {
        container: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
            marginBottom: '20px',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '2px solid #1e3a8a',
            paddingBottom: '12px',
        },
        title: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#1e3a8a',
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
        },
        fullWidth: {
            gridColumn: '1 / -1',
        },
        label: {
            display: 'block',
            fontWeight: '500',
            marginBottom: '4px',
            color: '#1f2937',
        },
        input: {
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
        },
        textarea: {
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            resize: 'vertical',
            minHeight: '80px',
        },
        button: {
            backgroundColor: '#2563eb',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
        },
        printButton: {
            backgroundColor: '#f59e0b',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginLeft: '12px',
        },
        closeButton: {
            backgroundColor: '#ef4444',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
        },
        printArea: {
            padding: '20mm',
            fontFamily: 'system-ui, -apple-system, sans-serif',
        },
        printHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid #1e3a8a',
            paddingBottom: '12px',
            marginBottom: '20px',
        },
        printTitle: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#1e3a8a',
        },
        printSection: {
            marginBottom: '16px',
        },
        printLabel: {
            fontWeight: 'bold',
            fontSize: '14px',
            color: '#1f2937',
        },
        printValue: {
            fontSize: '14px',
            marginTop: '4px',
            padding: '8px',
            backgroundColor: '#f8fafc',
            borderRadius: '4px',
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>⏳ Chargement...</div>;

    return (
        <div style={styles.container} ref={printRef}>
            <div style={styles.header}>
                <h2 style={styles.title}>📋 Fiche de consultation</h2>
                <div>
                    <button onClick={handlePrint} style={styles.printButton}>
                        <FaPrint /> Imprimer
                    </button>
                    {onClose && (
                        <button onClick={onClose} style={styles.closeButton}>✕ Fermer</button>
                    )}
                </div>
            </div>

            {/* Contenu imprimable */}
            <div id="printable-area">
                <form onSubmit={handleSubmit}>
                    {/* Motif et type */}
                    <div style={styles.grid}>
                        <div>
                            <label style={styles.label}>Motif de la consultation</label>
                            <input
                                type="text"
                                name="motif"
                                value={form.motif}
                                onChange={handleChange}
                                style={styles.input}
                                placeholder="Motif principal..."
                            />
                        </div>
                        <div>
                            <label style={styles.label}>Type de consultation</label>
                            <select
                                name="type_consultation"
                                value={form.type_consultation}
                                onChange={handleChange}
                                style={styles.input}
                            >
                                <option value="Générale">Générale</option>
                                <option value="Spécialiste">Spécialiste</option>
                                <option value="Urgence">Urgence</option>
                                <option value="Suivi">Suivi</option>
                            </select>
                        </div>
                    </div>

                    {/* Plainte principale */}
                    <div style={{ marginTop: '16px' }}>
                        <label style={styles.label}>Plainte principale</label>
                        <textarea
                            name="plainte_principale"
                            value={form.plainte_principale}
                            onChange={handleChange}
                            style={styles.textarea}
                            rows="3"
                            placeholder="Décrire la plainte principale du patient..."
                        />
                    </div>

                    {/* Historique */}
                    <div style={{ marginTop: '16px' }}>
                        <label style={styles.label}>Historique de la maladie</label>
                        <textarea
                            name="historique_maladie"
                            value={form.historique_maladie}
                            onChange={handleChange}
                            style={styles.textarea}
                            rows="3"
                            placeholder="Évolution de la maladie..."
                        />
                    </div>

                    {/* Antécédents */}
                    <div style={{ marginTop: '16px' }}>
                        <label style={styles.label}>Antécédents</label>
                        <textarea
                            name="antecedents"
                            value={form.antecedents}
                            onChange={handleChange}
                            style={styles.textarea}
                            rows="3"
                            placeholder="Antécédents médicaux, chirurgicaux, allergiques..."
                        />
                    </div>

                    {/* Complément d'anamnèse */}
                    <div style={{ marginTop: '16px' }}>
                        <label style={styles.label}>Complément d'anamnèse</label>
                        <textarea
                            name="complement_anamnese"
                            value={form.complement_anamnese}
                            onChange={handleChange}
                            style={styles.textarea}
                            rows="3"
                            placeholder="Informations complémentaires..."
                        />
                    </div>

                    {/* Examen physique */}
                    <div style={{ marginTop: '16px' }}>
                        <label style={styles.label}>Examen physique</label>
                        <textarea
                            name="examen_physique"
                            value={form.examen_physique}
                            onChange={handleChange}
                            style={styles.textarea}
                            rows="3"
                            placeholder="Résultats de l'examen clinique..."
                        />
                    </div>

                    {/* Conclusion */}
                    <div style={{ marginTop: '16px' }}>
                        <label style={styles.label}>Conclusion / Diagnostic</label>
                        <textarea
                            name="conclusion"
                            value={form.conclusion}
                            onChange={handleChange}
                            style={styles.textarea}
                            rows="2"
                            placeholder="Conclusion du médecin..."
                        />
                    </div>

                    {/* Traitement prescrit */}
                    <div style={{ marginTop: '16px' }}>
                        <label style={styles.label}>Traitement prescrit</label>
                        <textarea
                            name="traitement_prescrit"
                            value={form.traitement_prescrit}
                            onChange={handleChange}
                            style={styles.textarea}
                            rows="2"
                            placeholder="Médicaments, posologie, durée..."
                        />
                    </div>

                    {/* Recommandations */}
                    <div style={{ marginTop: '16px' }}>
                        <label style={styles.label}>Recommandations</label>
                        <textarea
                            name="recommandations"
                            value={form.recommandations}
                            onChange={handleChange}
                            style={styles.textarea}
                            rows="2"
                            placeholder="Conseils, prochains rendez-vous, etc."
                        />
                    </div>

                    {/* Boutons */}
                    <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                        <button type="submit" style={styles.button} disabled={saving}>
                            <FaSave /> {saving ? 'Sauvegarde...' : 'Sauvegarder la consultation'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Styles pour l'impression */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-area, #printable-area * {
                        visibility: visible;
                    }
                    #printable-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 20mm !important;
                        background: white !important;
                    }
                    #printable-area textarea, #printable-area input {
                        border: none !important;
                        background: transparent !important;
                        resize: none !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    button {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default FicheConsultation;