import { useState, useEffect } from 'react';
import api from '../../axios'; // ✅ Utilisation de l'instance partagée

const PharmacyManager = () => {
  const [medicaments, setMedicaments] = useState([]);
  const [alertes, setAlertes] = useState({ stockCritique: [], peremptionProche: [] });
  const [showMedicamentForm, setShowMedicamentForm] = useState(false);
  const [medicamentForm, setMedicamentForm] = useState({
    code: "", nom: "", description: "", stock: 0, seuil_alerte: 10,
    unite: "boîte", prix_unitaire: 0, principe_actif: "", forme: "", dosage: "", est_stupefiant: false
  });
  const [editingMedicamentId, setEditingMedicamentId] = useState(null);
  const [selectedMedicamentId, setSelectedMedicamentId] = useState("");
  const [lots, setLots] = useState([]);
  const [showLotForm, setShowLotForm] = useState(false);
  const [lotForm, setLotForm] = useState({ numero_lot: "", date_peremption: "", quantite: 0, prix_achat: 0 });
  const [commandes, setCommandes] = useState([]);
  const [showCommandeForm, setShowCommandeForm] = useState(false);
  const [commandeLignes, setCommandeLignes] = useState([{ medicament_id: "", quantite_commandee: 0, prix_unitaire_ht: 0 }]);
  const [deliveryForm, setDeliveryForm] = useState({ medicament_id: "", quantite: 1, patient_id: "", posologie: "", prescripteur_nom: "" });
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [patients, setPatients] = useState([]);
  const [subTab, setSubTab] = useState('medicaments');

  const showToast = (msg) => { alert(msg); }; // simplifié

  const fetchMedicaments = async () => {
    try { const res = await api.get('/pharmacy/medicaments'); setMedicaments(res.data); } catch(e) { console.error(e); }
  };
  const fetchAlertes = async () => {
    try { const res = await api.get('/pharmacy/alertes'); setAlertes(res.data); } catch(e) { console.error(e); }
  };
  const fetchLots = async (id) => {
    if (!id) return;
    try { const res = await api.get(`/pharmacy/lots/disponibles/${id}`); setLots(res.data); } catch(e) { console.error(e); }
  };
  const fetchCommandes = async () => {
    try { const res = await api.get('/pharmacy/commandes'); setCommandes(res.data); } catch(e) { console.error(e); }
  };
  const fetchPatients = async () => {
    try { const res = await api.get('/admin/patients'); setPatients(res.data); } catch(e) { console.error(e); }
  };

  useEffect(() => {
    fetchMedicaments();
    fetchAlertes();
    fetchCommandes();
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedMedicamentId) fetchLots(selectedMedicamentId);
  }, [selectedMedicamentId]);

  const handleMedicamentSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMedicamentId) {
        await api.put(`/pharmacy/medicaments/${editingMedicamentId}`, medicamentForm);
      } else {
        await api.post('/pharmacy/medicaments', medicamentForm);
      }
      setShowMedicamentForm(false);
      setEditingMedicamentId(null);
      setMedicamentForm({ code: "", nom: "", description: "", stock: 0, seuil_alerte: 10, unite: "boîte", prix_unitaire: 0, principe_actif: "", forme: "", dosage: "", est_stupefiant: false });
      fetchMedicaments();
      fetchAlertes();
      showToast('Médicament enregistré');
    } catch(err) { showToast('Erreur'); }
  };

  const deleteMedicament = async (id) => {
    if (!confirm('Supprimer ?')) return;
    try {
      await api.delete(`/pharmacy/medicaments/${id}`);
      fetchMedicaments();
      fetchAlertes();
    } catch(err) { showToast('Erreur'); }
  };

  const editMedicament = (med) => {
    setMedicamentForm(med);
    setEditingMedicamentId(med.id);
    setShowMedicamentForm(true);
  };

  const handleLotSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMedicamentId) return;
    try {
      await api.post('/pharmacy/lots', {
        ...lotForm,
        medicament_id: selectedMedicamentId,
        quantite: parseInt(lotForm.quantite)
      });
      setShowLotForm(false);
      setLotForm({ numero_lot: "", date_peremption: "", quantite: 0, prix_achat: 0 });
      fetchLots(selectedMedicamentId);
      fetchMedicaments();
      fetchAlertes();
      showToast('Lot ajouté');
    } catch(err) { showToast('Erreur'); }
  };

  const addCommandeLigne = () => setCommandeLignes([...commandeLignes, { medicament_id: "", quantite_commandee: 0, prix_unitaire_ht: 0 }]);
  const updateCommandeLigne = (idx, field, value) => {
    const newLignes = [...commandeLignes];
    newLignes[idx][field] = value;
    setCommandeLignes(newLignes);
  };
  const handleCommandeSubmit = async (e) => {
    e.preventDefault();
    const lignesValides = commandeLignes.filter(l => l.medicament_id && l.quantite_commandee > 0);
    if (lignesValides.length === 0) return;
    try {
      await api.post('/pharmacy/commandes', { fournisseur_id: 1, lignes: lignesValides });
      setShowCommandeForm(false);
      setCommandeLignes([{ medicament_id: "", quantite_commandee: 0, prix_unitaire_ht: 0 }]);
      fetchCommandes();
      showToast('Commande créée');
    } catch(err) { showToast('Erreur'); }
  };

  const handleDeliverySubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/pharmacy/delivrance', deliveryForm);
      setDeliveryMessage('✅ Délivrance enregistrée');
      setDeliveryForm({ medicament_id: "", quantite: 1, patient_id: "", posologie: "", prescripteur_nom: "" });
      fetchMedicaments();
      fetchAlertes();
    } catch(err) {
      setDeliveryMessage('❌ Erreur : ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div>
      <div className="mb-4 flex gap-2 border-b pb-2">
        <button onClick={() => setSubTab('medicaments')} className={`px-4 py-2 rounded ${subTab === 'medicaments' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Médicaments</button>
        <button onClick={() => setSubTab('lots')} className={`px-4 py-2 rounded ${subTab === 'lots' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Lots & Péremption</button>
        <button onClick={() => setSubTab('commandes')} className={`px-4 py-2 rounded ${subTab === 'commandes' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Commandes</button>
        <button onClick={() => setSubTab('delivrance')} className={`px-4 py-2 rounded ${subTab === 'delivrance' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Délivrance</button>
      </div>

      {subTab === 'medicaments' && (
        <div>
          {(alertes.stockCritique.length > 0 || alertes.peremptionProche.length > 0) && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 p-2 mb-4">
              {alertes.stockCritique.length > 0 && <p>⚠️ Stock critique : {alertes.stockCritique.map(m => m.nom).join(', ')}</p>}
              {alertes.peremptionProche.length > 0 && <p>⚠️ Péremption proche : {alertes.peremptionProche.map(l => l.medicament_nom).join(', ')}</p>}
            </div>
          )}
          <button onClick={() => setShowMedicamentForm(!showMedicamentForm)} className="bg-blue-600 text-white px-4 py-2 rounded mb-4">+ Ajouter médicament</button>
          {showMedicamentForm && (
            <form onSubmit={handleMedicamentSubmit} className="bg-gray-100 p-4 rounded mb-4">
              <input className="block w-full mb-2 p-2 border" placeholder="Code" value={medicamentForm.code} onChange={e => setMedicamentForm({...medicamentForm, code: e.target.value})} required />
              <input className="block w-full mb-2 p-2 border" placeholder="Nom" value={medicamentForm.nom} onChange={e => setMedicamentForm({...medicamentForm, nom: e.target.value})} required />
              <textarea className="block w-full mb-2 p-2 border" placeholder="Description" value={medicamentForm.description} onChange={e => setMedicamentForm({...medicamentForm, description: e.target.value})} />
              <div className="flex gap-2">
                <input type="number" className="w-1/2 p-2 border" placeholder="Stock" value={medicamentForm.stock} onChange={e => setMedicamentForm({...medicamentForm, stock: parseInt(e.target.value) || 0})} />
                <input type="number" className="w-1/2 p-2 border" placeholder="Seuil alerte" value={medicamentForm.seuil_alerte} onChange={e => setMedicamentForm({...medicamentForm, seuil_alerte: parseInt(e.target.value) || 0})} />
              </div>
              {/* autres champs... */}
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded mt-2">Enregistrer</button>
            </form>
          )}
          <table className="w-full border-collapse">
            <thead><tr className="bg-blue-600 text-white"><th>Code</th><th>Nom</th><th>Stock</th><th>Seuil</th><th>Prix</th><th>Stup</th><th>Actions</th></tr></thead>
            <tbody>
              {medicaments.map(m => (
                <tr key={m.id} className="border-b">
                  <td className="p-2">{m.code}</td><td className="p-2">{m.nom}</td>
                  <td className="p-2">{m.stock}</td><td className="p-2">{m.seuil_alerte}</td>
                  <td className="p-2">{m.prix_unitaire} €</td>
                  <td className="p-2">{m.est_stupefiant ? '✅' : '❌'}</td>
                  <td className="p-2">
                    <button onClick={() => editMedicament(m)} className="text-yellow-600 mr-2">✏️</button>
                    <button onClick={() => deleteMedicament(m.id)} className="text-red-600">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'lots' && (
        <div>
          <select value={selectedMedicamentId} onChange={e => setSelectedMedicamentId(e.target.value)} className="w-full p-2 border mb-4">
            <option value="">Choisir un médicament</option>
            {medicaments.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
          </select>
          {selectedMedicamentId && (
            <>
              <button onClick={() => setShowLotForm(!showLotForm)} className="bg-blue-600 text-white px-4 py-2 rounded mb-4">+ Ajouter lot</button>
              {showLotForm && (
                <form onSubmit={handleLotSubmit} className="bg-gray-100 p-4 rounded mb-4">
                  <input className="block w-full mb-2 p-2 border" placeholder="Numéro lot" value={lotForm.numero_lot} onChange={e => setLotForm({...lotForm, numero_lot: e.target.value})} required />
                  <input type="date" className="block w-full mb-2 p-2 border" value={lotForm.date_peremption} onChange={e => setLotForm({...lotForm, date_peremption: e.target.value})} required />
                  <input type="number" placeholder="Quantité" className="block w-full mb-2 p-2 border" value={lotForm.quantite} onChange={e => setLotForm({...lotForm, quantite: parseInt(e.target.value) || 0})} required />
                  <input type="number" step="0.01" placeholder="Prix achat" className="block w-full mb-2 p-2 border" value={lotForm.prix_achat} onChange={e => setLotForm({...lotForm, prix_achat: parseFloat(e.target.value) || 0})} />
                  <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Ajouter</button>
                </form>
              )}
              <table className="w-full border-collapse">
                <thead><tr className="bg-blue-600 text-white"><th>Lot</th><th>Péremption</th><th>Stock actuel</th><th>Prix achat</th></tr></thead>
                <tbody>
                  {lots.map(lot => (
                    <tr key={lot.id} className="border-b">
                      <td className="p-2">{lot.numero_lot}</td>
                      <td className="p-2">{lot.date_peremption}</td>
                      <td className="p-2">{lot.stock_actuel}</td>
                      <td className="p-2">{lot.prix_achat} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {subTab === 'commandes' && (
        <div>
          <button onClick={() => setShowCommandeForm(!showCommandeForm)} className="bg-blue-600 text-white px-4 py-2 rounded mb-4">+ Nouvelle commande</button>
          {showCommandeForm && (
            <form onSubmit={handleCommandeSubmit} className="bg-gray-100 p-4 rounded mb-4">
              <h4 className="font-bold">Lignes de commande</h4>
              {commandeLignes.map((ligne, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <select value={ligne.medicament_id} onChange={e => updateCommandeLigne(idx, 'medicament_id', e.target.value)} className="flex-1 p-2 border">
                    <option value="">Médicament</option>
                    {medicaments.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                  </select>
                  <input type="number" placeholder="Quantité" className="w-24 p-2 border" value={ligne.quantite_commandee} onChange={e => updateCommandeLigne(idx, 'quantite_commandee', parseInt(e.target.value) || 0)} required />
                  <input type="number" step="0.01" placeholder="Prix HT" className="w-32 p-2 border" value={ligne.prix_unitaire_ht} onChange={e => updateCommandeLigne(idx, 'prix_unitaire_ht', parseFloat(e.target.value) || 0)} />
                </div>
              ))}
              <button type="button" onClick={addCommandeLigne} className="bg-gray-500 text-white px-2 py-1 rounded">+ Ajouter ligne</button>
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded ml-2">Créer commande</button>
            </form>
          )}
          <table className="w-full border-collapse">
            <thead><tr className="bg-blue-600 text-white"><th>N° commande</th><th>Date</th><th>Statut</th></tr></thead>
            <tbody>
              {commandes.map(cmd => (
                <tr key={cmd.id} className="border-b">
                  <td className="p-2">{cmd.numero_commande}</td>
                  <td className="p-2">{new Date(cmd.date_commande).toLocaleDateString()}</td>
                  <td className="p-2">{cmd.statut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'delivrance' && (
        <div>
          {deliveryMessage && <div className="bg-green-100 text-green-700 p-2 rounded mb-4">{deliveryMessage}</div>}
          <form onSubmit={handleDeliverySubmit} className="bg-gray-100 p-4 rounded">
            <select className="w-full p-2 mb-2 border" value={deliveryForm.medicament_id} onChange={e => setDeliveryForm({...deliveryForm, medicament_id: e.target.value})} required>
              <option value="">Médicament</option>
              {medicaments.map(m => <option key={m.id} value={m.id}>{m.nom} (stock: {m.stock})</option>)}
            </select>
            <input type="number" placeholder="Quantité" className="w-full p-2 mb-2 border" value={deliveryForm.quantite} onChange={e => setDeliveryForm({...deliveryForm, quantite: parseInt(e.target.value) || 1})} required min="1" />
            <select className="w-full p-2 mb-2 border" value={deliveryForm.patient_id} onChange={e => setDeliveryForm({...deliveryForm, patient_id: e.target.value})} required>
              <option value="">Patient</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
            </select>
            <input type="text" placeholder="Posologie" className="w-full p-2 mb-2 border" value={deliveryForm.posologie} onChange={e => setDeliveryForm({...deliveryForm, posologie: e.target.value})} />
            <input type="text" placeholder="Prescripteur" className="w-full p-2 mb-2 border" value={deliveryForm.prescripteur_nom} onChange={e => setDeliveryForm({...deliveryForm, prescripteur_nom: e.target.value})} />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Délivrer</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PharmacyManager;