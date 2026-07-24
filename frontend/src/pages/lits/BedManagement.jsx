import { useEffect, useState } from 'react';
import axios from 'axios';

const BedManagement = () => {
  const [chambres, setChambres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:5000/api/consultations/lits/all')
      .then(res => {
        const lits = res.data;
        // Regrouper les lits par chambre (nom)
        const grouped = lits.reduce((acc, lit) => {
          const chambreNom = lit.chambre_nom || 'Sans chambre';
          if (!acc[chambreNom]) {
            acc[chambreNom] = { chambre: chambreNom, lits: [] };
          }
          acc[chambreNom].lits.push({
            id: lit.id,
            numero: lit.numero,
            statut: lit.statut,
            patient: lit.patient // peut être null ou undefined
          });
          return acc;
        }, {});
        // Convertir l'objet en tableau
        const chambresArray = Object.values(grouped);
        setChambres(chambresArray);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Erreur de chargement des lits');
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '20px' }}>Chargement...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Gestion des lits et chambres</h1>
      {chambres.length === 0 ? (
        <p>Aucune chambre trouvée.</p>
      ) : (
        chambres.map((ch, idx) => (
          <div key={idx} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
            <h3>{ch.chambre}</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {ch.lits.map(lit => (
                <div key={lit.id} style={{
                  backgroundColor: lit.statut === 'occupe' ? '#ef4444' : '#10b981',
                  padding: '5px 10px',
                  borderRadius: '5px',
                  color: 'white'
                }}>
                  Lit {lit.numero} - {lit.statut === 'occupe' ? 'Occupé' : 'Libre'}
                  {lit.patient && <div style={{ fontSize: '12px' }}>{lit.patient}</div>}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default BedManagement;