// src/utils/seedTenant.js
// ============================================================
// Initialise les données par défaut d'un nouvel hôpital
// (services, lits, paramètres, etc.)
//
// ⚠️ STUB minimal — à compléter avec la vraie logique métier.
//    Le serveur démarre et les routes fonctionnent avec ce stub,
//    mais aucune donnée n'est réellement initialisée.
// ============================================================

async function seedTenant(client, hospitalId) {
  if (!client || !hospitalId) {
    console.warn('⚠️ seedTenant() : client ou hospitalId manquant');
    return { ok: false, reason: 'missing_params' };
  }

  console.log(`🌱 seedTenant() appelé pour hôpital ${hospitalId} (stub)`);

  // TODO : insérer ici les données par défaut :
  //   - services (Administration, Urgences, Médecine, etc.)
  //   - lits / chambres / étages / bâtiments
  //   - paramètres de référence
  //   - types d'examens par défaut
  // Exemple :
  //   await client.query(
  //     `INSERT INTO services (hospital_id, nom, code, actif)
  //      VALUES ($1, $2, $3, true)`,
  //     [hospitalId, 'Administration', 'ADMIN']
  //   );

  return { ok: true, hospitalId, seeded: [] };
}

module.exports = { seedTenant };
