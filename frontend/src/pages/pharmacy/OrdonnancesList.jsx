import { useEffect, useState } from 'react';
import { FaEye, FaCheck, FaTimes, FaHistory, FaSyringe } from 'react-icons/fa';
import api from '../../axios';

const OrdonnancesList = () => {
  const [ordonnances, setOrdonnances] = useState([]);
  const [selectedOrdonnance, setSelectedOrdonnance] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [showModal, setShowModal] = useState(false);
  const [lotsDisponibles, setLotsDisponibles] = useState({});
  const [selectedLots, setSelectedLots] = useState({});
  const [quantites, setQuantites] = useState({});
  const [password, setPassword] = useState('');
  const [delivering, setDelivering] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast(message);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  // Récupérer les ordonnances en attente
  const fetchOrdonnances = async () => {
    try {
      const res = await api.get('/pharmacy/ordonnances/en-attente');
      setOrdonnances(res.data);
    } catch (err) {
      console.error('Erreur fetchOrdonnances :', err);
      showToast('Erreur chargement des ordonnances : ' + (err.response?.status || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdonnances();
  }, []);

  // Voir les détails d'une ordonnance
  const viewOrdonnance = async (id) => {
    try {
      const res = await api.get(`/pharmacy/ordonnances/${id}/lignes`);
      const lignesData = res.data;
      setSelectedOrdonnance({ id, ...res.data });
      setLignes(lignesData);

      // Initialiser les états pour chaque ligne
      const initialLots = {};
      const initialQuantites = {};
      for (let i = 0; i < lignesData.length; i++) {
        const ligne = lignesData[i];
        initialQuantites[i] = ligne.quantite_prescrit - (ligne.quantite_delivree || 0);
        // Récupérer les lots disponibles pour ce médicament
        try {
          const lotsRes = await api.get(`/pharmacy/lots/disponibles/${ligne.medicament_id}`);
          if (lotsRes.data.length > 0) {
            initialLots[i] = lotsRes.data[0].id; // pré-sélectionner le premier lot
          }
          setLotsDisponibles(prev => ({ ...prev, [ligne.medicament_id]: lotsRes.data }));
        } catch (err) {
          console.error(`Erreur chargement lots pour médicament ${ligne.medicament_id} :`, err);
        }
      }
      setSelectedLots(initialLots);
      setQuantites(initialQuantites);
      setShowModal(true);
    } catch (err) {
      console.error('Erreur viewOrdonnance :', err);
      showToast('Erreur chargement des lignes de l\'ordonnance', 'error');
    }
  };

  // Délivrer une ligne
  const deliverLine = async (ligneIndex) => {
    const ligne = lignes[ligneIndex];
    const lotId = selectedLots[ligneIndex];
    const quantite = quantites[ligneIndex];

    if (!lotId) {
      showToast('Veuillez sélectionner un lot', 'error');
      return;
    }
    if (!quantite || quantite <= 0) {
      showToast('Quantité invalide', 'error');
      return;
    }
    if (!password) {
      showToast('Veuillez saisir votre mot de passe', 'error');
      return;
    }

    setDelivering(true);
    try {
      const payload = {
        patient_id: selectedOrdonnance.patient_id,
        medicament_id: ligne.medicament_id,
        lot_id: lotId,
        quantite: quantite,
        posologie: ligne.posologie || '',
        prescripteur_nom: selectedOrdonnance.medecin_nom ? `Dr. ${selectedOrdonnance.medecin_prenom} ${selectedOrdonnance.medecin_nom}` : '',
        ligne_ordonnance_id: ligne.id,
        password: password
      };
      await api.post('/pharmacy/delivrance', payload);
      showToast('✅ Délivrance enregistrée avec succès', 'success');
      fetchOrdonnances();
      setShowModal(false);
    } catch (err) {
      console.error('Erreur délivrance :', err);
      let msg = err.response?.data?.error || err.message;
      if (err.response?.status === 403) {
        msg = 'Mot de passe incorrect. Veuillez réessayer.';
      }
      showToast('❌ Erreur : ' + msg, 'error');
    } finally {
      setDelivering(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>⏳ Chargement...</div>;
  }

  return (
    <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}

      <h2 style={{ marginBottom: '20px' }}>📋 Ordonnances en attente de délivrance</h2>

      {ordonnances.length === 0 ? (
        <p>Aucune ordonnance en attente.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>N°</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Patient</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Médecin</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Date</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Statut</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ordonnances.map(ord => (
              <tr key={ord.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>ORD-{String(ord.id).padStart(4, '0')}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{ord.patient_prenom} {ord.patient_nom}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>Dr. {ord.medecin_prenom} {ord.medecin_nom}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{new Date(ord.date_prescription).toLocaleString()}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  <span style={{
                    backgroundColor: ord.statut === 'en_attente' || ord.statut === 'partiellement_delivree' ? '#f59e0b' : '#10b981',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    fontSize: '12px'
                  }}>
                    {ord.statut === 'en_attente' ? '⏳ En attente' :
                     ord.statut === 'partiellement_delivree' ? '🔶 Partielle' : '✅ Délivrée'}
                  </span>
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  <button
                    onClick={() => viewOrdonnance(ord.id)}
                    style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <FaEye /> Détails
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && selectedOrdonnance && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            width: '800px',
            maxWidth: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2>Ordonnance ORD-{String(selectedOrdonnance.id).padStart(4, '0')}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>✕</button>
            </div>
            <p><strong>Patient :</strong> {selectedOrdonnance.patient_prenom} {selectedOrdonnance.patient_nom}</p>
            <p><strong>Médecin :</strong> Dr. {selectedOrdonnance.medecin_prenom} {selectedOrdonnance.medecin_nom}</p>
            <p><strong>Date :</strong> {new Date(selectedOrdonnance.date_prescription).toLocaleString()}</p>
            {selectedOrdonnance.observations && <p><strong>Observations :</strong> {selectedOrdonnance.observations}</p>}

            <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>💊 Médicaments prescrits</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Médicament</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Prescrit</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Délivré</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Reste</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Lot</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((ligne, index) => {
                  const reste = ligne.quantite_prescrit - (ligne.quantite_delivree || 0);
                  return (
                    <tr key={index}>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{ligne.medicament_nom}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{ligne.quantite_prescrit}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{ligne.quantite_delivree || 0}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{reste}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                        <select
                          value={selectedLots[index] || ''}
                          onChange={(e) => setSelectedLots({ ...selectedLots, [index]: e.target.value })}
                          style={{ padding: '4px', width: '100%' }}
                          disabled={reste <= 0}
                        >
                          <option value="">-- Choisir un lot --</option>
                          {(lotsDisponibles[ligne.medicament_id] || []).map(lot => (
                            <option key={lot.id} value={lot.id}>
                              {lot.numero_lot} (pr. {new Date(lot.date_peremption).toLocaleDateString()}, stock {lot.stock_actuel})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                        {reste > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                            <input
                              type="number"
                              min="1"
                              max={reste}
                              value={quantites[index] || 1}
                              onChange={(e) => setQuantites({ ...quantites, [index]: parseInt(e.target.value) || 1 })}
                              style={{ width: '60px', padding: '4px' }}
                            />
                            <button
                              onClick={() => deliverLine(index)}
                              disabled={delivering}
                              style={{ background: '#16a34a', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              <FaCheck /> Délivrer
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ marginTop: '20px' }}>
              <label style={{ fontWeight: 'bold' }}>Mot de passe de validation *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '4px' }}
                placeholder="Saisissez votre mot de passe pour valider"
              />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', marginRight: '8px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Fermer</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default OrdonnancesList;