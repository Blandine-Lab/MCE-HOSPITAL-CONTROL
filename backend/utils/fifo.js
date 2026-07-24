/**
 * First Expired, First Out (FIFO)
 * Sélectionne le lot dont la date de péremption est la plus proche,
 * avec stock disponible et non périmé.
 *
 * @param {object} client - Client PostgreSQL (transaction)
 * @param {number} medicament_id - ID du médicament
 * @param {number} quantiteDemandee - Quantité à délivrer
 * @returns {Promise<object>} Lot sélectionné (id, stock_actuel, numero_lot, date_peremption)
 * @throws {Error} Si stock total insuffisant ou aucun lot valide
 */
async function getFifoLot(client, medicament_id, quantiteDemandee) {
  const query = `
    SELECT id, stock_actuel, numero_lot, date_peremption
    FROM lots
    WHERE medicament_id = $1
      AND stock_actuel > 0
      AND date_peremption > CURRENT_DATE
    ORDER BY date_peremption ASC
  `;
  const { rows } = await client.query(query, [medicament_id]);

  let reste = quantiteDemandee;
  let lotChoisi = null;

  for (const lot of rows) {
    if (lot.stock_actuel >= reste) {
      lotChoisi = lot;
      break;
    } else {
      reste -= lot.stock_actuel;
    }
  }

  if (!lotChoisi) {
    throw new Error('Stock total insuffisant ou aucun lot valide');
  }

  return lotChoisi;
}

module.exports = { getFifoLot };