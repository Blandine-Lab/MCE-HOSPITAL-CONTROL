import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api'; // Import de l'instance Axios configure

const AdmissionForm = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [lits, setLits] = useState([]);
  const [services, setServices] = useState([]);
  const [medecins, setMedecins] = useState([]);
  const [form, setForm] = useState({
    patient_id: '',
    lit_id: '',
    service_id: '',
    motif: '',
    medecin_referent_id: ''
  });

  useEffect(() => {
    // Patients hospitaliss (non sortis)
    api.get('/patients')
      .then(res => setPatients(res.data.filter(p => p.statut !== 'sorti')))
      .catch(err => console.error('Erreur chargement patients :', err));
    // Lits disponibles
    api.get('/consultations/lits/disponibles')
      .then(res => setLits(res.data))
      .catch(err => console.error('Erreur chargement lits :', err));
    // Services
    api.get('/consultations/services')
      .then(res => setServices(res.data))
      .catch(err => console.error('Erreur chargement services :', err));
    // Mdecins
    api.get('/consultations/medecins')
      .then(res => setMedecins(res.data))
      .catch(err => console.error('Erreur chargement mdecins :', err));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/consultations/admissions', form);
      alert('Patient admis avec succs ?FC? sjour cr');
      navigate('/patients');
    } catch (err) {
      console.error('Erreur lors de l?FC?admission :', err);
      alert('Erreur lors de l?FC?admission');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Nouvelle admission / Hospitalisation</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Patient</label>
          <select name="patient_id" value={form.patient_id} onChange={handleChange} className="w-full border p-2 rounded" required>
            <option value="">Choisir un patient</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.nom} {p.prenom} (IPP: {p.ipp})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-medium">Lit disponible</label>
          <select name="lit_id" value={form.lit_id} onChange={handleChange} className="w-full border p-2 rounded" required>
            <option value="">Choisir un lit</option>
            {lits.map(l => (
              <option key={l.id} value={l.id}>Lit {l.numero} - Chambre {l.chambre} (Service: {l.service_nom})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-medium">Service d'admission</label>
          <select name="service_id" value={form.service_id} onChange={handleChange} className="w-full border p-2 rounded" required>
            <option value="">Choisir un service</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.nom}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-medium">Mdecin rfrent</label>
          <select name="medecin_referent_id" value={form.medecin_referent_id} onChange={handleChange} className="w-full border p-2 rounded">
            <option value="">Choisir un mdecin</option>
            {medecins.map(m => (
              <option key={m.id} value={m.id}>{m.nom} {m.prenom}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-medium">Motif d'admission</label>
          <textarea name="motif" value={form.motif} onChange={handleChange} className="w-full border p-2 rounded" rows="3"></textarea>
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Admettre le patient</button>
      </form>
    </div>
  );
};

export default AdmissionForm;
