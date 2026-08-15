import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const PatientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPatient(res.data);
      } catch (err) {
        console.error('Erreur chargement patient:', err);
        setError('Patient non trouvé ou erreur serveur.');
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
  }, [id]);

  const goToPrescriptionCreation = () => {
    navigate(`/prescription/new/${id}`);
  };

  if (loading) return <div className="text-center p-4">⏳ Chargement...</div>;
  if (error) return <div className="text-red-600 p-4">{error}</div>;
  if (!patient) return <div className="p-4">Patient introuvable.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {patient.prenom} {patient.nom}
        </h1>
        <div className="space-x-3">
          <button
            onClick={goToPrescriptionCreation}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            💊 Prescrire une ordonnance
          </button>
          <button
            onClick={() => navigate(`/patients/edit/${patient.id}`)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Modifier
          </button>
          <button
            onClick={() => navigate('/patients')}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          >
            Retour
          </button>
        </div>
      </div>

      {/* Informations patient – uniquement les champs existants */}
      <div className="bg-gray-50 p-4 rounded border mb-6">
        {patient.date_naissance && (
          <p><strong>Date de naissance :</strong> {new Date(patient.date_naissance).toLocaleDateString()}</p>
        )}
        <p><strong>Téléphone :</strong> {patient.telephone || 'Non renseigné'}</p>
        <p><strong>Email :</strong> {patient.email || 'Non renseigné'}</p>
        <p><strong>Adresse :</strong> {patient.adresse || 'Non renseignée'}</p>
        {patient.genre && <p><strong>Genre :</strong> {patient.genre}</p>}
        {/* Ajoutez ici d’autres champs si votre table en contient (ex: date_admission) */}
      </div>
    </div>
  );
};

export default PatientProfile;