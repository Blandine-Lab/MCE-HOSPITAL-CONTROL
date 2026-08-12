// src/pages/rh-planning/ContratsList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../axios';
import { FaFileContract, FaPlus, FaEye, FaEdit, FaTrash, FaPrint, FaFileAlt } from 'react-icons/fa';

const ContratsList = () => {
  const [contrats, setContrats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [userRole, setUserRole] = useState(null);

  // Récupérer le rôle depuis le token JWT
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (e) {
        console.error('Erreur décodage token', e);
      }
    }
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchContrats();
  }, []);

  const fetchContrats = async () => {
    try {
      const res = await api.get('/contrats');
      setContrats(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Erreur chargement des contrats');
      showToast('Erreur chargement des contrats', 'error');
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce contrat ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/contrats/${id}`);
      setContrats(contrats.filter(c => c.id !== id));
      showToast('Contrat supprimé avec succès');
    } catch (err) {
      console.error('Erreur suppression :', err);
      if (err.response?.status === 403) {
        showToast('Seul un administrateur peut supprimer un contrat.', 'error');
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  const isAdmin = userRole === 'admin';

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>Chargement...</div>;
  if (error) return <div style={{ padding: 60, color: 'red' }}>{error}</div>;

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 24px',
          borderRadius: 8,
          backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, color: '#0f172a' }}>
          <FaFileContract style={{ color: '#60a5fa', marginRight: 12 }} /> Contrats
        </h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/rh/contrats/generer" style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaFileAlt /> Générer un contrat
          </Link>
          <Link to="/rh/contrats/nouveau" style={{ backgroundColor: '#60a5fa', color: 'white', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaPlus /> Nouveau contrat
          </Link>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th>Employé</th>
              <th>Type</th>
              <th>Début</th>
              <th>Fin</th>
              <th>Salaire</th>
              <th>Statut</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contrats.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: 40, textAlign: 'center' }}>Aucun contrat</td></tr>
            ) : (
              contrats.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>{c.employe_prenom} {c.employe_nom}</td>
                  <td style={{ padding: '12px 16px' }}>{c.type}</td>
                  <td style={{ padding: '12px 16px' }}>{new Date(c.date_debut).toLocaleDateString('fr-FR')}</td>
                  <td style={{ padding: '12px 16px' }}>{c.date_fin ? new Date(c.date_fin).toLocaleDateString('fr-FR') : '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{c.salaire ? `${parseFloat(c.salaire).toFixed(2)} FC` : '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 13,
                      backgroundColor: c.statut === 'actif' ? '#d1fae5' : '#fee2e2',
                      color: c.statut === 'actif' ? '#065f46' : '#991b1b'
                    }}>
                      {c.statut}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <Link to={`/rh/contrats/${c.id}`} style={{ color: '#3b82f6', marginRight: 12 }}><FaEye /></Link>
                    <Link to={`/rh/contrats/print/${c.id}`} style={{ color: '#10b981', marginRight: 12 }}><FaPrint /></Link>
                    <Link to={`/rh/contrats/edit/${c.id}`} style={{ color: '#f59e0b', marginRight: 12 }}><FaEdit /></Link>
                    {isAdmin ? (
                      <button onClick={() => handleDelete(c.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><FaTrash /></button>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '14px' }} title="Réservé aux administrateurs">🔒</span>
                    )}
                  </td>
                </tr>
              ))
            )}
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

export default ContratsList;