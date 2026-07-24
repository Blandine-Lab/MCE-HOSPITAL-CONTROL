const pool = require('../../config/db');

/**
 * Ajoute un examen validé à une facture du patient
 * @param {number} examenId - ID de l'examen
 * @param {number} userId - ID de l'utilisateur qui valide (pour traçabilité)
 */
const addExamenToFacture = async (examenId, userId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Récupérer l'examen et le patient
    const examen = await client.query(`
      SELECT e.*, t.prestation_id, t.nom AS type_nom
      FROM examens e
      LEFT JOIN types_examens t ON e.type_examen_id = t.id
      WHERE e.id = $1
    `, [examenId]);
    if (examen.rows.length === 0) {
      throw new Error('Examen non trouvé');
    }
    const exam = examen.rows[0];
    const patientId = exam.patient_id;

    // 2. Récupérer la prestation associée (ou créer une prestation par défaut)
    let prestation = null;
    let prixUnitaire = 0;
    let libelle = exam.type_examen;

    if (exam.prestation_id) {
      const prest = await client.query(`
        SELECT * FROM prestations WHERE id = $1
      `, [exam.prestation_id]);
      if (prest.rows.length > 0) {
        prestation = prest.rows[0];
        prixUnitaire = parseFloat(prestation.prix_unitaire) || 0;
        libelle = prestation.libelle || libelle;
      }
    } else {
      // Si aucune prestation associée, on utilise un prix par défaut
      prixUnitaire = exam.categorie === 'imagerie' ? 80 : 40;
      libelle = `${exam.categorie} - ${exam.type_examen}`;
    }

    // 3. Chercher une facture en cours pour ce patient (statut 'impayee')
    let facture = await client.query(`
      SELECT * FROM factures
      WHERE patient_id = $1 AND statut = 'impayee'
      ORDER BY date_emission DESC
      LIMIT 1
    `, [patientId]);

    let factureId;
    if (facture.rows.length === 0) {
      // Créer une nouvelle facture
      const numeroFacture = `F${Date.now()}`;
      const newFact = await client.query(`
        INSERT INTO factures (patient_id, date_emission, statut, numero_facture, montant_total)
        VALUES ($1, NOW(), 'impayee', $2, 0)
        RETURNING id
      `, [patientId, numeroFacture]);
      factureId = newFact.rows[0].id;
    } else {
      factureId = facture.rows[0].id;
    }

    // 4. Ajouter la ligne de facture
    const qte = 1;
    const totalLigne = prixUnitaire * qte;
    await client.query(`
      INSERT INTO facture_lignes (
        facture_id,
        prestation_id,
        quantite,
        prix_unitaire,
        total_ligne,
        libelle,
        reference_id,
        reference_type,
        reference_libelle
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      factureId,
      prestation ? prestation.id : null,
      qte,
      prixUnitaire,
      totalLigne,
      libelle,
      examenId,
      'examen',
      exam.type_examen
    ]);

    // 5. Mettre à jour le montant total de la facture
    await client.query(`
      UPDATE factures
      SET montant_total = montant_total + $1,
          updated_at = NOW()
      WHERE id = $2
    `, [totalLigne, factureId]);

    // 6. Enregistrer dans l'historique (optionnel)
    await client.query(`
      INSERT INTO historique_factures (facture_id, utilisateur_id, action, details)
      VALUES ($1, $2, 'ajout_ligne', $3)
    `, [factureId, userId, `Ajout de l'examen #${examenId} (${libelle}) - ${prixUnitaire} €`]);

    await client.query('COMMIT');
    return { factureId, ligneAjoutee: true };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur addExamenToFacture:', err);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { addExamenToFacture };