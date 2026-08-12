// src/pages/stock/InventaireDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft } from 'react-icons/fa';

const InventaireDetail = () => {
  const { id } = useParams();
  const [inventaire, setInventaire] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/inventaires/${id}`)
      .then(res => {
        setInventaire(res.data);
        setLignes(res.data.lignes || []);
        setLoading(false);
      })
      .catch(err => { console.error(err); setLoading(false); });
  }, [id]);

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>? Chargement...</div>;
  if (!inventaire) return <div style={{ padding: 60, textAlign: 'center' }}>Inventaire non trouv</div>;

  const totalEcart = lignes.reduce((sum, l) => sum + (l.ecart || 0), 0);

  return (
    <div>
      <Link to="/stock/inventaires" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#3b82f6', textDecoration: 'none' }}>
        <FaArrowLeft /> Retour
      </Link>
      <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 32, marginTop: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2>Rapport d'inventaire #{inventaire.id}</h2>
        <p><strong>Date :</strong> {new Date(inventaire.date).toLocaleDateString()}</p>
        <p><strong>Type :</strong> {inventaire.type}</p>
        <p><strong>Statut :</strong> {inventaire.statut}</p>
        <p><strong>Notes :</strong> {inventaire.notes || '?FC?'}</p>
        <p><strong>cart total :</strong>
          <span style={{
            fontWeight: 'bold',
            marginLeft: 8,
            color: totalEcart === 0 ? '#10b981' : totalEcart > 0 ? '#f59e0b' : '#ef4444'
          }}>
            {totalEcart > 0 ? `+${totalEcart}` : totalEcart}
          </span>
        </p>

        <h3 style={{ marginTop: 24 }}>Dtail des lignes</h3>
        {lignes.length === 0 ? (
          <p>Aucune ligne d'inventaire.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f1f5f9' }}>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Produit</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Quantit thorique</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Quantit relle</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>cart</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px' }}>
                      {l.produit_code ? `${l.produit_code} - ` : ''}{l.produit_nom || l.produit_id}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{l.quantite_theorique}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{l.quantite_reelle}</td>
                    <td style={{
                      padding: '10px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: l.ecart === 0 ? '#10b981' : l.ecart > 0 ? '#f59e0b' : '#ef4444'
                    }}>
                      {l.ecart > 0 ? `+${l.ecart}` : l.ecart}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventaireDetail;
