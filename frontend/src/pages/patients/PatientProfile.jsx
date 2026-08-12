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

  // ✅ Redirection vers le NOUVEAU formulaire de création
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
            📝 Prescrire une ordonnance
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

      {/* Informations patient �FC� inchangé */}
      <div className="bg-gray-50 p-4 rounded border mb-6">
        <p><strong>IPP :</strong> {patient.ipp || 'Non renseigné'}</p>
        <p><strong>Date de naissance :</strong> {patient.date_naissance ? new Date(patient.date_naissance).toLocaleDateString() : 'N/C'}</p>
        <p><strong>Téléphone :</strong> {patient.telephone || 'N/C'}</p>
        <p><strong>Email :</strong> {patient.email || 'N/C'}</p>
        <p><strong>Adresse :</strong> {patient.adresse || 'N/C'}</p>
        <p><strong>Date d'admission :</strong> {patient.date_admission ? new Date(patient.date_admission).toLocaleDateString() : 'N/C'}</p>
        <p><strong>Antécédents :</strong> {patient.antecedents || 'Aucun'}</p>
        <p><strong>Allergies :</strong> {patient.allergies || 'Aucune'}</p>
        <p><strong>Traitements :</strong> {patient.traitements || 'Aucun'}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border p-3 rounded">
          <h3 className="font-semibold">Contact 1</h3>
          <p>{patient.personne_a_prevenir_nom1 || 'N/C'}</p>
          <p>{patient.personne_a_prevenir_tel1 || 'N/C'}</p>
          <p>{patient.personne_a_prevenir_adresse1 || ''}</p>
        </div>
        <div className="border p-3 rounded">
          <h3 className="font-semibold">Contact 2</h3>
          <p>{patient.personne_a_prevenir_nom2 || 'N/C'}</p>
          <p>{patient.personne_a_prevenir_tel2 || 'N/C'}</p>
          <p>{patient.personne_a_prevenir_adresse2 || ''}</p>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
