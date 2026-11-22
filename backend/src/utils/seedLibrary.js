// backend/src/utils/seedLibrary.js
// Version IDEMPOTENTE : peut être relancée sans dupliquer, complète ce qui manque.
const { LIBRARY_TREE } = require('./libraryTree');
const { supabaseAdmin } = require('../services/supabase');

async function seedLibraryFolders(hospitalId, createdBy = null) {
  console.log(`📚 Seed bibliothèque Supabase pour hospital ${hospitalId}…`);

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < LIBRARY_TREE.length; i++) {
    const top = LIBRARY_TREE[i];

    // 1. Vérifier si la catégorie principale existe déjà (par nom + parent null + hospital)
    const { data: existingTop, error: findErr } = await supabaseAdmin
      .from('library_folders')
      .select('id')
      .eq('hospital_id', hospitalId)
      .eq('nom', top.nom)
      .is('parent_id', null)
      .maybeSingle();

    if (findErr) throw new Error(`Find top folder échoué : ${findErr.message}`);

    let topId;

    if (existingTop) {
      // Déjà présent → on récupère son id, on ne recrée pas
      topId = existingTop.id;
      skipped++;
    } else {
      // Absent → on crée
      const { data: topRow, error: topErr } = await supabaseAdmin
        .from('library_folders')
        .insert({
          hospital_id: hospitalId,
          parent_id: null,
          nom: top.nom,
          icon: top.icon || null,
          ordre: i,
          is_system: true,
          created_by: createdBy,
        })
        .select('id')
        .single();

      if (topErr) throw new Error(`Insert top folder échoué : ${topErr.message}`);
      topId = topRow.id;
      created++;

      // Permissions du parent (uniquement pour les nouveaux)
      if (top.roles && top.roles.length > 0) {
        const perms = top.roles.map((role) => ({
          folder_id: topId,
          role,
          can_read: true,
          can_write: role === 'admin',
        }));
        const { error: permErr } = await supabaseAdmin
          .from('library_folder_permissions')
          .insert(perms);
        // Ignore les doublons (au cas où on relance)
        if (permErr && !permErr.message.includes('duplicate')) {
          throw new Error(`Insert perms échoué : ${permErr.message}`);
        }
      }
    }

    // 2. Sous-dossiers (vérification individuelle)
    for (let j = 0; j < (top.children || []).length; j++) {
      const sub = top.children[j];

      const { data: existingSub, error: findSubErr } = await supabaseAdmin
        .from('library_folders')
        .select('id')
        .eq('hospital_id', hospitalId)
        .eq('parent_id', topId)
        .eq('nom', sub.nom)
        .maybeSingle();

      if (findSubErr) throw new Error(`Find sub folder échoué : ${findSubErr.message}`);

      if (existingSub) {
        skipped++;
        continue;
      }

      const { data: subRow, error: subErr } = await supabaseAdmin
        .from('library_folders')
        .insert({
          hospital_id: hospitalId,
          parent_id: topId,
          nom: sub.nom,
          icon: sub.icon || null,
          ordre: j,
          is_system: true,
          created_by: createdBy,
        })
        .select('id')
        .single();

      if (subErr) throw new Error(`Insert sub folder échoué : ${subErr.message}`);
      created++;

      const subRoles = sub.roles !== undefined ? sub.roles : (top.roles || []);
      if (subRoles.length > 0) {
        const perms = subRoles.map((role) => ({
          folder_id: subRow.id,
          role,
          can_read: true,
          can_write: role === 'admin',
        }));
        const { error: permErr } = await supabaseAdmin
          .from('library_folder_permissions')
          .insert(perms);
        if (permErr && !permErr.message.includes('duplicate')) {
          throw new Error(`Insert sub perms échoué : ${permErr.message}`);
        }
      }
    }
  }

  console.log(
    `✅ ${created} créés, ${skipped} déjà existants (total ${created + skipped}/110) pour ${hospitalId}`
  );
  return created;
}

module.exports = { seedLibraryFolders };