// src/pages/consultations/PrescriptionDetail.jsx
import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';

const PrescriptionDetail = () => {
  // 🔧 Récupère l'hôpital courant depuis le contexte auth (multi-tenant)
  const { hopital } = useAuth();

  const { id } = useParams();
  const [prescription, setPrescription] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [password, setPassword] = useState('');
  const [retrievedBy, setRetrievedBy] = useState('');
  const [infirmiers, setInfirmiers] = useState([]);
  const [delivering, setDelivering] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

  // 🔧 Nom + logo tenant-aware
  const HOPITAL_NOM =
    hopital?.nom || import.meta.env.VITE_HOPITAL_NOM || 'Hôpital';

  // 🔧 Résout le logo :
  //  - URL absolue (https://...) → utilisée telle quelle
  //  - chemin relatif (/logo.jpeg) → préfixé par l'origine
  //  - fallback → /logo.jpeg
  const resolveLogoUrl = (rawLogo) => {
    if (!rawLogo) return `${window.location.origin}/logo.jpeg`;
    if (/^https?:\/\//i.test(rawLogo)) return rawLogo;
    const withSlash = rawLogo.startsWith('/') ? rawLogo : `/${rawLogo}`;
    return `${window.location.origin}${withSlash}`;
  };

  const LOGO_PATH =
    hopital?.logo_url && !/^https?:\/\//i.test(hopital.logo_url)
      ? hopital.logo_url.startsWith('/')
        ? hopital.logo_url
        : `/${hopital.logo_url}`
      : resolveLogoUrl(hopital?.logo_url);

  const API_BASE = '/prescriptions';

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  // 🔧 Chargement NON BLOQUANT : prescription + infirmiers d'abord,
  //    historique ensuite (si 500 → on ignore, la page reste fonctionnelle)
  const loadAll = async () => {
    try {
      // 1. Chargement critique
      const [prescRes, infirmiersRes] = await Promise.all([
        api.get(`${API_BASE}/${id}`),
        api.get('/pharmacy/infirmiers')
      ]);
      setPrescription(prescRes.data);
      setInfirmiers(infirmiersRes.data || []);

      // 2. Historique — NON bloquant (try/catch isolé)
      try {
        const histRes = await api.get(`${API_BASE}/${id}/historique`);
        setHistorique(histRes.data?.historique || []);
      } catch (histErr) {
        console.warn('⚠️ Historique indisponible :', histErr.message);
        setHistorique([]);
      }
    } catch (err) {
      console.error('Erreur chargement prescription :', err);
      setError(err.response?.data?.error || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 🔧 Impression : ouvre la version propre dans un nouvel onglet
  const handlePrint = () => {
    window.open(`/prescriptions/${id}/print`, '_blank', 'noopener,noreferrer');
  };

  const formatOrdre = (p) => {
    if (p?.numero_ordonnance) return p.numero_ordonnance;
    return `ORD-${String(p?.id ?? '').padStart(4, '0')}`;
  };

  const handleDeliver = async () => {
    if (!password) {
      showToast('Veuillez saisir votre mot de passe', 'error');
      return;
    }
    if (!retrievedBy) {
      showToast("Veuillez sélectionner l'infirmier qui retire les médicaments", 'error');
      return;
    }
    setDelivering(true);
    try {
      await api.put(`${API_BASE}/${id}/serve`, {
        retrieved_by: parseInt(retrievedBy, 10),
        password
      });
      showToast('✅ Délivrance effectuée avec succès', 'success');
      setShowDeliverModal(false);
      setPassword('');
      setRetrievedBy('');
      await loadAll();
    } catch (err) {
      console.error(err);
      let msg = err.response?.data?.error || err.message;
      if (err.response?.status === 403) {
        msg = 'Mot de passe incorrect. Veuillez réessayer.';
      }
      showToast('❌ Erreur : ' + msg, 'error');
    } finally {
      setDelivering(false);
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px' }}>⏳ Chargement de la prescription...</div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>❌ {error}</div>
  );

  if (!prescription) return (
    <div style={{ textAlign: 'center', padding: '40px' }}>🧾 Prescription non trouvée</div>
  );

  const getMedicamentNom = (item) =>
    item.medicament_nom || item.medicament || item.nom
    || (item.medicament_id ? `Médicament #${item.medicament_id}` : 'Médicament inconnu');

  const getQuantite = (item) => item.quantite_prescrit ?? item.quantite ?? 0;

  // Le backend renvoie `lignes` ET `items` — on prend ce qui existe
  const lignesPrescrites = prescription.lignes || prescription.items || [];

  const statutLabel =
    prescription.statut === 'en_attente' ? '⏳ En attente' :
    prescription.statut === 'delivree' || prescription.statut === 'servie' ? '✅ Délivrée' :
    prescription.statut === 'partiellement_delivree' ? '📦 Partielle' :
    prescription.statut;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px',
          backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
          color: 'white', padding: '12px 24px', borderRadius: '8px',
          zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          animation: 'slideIn 0.3s ease-out'
        }}>{toast}</div>
      )}

      {/* 🔧 En-tête tenant-aware */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '20px',
        borderBottom: '3px solid #1e3a8a', paddingBottom: '16px', marginBottom: '24px'
      }}>
        <img
          src={LOGO_PATH}
          alt={`Logo ${HOPITAL_NOM}`}
          style={{ height: '60px', width: 'auto' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>
            {HOPITAL_NOM}
          </h1>
          <p style={{ color: '#475569', margin: 0, fontSize: '14px' }}>
            Service de pharmacie – Prescription médicale
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>📋 Détail de la prescription</h2>
        <button onClick={handlePrint} style={{
          background: '#9333ea', color: 'white', padding: '8px 20px',
          border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px',
          display: 'inline-flex', alignItems: 'center', gap: '6px'
        }}>
          🖨️ Imprimer
        </button>
      </div>

      <div style={{
        border: '1px solid #e5e7eb', padding: '24px',
        borderRadius: '8px', backgroundColor: '#f9fafb'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <p><strong>N° Ordonnance :</strong> {formatOrdre(prescription)}</p>
          <p><strong>Patient :</strong> {prescription.patient_prenom} {prescription.patient_nom}</p>
          <p><strong>Médecin prescripteur :</strong> Dr. {prescription.medecin_prenom} {prescription.medecin_nom}</p>
          <p><strong>Date :</strong> {new Date(prescription.created_at || prescription.date_creation).toLocaleString('fr-FR')}</p>
          <p>
            <strong>Statut :</strong>
            <span style={{
              marginLeft: '8px', padding: '4px 12px', borderRadius: '20px', fontSize: '14px',
              backgroundColor: prescription.statut === 'en_attente' ? '#fef3c7' : '#d1fae5',
              color: prescription.statut === 'en_attente' ? '#92400e' : '#065f46'
            }}>
              {statutLabel}
            </span>
          </p>
          {prescription.retrieved_nom && (
            <p><strong>Retiré par :</strong> {prescription.retrieved_prenom} {prescription.retrieved_nom}</p>
          )}
        </div>

        <h3 style={{ marginTop: '24px', marginBottom: '12px' }}>💊 Médicaments prescrits :</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {lignesPrescrites.map((item, idx) => (
            <li key={item.id ?? idx} style={{
              padding: '8px 12px', marginBottom: '8px',
              backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e5e7eb'
            }}>
              <strong>{getMedicamentNom(item)}</strong>
              {item.posologie && ` – ${item.posologie}`}
              <span style={{ marginLeft: '12px', color: '#6b7280', fontSize: '14px' }}>
                Qté : {getQuantite(item)}
                {item.quantite_delivree != null && item.quantite_delivree > 0 && (
                  <span style={{ marginLeft: '8px', color: '#10b981' }}>
                    (livré : {item.quantite_delivree})
                  </span>
                )}
              </span>
            </li>
          ))}
          {lignesPrescrites.length === 0 && (
            <li style={{ color: '#9ca3af', fontStyle: 'italic' }}>
              Aucun médicament dans cette ordonnance.
            </li>
          )}
        </ul>

        {prescription.observations && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
            <strong>📝 Observations :</strong> {prescription.observations}
          </div>
        )}

        {/* Bouton délivrer */}
        {prescription.statut === 'en_attente' && (
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowDeliverModal(true)} style={{
              backgroundColor: '#16a34a', color: 'white', border: 'none',
              padding: '10px 24px', borderRadius: '6px', cursor: 'pointer',
              fontSize: '16px', fontWeight: 'bold'
            }}>
              ✅ Délivrer
            </button>
          </div>
        )}

        {/* Modal de délivrance */}
        {showDeliverModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white', borderRadius: '16px',
              padding: '24px', width: '450px', maxWidth: '90%'
            }}>
              <h3 style={{ marginBottom: '16px' }}>🔒 Validation de la délivrance</h3>

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
                {infirmiers.length === 0 && (
                  <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    ⚠️ Aucun infirmier disponible — créez-en un dans la base.
                  </p>
                )}
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  L'infirmier qui vient chercher les médicaments
                </div>
              </div>

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
                  onClick={() => { setShowDeliverModal(false); setPassword(''); setRetrievedBy(''); }}
                  style={{ padding: '8px 16px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeliver}
                  disabled={delivering}
                  style={{
                    padding: '8px 16px', backgroundColor: '#16a34a', color: 'white',
                    border: 'none', borderRadius: '4px', cursor: 'pointer',
                    opacity: delivering ? 0.6 : 1
                  }}
                >
                  {delivering ? 'En cours...' : 'Valider'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Historique — s'affiche seulement si des événements existent */}
        {historique.length > 0 && (
          <div style={{ marginTop: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
            <h3>📜 Historique</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {historique.map((evt, idx) => (
                <li key={idx} style={{ padding: '6px 0', fontSize: '14px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                    backgroundColor: evt.action === 'creation' ? '#3b82f6' : '#10b981'
                  }} />
                  <strong>{evt.action === 'creation' ? '✏️ Créée par' : '✅ Délivrée par'}</strong>{' '}
                  {evt.utilisateur}
                  {' — '}
                  {new Date(evt.date).toLocaleString('fr-FR')}
                  {evt.role && (
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>({evt.role})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Link to="/doctor/prescriptions" style={{
        display: 'inline-block', marginTop: '20px', color: '#2563eb',
        textDecoration: 'none', fontWeight: 'bold'
      }}>
        ← Retour aux prescriptions
      </Link>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default PrescriptionDetail;