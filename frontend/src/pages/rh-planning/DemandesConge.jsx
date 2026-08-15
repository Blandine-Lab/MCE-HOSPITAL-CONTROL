import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaPlus, FaCheck, FaTimes, FaTrash, FaClipboardList, FaComment, FaPrint } from 'react-icons/fa';

const DemandesConge = () => {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'congé annuel',
    date_debut: '',
    date_fin: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Modal de commentaire pour le RH
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedDemandeId, setSelectedDemandeId] = useState(null);
  const [selectedAction, setSelectedAction] = useState('');
  const [commentRH, setCommentRH] = useState('');

  // Nom et logo de l'hôpital (personnalisables via .env)
  const HOPITAL_NOM = import.meta.env.VITE_HOPITAL_NOM || 'Medical Center Elizabeth MCE';
  const LOGO_PATH = '/logo.jpeg'; // ✅ Fichier logo en .jpeg
  const LOGO_URL = window.location.origin + LOGO_PATH; // URL absolue pour l'impression

  // Récupérer les infos de l'utilisateur depuis le token JWT
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
        setUserId(payload.id);
      } catch (e) {
        console.error('Erreur de décodage du token', e);
      }
    }
  }, []);

  // Charger les demandes (le backend filtre déjà)
  const fetchDemandes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/demandes');
      setDemandes(res.data);
    } catch (err) {
      console.error('Erreur lors du chargement des demandes :', err);
      setToast({ type: 'error', message: 'Erreur de chargement' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole !== null) {
      fetchDemandes();
    }
  }, [userRole]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.date_debut || !formData.date_fin) {
      setToast({ type: 'error', message: 'Veuillez renseigner les dates' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (new Date(formData.date_fin) < new Date(formData.date_debut)) {
      setToast({ type: 'error', message: 'La date de fin doit être postérieure à la date de début' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        employe_id: userId,
        statut: 'en_attente'
      };
      await api.post('/demandes', payload);
      setToast({ type: 'success', message: 'Demande envoyée avec succès' });
      setShowForm(false);
      setFormData({ type: 'congé annuel', date_debut: '', date_fin: '', description: '' });
      fetchDemandes();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || 'Erreur lors de l\'envoi';
      setToast({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const openCommentModal = (id, action) => {
    setSelectedDemandeId(id);
    setSelectedAction(action);
    setCommentRH('');
    setShowCommentModal(true);
  };

  const confirmStatusChange = async () => {
    if (!selectedDemandeId) return;
    try {
      await api.put(`/demandes/${selectedDemandeId}`, {
        statut: selectedAction,
        commentaire_rh: commentRH.trim() || null
      });
      setToast({ type: 'success', message: `Demande ${selectedAction === 'approuvé' ? 'approuvée' : 'refusée'} avec commentaire` });
      setShowCommentModal(false);
      fetchDemandes();
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Erreur lors du changement de statut' });
    } finally {
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette demande ?')) return;
    try {
      await api.delete(`/demandes/${id}`);
      setToast({ type: 'success', message: 'Demande supprimée' });
      fetchDemandes();
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Erreur lors de la suppression' });
    } finally {
      setTimeout(() => setToast(null), 3000);
    }
  };

  const isAdmin = userRole === 'admin';

  // Impression globale (utilise l'impression de la page entière)
  const handlePrint = () => {
    window.print();
  };

  // Impression d'une seule demande avec en-tête (logo + nom hôpital) et signatures
  const printOneDemande = (d) => {
    const printWindow = window.open('', '_blank', 'width=700,height=900');
    if (!printWindow) {
      setToast({ type: 'error', message: 'Impossible d\'ouvrir la fenêtre d\'impression' });
      return;
    }
    const statusLabel = d.statut === 'approuvé' ? 'Approuvé' : d.statut === 'refusé' ? 'Refusé' : 'En attente';
    const statusColor = d.statut === 'approuvé' ? '#10b981' : d.statut === 'refusé' ? '#ef4444' : '#f59e0b';
    const rhResponse = d.commentaire_rh || 'Aucun commentaire';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Demande de ${d.type}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: auto; }
          .header {
            display: flex;
            align-items: center;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .header img {
            max-height: 70px;
            margin-right: 20px;
          }
          .header .title-group {
            flex: 1;
          }
          .header h1 {
            margin: 0;
            color: #1e3a8a;
            font-size: 22px;
          }
          .header .hopital-nom {
            font-size: 18px;
            font-weight: bold;
            color: #0f172a;
            margin: 5px 0 0 0;
          }
          .detail { margin-bottom: 12px; }
          .label { font-weight: bold; display: inline-block; width: 160px; }
          .value { display: inline-block; }
          .status {
            padding: 4px 12px;
            border-radius: 20px;
            font-weight: bold;
            color: white;
            background-color: ${statusColor};
            display: inline-block;
          }
          .signature-section {
            margin-top: 40px;
            border-top: 1px solid #ccc;
            padding-top: 30px;
          }
          .signature-block {
            display: inline-block;
            width: 45%;
            margin: 0 2%;
          }
          .signature-line {
            border-bottom: 1px solid #000;
            width: 80%;
            margin: 30px auto 10px auto;
          }
          .signature-label {
            text-align: center;
            font-size: 14px;
            color: #4b5563;
          }
          .footer {
            margin-top: 50px;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
          }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${LOGO_URL}" alt="Logo" />
          <div class="title-group">
            <h1>Demande de ${d.type}</h1>
            <p class="hopital-nom">${HOPITAL_NOM}</p>
          </div>
        </div>
        <div class="detail"><span class="label">Type :</span><span class="value">${d.type}</span></div>
        <div class="detail"><span class="label">Date début :</span><span class="value">${new Date(d.date_debut).toLocaleDateString('fr-FR')}</span></div>
        <div class="detail"><span class="label">Date fin :</span><span class="value">${new Date(d.date_fin).toLocaleDateString('fr-FR')}</span></div>
        <div class="detail"><span class="label">Statut :</span><span class="status">${statusLabel}</span></div>
        <div class="detail"><span class="label">Description :</span><span class="value">${d.commentaire || 'Aucune description'}</span></div>
        <div class="detail"><span class="label">Réponse RH :</span><span class="value">${rhResponse}</span></div>

        <div class="signature-section">
          <div style="text-align: center; margin-bottom: 20px; font-weight: bold; font-size: 16px;">Signatures</div>
          <div style="display: flex; justify-content: space-around; flex-wrap: wrap;">
            <div class="signature-block">
              <p style="text-align: center; font-weight: bold;">Employé</p>
              <div class="signature-line"></div>
              <div class="signature-label">Signature</div>
              <div style="margin-top: 10px; display: flex; justify-content: space-between;">
                <span>Nom : _________________________</span>
                <span>Date : ___/___/______</span>
              </div>
            </div>
            <div class="signature-block">
              <p style="text-align: center; font-weight: bold;">Responsable RH</p>
              <div class="signature-line"></div>
              <div class="signature-label">Signature</div>
              <div style="margin-top: 10px; display: flex; justify-content: space-between;">
                <span>Nom : _________________________</span>
                <span>Date : ___/___/______</span>
              </div>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; font-size: 13px; color: #4b5563;">
            <p><em>Lu et approuvé,</em></p>
            <p>Fait à ______________, le ___/___/______</p>
          </div>
        </div>

        <div class="footer">
          Document imprimé le ${new Date().toLocaleString('fr-FR')} - ${window.location.origin}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Chargement...</div>;

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, padding: '12px 24px', borderRadius: 8,
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {toast.message}
        </div>
      )}

      {showCommentModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: 12, padding: 32,
            maxWidth: 500, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginTop: 0 }}>
              {selectedAction === 'approuvé' ? '✅ Approuver la demande' : '❌ Refuser la demande'}
            </h3>
            <p style={{ color: '#4b5563', marginBottom: 16 }}>
              Veuillez ajouter un commentaire (optionnel) pour l'employé :
            </p>
            <textarea
              value={commentRH}
              onChange={(e) => setCommentRH(e.target.value)}
              rows={4}
              placeholder="Ex: Demande acceptée sous réserve de... / Refusée car..."
              style={{
                width: '100%', padding: '12px', border: '1px solid #d1d5db',
                borderRadius: 6, fontFamily: 'inherit', marginBottom: 16
              }}
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCommentModal(false)}
                style={{ backgroundColor: '#e5e7eb', padding: '8px 20px', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                onClick={confirmStatusChange}
                style={{
                  backgroundColor: selectedAction === 'approuvé' ? '#10b981' : '#ef4444',
                  color: 'white', padding: '8px 20px', border: 'none', borderRadius: 6, cursor: 'pointer'
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* En-tête de la page avec logo et nom de l'hôpital (visible à l'écran et à l'impression globale) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        padding: '16px 24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <img src={LOGO_PATH} alt="Logo hôpital" style={{ height: '60px' }} />
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#1e3a8a' }}>{HOPITAL_NOM}</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Gestion des demandes de congé et absences
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 12 }}>
          <FaClipboardList style={{ color: '#60a5fa' }} />
          {isAdmin ? 'Gestion des demandes' : 'Mes demandes'}
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handlePrint}
            style={{
              backgroundColor: '#6b7280', color: 'white', padding: '10px 20px',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <FaPrint /> Imprimer tout
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              backgroundColor: '#60a5fa', color: 'white', padding: '10px 20px',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <FaPlus /> Nouvelle demande
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{
          backgroundColor: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: 24
        }}>
          <h3 style={{ marginTop: 0 }}>Nouvelle demande</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Type *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }}
              >
                <option value="congé annuel">Congé annuel</option>
                <option value="congé maladie">Congé maladie</option>
                <option value="congé maternité">Congé maternité</option>
                <option value="congé paternité">Congé paternité</option>
                <option value="congé sans solde">Congé sans solde</option>
                <option value="formation">Formation</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Date début *</label>
              <input
                type="date"
                name="date_debut"
                value={formData.date_debut}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Date fin *</label>
              <input
                type="date"
                name="date_fin"
                value={formData.date_fin}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Description / Commentaire</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 }}
              />
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: 12 }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  backgroundColor: '#10b981', color: 'white', padding: '10px 24px',
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                  opacity: submitting ? 0.6 : 1
                }}
              >
                {submitting ? 'Envoi...' : 'Envoyer la demande'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{ backgroundColor: '#e5e7eb', padding: '10px 24px', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ backgroundColor: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {demandes.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Aucune demande trouvée</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f1f5f9' }}>
              <tr>
                {isAdmin && <th style={{ padding: '12px 16px', textAlign: 'left' }}>Employé</th>}
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Du</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Au</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Description</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Statut</th>
                {!isAdmin && <th style={{ padding: '12px 16px', textAlign: 'left' }}>Réponse RH</th>}
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {demandes.map((d, i) => (
                <tr key={d.id} style={{ borderBottom: i === demandes.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                  {isAdmin && <td style={{ padding: '12px 16px' }}>{d.employe_nom} {d.employe_prenom}</td>}
                  <td style={{ padding: '12px 16px' }}>{d.type}</td>
                  <td style={{ padding: '12px 16px' }}>{new Date(d.date_debut).toLocaleDateString('fr-FR')}</td>
                  <td style={{ padding: '12px 16px' }}>{new Date(d.date_fin).toLocaleDateString('fr-FR')}</td>
                  <td style={{ padding: '12px 16px', maxWidth: '200px', wordWrap: 'break-word' }}>
                    {d.commentaire || '-'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                      backgroundColor: d.statut === 'approuvé' ? '#d1fae5' : d.statut === 'refusé' ? '#fee2e2' : '#fef3c7',
                      color: d.statut === 'approuvé' ? '#065f46' : d.statut === 'refusé' ? '#991b1b' : '#92400e'
                    }}>
                      {d.statut === 'approuvé' ? 'Approuvé' : d.statut === 'refusé' ? 'Refusé' : 'En attente'}
                    </span>
                  </td>
                  {!isAdmin && (
                    <td style={{ padding: '12px 16px', maxWidth: 200 }}>
                      {d.commentaire_rh || <span style={{ color: '#94a3b8', fontSize: 13 }}>—</span>}
                    </td>
                  )}
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {isAdmin && d.statut === 'en_attente' && (
                      <>
                        <button onClick={() => openCommentModal(d.id, 'approuvé')} style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', marginRight: 4 }} title="Approuver avec commentaire">
                          <FaCheck />
                        </button>
                        <button onClick={() => openCommentModal(d.id, 'refusé')} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginRight: 4 }} title="Refuser avec commentaire">
                          <FaTimes />
                        </button>
                      </>
                    )}
                    {(!isAdmin || d.statut !== 'en_attente') && (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        {d.statut === 'approuvé' ? '✅' : d.statut === 'refusé' ? '❌' : '⏳'}
                      </span>
                    )}
                    {isAdmin && (
                      <button onClick={() => handleDelete(d.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8 }}>
                        <FaTrash />
                      </button>
                    )}
                    {!isAdmin && d.commentaire_rh && (
                      <span style={{ marginLeft: 8, color: '#3b82f6' }}><FaComment /></span>
                    )}
                    <button
                      onClick={() => printOneDemande(d)}
                      style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4 }}
                      title="Imprimer cette demande"
                    >
                      <FaPrint />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @media print {
          button, .no-print, .toast, .modal {
            display: none !important;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0.5cm !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #ccc !important;
            padding: 8px !important;
            text-align: left !important;
          }
          thead {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .statut-badge {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          th:last-child, td:last-child {
            display: none !important;
          }
          ${isAdmin ? `th:last-child, td:last-child { display: none !important; }` : ''}
        }
      `}</style>
    </div>
  );
};

export default DemandesConge;