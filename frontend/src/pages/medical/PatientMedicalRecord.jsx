// src/pages/medical/PatientMedicalRecord.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { 
  FaArrowLeft, FaUser, FaCalendar, FaPhone, FaFileMedical, 
  FaPrescription, FaStethoscope, FaFlask, FaFileInvoice,
  FaHospital, FaClipboardList, FaExclamationTriangle,
  FaInfoCircle, FaHistory, FaPills
} from 'react-icons/fa';

const PatientMedicalRecord = () => {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info');

  // Données cliniques
  const [consultations, setConsultations] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [examens, setExamens] = useState([]);
  const [ordonnances, setOrdonnances] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [loadingData, setLoadingData] = useState({});

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        setLoading(true);
        // Patient
        const patientRes = await api.get(`/patients/${id}`);
        setPatient(patientRes.data);

        // Charger les données associées
        await Promise.all([
          fetchConsultations(id),
          fetchPrescriptions(id),
          fetchExamens(id),
          fetchOrdonnances(id),
          fetchAdmissions(id)
        ]);

        setLoading(false);
      } catch (err) {
        console.error('❌ Erreur chargement dossier patient :', err);
        setError('Impossible de charger le dossier du patient');
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [id]);

  const fetchConsultations = async (patientId) => {
    try {
      const res = await api.get(`/consultations/patient/${patientId}`);
      setConsultations(res.data || []);
    } catch (err) {
      console.warn('⚠️ Erreur consultations :', err.message);
      setConsultations([]);
    }
  };

  const fetchPrescriptions = async (patientId) => {
    try {
      // ✅ Correction : ajout du préfixe /consultations/
      const res = await api.get(`/consultations/prescriptions/patient/${patientId}`);
      setPrescriptions(res.data || []);
    } catch (err) {
      console.warn('⚠️ Erreur prescriptions :', err.message);
      setPrescriptions([]);
    }
  };

  const fetchExamens = async (patientId) => {
    try {
      const res = await api.get(`/examens/patient/${patientId}`);
      setExamens(res.data || []);
    } catch (err) {
      console.warn('⚠️ Erreur examens :', err.message);
      setExamens([]);
    }
  };

  const fetchOrdonnances = async (patientId) => {
    try {
      // ✅ Correction : ajout du préfixe /consultations/
      const res = await api.get(`/consultations/ordonnances/patient/${patientId}`);
      setOrdonnances(res.data || []);
    } catch (err) {
      console.warn('⚠️ Erreur ordonnances :', err.message);
      setOrdonnances([]);
    }
  };

  const fetchAdmissions = async (patientId) => {
    try {
      const res = await api.get(`/consultations/admissions/patient/${patientId}`);
      setAdmissions(res.data || []);
    } catch (err) {
      console.warn('⚠️ Erreur admissions :', err.message);
      setAdmissions([]);
    }
  };

  const getStatusBadge = (statut) => {
    const colors = {
      'planifié': { bg: '#fef9c3', text: '#854d0e' },
      'confirme': { bg: '#dbeafe', text: '#1e40af' },
      'terminé': { bg: '#d1fae5', text: '#065f46' },
      'annulé': { bg: '#fee2e2', text: '#991b1b' },
      'demandé': { bg: '#fef3c7', text: '#92400e' },
      'en_cours': { bg: '#dbeafe', text: '#1e40af' },
      'valide': { bg: '#d1fae5', text: '#065f46' },
      'payee': { bg: '#d1fae5', text: '#065f46' },
      'impayee': { bg: '#fee2e2', text: '#991b1b' },
    };
    const s = colors[statut] || colors['planifié'];
    return { backgroundColor: s.bg, color: s.text, padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' };
  };

  const TabButton = ({ tab, label, icon: Icon, count }) => (
    <button
      onClick={() => setActiveTab(tab)}
      style={{
        padding: '10px 20px',
        border: 'none',
        borderBottom: activeTab === tab ? '3px solid #3b82f6' : '3px solid transparent',
        backgroundColor: activeTab === tab ? '#eff6ff' : 'transparent',
        color: activeTab === tab ? '#1e40af' : '#64748b',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontWeight: activeTab === tab ? '600' : '400',
        borderRadius: '8px 8px 0 0',
        transition: 'all 0.2s',
        fontSize: '14px',
      }}
      onMouseEnter={(e) => {
        if (activeTab !== tab) e.currentTarget.style.backgroundColor = '#f1f5f9';
      }}
      onMouseLeave={(e) => {
        if (activeTab !== tab) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <Icon /> {label} {count !== undefined && count > 0 && (
        <span style={{
          backgroundColor: '#3b82f6',
          color: 'white',
          borderRadius: '50%',
          padding: '0 6px',
          fontSize: '11px',
          fontWeight: 'bold',
        }}>{count}</span>
      )}
    </button>
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '24px' }}>⏳ Chargement du dossier...</div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ef4444' }}>
        <div style={{ fontSize: '20px' }}>{error || 'Patient non trouvé'}</div>
      </div>
    );
  }

  // Calcul des totaux pour les onglets
  const counts = {
    consultations: consultations.filter(c => c.statut !== 'annulé').length,
    prescriptions: prescriptions.length,
    examens: examens.filter(e => e.statut !== 'annulé').length,
    ordonnances: ordonnances.length,
    admissions: admissions.length,
  };

  return (
    <div>
      {/* En-tête avec retour */}
      <div style={{ marginBottom: '24px' }}>
        <Link 
          to="/medical/patients" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px',
            color: '#3b82f6',
            textDecoration: 'none',
            fontWeight: '500'
          }}
        >
          <FaArrowLeft /> Retour à la liste
        </Link>
      </div>

      {/* Carte patient */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ 
            backgroundColor: '#3b82f6', 
            borderRadius: '50%', 
            width: '64px', 
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '28px',
            flexShrink: 0
          }}>
            <FaUser />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '28px', margin: 0, color: '#0f172a' }}>
              {patient.prenom} {patient.nom}
            </h1>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '4px' }}>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FaCalendar /> Né(e) le {patient.date_naissance ? new Date(patient.date_naissance).toLocaleDateString('fr-FR') : 'N/C'}
              </span>
              {patient.ipp && (
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🏷️ IPP : {patient.ipp}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {patient.telephone && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '20px' }}>
                <FaPhone /> {patient.telephone}
              </span>
            )}
            {patient.email && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '20px' }}>
                ✉️ {patient.email}
              </span>
            )}
          </div>
        </div>
        {patient.antecedents && (
          <div style={{ marginTop: '8px', padding: '12px 16px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
            <span style={{ fontWeight: '600', color: '#92400e' }}>⚠️ Antécédents :</span> {patient.antecedents}
          </div>
        )}
        {patient.allergies && (
          <div style={{ marginTop: '8px', padding: '12px 16px', backgroundColor: '#fee2e2', borderRadius: '8px' }}>
            <span style={{ fontWeight: '600', color: '#991b1b' }}>🚫 Allergies :</span> {patient.allergies}
          </div>
        )}
        {patient.traitements && (
          <div style={{ marginTop: '8px', padding: '12px 16px', backgroundColor: '#dbeafe', borderRadius: '8px' }}>
            <span style={{ fontWeight: '600', color: '#1e40af' }}>💊 Traitements :</span> {patient.traitements}
          </div>
        )}
      </div>

      {/* Onglets */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        marginBottom: '24px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: 'white',
        borderRadius: '12px 12px 0 0',
        padding: '0 16px',
      }}>
        <TabButton tab="info" label="Informations" icon={FaInfoCircle} />
        <TabButton tab="consultations" label="Consultations" icon={FaStethoscope} count={counts.consultations} />
        <TabButton tab="prescriptions" label="Prescriptions" icon={FaPills} count={counts.prescriptions} />
        <TabButton tab="examens" label="Examens" icon={FaFlask} count={counts.examens} />
        <TabButton tab="ordonnances" label="Ordonnances" icon={FaFileInvoice} count={counts.ordonnances} />
        <TabButton tab="admissions" label="Hospitalisations" icon={FaHospital} count={counts.admissions} />
      </div>

      {/* Contenu des onglets */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0 0 12px 12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        minHeight: '200px',
      }}>
        {/* Onglet Informations */}
        {activeTab === 'info' && (
          <div>
            <h3 style={{ marginTop: 0, color: '#0f172a' }}>Informations générales</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={{ color: '#64748b', margin: 0 }}><strong>Nom complet</strong></p>
                <p style={{ margin: '4px 0 16px 0', color: '#0f172a' }}>{patient.nom} {patient.prenom}</p>
              </div>
              <div>
                <p style={{ color: '#64748b', margin: 0 }}><strong>IPP</strong></p>
                <p style={{ margin: '4px 0 16px 0', color: '#0f172a' }}>{patient.ipp || 'N/C'}</p>
              </div>
              <div>
                <p style={{ color: '#64748b', margin: 0 }}><strong>Date de naissance</strong></p>
                <p style={{ margin: '4px 0 16px 0', color: '#0f172a' }}>{patient.date_naissance ? new Date(patient.date_naissance).toLocaleDateString('fr-FR') : 'N/C'}</p>
              </div>
              <div>
                <p style={{ color: '#64748b', margin: 0 }}><strong>Âge</strong></p>
                <p style={{ margin: '4px 0 16px 0', color: '#0f172a' }}>
                  {patient.date_naissance ? `${new Date().getFullYear() - new Date(patient.date_naissance).getFullYear()} ans` : 'N/C'}
                </p>
              </div>
              <div>
                <p style={{ color: '#64748b', margin: 0 }}><strong>Téléphone</strong></p>
                <p style={{ margin: '4px 0 16px 0', color: '#0f172a' }}>{patient.telephone || 'N/C'}</p>
              </div>
              <div>
                <p style={{ color: '#64748b', margin: 0 }}><strong>Email</strong></p>
                <p style={{ margin: '4px 0 16px 0', color: '#0f172a' }}>{patient.email || 'N/C'}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ color: '#64748b', margin: 0 }}><strong>Adresse</strong></p>
                <p style={{ margin: '4px 0 16px 0', color: '#0f172a' }}>{patient.adresse || 'N/C'}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ color: '#64748b', margin: 0 }}><strong>Personne à prévenir</strong></p>
                <p style={{ margin: '4px 0 0 0', color: '#0f172a' }}>
                  {patient.personne_a_prevenir_nom1 || 'Aucune'} 
                  {patient.personne_a_prevenir_tel1 && ` - ${patient.personne_a_prevenir_tel1}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Onglet Consultations */}
        {activeTab === 'consultations' && (
          <div>
            <h3 style={{ marginTop: 0, color: '#0f172a' }}>Historique des consultations</h3>
            {consultations.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>Aucune consultation trouvée.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Date</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Médecin</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Motif</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultations.map((c, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px' }}>{new Date(c.date || c.date_rdv).toLocaleDateString('fr-FR')}</td>
                        <td style={{ padding: '10px' }}>{c.medecin_nom || c.medecin || '-'}</td>
                        <td style={{ padding: '10px' }}>{c.motif || c.raison || '-'}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={getStatusBadge(c.statut || c.status || 'planifié')}>
                            {c.statut || c.status || 'Planifié'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Onglet Prescriptions */}
        {activeTab === 'prescriptions' && (
          <div>
            <h3 style={{ marginTop: 0, color: '#0f172a' }}>Prescriptions</h3>
            {prescriptions.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>Aucune prescription trouvée.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Date</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Médecin</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Statut</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px' }}>{new Date(p.date_creation || p.date).toLocaleDateString('fr-FR')}</td>
                        <td style={{ padding: '10px' }}>{p.medecin_nom || p.doctor_nom || '-'}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={getStatusBadge(p.status || p.statut || 'pending')}>
                            {p.status || p.statut || 'En cours'}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          {p.items && p.items.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '16px' }}>
                              {p.items.map((item, i) => (
                                <li key={i}>{item.medicament} - {item.posologie} (x{item.quantite})</li>
                              ))}
                            </ul>
                          ) : p.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Onglet Examens */}
        {activeTab === 'examens' && (
          <div>
            <h3 style={{ marginTop: 0, color: '#0f172a' }}>Examens & résultats</h3>
            {examens.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>Aucun examen trouvé.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Date demande</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Type</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Catégorie</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examens.map((e, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px' }}>{new Date(e.date_demande).toLocaleDateString('fr-FR')}</td>
                        <td style={{ padding: '10px' }}>{e.type_examen || e.type || '-'}</td>
                        <td style={{ padding: '10px' }}>{e.categorie || '-'}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={getStatusBadge(e.statut)}>
                            {e.statut === 'demandé' ? 'Demandé' :
                             e.statut === 'en_cours' ? 'En cours' :
                             e.statut === 'terminé' ? 'Terminé' :
                             e.statut === 'valide' ? 'Validé' :
                             e.statut === 'annulé' ? 'Annulé' : e.statut}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Onglet Ordonnances */}
        {activeTab === 'ordonnances' && (
          <div>
            <h3 style={{ marginTop: 0, color: '#0f172a' }}>Ordonnances</h3>
            {ordonnances.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>Aucune ordonnance trouvée.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>N°</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Date</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Médecin</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Observations</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordonnances.map((o, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px' }}>{o.numero_ordonnance || o.id || '-'}</td>
                        <td style={{ padding: '10px' }}>{new Date(o.date_prescription || o.date_creation || o.date).toLocaleDateString('fr-FR')}</td>
                        <td style={{ padding: '10px' }}>{o.medecin_nom || o.medecin || '-'}</td>
                        <td style={{ padding: '10px' }}>{o.observations || '-'}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={getStatusBadge(o.statut || 'en_cours')}>
                            {o.statut || 'En cours'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Onglet Hospitalisations */}
        {activeTab === 'admissions' && (
          <div>
            <h3 style={{ marginTop: 0, color: '#0f172a' }}>Historique des hospitalisations</h3>
            {admissions.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>Aucune hospitalisation trouvée.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Date admission</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Service</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Motif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissions.map((a, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px' }}>{new Date(a.date_admission).toLocaleDateString('fr-FR')}</td>
                        <td style={{ padding: '10px' }}>{a.service_nom || '-'}</td>
                        <td style={{ padding: '10px' }}>{a.motif || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions rapides */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '24px' }}>
        <Link 
          to={`/admission?patient=${patient.id}`}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <FaHospital /> Nouvelle admission
        </Link>
        <Link 
          to={`/prescription/new/${patient.id}`}
          style={{
            backgroundColor: '#8b5cf6',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <FaPrescription /> Prescrire
        </Link>
        <Link 
          to={`/rendezvous/new?patient=${patient.id}`}
          style={{
            backgroundColor: '#10b981',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <FaStethoscope /> Nouvelle consultation
        </Link>
        <Link 
          to={`/examen/new?patient=${patient.id}`}
          style={{
            backgroundColor: '#f59e0b',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <FaFlask /> Demander examen
        </Link>
      </div>
    </div>
  );
};

export default PatientMedicalRecord;
