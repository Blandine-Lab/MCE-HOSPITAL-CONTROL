import { useEffect, useState } from 'react';
import api from '../../axios'; // ? Utilisation de l'instance partage

const RendezVousList = () => {
  const [rdvs, setRdvs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [medecins, setMedecins] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ patient_id: '', medecin_id: '', service_id: '', date_rdv: '', motif: '' });

  useEffect(() => {
    fetchRdvs();
    api.get('/patients').then(res => setPatients(res.data)).catch(console.error);
    api.get('/consultations/medecins').then(res => setMedecins(res.data)).catch(console.error);
    api.get('/consultations/services').then(res => setServices(res.data)).catch(console.error);
  }, []);

  const fetchRdvs = async () => {
    try {
      const res = await api.get('/consultations/rendezvous');
      setRdvs(res.data);
    } catch (err) {
      console.error('Erreur chargement rendez-vous:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/consultations/rendezvous', form);
      setForm({ patient_id: '', medecin_id: '', service_id: '', date_rdv: '', motif: '' });
      fetchRdvs();
    } catch (err) {
      console.error('Erreur ajout rendez-vous:', err);
    }
  };

  const updateStatut = async (id, statut) => {
    try {
      await api.put(`/consultations/rendezvous/${id}`, { statut });
      fetchRdvs();
    } catch (err) {
      console.error('Erreur mise  jour statut:', err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Planification des rendez-vous</h1>
      <form onSubmit={handleSubmit} className="bg-gray-100 p-4 rounded mb-6 grid grid-cols-1 md:grid-cols-5 gap-3">
        <select required value={form.patient_id} onChange={e => setForm({...form, patient_id: e.target.value})} className="border p-2 rounded">
          <option value="">Patient</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
        </select>
        <select value={form.medecin_id} onChange={e => setForm({...form, medecin_id: e.target.value})} className="border p-2 rounded">
          <option value="">Mdecin</option>
          {medecins.map(m => <option key={m.id} value={m.id}>{m.nom} {m.prenom}</option>)}
        </select>
        <select value={form.service_id} onChange={e => setForm({...form, service_id: e.target.value})} className="border p-2 rounded">
          <option value="">Service</option>
          {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
        </select>
        <input type="datetime-local" required value={form.date_rdv} onChange={e => setForm({...form, date_rdv: e.target.value})} className="border p-2 rounded" />
        <input type="text" placeholder="Motif" value={form.motif} onChange={e => setForm({...form, motif: e.target.value})} className="border p-2 rounded" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Ajouter RDV</button>
      </form>

      <table className="min-w-full border">
        <thead className="bg-gray-200">
          <tr><th className="border p-2">Date</th><th className="border p-2">Patient</th><th className="border p-2">Mdecin</th><th className="border p-2">Service</th><th className="border p-2">Motif</th><th className="border p-2">Statut</th><th className="border p-2">Rappel</th><th className="border p-2">Actions</th></tr>
        </thead>
        <tbody>
          {rdvs.map(r => (
            <tr key={r.id}>
              <td className="border p-2">{new Date(r.date_rdv).toLocaleString()}</td>
              <td className="border p-2">{r.patient_nom} {r.patient_prenom}</td>
              <td className="border p-2">{r.medecin_nom} {r.medecin_prenom}</td>
              <td className="border p-2">{r.service_nom}</td>
              <td className="border p-2">{r.motif}</td>
              <td className="border p-2">{r.statut}</td>
              <td className="border p-2">{r.rappel_envoye ? '?' : '?'}</td>
              <td className="border p-2">
                {r.statut === 'planifie' && (
                  <>
                    <button onClick={() => updateStatut(r.id, 'confirme')} className="bg-green-500 text-white px-1 mr-1">Confirmer</button>
                    <button onClick={() => updateStatut(r.id, 'annule')} className="bg-red-500 text-white px-1">Annuler</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RendezVousList;
