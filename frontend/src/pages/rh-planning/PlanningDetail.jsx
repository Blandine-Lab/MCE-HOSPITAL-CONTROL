// src/pages/rh-planning/PlanningDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaCalendar, FaClock, FaUser, FaEdit } from 'react-icons/fa';

const PlanningDetail = () => {
  const { id } = useParams();
  const [planning, setPlanning] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/plannings/${id}`)
      .then(res => { setPlanning(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, [id]);

  if (loading) return <div style={{textAlign:'center', padding:60}}>Chargement...</div>;
  if (!planning) return <div style={{textAlign:'center', padding:60}}>Planning non trouvé</div>;

  return (
    <div>
      <Link to="/rh/plannings" style={{display:'inline-flex', alignItems:'center', gap:8, color:'#3b82f6', textDecoration:'none'}}>
        <FaArrowLeft /> Retour
      </Link>
      <div style={{backgroundColor:'white', borderRadius:12, padding:32, marginTop:16, boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16}}>
          <h1 style={{margin:0}}>Planning #{planning.id}</h1>
          <Link to={`/rh/plannings/${id}/edit`} style={{backgroundColor:'#f59e0b', color:'white', padding:'8px 16px', borderRadius:8, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6}}>
            <FaEdit /> Modifier
          </Link>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginTop:24}}>
          <div><FaUser style={{marginRight:8}} /> <strong>Employé :</strong> {planning.employe_nom} {planning.employe_prenom}</div>
          <div><FaCalendar style={{marginRight:8}} /> <strong>Date :</strong> {new Date(planning.date).toLocaleDateString('fr-FR')}</div>
          <div><FaClock style={{marginRight:8}} /> <strong>Horaire :</strong> {planning.heure_debut} - {planning.heure_fin}</div>
          <div><strong>Type :</strong> {planning.type}</div>
          <div style={{gridColumn:'span 2'}}><strong>Notes :</strong> {planning.notes || '-'}</div>
        </div>
      </div>
    </div>
  );
};

export default PlanningDetail;