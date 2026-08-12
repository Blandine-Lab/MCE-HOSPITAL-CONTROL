// src/pages/rh-planning/ContratDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaEdit, FaTrash } from 'react-icons/fa';

const ContratDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contrat, setContrat] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/contrats/${id}`)
      .then(res => { setContrat(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Supprimer ce contrat ?')) return;
    try {
      await api.delete(`/contrats/${id}`);
      navigate('/rh/contrats');
    } catch (err) { alert('Erreur suppression'); }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>? Chargement...</div>;
  if (!contrat) return <div style={{ padding: 60, textAlign: 'center' }}>Contrat non trouvï</div>;

  return (
    <div>
      <Link to="/rh/contrats" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#3b82f6', textDecoration: 'none' }}>
        <FaArrowLeft /> Retour
      </Link>
      <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 32, marginTop: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Contrat de {contrat.employe_prenom} {contrat.employe_nom}</h2>
          <div>
            <Link to={`/rh/contrats/edit/${contrat.id}`} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '8px 16px', borderRadius: 6, textDecoration: 'none', marginRight: 8 }}><FaEdit /> Modifier</Link>
            <button onClick={handleDelete} style={{ backgroundColor: '#ef4444', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer' }}><FaTrash /> Supprimer</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
          <p><strong>Type :</strong> {contrat.type}</p>
          <p><strong>Statut :</strong> <span style={{ backgroundColor: contrat.statut === 'actif' ? '#d1fae5' : '#fee2e2', padding: '2px 10px', borderRadius: 20 }}>{contrat.statut}</span></p>
          <p><strong>Date dïbut :</strong> {new Date(contrat.date_debut).toLocaleDateString('fr-FR')}</p>
          <p><strong>Date fin :</strong> {contrat.date_fin ? new Date(contrat.date_fin).toLocaleDateString('fr-FR') : 'FC'}</p>
          <p><strong>Salaire :</strong> {contrat.salaire ? `${parseFloat(contrat.salaire).toFixed(2)} FC` : 'FC'}</p>
          <p><strong>Commentaire :</strong> {contrat.commentaire || 'FC'}</p>
        </div>
      </div>
    </div>
  );
};

export default ContratDetail;
