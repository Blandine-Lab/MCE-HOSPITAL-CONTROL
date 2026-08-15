import { useEffect, useState } from 'react';
import api from '../../axios';
import { FaChevronLeft, FaChevronRight, FaCalendarWeek } from 'react-icons/fa';

const PlanningBloc = () => {
  const [weekStart, setWeekStart] = useState(new Date());
  const [interventions, setInterventions] = useState([]);
  const [salles, setSalles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);

  const getMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const loadPlanning = async () => {
    setLoading(true);
    try {
      const monday = getMonday(weekStart);
      const [planRes, sallesRes] = await Promise.all([
        api.get(`/bloc/planning?semaine=${formatDate(monday)}`),
        api.get('/bloc/salles')
      ]);
      setInterventions(planRes.data || []);
      setSalles(sallesRes.data || []);
      setLoaded(true);
    } catch (err) {
      setToast('Erreur chargement planning');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlanning();
  }, [weekStart]);

  const changeWeek = (delta) => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + delta * 7);
    setWeekStart(newDate);
  };

  const monday = getMonday(weekStart);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }

  const hours = Array.from({ length: 12 }, (_, i) => i + 8);

  const getInterventionForSlot = (salleId, date, hour) => {
    return interventions.find(inter => {
      const d = new Date(inter.date_prevue);
      return inter.salle_id === salleId &&
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate() &&
        d.getHours() === hour;
    });
  };

  const getStatusColor = (statut) => {
    const colors = {
      planifiee: '#3b82f6',
      en_cours: '#f59e0b',
      terminee: '#10b981',
      annulee: '#ef4444'
    };
    return colors[statut] || '#64748b';
  };

  const getStatusLabel = (statut) => {
    const labels = {
      planifiee: 'Planifiée',
      en_cours: 'En cours',
      terminee: 'Terminée',
      annulee: 'Annulée'
    };
    return labels[statut] || statut;
  };

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    opacity: loaded ? 1 : 0,
    transform: loaded ? 'translateY(0)' : 'translateY(20px)',
    transition: 'all 0.5s 0.2s',
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
      <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #2563eb', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
    </div>
  );

  return (
    <div style={cardStyle}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', backgroundColor: '#ef4444', color: 'white',
          padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000, animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaCalendarWeek style={{ color: '#2563eb' }} /> Planning hebdomadaire
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => changeWeek(-1)} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', background: 'white', cursor: 'pointer' }}>
            <FaChevronLeft />
          </button>
          <span style={{ fontWeight: '500', color: '#374151', minWidth: '200px', textAlign: 'center' }}>
            {monday.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} - {new Date(monday.getTime() + 6*24*60*60*1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => changeWeek(1)} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', background: 'white', cursor: 'pointer' }}>
            <FaChevronRight />
          </button>
          <button onClick={() => setWeekStart(new Date())} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
            Aujourd'hui
          </button>
        </div>
      </div>

      {salles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <p>Aucune salle de bloc configurée.<br />Veuillez d'abord ajouter des salles dans la gestion des salles.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <th style={{ padding: '12px 8px', border: '1px solid #e5e7eb', textAlign: 'center', minWidth: '60px' }}>Heure</th>
                {salles.map(salle => (
                  <th key={salle.id} style={{ padding: '12px 8px', border: '1px solid #e5e7eb', textAlign: 'center', minWidth: '140px', backgroundColor: '#e8f0fe' }}>
                    <div style={{ fontWeight: '600', color: '#1e3a8a' }}>{salle.nom}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{salle.numero}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map(hour => (
                <tr key={hour}>
                  <td style={{ padding: '8px 4px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: '500', backgroundColor: '#f8fafc' }}>
                    {hour}h - {hour+1}h
                  </td>
                  {salles.map(salle => {
                    // On vérifie chaque jour de la semaine pour cette heure
                    let foundInter = null;
                    for (const day of days) {
                      const inter = getInterventionForSlot(salle.id, day, hour);
                      if (inter) { foundInter = inter; break; }
                    }
                    return (
                      <td key={salle.id} style={{ padding: '6px', border: '1px solid #e5e7eb', textAlign: 'center', backgroundColor: foundInter ? '#dbeafe' : 'white' }}>
                        {foundInter ? (
                          <div style={{ fontSize: '12px' }}>
                            <div style={{ fontWeight: '600', color: '#1e40af' }}>{foundInter.patient_nom} {foundInter.patient_prenom}</div>
                            <div style={{ color: '#374151', fontSize: '11px' }}>{foundInter.type_intervention}</div>
                            <div style={{ fontSize: '11px', color: '#6b7280' }}>{foundInter.chirurgien_nom}</div>
                            <span style={{ display: 'inline-block', backgroundColor: getStatusColor(foundInter.statut), color: 'white', padding: '1px 10px', borderRadius: '12px', fontSize: '10px', marginTop: '2px' }}>
                              {getStatusLabel(foundInter.statut)}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#d1d5db', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PlanningBloc;