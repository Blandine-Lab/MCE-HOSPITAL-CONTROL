import { useEffect, useState } from 'react';
import api from '../axios'; // ✅ Utilisation de l'instance partagée

const UrgencesList = () => {
  const [urgences, setUrgences] = useState([]);
  const [newUrgence, setNewUrgence] = useState({ patient_id: '', niveau: 'Jaune', priorite: 3, motif: '' });
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    fetchUrgences();
    api.get('/patients')
      .then(res => setPatients(res.data))
      .catch(err => console.error(err));
  }, []);

  const fetchUrgences = async () => {
    try {
      const res = await api.get('/consultations/urgences');
      setUrgences(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/consultations/urgences', newUrgence);
      setNewUrgence({ patient_id: '', niveau: 'Jaune', priorite: 3, motif: '' });
      fetchUrgences();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTakeCharge = async (id) => {
    try {
      await api.put(`/consultations/urgences/${id}`, { statut: 'pris_en_charge' });
      fetchUrgences();
    } catch (err) {
      console.error(err);
    }
  };

  const getColor = (priorite) => {
    if (priorite === 1) return 'bg-red-200';
    if (priorite === 2) return 'bg-orange-200';
    if (priorite === 3) return 'bg-yellow-200';
    return 'bg-green-200';
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Service des urgences</h1>
      {/* Formulaire d'ajout */}
      <form onSubmit={handleAdd} className="bg-gray-100 p-4 rounded mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm">Patient</label>
          <select value={newUrgence.patient_id} onChange={e => setNewUrgence({...newUrgence, patient_id: e.target.value})} className="border p-2 rounded">
            <option value="">Patient inconnu</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm">Niveau</label>
          <select value={newUrgence.niveau} onChange={e => setNewUrgence({...newUrgence, niveau: e.target.value, priorite: e.target.value === 'Rouge' ? 1 : e.target.value === 'Orange' ? 2 : e.target.value === 'Jaune' ? 3 : 4})} className="border p-2 rounded">
            <option>Rouge</option><option>Orange</option><option>Jaune</option><option>Vert</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm">Motif</label>
          <input type="text" value={newUrgence.motif} onChange={e => setNewUrgence({...newUrgence, motif: e.target.value})} className="w-full border p-2 rounded" />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Ajouter urgence</button>
      </form>

      {/* Liste des urgences */}
      <table className="min-w-full border">
        <thead className="bg-gray-200">
          <tr><th className="border p-2">Priorité</th><th className="border p-2">Patient</th><th className="border p-2">Niveau</th><th className="border p-2">Heure arrivée</th><th className="border p-2">Motif</th><th className="border p-2">Statut</th><th className="border p-2">Action</th></tr>
        </thead>
        <tbody>
          {urgences.map(u => (
            <tr key={u.id} className={getColor(u.priorite)}>
              <td className="border p-2">{u.priorite}</td>
              <td className="border p-2">{u.patient_nom} {u.patient_prenom}</td>
              <td className="border p-2">{u.niveau}</td>
              <td className="border p-2">{new Date(u.heure_arrivee).toLocaleString()}</td>
              <td className="border p-2">{u.motif}</td>
              <td className="border p-2">{u.statut}</td>
              <td className="border p-2">
                {u.statut === 'en_attente' && (
                  <button onClick={() => handleTakeCharge(u.id)} className="bg-green-500 text-white px-2 py-1 rounded">Prendre en charge</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UrgencesList;