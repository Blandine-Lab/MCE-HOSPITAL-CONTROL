/**
 * First Expired, First Out (FIFO) — multi-tenant.
 *
 * Règles :
 *  - hospital_id obligatoire (isolation multi-tenant stricte)
 *  - ne sélectionne que les lots non périmés et avec stock > 0
 *  - verrouille les lignes (FOR UPDATE) : à utiliser dans une transaction
 *  - gère l'allocation sur plusieurs lots si nécessaire
 */

/**
 * Retourne la liste des allocations FIFO à consommer.
 * Chaque allocation : { id, stock_actuel, numero_lot, date_peremption, quantite }
 *
 * @param {import('pg').PoolClient} client
 * @param {string} hospital_id
 * @param {string|number} medicament_id
 * @param {number} quantiteDemandee  entier > 0
 * @returns {Promise<Array>}
 */
async function getFifoLots(client, hospital_id, medicament_id, quantiteDemandee) {
  if (!hospital_id) {
    throw new Error('hospital_id requis pour FIFO');
  }
  if (!Number.isInteger(quantiteDemandee) || quantiteDemandee <= 0) {
    throw new Error('quantiteDemandee doit être un entier > 0');
  }

  const { rows } = await client.query(
    `
    SELECT id, stock_actuel, numero_lot, date_peremption
    FROM lots
    WHERE hospital_id = $1
      AND medicament_id = $2
      AND stock_actuel > 0
      AND date_peremption >= CURRENT_DATE
    ORDER BY date_peremption ASC, id ASC
    FOR UPDATE
    `,
    [hospital_id, medicament_id]
  );

  let reste = quantiteDemandee;
  const allocations = [];

  for (const lot of rows) {
    if (reste <= 0) break;
    const quantite = Math.min(lot.stock_actuel, reste);
    if (quantite <= 0) continue;
    allocations.push({ ...lot, quantite });
    reste -= quantite;
  }

  if (reste > 0) {
    throw new Error('Stock total insuffisant ou aucun lot valide pour cet hôpital');
  }

  return allocations;
}

/**
 * Version mono-lot : retourne un seul lot uniquement si toute la quantité
 * demandée tient dans ce lot. Sinon, erreur explicite pour éviter tout stock négatif.
 *
 * @param {import('pg').PoolClient} client
 * @param {string} hospital_id
 * @param {string|number} medicament_id
 * @param {number} quantiteDemandee
 * @returns {Promise<{id, stock_actuel, numero_lot, date_peremption, quantite}>}
 */
async function getFifoLot(client, hospital_id, medicament_id, quantiteDemandee) {
  const allocations = await getFifoLots(
    client,
    hospital_id,
    medicament_id,
    quantiteDemandee
  );

  if (allocations.length !== 1) {
    throw new Error(
      'Quantité répartie sur plusieurs lots : utiliser getFifoLots'
    );
  }

  return allocations[0];
}

module.exports = { getFifoLot, getFifoLots };