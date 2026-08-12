// src/pages/finances/EcrituresList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaPlus, FaEye, FaCheck, FaTimes, FaTrash, FaFilter } from 'react-icons/fa';

const EcrituresList = () => {
  const [ecritures, setEcritures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('tous');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [userRole, setUserRole] = useState(null);

  // ? Rcuprer le rle depuis le token JWT
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (e) {
        console.error('Erreur dcodage token', e);
      }
    }
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchEcritures = () => {
    const params = new URLSearchParams();
    if (filter !== 'tous') params.append('statut', filter);
    if (dateDebut) params.append('date_debut', dateDebut);
    if (dateFin) params.append('date_fin', dateFin);

    api.get(`/ecritures?${params.toString()}`)
      .then(res => {
        setEcritures(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur chargement critures:', err);
        showToast('Erreur lors du chargement des critures', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEcritures();
  }, [filter, dateDebut, dateFin]);

  const handleValider = (id) => {
    if (!window.confirm('Valider cette criture ?')) return;
    api.put(`/ecritures/${id}/valider`)
      .then(() => {
        setEcritures(ecritures.map(e => e.id === id ? { ...e, statut: 'valid' } : e));
        showToast('criture valide');
      })
      .catch(err => {
        console.error(err);
        showToast('Erreur lors de la validation', 'error');
      });
  };

  const handleAnnuler = (id) => {
    if (!window.confirm('Annuler cette criture ?')) return;
    api.put(`/ecritures/${id}/annuler`)
      .then(() => {
        setEcritures(ecritures.map(e => e.id === id ? { ...e, statut: 'annul' } : e));
        showToast('criture annule');
      })
      .catch(err => {
        console.error(err);
        showToast('Erreur lors de l\'annulation', 'error');
      });
  };

  // ? handleDelete avec gestion 403
  const handleDelete = async (id) => {
    if (!window.confirm('?? Supprimer dfinitivement cette criture ? Seulement si elle est au statut "Brouillon". Cette action est irrversible.')) return;
    try {
      await api.delete(`/ecritures/${id}`);
      setEcritures(ecritures.filter(e => e.id !== id));
      showToast('criture supprime avec succs');
    } catch (err) {
      console.error('Erreur suppression criture:', err);
      if (err.response?.status === 403) {
        showToast('? Seul un administrateur peut supprimer une criture.', 'error');
      } else {
        showToast('? Erreur lors de la suppression : ' + (err.response?.data?.error || err.message), 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>? Chargement...</div>;

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontSize: '28px', color: '#0f172a' }}>?? critures comptables</h1>
        <Link to="/finance/ecritures/nouveau" style={{ backgroundColor: '#f59e0b', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPlus /> Nouvelle criture
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaFilter style={{ color: '#64748b' }} />
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <option value="tous">Tous</option>
            <option value="brouillon">Brouillon</option>
            <option value="valid">Valid</option>
            <option value="annul">Annul</option>
          </select>
        </div>
        <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
        <span>?</span>
        <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th style={{ padding: '14px 20px', textAlign: 'left' }}>N Pice</th>
              <th style={{ padding: '14px 20px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '14px 20px', textAlign: 'left' }}>Libell</th>
              <th style={{ padding: '14px 20px', textAlign: 'right' }}>Montant</th>
              <th style={{ padding: '14px 20px', textAlign: 'left' }}>Statut</th>
              <th style={{ padding: '14px 20px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ecritures.map((e, i) => (
              <tr key={e.id} style={{ borderBottom: i === ecritures.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 20px', fontWeight: '500' }}>{e.numero_piece}</td>
                <td style={{ padding: '14px 20px' }}>{new Date(e.date_ecriture).toLocaleDateString('fr-FR')}</td>
                <td style={{ padding: '14px 20px' }}>{e.libelle}</td>
                <td style={{ padding: '14px 20px', textAlign: 'right' }}>{Number(e.montant_total).toLocaleString('fr-FR')} FCFA</td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: e.statut === 'valid' ? '#d1fae5' : e.statut === 'annul' ? '#fee2e2' : '#fef3c7',
                    color: e.statut === 'valid' ? '#065f46' : e.statut === 'annul' ? '#991b1b' : '#92400e'
                  }}>
                    {e.statut === 'valid' ? '? Valid' : e.statut === 'annul' ? '? Annul' : '?? Brouillon'}
                  </span>
                </td>
                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                  <Link to={`/finance/ecritures/${e.id}`} style={{ color: '#3b82f6', marginRight: '8px' }}><FaEye /></Link>
                  {e.statut === 'brouillon' && (
                    <>
                      <button onClick={() => handleValider(e.id)} style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', marginRight: '4px' }}><FaCheck /></button>
                      {/* ? Bouton supprimer visible uniquement pour admin */}
                      {isAdmin ? (
                        <button onClick={() => handleDelete(e.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginRight: '4px' }}><FaTrash /></button>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '14px', marginRight: '4px' }} title="Rserv aux administrateurs">??</span>
                      )}
                    </>
                  )}
                  {(e.statut === 'brouillon' || e.statut === 'valid') && (
                    <button onClick={() => handleAnnuler(e.id)} style={{ color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer' }}><FaTimes /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default EcrituresList;
