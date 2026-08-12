// pages/PrescriptionPage.jsx
import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../../axios'; // ✅ Utilisation de l'instance partagée

const PrescriptionPage = () => {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/patients/${id}`) // ✅ Suppression de l'URL absolue
      .then(res => {
        setPatient(res.data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, [id]);

  if (loading) return <div className="p-6">Chargement...</div>;
  if (!patient) return <div className="p-6">Patient non trouvé</div>;

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>
        📝 Prescription pour {patient.prenom} {patient.nom}
      </h1>
      <Link to="/patients" style={{ color: '#3b82f6' }}>← Retour</Link>
      {/* Formulaire à compléter */}
    </div>
  );
};

export default PrescriptionPage;
