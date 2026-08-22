import { useState, useEffect } from 'react';
import api from '../../axios';

const SignesVitauxForm = ({ patientId, consultationId = null, onSuccess }) => {
    const [form, setForm] = useState({
        temperature: '',
        poids: '',
        tension_systolique: '',
        tension_diastolique: '',
        taille: '',
        frequence_cardiaque: '',
        commentaire: ''
    });
    const [historique, setHistorique] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingHistorique, setLoadingHistorique] = useState(false);
    const [message, setMessage] = useState(null);

    // Charger l'historique des signes vitaux du patient
    useEffect(() => {
        if (patientId) {
            setLoadingHistorique(true);
            api.get(`/signes-vitaux/patient/${patientId}`)
                .then(res => {
                    setHistorique(res.data);
                    setLoadingHistorique(false);
                })
                .catch(err => {
                    console.error('Erreur chargement historique :', err);
                    setLoadingHistorique(false);
                });
        }
    }, [patientId]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            await api.post('/signes-vitaux', {
                patient_id: patientId,
                consultation_id: consultationId,
                ...form
            });
            setMessage({ type: 'success', text: '✅ Signes vitaux enregistrés avec succès' });
            setForm({
                temperature: '', poids: '', tension_systolique: '',
                tension_diastolique: '', taille: '', frequence_cardiaque: '',
                commentaire: ''
            });
            // Recharger l'historique
            const res = await api.get(`/signes-vitaux/patient/${patientId}`);
            setHistorique(res.data);
            if (onSuccess) onSuccess();
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Erreur : ' + (err.response?.data?.error || err.message) });
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        fontSize: '14px',
        marginTop: '4px'
    };

    return (
        <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>📝 Saisie des signes vitaux</h3>

            {message && (
                <div style={{
                    padding: '12px',
                    backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: message.type === 'success' ? '#166534' : '#991b1b',
                    borderRadius: '8px',
                    marginBottom: '16px'
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div>
                    <label style={{ fontWeight: 500 }}>🌡️ Température (°C)</label>
                    <input type="number" step="0.1" name="temperature" value={form.temperature} onChange={handleChange} style={inputStyle} placeholder="ex: 37.5" />
                </div>
                <div>
                    <label style={{ fontWeight: 500 }}>⚖️ Poids (kg)</label>
                    <input type="number" step="0.01" name="poids" value={form.poids} onChange={handleChange} style={inputStyle} placeholder="ex: 72.50" />
                </div>
                <div>
                    <label style={{ fontWeight: 500 }}>📏 Taille (cm)</label>
                    <input type="number" step="0.5" name="taille" value={form.taille} onChange={handleChange} style={inputStyle} placeholder="ex: 175" />
                </div>
                <div>
                    <label style={{ fontWeight: 500 }}>❤️ Fréquence cardiaque (bpm)</label>
                    <input type="number" name="frequence_cardiaque" value={form.frequence_cardiaque} onChange={handleChange} style={inputStyle} placeholder="ex: 72" />
                </div>
                <div>
                    <label style={{ fontWeight: 500 }}>🩸 Tension systolique</label>
                    <input type="number" name="tension_systolique" value={form.tension_systolique} onChange={handleChange} style={inputStyle} placeholder="ex: 120" />
                </div>
                <div>
                    <label style={{ fontWeight: 500 }}>🩸 Tension diastolique</label>
                    <input type="number" name="tension_diastolique" value={form.tension_diastolique} onChange={handleChange} style={inputStyle} placeholder="ex: 80" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontWeight: 500 }}>💬 Commentaire</label>
                    <textarea name="commentaire" value={form.commentaire} onChange={handleChange} rows="2" style={{ ...inputStyle, resize: 'vertical' }} placeholder="Observations..." />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <button type="submit" disabled={loading} style={{
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        padding: '10px 24px',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        opacity: loading ? 0.6 : 1
                    }}>
                        {loading ? 'Enregistrement...' : '💾 Enregistrer les signes vitaux'}
                    </button>
                </div>
            </form>

            <hr style={{ margin: '24px 0' }} />

            <h4 style={{ marginBottom: '12px' }}>📊 Historique des signes vitaux</h4>
            {loadingHistorique ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>Chargement...</div>
            ) : historique.length === 0 ? (
                <div style={{ color: '#6b7280', fontStyle: 'italic' }}>Aucun enregistrement pour ce patient.</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f1f5f9' }}>
                                <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Temp</th>
                                <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Poids</th>
                                <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Taille</th>
                                <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Tension</th>
                                <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>FC (bpm)</th>
                                <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Enregistré par</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historique.map(sv => (
                                <tr key={sv.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '8px' }}>{new Date(sv.date_enregistrement).toLocaleDateString('fr-FR')}</td>
                                    <td style={{ padding: '8px' }}>{sv.temperature ?? '-'} °C</td>
                                    <td style={{ padding: '8px' }}>{sv.poids ?? '-'} kg</td>
                                    <td style={{ padding: '8px' }}>{sv.taille ?? '-'} cm</td>
                                    <td style={{ padding: '8px' }}>{sv.tension_systolique ?? '-'}/{sv.tension_diastolique ?? '-'}</td>
                                    <td style={{ padding: '8px' }}>{sv.frequence_cardiaque ?? '-'}</td>
                                    <td style={{ padding: '8px' }}>{sv.enregistre_par_nom || 'Inconnu'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default SignesVitauxForm;