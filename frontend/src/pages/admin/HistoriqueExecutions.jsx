import { useEffect, useState } from 'react';
import api from '../../axios'; // ✅ Utilisation de l'instance partagée

const HistoriqueExecutions = () => {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/pharmacy/preparations/executions')
      .then(res => {
        setExecutions(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Chargement...</div>;

  return (
    <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
      <h2>📋 Historique des préparations exécutées</h2>
      {executions.length === 0 ? (
        <p>Aucune exécution enregistrée.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>ID</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Recette</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Patient</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Quantité finale</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Réalisé par</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f3f4f6' }}>Date d'exécution</th>
            </tr>
          </thead>
          <tbody>
            {executions.map(e => (
              <tr key={e.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{e.id}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{e.recette_nom || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{e.patient_id || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{e.quantite_finale}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{e.realise_par || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{new Date(e.date_execution).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default HistoriqueExecutions;