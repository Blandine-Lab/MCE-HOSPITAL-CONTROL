const express = require('express');
const router = express.Router();
const pool = require('../config/db');                       // ✅ pool patché
const { authenticate } = require('../middleware/auth');

// GET - Bilan comptable (synthèse des comptes)
router.get('/bilan', authenticate, async (req, res) => {
  try {
    const { date } = req.query;
    
    // ✅ FIX : Requête paramétrée (contre l'injection SQL) + bonne colonne (date_ecriture)
    let query = `
      SELECT 
        c.type,
        SUM(CASE WHEN el.sens = 'debit' THEN el.montant ELSE 0 END) as total_debit,
        SUM(CASE WHEN el.sens = 'credit' THEN el.montant ELSE 0 END) as total_credit
      FROM comptes_comptables c
      JOIN ecriture_lignes el ON c.id = el.compte_id
      JOIN ecritures e ON el.ecriture_id = e.id
      WHERE e.statut = 'validé'
    `;
    const params = [];
    if (date) {
      query += ` AND e.date_ecriture <= $1`;
      params.push(date);
    }
    query += ` GROUP BY c.type`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /rapports/bilan :', err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Résultat (compte de résultat simplifié)
router.get('/resultat', authenticate, async (req, res) => {
  try {
    const { date_debut, date_fin } = req.query;
    if (!date_debut || !date_fin) {
      return res.status(400).json({ error: 'date_debut et date_fin sont requis' });
    }

    // ✅ FIX : date_ecriture
    const query = `
      SELECT 
        SUM(CASE WHEN c.type = 'produit' AND el.sens = 'credit' THEN el.montant ELSE 0 END) as total_produits,
        SUM(CASE WHEN c.type = 'charge' AND el.sens = 'debit' THEN el.montant ELSE 0 END) as total_charges,
        SUM(CASE WHEN c.type = 'produit' AND el.sens = 'credit' THEN el.montant ELSE 0 END) -
        SUM(CASE WHEN c.type = 'charge' AND el.sens = 'debit' THEN el.montant ELSE 0 END) as resultat
      FROM comptes_comptables c
      JOIN ecriture_lignes el ON c.id = el.compte_id
      JOIN ecritures e ON el.ecriture_id = e.id
      WHERE e.statut = 'validé'
        AND e.date_ecriture BETWEEN $1 AND $2
        AND c.type IN ('produit', 'charge')
    `;

    const { rows } = await pool.query(query, [date_debut, date_fin]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur GET /rapports/resultat :', err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Grand livre (mouvements par compte)
router.get('/grand-livre', authenticate, async (req, res) => {
  try {
    const { compte_id, date_debut, date_fin } = req.query;
    if (!compte_id) {
      return res.status(400).json({ error: 'compte_id est requis' });
    }

    // ✅ FIX : date_ecriture + valeurs par défaut si les dates ne sont pas fournies
    let query = `
      SELECT 
        e.date_ecriture as date,
        e.numero_piece,
        e.libelle,
        el.sens,
        el.montant,
        el.description
      FROM ecriture_lignes el
      JOIN ecritures e ON el.ecriture_id = e.id
      WHERE el.compte_id = $1
        AND e.statut = 'validé'
    `;
    const params = [compte_id];
    
    if (date_debut && date_fin) {
      query += ` AND e.date_ecriture BETWEEN $2 AND $3`;
      params.push(date_debut, date_fin);
    } else if (date_debut) {
      query += ` AND e.date_ecriture >= $2`;
      params.push(date_debut);
    } else if (date_fin) {
      query += ` AND e.date_ecriture <= $2`;
      params.push(date_fin);
    }

    query += ` ORDER BY e.date_ecriture, e.id`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /rapports/grand-livre :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;