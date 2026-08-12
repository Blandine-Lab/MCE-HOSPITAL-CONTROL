// src/pages/paramedical/PatientSuivi.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaUser, FaCalendar, FaClipboardList, FaHeartbeat } from 'react-icons/fa';

const PatientSuivi = () => {
  const { patientId } = useParams();
  const [patient, setPatient] = useState(null);
  const [soins, setSoins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/patients/${patientId}`),
      api.get(`/soins?patient_id=${patientId}`)
    ])
      .then(([patientRes, soinsRes]) => {
        setPatient(patientRes.data);
        setSoins(soinsRes.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur chargement suivi :', err);
        setLoading(false);
      });
  }, [patientId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '24px' }}>⏳ Chargement du suivi...</div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ef4444' }}>
        <div style={{ fontSize: '20px' }}>Patient non trouvé</div>
      </div>
    );
  }

  const getStatusBadge = (statut) => {
    const configs = {
      'planifié': { bg: '#dbeafe', color: '#1e40af', label: '📅 Planifié' },
      'en_cours': { bg: '#fef3c7', color: '#92400e', label: '⏳ En cours' },
      'effectué': { bg: '#d1fae5', color: '#065f46', label: '✅ Effectué' },
      'annulé': { bg: '#fee2e2', color: '#991b1b', label: '❌ Annulé' },
    };
    const config = configs[statut] || configs['planifié'];
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '500',
        backgroundColor: config.bg,
        color: config.color
      }}>
        {config.label}
      </span>
    );
  };

  const soinsEffectues = soins.filter(s => s.statut === 'effectué').length;
  const soinsPlanifies = soins.filter(s => s.statut === 'planifié' || s.statut === 'en_cours').length;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/paramedical/soins" style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: '#3b82f6', 
          textDecoration: 'none',
          fontWeight: '500'
        }}>
          <FaArrowLeft /> Retour
        </Link>
      </div>

      {/* Info patient */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            backgroundColor: '#34d399', 
            borderRadius: '50%', 
            width: '60px', 
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px'
          }}>
            <FaUser />
          </div>
          <div>
            <h1 style={{ fontSize: '28px', margin: 0, color: '#0f172a' }}>
              {patient.prenom} {patient.nom}
            </h1>
            <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>
              Suivi des soins paramédicaux
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#64748b', margin: 0 }}>Total des soins</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '4px 0 0 0', color: '#0f172a' }}>{soins.length}</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#64748b', margin: 0 }}>✅ Soins effectués</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '4px 0 0 0', color: '#10b981' }}>{soinsEffectues}</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#64748b', margin: 0 }}>📅 Soins à venir</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '4px 0 0 0', color: '#3b82f6' }}>{soinsPlanifies}</p>
        </div>
      </div>

      {/* Liste des soins */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <h3 style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid #e2e8f0', color: '#0f172a' }}>
          <FaClipboardList style={{ marginRight: '8px' }} />
          Historique des soins
        </h3>
        {soins.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            Aucun soin enregistré pour ce patient
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Type</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Date</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Prestataire</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Statut</th>
                <th style={{ padding: '12px 20px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {soins.map((s, index) => (
                <tr 
                  key={s.id} 
                  style={{ 
                    borderBottom: index === soins.length - 1 ? 'none' : '1px solid #f1f5f9'
                  }}
                >
                  <td style={{ padding: '12px 20px', fontWeight: '500', color: '#0f172a' }}>
                    <FaHeartbeat style={{ marginRight: '8px', color: '#34d399' }} />
                    {s.type_soin}
                  </td>
                  <td style={{ padding: '12px 20px', color: '#475569' }}>
                    {new Date(s.date_soin).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={{ padding: '12px 20px', color: '#475569' }}>{s.prestataire || '-'}</td>
                  <td style={{ padding: '12px 20px' }}>{getStatusBadge(s.statut)}</td>
                  <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                    <Link 
                      to={`/paramedical/soins/${s.id}`}
                      style={{ color: '#3b82f6', textDecoration: 'none' }}
                    >
                      Voir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PatientSuivi;
