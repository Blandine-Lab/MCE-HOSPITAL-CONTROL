const pool = require('../config/db');

const getKpi = async (req, res) => {
  try {
    const queries = {
      patients_presents: `SELECT COUNT(*) AS nb FROM patients WHERE statut = 'hospitalise'`,
      admissions_auj: `SELECT COUNT(*) AS nb FROM patients WHERE date_admission = CURRENT_DATE`,
      sorties_auj: `SELECT COUNT(*) AS nb FROM patients WHERE date_sortie = CURRENT_DATE`,
      urgences_auj: `SELECT COUNT(*) AS nb FROM urgences WHERE DATE(heure_arrivee) = CURRENT_DATE`,
      interventions_auj: `SELECT COUNT(*) AS nb FROM interventions WHERE DATE(date_prevue) = CURRENT_DATE`,
      lits_occupes: `SELECT COUNT(*) AS nb FROM lits WHERE statut = 'occupe'`,
      lits_totaux: `SELECT COUNT(*) AS nb FROM lits`,
      ca_jour: `SELECT COALESCE(SUM(montant_total), 0) AS total FROM factures WHERE date_emission = CURRENT_DATE`,
      impayes_total: `SELECT COALESCE(SUM(montant_total - montant_paye), 0) AS total FROM factures WHERE statut != 'payee'`,
      medicaments_critiques: `SELECT COUNT(*) AS nb FROM medicaments WHERE stock < seuil_alerte`,
      equipements_panne: `SELECT COUNT(*) AS nb FROM equipements WHERE statut = 'panne'`,
      medecins_presents: `SELECT COUNT(*) AS nb FROM presences WHERE employe_type = 'medecin' AND present = true AND date = CURRENT_DATE`,
      infirmiers_presents: `SELECT COUNT(*) AS nb FROM presences WHERE employe_type = 'infirmier' AND present = true AND date = CURRENT_DATE`,
      absences: `SELECT COUNT(*) AS nb FROM presences WHERE present = false AND date = CURRENT_DATE`
    };

    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      const { rows } = await pool.query(query);
      // Certaines requêtes retournent 'nb', d'autres 'total'
      const value = rows[0];
      results[key] = (value.nb !== undefined) ? parseInt(value.nb, 10) : parseFloat(value.total);
    }

    results.taux_occupation = results.lits_totaux ? Math.round((results.lits_occupes / results.lits_totaux) * 100) : 0;
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

const getBedOccupancy = async (req, res) => {
  try {
    const query = `
      SELECT 
        b.nom AS batiment,
        e.numero AS etage,
        COUNT(l.id) AS total_lits,
        SUM(CASE WHEN l.statut = 'occupe' THEN 1 ELSE 0 END) AS occupes,
        SUM(CASE WHEN l.statut = 'libre' THEN 1 ELSE 0 END) AS libres,
        SUM(CASE WHEN l.statut = 'maintenance' THEN 1 ELSE 0 END) AS maintenance,
        SUM(CASE WHEN l.statut = 'nettoyage' THEN 1 ELSE 0 END) AS nettoyage
      FROM lits l
      JOIN batiments b ON l.batiment_id = b.id
      JOIN etages e ON l.etage_id = e.id
      GROUP BY b.nom, e.numero
      ORDER BY b.nom, e.numero;
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne' });
  }
};

const getTodaysSurgeries = async (req, res) => {
  try {
    const query = `
      SELECT 
        i.id,
        p.nom AS patient_nom,
        p.prenom AS patient_prenom,
        m.nom AS medecin_nom,
        m.prenom AS medecin_prenom,
        sb.numero AS salle,
        i.date_prevue,
        i.statut
      FROM interventions i
      JOIN patients p ON i.patient_id = p.id
      LEFT JOIN medecins m ON i.medecin_id = m.id
      JOIN salles_bloc sb ON i.salle_id = sb.id
      WHERE DATE(i.date_prevue) = CURRENT_DATE
      ORDER BY i.date_prevue;
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne' });
  }
};

module.exports = { getKpi, getBedOccupancy, getTodaysSurgeries };