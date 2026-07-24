// src/pages/PrescriptionPage.jsx
import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';

const PrescriptionPage = () => {
  const { patientId } = useParams(); // attention : le paramètre s'appelle patientId dans la route
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [medicament, setMedicament] = useState('');
  const [posologie, setPosologie] = useState('');
  const [duree, setDuree] = useState('');

  useEffect(() => {
    if (!patientId) return;
    axios.get(`http://localhost:5000/api/patients/${patientId}`)
      .then(res => {
        setPatient(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [patientId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Prescription pour ${patient.prenom} ${patient.nom} : ${medicament} - ${posologie}`);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Chargement du patient...</div>;
  if (!patient) return <div style={{ padding: '40px', textAlign: 'center' }}>❌ Patient non trouvé</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>
          📝 Prescription pour {patient.prenom} {patient.nom}
        </h1>
        <Link to="/patients" style={{ color: '#3b82f6', textDecoration: 'underline' }}>← Retour</Link>
      </div>

      <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
        <p><strong>IPP :</strong> {patient.ipp || 'Non renseigné'}</p>
        <p><strong>Téléphone :</strong> {patient.telephone || 'Non renseigné'}</p>
        <p><strong>Email :</strong> {patient.email || 'Non renseigné'}</p>
      </div>

      <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Médicament / Acte *</label>
          <input type="text" value={medicament} onChange={(e) => setMedicament(e.target.value)} required style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }} placeholder="Nom du médicament ou de l'acte" />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Posologie / Instructions</label>
          <textarea value={posologie} onChange={(e) => setPosologie(e.target.value)} rows="4" style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }} placeholder="Ex: 1 comprimé matin et soir pendant 7 jours" />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Durée du traitement</label>
          <input type="text" value={duree} onChange={(e) => setDuree(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }} placeholder="Ex: 7 jours, à renouveler" />
        </div>

        <button type="submit" style={{ backgroundColor: '#16a34a', color: 'white', padding: '10px 24px', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer' }}>💾 Enregistrer</button>
      </form>
    </div>
  );
};

export default PrescriptionPage;