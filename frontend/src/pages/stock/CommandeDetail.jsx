// src/pages/stock/CommandeDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../axios';
import { FaArrowLeft, FaTruck, FaCalendar, FaUser, FaEdit } from 'react-icons/fa';

const CommandeDetail = () => {
  const { id } = useParams();
  const [commande, setCommande] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/commandes/${id}`)
      .then(res => { setCommande(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, [id]);

  const getStatusBadge = (statut) => {
    const configs = {
      en_attente: { bg: '#fef3c7', color: '#92400e', label: '⏳ En attente' },
      commandee: { bg: '#dbeafe', color: '#1e40af', label: '📦 Commandée' },
      partiellement_livree: { bg: '#fef3c7', color: '#92400e', label: '📦 Partielle' },
      livree: { bg: '#d1fae5', color: '#065f46', label: '✅ Livrée' },
      annulee: { bg: '#fee2e2', color: '#991b1b', label: '❌ Annulée' }
    };
    // Gestion des anciens noms de statut si besoin (on garde la compatibilité)
    const keyMap = {
      'command': 'commandee',
      'partiellement_livr': 'partiellement_livree',
      'livr': 'livree',
      'annul': 'annulee'
    };
    const normalizedStatut = keyMap[statut] || statut;
    const c = configs[normalizedStatut] || configs.en_attente;
    return <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: c.bg, color: c.color }}>{c.label}</span>;
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>⏳ Chargement...</div>;
  if (!commande) return <div style={{ textAlign: 'center', padding: '60px' }}>Commande non trouvée</div>;

  return (
    <div>
      <Link to="/stock/commandes" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', textDecoration: 'none' }}><FaArrowLeft /> Retour</Link>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0 }}>Commande {commande.numero_commande}</h1>
            <p style={{ color: '#64748b' }}>{commande.fournisseur_nom}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {getStatusBadge(commande.statut)}
            {(commande.statut === 'en_attente' || commande.statut === 'commandee' || commande.statut === 'command') && (
              <Link to={`/stock/commandes/${id}/edit`} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '6px 16px', borderRadius: '6px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <FaEdit /> Modifier
              </Link>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '20px' }}>
          <div><FaCalendar style={{ marginRight: '8px' }} /> <strong>Date :</strong> {new Date(commande.date_commande).toLocaleDateString('fr-FR')}</div>
          <div><FaTruck style={{ marginRight: '8px' }} /> <strong>Livraison prévue :</strong> {commande.date_livraison_prevue ? new Date(commande.date_livraison_prevue).toLocaleDateString('fr-FR') : '-'}</div>
          <div><FaUser style={{ marginRight: '8px' }} /> <strong>Créé par :</strong> {commande.created_by_nom || '-'}</div>
        </div>
        {commande.notes && <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}><strong>Notes :</strong> {commande.notes}</div>}

        <h3 style={{ marginTop: '24px' }}>Lignes de commande</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr><th>Produit</th><th style={{ textAlign: 'right' }}>Quantité</th><th style={{ textAlign: 'right' }}>Prix unitaire</th><th style={{ textAlign: 'right' }}>Total</th></tr>
          </thead>
          <tbody>
            {commande.lignes?.map((l, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px' }}>{l.produit_code} - {l.produit_nom}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{l.quantite}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{Number(l.prix_unitaire).toLocaleString('fr-FR')} FCFA</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{(l.quantite * l.prix_unitaire).toLocaleString('fr-FR')} FCFA</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: '16px', textAlign: 'right', fontSize: '18px', fontWeight: 'bold' }}>
          Total : {Number(commande.montant_total).toLocaleString('fr-FR')} FCFA
        </div>
      </div>
    </div>
  );
};

export default CommandeDetail;