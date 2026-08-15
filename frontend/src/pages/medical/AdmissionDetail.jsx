// src/pages/medical/AdmissionDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaUser, FaCalendar, FaHospital, FaUserMd, FaBed, FaEdit, FaTrash } from 'react-icons/fa';

const AdmissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [admission, setAdmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAdmission = async () => {
      try {
        const res = await api.get(`/consultations/admissions/${id}`);
        setAdmission(res.data);
        setLoading(false);
      } catch (err) {
        console.error('Erreur chargement admission :', err);
        setError('Impossible de charger l\'admission');
        setLoading(false);
      }
    };
    fetchAdmission();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette admission ?')) return;
    try {
      await api.delete(`/consultations/admissions/${id}`);
      navigate('/medical/admissions');
    } catch (err) {
      console.error('Erreur suppression :', err);
      setError('Impossible de supprimer l\'admission');
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Chargement...</div>;
  if (error) return <div style={{ padding: '40px', color: '#ef4444', textAlign: 'center' }}>{error}</div>;
  if (!admission) return <div style={{ padding: '40px', textAlign: 'center' }}>Admission non trouvée</div>;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/medical/admissions" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>
          <FaArrowLeft /> Retour à la liste
        </Link>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#0f172a' }}>Détail de l'admission #{admission.id}</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link
              to={`/medical/admissions/edit/${admission.id}`}
              style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FaEdit /> Modifier
            </Link>
            <button onClick={handleDelete} style={{
              backgroundColor: '#ef4444',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <FaTrash /> Supprimer
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <p><strong><FaUser style={{ marginRight: '8px' }} /> Patient</strong></p>
            <p style={{ color: '#0f172a', marginTop: '4px' }}>
              <Link to={`/medical/patients/${admission.patient_id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                {admission.patient_prenom} {admission.patient_nom}
              </Link>
              {admission.ipp && <span style={{ fontSize: '14px', color: '#64748b', marginLeft: '8px' }}>(IPP: {admission.ipp})</span>}
            </p>
          </div>
          <div>
            <p><strong><FaHospital style={{ marginRight: '8px' }} /> Service</strong></p>
            <p style={{ color: '#0f172a', marginTop: '4px' }}>{admission.service_nom || 'Non spécifié'}</p>
          </div>
          <div>
            <p><strong><FaUserMd style={{ marginRight: '8px' }} /> Médecin référent</strong></p>
            <p style={{ color: '#0f172a', marginTop: '4px' }}>{admission.medecin_prenom} {admission.medecin_nom}</p>
          </div>
          <div>
            <p><strong><FaBed style={{ marginRight: '8px' }} /> Lit</strong></p>
            <p style={{ color: '#0f172a', marginTop: '4px' }}>{admission.lit_numero || 'Non attribué'}</p>
          </div>
          <div>
            <p><strong><FaCalendar style={{ marginRight: '8px' }} /> Date d'admission</strong></p>
            <p style={{ color: '#0f172a', marginTop: '4px' }}>{new Date(admission.date_admission).toLocaleString('fr-FR')}</p>
          </div>
          <div>
            <p><strong><FaCalendar style={{ marginRight: '8px' }} /> Date de sortie (prévue)</strong></p>
            <p style={{ color: '#0f172a', marginTop: '4px' }}>
              {admission.date_sortie_prevue ? new Date(admission.date_sortie_prevue).toLocaleDateString('fr-FR') : 'Non renseignée'}
            </p>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <p><strong>Motif de l'admission</strong></p>
            <p style={{ color: '#0f172a', marginTop: '4px' }}>{admission.motif || 'Non renseigné'}</p>
          </div>
          {admission.notes && (
            <div style={{ gridColumn: '1 / -1' }}>
              <p><strong>Notes</strong></p>
              <p style={{ color: '#0f172a', marginTop: '4px' }}>{admission.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdmissionDetail;