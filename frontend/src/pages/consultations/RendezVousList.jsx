import { useEffect, useState } from 'react';
import api from '../../axios';
import SignesVitauxForm from '../consultations/SignesVitauxForm';

// Utilitaire : accepte un tableau brut OU { data: [...] }
const asArray = (d) =>
  Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];

const RendezVousList = () => {
  const [rdvs, setRdvs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [medecins, setMedecins] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({
    patient_id: '',
    medecin_id: '',
    service_id: '',
    date_rdv: '',
    motif: '',
    type_consultation: 'générale',
    categorie: 'ambulatoire',
    prix: 50.0,
  });
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [selectedPatientId, setSelectedPatientId] = useState(null); // formulaire
  const [selectedPatientFromList, setSelectedPatientFromList] = useState(null); // tableau

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  // ================== CHARGEMENT INITIAL ==================
  useEffect(() => {
    const fetchData = async () => {
      // Essaie plusieurs routes dans l'ordre et renvoie la 1ère qui donne des données
      const tryRoutes = async (routes) => {
        for (const url of routes) {
          try {
            const res = await api.get(url);
            const arr = asArray(res.data);
            if (arr.length > 0) {
              console.log(`✅ ${url} → ${arr.length} élément(s)`);
              return arr;
            } else {
              console.warn(`⚠️ ${url} → tableau vide`);
            }
          } catch (err) {
            console.warn(
              `❌ ${url} → ${err.response?.status || err.message}`
            );
          }
        }
        return [];
      };

      const [patientsArr, medecinsArr, servicesArr] = await Promise.all([
        tryRoutes(['/patients', '/admin/patients']),
        tryRoutes([
          '/consultations/medecins/all',
          '/consultations/medecins',
          '/admin/medecins',
        ]),
        tryRoutes([
          '/consultations/services/all',
          '/consultations/services',
          '/admin/services',
        ]),
      ]);

      setPatients(patientsArr);
      setMedecins(medecinsArr);
      setServices(servicesArr);

      console.log('👥 Patients chargés :', patientsArr.length);
      console.log('🩺 Médecins chargés :', medecinsArr.length);
      console.log('🏥 Services chargés :', servicesArr.length);

      setLoaded(true);
    };

    fetchData();
    fetchRdvs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ================== FETCH RDV ==================
  const fetchRdvs = async () => {
    try {
      const res = await api.get('/consultations/rendezvous');
      setRdvs(asArray(res.data));
    } catch (err) {
      console.error('Erreur fetch rdvs:', err);
      try {
        const res2 = await api.get('/consultations/rendezvous/all');
        setRdvs(asArray(res2.data));
      } catch (err2) {
        console.error('Fallback rdvs échoué:', err2);
        const msg =
          err.response?.data?.error || 'Erreur chargement rendez-vous';
        showToast('❌ ' + msg, 'error');
      }
    }
  };

  // ================== SOUMISSION ==================
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        patient_id: form.patient_id || null,
        medecin_id: form.medecin_id || null,
        service_id: form.service_id || null,
        date_rdv: form.date_rdv,
        motif: form.motif || '',
        type_consultation: form.type_consultation || 'générale',
        categorie: form.categorie || 'ambulatoire',
        prix: form.prix || 50.0,
      };

      await api.post('/consultations/rendezvous', payload);
      setForm({
        patient_id: '',
        medecin_id: '',
        service_id: '',
        date_rdv: '',
        motif: '',
        type_consultation: 'générale',
        categorie: 'ambulatoire',
        prix: 50.0,
      });
      setSelectedPatientId(null);
      await fetchRdvs();
      showToast('Rendez-vous ajouté avec succès');
    } catch (err) {
      console.error('Erreur ajout rendez-vous:', err);
      const msg = err.response?.data?.error || "Erreur lors de l'ajout";
      showToast('❌ ' + msg, 'error');
    }
  };

  // ================== STATUT ==================
  const updateStatut = async (id, statut) => {
    try {
      await api.put(`/consultations/rendezvous/${id}`, { statut });
      await fetchRdvs();
      const label = statut === 'confirme' ? 'confirmé' : 'annulé';
      showToast(`Rendez-vous ${label}`);
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
      const msg =
        err.response?.data?.error || 'Erreur lors de la mise à jour';
      showToast('❌ ' + msg, 'error');
    }
  };

  // ================== STYLES ==================
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f0f9ff',
    padding: '32px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };
  const innerStyle = { maxWidth: '1400px', margin: '0 auto' };
  const titleStyle = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e3a8a',
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
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    alignItems: 'end',
  };
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  };
  const buttonStyle = {
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.1s',
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
    backgroundColor: '#1e3a8a',
    color: 'white',
    padding: '12px 8px',
    textAlign: 'left',
    border: '1px solid #1e40af',
  };
  const tdStyle = {
    padding: '10px 8px',
    border: '1px solid #e2e8f0',
  };
  const statusBadge = (statut) => {
    const colors = {
      planifie: { bg: '#fef9c3', text: '#854d0e' },
      confirme: { bg: '#dcfce7', text: '#166534' },
      annule: { bg: '#fee2e2', text: '#991b1b' },
    };
    const s = colors[statut] || colors.planifie;
    return {
      backgroundColor: s.bg,
      color: s.text,
      padding: '4px 8px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 'bold',
      display: 'inline-block',
    };
  };
  const actionButtonStyle = (color) => ({
    backgroundColor: color,
    color: 'white',
    border: 'none',
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    marginRight: '6px',
    transition: 'opacity 0.2s',
  });

  const getServiceName = (rdv) => {
    if (rdv.service_nom) return rdv.service_nom;
    if (rdv.service_id) {
      const service = services.find((s) => s.id === rdv.service_id);
      return service ? service.nom : '-';
    }
    return '-';
  };

  // ================== RENDER ==================
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
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: 1000,
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          {toast}
        </div>
      )}

      <div style={innerStyle}>
        <h1 style={titleStyle}>📅 Planification des rendez-vous</h1>

        {/* ============ FORMULAIRE ============ */}
        <form onSubmit={handleSubmit} style={formStyle}>
          {/* PATIENTS */}
          <select
            required
            value={form.patient_id}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, patient_id: val });
              setSelectedPatientId(val || null);
            }}
            style={inputStyle}
          >
            <option value="">Patient ({patients.length})</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom} {p.prenom}
              </option>
            ))}
          </select>

          {/* MEDECINS */}
          <select
            value={form.medecin_id}
            onChange={(e) => setForm({ ...form, medecin_id: e.target.value })}
            style={inputStyle}
          >
            <option value="">Médecin ({medecins.length})</option>
            {medecins.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom} {m.prenom}
                {m.specialite ? ` — ${m.specialite}` : ''}
              </option>
            ))}
          </select>

          {/* SERVICES */}
          <select
            value={form.service_id}
            onChange={(e) => setForm({ ...form, service_id: e.target.value })}
            style={inputStyle}
          >
            <option value="">Service ({services.length})</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>

          {/* DATE */}
          <input
            type="datetime-local"
            required
            value={form.date_rdv}
            onChange={(e) => setForm({ ...form, date_rdv: e.target.value })}
            style={inputStyle}
          />

          {/* MOTIF */}
          <input
            type="text"
            placeholder="Motif"
            value={form.motif}
            onChange={(e) => setForm({ ...form, motif: e.target.value })}
            style={inputStyle}
          />

          {/* TYPE */}
          <select
            value={form.type_consultation}
            onChange={(e) =>
              setForm({ ...form, type_consultation: e.target.value })
            }
            style={inputStyle}
          >
            <option value="générale">Générale</option>
            <option value="spécialiste">Spécialiste</option>
            <option value="urgence">Urgence</option>
            <option value="suivi">Suivi</option>
            <option value="téléconsultation">Téléconsultation</option>
          </select>

          {/* CATEGORIE */}
          <select
            value={form.categorie}
            onChange={(e) => setForm({ ...form, categorie: e.target.value })}
            style={inputStyle}
          >
            <option value="ambulatoire">Ambulatoire</option>
            <option value="hospitalisation">Hospitalisation</option>
          </select>

          {/* PRIX */}
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Prix (FC)"
            value={form.prix}
            onChange={(e) =>
              setForm({ ...form, prix: parseFloat(e.target.value) || 0 })
            }
            style={inputStyle}
          />

          <button
            type="submit"
            style={buttonStyle}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#1d4ed8')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#2563eb')}
          >
            ➕ Ajouter RDV
          </button>
        </form>

        {/* ============ SIGNES VITAUX (depuis formulaire) ============ */}
        {selectedPatientId && (
          <div style={{ marginTop: 20, marginBottom: 30 }}>
            <SignesVitauxForm
              patientId={parseInt(selectedPatientId)}
              consultationId={null}
              onSuccess={() => console.log('Signes vitaux mis à jour')}
            />
          </div>
        )}

        {/* ============ TABLEAU ============ */}
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Patient</th>
                <th style={thStyle}>Médecin</th>
                <th style={thStyle}>Service</th>
                <th style={thStyle}>Motif</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Catégorie</th>
                <th style={thStyle}>Prix</th>
                <th style={thStyle}>Statut</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rdvs.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    style={{
                      ...tdStyle,
                      textAlign: 'center',
                      padding: 24,
                      color: '#64748b',
                    }}
                  >
                    {loaded
                      ? 'Aucun rendez-vous pour le moment.'
                      : 'Chargement…'}
                  </td>
                </tr>
              )}
              {rdvs.map((r, idx) => (
                <tr
                  key={r.id}
                  style={{
                    backgroundColor:
                      idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = '#f1f5f9')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      idx % 2 === 0 ? '#ffffff' : '#f8fafc')
                  }
                >
                  <td style={tdStyle}>
                    {new Date(r.date_rdv).toLocaleString()}
                  </td>
                  <td style={tdStyle}>
                    {r.patient_nom} {r.patient_prenom}
                  </td>
                  <td style={tdStyle}>
                    {r.medecin_nom} {r.medecin_prenom}
                  </td>
                  <td style={tdStyle}>{getServiceName(r)}</td>
                  <td style={tdStyle}>{r.motif}</td>
                  <td style={tdStyle}>
                    {r.type_consultation || 'générale'}
                  </td>
                  <td style={tdStyle}>{r.categorie || 'ambulatoire'}</td>
                  <td style={tdStyle}>
                    {r.prix
                      ? parseFloat(r.prix).toFixed(2) + ' FC'
                      : '50.00 FC'}
                  </td>
                  <td style={tdStyle}>
                    <span style={statusBadge(r.statut)}>
                      {r.statut || 'planifie'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {r.statut === 'planifie' && (
                      <>
                        <button
                          onClick={() => updateStatut(r.id, 'confirme')}
                          style={actionButtonStyle('#22c55e')}
                          onMouseEnter={(e) =>
                            (e.target.style.opacity = 0.8)
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.opacity = 1)
                          }
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => updateStatut(r.id, 'annule')}
                          style={actionButtonStyle('#ef4444')}
                          onMouseEnter={(e) =>
                            (e.target.style.opacity = 0.8)
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.opacity = 1)
                          }
                        >
                          Annuler
                        </button>
                      </>
                    )}
                    <button
                      onClick={() =>
                        setSelectedPatientFromList(r.patient_id)
                      }
                      style={{
                        backgroundColor: '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        marginLeft: '6px',
                      }}
                    >
                      📊 Signes vitaux
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ============ SIGNES VITAUX (depuis tableau) ============ */}
        {selectedPatientFromList && (
          <div
            style={{
              marginTop: 30,
              padding: '20px',
              backgroundColor: 'white',
              borderRadius: '16px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ margin: 0 }}>📊 Signes vitaux du patient</h3>
              <button
                onClick={() => setSelectedPatientFromList(null)}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                ✕ Fermer
              </button>
            </div>
            <SignesVitauxForm
              patientId={parseInt(selectedPatientFromList)}
              consultationId={null}
              onSuccess={() => console.log('Signes vitaux mis à jour')}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default RendezVousList;