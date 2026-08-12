import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../../axios';

const PrescriptionDetail = () => {
  const { id } = useParams();
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [password, setPassword] = useState('');
  const [retrievedBy, setRetrievedBy] = useState('');
  const [infirmiers, setInfirmiers] = useState([]);
  const [delivering, setDelivering] = useState(false);
  const [toast, setToast] = useState(null);

  // Charger la prescription et la liste des infirmiers
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prescRes, infirmiersRes] = await Promise.all([
          api.get(`/prescriptions/${id}`),
          api.get('/pharmacy/infirmiers')
        ]);
        setPrescription(prescRes.data);
        setInfirmiers(infirmiersRes.data);
        setLoading(false);
      } catch (err) {
        console.error('❌ Erreur chargement :', err);
        setError(err.response?.data?.error || 'Erreur de chargement');
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const formatOrdre = (num) => {
    return `ORD-${String(num).padStart(4, '0')}`;
  };

  // Gérer la délivrance avec l'infirmier sélectionné
  const handleDeliver = async () => {
    if (!password) {
      setToast('Veuillez saisir votre mot de passe');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (!retrievedBy) {
      setToast('Veuillez sélectionner l\'infirmier qui retire les médicaments');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setDelivering(true);
    try {
      await api.put(`/prescriptions/${id}/serve`, {
        password,
        retrieved_by: retrievedBy
      });
      setToast('✅ Délivrance effectuée avec succès');
      setTimeout(() => setToast(null), 3000);
      setShowDeliverModal(false);
      // Recharger la prescription pour mettre à jour le statut
      const res = await api.get(`/prescriptions/${id}`);
      setPrescription(res.data);
    } catch (err) {
      console.error(err);
      let msg = err.response?.data?.error || err.message;
      if (err.response?.status === 403) {
        msg = 'Mot de passe incorrect. Veuillez réessayer.';
      }
      setToast('❌ Erreur : ' + msg);
      setTimeout(() => setToast(null), 3000);
    } finally {
      setDelivering(false);
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      ⏳ Chargement de la prescription...
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
      ❌ {error}
    </div>
  );

  if (!prescription) return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      ❌ Prescription non trouvée
    </div>
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toast.includes('✅') ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {toast}
        </div>
      )}

      {/* ===== EN�FC�TÊTE DE L�FC�HÔPITAL ===== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        borderBottom: '3px solid #1e3a8a',
        paddingBottom: '16px',
        marginBottom: '24px'
      }}>
        <img
          src="/logo.jpeg"
          alt="Logo Medical Center Elizabeth MCE"
          style={{ height: '60px', width: 'auto' }}
        />
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>
            Medical Center Elizabeth MCE
          </h1>
          <p style={{ color: '#475569', margin: 0, fontSize: '14px' }}>
            Service de pharmacie �FC� Prescription médicale
          </p>
        </div>
      </div>

      {/* ===== CONTENU PRINCIPAL ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>📄 Détail de la prescription</h2>
        <button 
          onClick={handlePrint} 
          style={{ 
            background: '#9333ea', 
            color: 'white', 
            padding: '8px 20px', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          🖨️ Imprimer
        </button>
      </div>

      <div style={{ 
        border: '1px solid #e5e7eb', 
        padding: '24px', 
        borderRadius: '8px',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <p><strong>N° Ordonnance :</strong> {formatOrdre(prescription.id)}</p>
          <p><strong>Patient :</strong> {prescription.patient_prenom} {prescription.patient_nom}</p>
          <p><strong>Médecin prescripteur :</strong> Dr. {prescription.doctor_prenom} {prescription.doctor_nom}</p>
          <p><strong>Date :</strong> {new Date(prescription.date_creation).toLocaleString()}</p>
          <p>
            <strong>Statut :</strong> 
            <span style={{ 
              marginLeft: '8px',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '14px',
              backgroundColor: prescription.status === 'pending' ? '#fef3c7' : '#d1fae5',
              color: prescription.status === 'pending' ? '#92400e' : '#065f46'
            }}>
              {prescription.status === 'pending' ? '⏳ En attente' : 
               prescription.status === 'served' ? '✅ Servie' : '⚠️ Partielle'}
            </span>
          </p>
          {prescription.pharmacist_id && (
            <p><strong>Servie par :</strong> pharmacien ID {prescription.pharmacist_id} le {prescription.date_served ? new Date(prescription.date_served).toLocaleString() : '-'}</p>
          )}
          {/* ✅ Nouvelle ligne : afficher l'infirmier récupérant */}
          {prescription.retrieved_nom && (
            <p><strong>Récupéré par :</strong> {prescription.retrieved_prenom} {prescription.retrieved_nom}</p>
          )}
        </div>

        <h3 style={{ marginTop: '24px', marginBottom: '12px' }}>💊 Médicaments prescrits :</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {prescription.items?.map((item, idx) => (
            <li key={idx} style={{ 
              padding: '8px 12px', 
              marginBottom: '8px',
              backgroundColor: 'white',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              <strong>{item.medicament}</strong>
              {item.posologie && ` �FC� ${item.posologie}`}
              {item.duree && ` (${item.duree})`}
              <span style={{ marginLeft: '12px', color: '#6b7280', fontSize: '14px' }}>
                Qté: {item.quantite}
              </span>
            </li>
          ))}
        </ul>

        {prescription.notes && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
            <strong>📝 Notes :</strong> {prescription.notes}
          </div>
        )}

        {/* ===== BOUTON DÉLIVRER ===== */}
        {prescription.status === 'pending' && (
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowDeliverModal(true)}
              style={{
                backgroundColor: '#16a34a',
                color: 'white',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              💊 Délivrer
            </button>
          </div>
        )}

        {/* ===== MODAL DE DÉLIVRANCE AVEC SÉLECTION DE L'INFIRMIER ===== */}
        {showDeliverModal && (
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
              width: '450px',
              maxWidth: '90%'
            }}>
              <h3 style={{ marginBottom: '16px' }}>🔒 Validation de la délivrance</h3>
              
              {/* Sélection de l'infirmier */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
                  Infirmier récupérant *
                </label>
                <select
                  value={retrievedBy}
                  onChange={(e) => setRetrievedBy(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="">-- Choisir --</option>
                  {infirmiers.map(inf => (
                    <option key={inf.id} value={inf.id}>
                      {inf.prenom} {inf.nom}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  L'infirmier qui vient chercher les médicaments
                </div>
              </div>

              {/* Mot de passe du pharmacien */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
                  Mot de passe du pharmacien *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Saisissez votre mot de passe"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  onClick={() => {
                    setShowDeliverModal(false);
                    setPassword('');
                    setRetrievedBy('');
                  }}
                  style={{ padding: '8px 16px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeliver}
                  disabled={delivering}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    opacity: delivering ? 0.6 : 1
                  }}
                >
                  {delivering ? 'En cours...' : 'Valider'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== HISTORIQUE ===== */}
        {prescription.historique && prescription.historique.length > 0 && (
          <div style={{ marginTop: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
            <h3>📜 Historique</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {prescription.historique.map((evt, idx) => (
                <li key={idx} style={{ padding: '4px 0', fontSize: '14px', color: '#4b5563' }}>
                  <strong>{evt.action === 'creation' ? '📝 Créée par' : '💊 Délivrée par'}</strong> {evt.utilisateur}
                  �FC� {new Date(evt.date).toLocaleString()}
                  {evt.role && <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '12px' }}>({evt.role})</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Link to="/" style={{ 
        display: 'inline-block', 
        marginTop: '20px', 
        color: '#2563eb',
        textDecoration: 'none',
        fontWeight: 'bold'
      }}>
        ← Retour
      </Link>
    </div>
  );
};

export default PrescriptionDetail;
