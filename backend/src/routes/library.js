// backend/src/routes/library.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const {
  supabaseAdmin,
  uploadFile,
  getSignedDownloadUrl,
  deleteFile,
} = require('../services/supabase');

// Multer en mémoire (pas de disque local — on envoie direct à Supabase Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 Mo
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'video/mp4',
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Type de fichier non autorisé'));
    }
    cb(null, true);
  },
});

router.use(authenticate);

// ============================================================
// Helpers
// ============================================================

// 👑 Admin d'hôpital ou super_admin
function isAdmin(req) {
  return req.user?.role === 'super_admin' || req.user?.is_super_admin === true || req.user?.role === 'admin';
}

function isSuperAdmin(req) {
  return req.user?.role === 'super_admin' || req.user?.is_super_admin === true;
}

// 📂 Récupère un dossier et vérifie l'isolation par hôpital
// (l'accès en lecture est libre pour tous les utilisateurs de l'hôpital)
async function getFolderIfAccessible(req, folderId) {
  const { data: folder, error } = await supabaseAdmin
    .from('library_folders')
    .select('id, hospital_id, nom, parent_id')
    .eq('id', folderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!folder) return { folder: null, reason: 'Dossier introuvable' };

  // Super admin → accès total
  if (isSuperAdmin(req)) return { folder };

  // Sinon, isolation par hôpital
  if (folder.hospital_id !== req.user.hospital_id) {
    return { folder: null, reason: 'Accès refusé (autre hôpital)' };
  }

  return { folder };
}

// ✍️ Upload : admin d'hôpital OU permission `can_upload` sur ce dossier
async function canUploadToFolder(req, folderId) {
  if (isAdmin(req)) return true;

  const { data, error } = await supabaseAdmin
    .from('library_user_permissions')
    .select('can_upload')
    .eq('user_id', req.user.id)
    .eq('folder_id', folderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.can_upload === true;
}

// ============================================================
// GET /api/library/users — Liste des utilisateurs (pour la modale droits)
// 🔒 Admin | robuste super_admin + admin hôpital
// ============================================================
router.get('/users', async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Réservé à l\'administrateur' });
    }

    console.log('🔍 /library/users — req.user :', {
      id: req.user?.id,
      role: req.user?.role,
      hospital_id: req.user?.hospital_id,
      is_super_admin: req.user?.is_super_admin,
    });

    // Liste tous les utilisateurs via l'API admin Supabase
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw new Error(error.message);

    const allUsers = data?.users || [];
    console.log('🔍 /library/users — nb total auth.users :', allUsers.length);

    const hospitalId = isSuperAdmin(req)
      ? (req.query.hospital_id || null)
      : (req.user.hospital_id || null);

    console.log('🔍 /library/users — hospitalId filtre :', hospitalId);

    // Debug : affiche les meta des 5 premiers users
    if (allUsers.length > 0) {
      console.log('🔍 /library/users — sample des 5 premiers users :');
      allUsers.slice(0, 5).forEach((u, i) => {
        console.log(`  [${i}] ${u.email} → meta:`, {
          hospital_id: u.user_metadata?.hospital_id,
          role: u.user_metadata?.role,
          login: u.user_metadata?.login,
          app_hospital_id: u.app_metadata?.hospital_id,
        });
      });
    }

    const users = allUsers
      .map((u) => {
        const meta = u.user_metadata || {};
        const appMeta = u.app_metadata || {};
        return {
          id: u.id,
          email: u.email,
          login: meta.login || u.email,
          nom: meta.nom || '',
          prenom: meta.prenom || '',
          role: meta.role || (meta.is_super_admin ? 'super_admin' : 'user'),
          is_super_admin: meta.is_super_admin === true || meta.role === 'super_admin',
          hospital_id: meta.hospital_id || appMeta.hospital_id || null,
        };
      })
      .filter((u) => {
        // Super_admin sans hospital_id précis → on renvoie tout le monde
        if (!hospitalId) return true;
        // Sinon filtre par hôpital
        return u.hospital_id === hospitalId;
      });

    console.log('🔍 /library/users — nb après filtre :', users.length);

    res.json(users);
  } catch (err) {
    console.error('❌ GET /library/users :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/library/tree — Arborescence complète
// 🔓 Tout le monde voit tous les dossiers (lecture libre)
// ============================================================
router.get('/tree', async (req, res) => {
  try {
    const hospitalId = isSuperAdmin(req) ? req.query.hospital_id : req.user.hospital_id;
    if (!hospitalId) {
      return res.status(400).json({ error: 'hospital_id requis' });
    }

    const { data: folders, error } = await supabaseAdmin
      .from('library_folders')
      .select('id, parent_id, nom, icon, ordre, is_system')
      .eq('hospital_id', hospitalId)
      .order('ordre', { ascending: true });

    if (error) throw new Error(error.message);

    // Construire l'arbre
    const byId = {};
    for (const f of folders || []) {
      byId[f.id] = { ...f, children: [] };
    }

    const tree = [];
    for (const f of folders || []) {
      if (f.parent_id && byId[f.parent_id]) {
        byId[f.parent_id].children.push(byId[f.id]);
      } else if (!f.parent_id) {
        tree.push(byId[f.id]);
      }
    }

    res.json({ hospital_id: hospitalId, folders: tree, count: (folders || []).length });
  } catch (err) {
    console.error('❌ GET /library/tree :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/library/folders/:id — Contenu d'un dossier
// 🔓 Lecture libre | renvoie canUpload + canDelete pour ce user
// ============================================================
router.get('/folders/:id', async (req, res) => {
  try {
    const { folder, reason } = await getFolderIfAccessible(req, req.params.id);
    if (!folder) return res.status(403).json({ error: reason });

    // Sous-dossiers
    const { data: children, error: cErr } = await supabaseAdmin
      .from('library_folders')
      .select('id, nom, icon, ordre')
      .eq('parent_id', req.params.id)
      .order('ordre', { ascending: true });

    if (cErr) throw new Error(cErr.message);

    // Documents
    const { data: documents, error: dErr } = await supabaseAdmin
      .from('library_documents')
      .select('id, title, description, file_name, file_type, file_size_bytes, mime_type, created_at, uploaded_by')
      .eq('folder_id', req.params.id)
      .order('created_at', { ascending: false });

    if (dErr) throw new Error(dErr.message);

    // 🔑 Flags pour ce user
    const canDelete = isAdmin(req);
    const canUpload = canDelete || (await canUploadToFolder(req, req.params.id));

    // Permissions role-based (legacy, conservé pour la modale existante)
    let permissions = [];
    if (isAdmin(req)) {
      const { data: perms } = await supabaseAdmin
        .from('library_folder_permissions')
        .select('role, can_read, can_write')
        .eq('folder_id', req.params.id);
      permissions = perms || [];
    }

    res.json({
      folder: { id: folder.id, nom: folder.nom, hospital_id: folder.hospital_id },
      children: children || [],
      documents: documents || [],
      canUpload,
      canDelete,
      permissions, // legacy
    });
  } catch (err) {
    console.error('❌ GET /library/folders/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/library/folders — Créer un sous-dossier
// 🔒 Admin uniquement
// ============================================================
router.post('/folders', async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Seul l\'administrateur peut créer un sous-dossier' });
    }

    const { parent_id, nom, description, icon } = req.body;
    if (!parent_id || !nom) {
      return res.status(400).json({ error: 'parent_id et nom requis' });
    }

    const { folder: parent, reason } = await getFolderIfAccessible(req, parent_id);
    if (!parent) return res.status(403).json({ error: reason });

    const { data, error } = await supabaseAdmin
      .from('library_folders')
      .insert({
        hospital_id: parent.hospital_id,
        parent_id,
        nom: String(nom).trim(),
        description: description || null,
        icon: icon || '📁',
        is_system: false,
        created_by: req.user.id,
      })
      .select('id, nom, icon')
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json(data);
  } catch (err) {
    console.error('❌ POST /library/folders :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PATCH /api/library/folders/:id/permissions — (LEGACY role-based)
// 🔒 Admin uniquement | conservé pour compatibilité du front existant
// ============================================================
router.patch('/folders/:id/permissions', async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Réservé à l\'administrateur' });
    }

    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'permissions doit être un tableau' });
    }

    const { folder, reason } = await getFolderIfAccessible(req, req.params.id);
    if (!folder) return res.status(403).json({ error: reason });

    await supabaseAdmin.from('library_folder_permissions').delete().eq('folder_id', req.params.id);

    if (permissions.length > 0) {
      const rows = permissions.map((p) => ({
        folder_id: req.params.id,
        role: p.role,
        can_read: p.can_read !== false,
        can_write: p.can_write === true,
      }));
      const { error } = await supabaseAdmin.from('library_folder_permissions').insert(rows);
      if (error) throw new Error(error.message);
    }

    res.json({ ok: true, folder_id: folder.id, count: permissions.length });
  } catch (err) {
    console.error('❌ PATCH /library/folders/:id/permissions :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/library/folders/:id/user-permissions
// 🔒 Admin | liste les utilisateurs ayant can_upload sur ce dossier
// ============================================================
router.get('/folders/:id/user-permissions', async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Réservé à l\'administrateur' });
    }

    const { folder, reason } = await getFolderIfAccessible(req, req.params.id);
    if (!folder) return res.status(403).json({ error: reason });

    const { data, error } = await supabaseAdmin
      .from('library_user_permissions')
      .select('user_id, can_upload, granted_at, granted_by')
      .eq('folder_id', req.params.id)
      .eq('can_upload', true);

    if (error) throw new Error(error.message);
    res.json(data || []);
  } catch (err) {
    console.error('❌ GET /library/folders/:id/user-permissions :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUT /api/library/folders/:id/user-permissions
// 🔒 Admin | remplace la liste des users autorisés à uploader
// Body : { permissions: [{ user_id, can_upload: true }] }
// ============================================================
router.put('/folders/:id/user-permissions', async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Réservé à l\'administrateur' });
    }

    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'permissions doit être un tableau' });
    }

    const { folder, reason } = await getFolderIfAccessible(req, req.params.id);
    if (!folder) return res.status(403).json({ error: reason });

    // 1. Supprimer toutes les permissions existantes pour ce dossier
    const { error: delErr } = await supabaseAdmin
      .from('library_user_permissions')
      .delete()
      .eq('folder_id', req.params.id);

    if (delErr) throw new Error(delErr.message);

    // 2. Insérer les nouvelles (seulement can_upload = true)
    const validPerms = permissions.filter((p) => p && p.user_id && p.can_upload === true);
    if (validPerms.length > 0) {
      const rows = validPerms.map((p) => ({
        user_id: p.user_id,
        folder_id: req.params.id,
        can_upload: true,
        granted_by: req.user.id,
      }));
      const { error: insErr } = await supabaseAdmin.from('library_user_permissions').insert(rows);
      if (insErr) throw new Error(insErr.message);
    }

    res.json({ ok: true, folder_id: req.params.id, count: validPerms.length });
  } catch (err) {
    console.error('❌ PUT /library/folders/:id/user-permissions :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/library/documents — Upload
// 🔒 Admin OU user avec can_upload sur ce dossier
// ============================================================
router.post('/documents', upload.single('file'), async (req, res) => {
  try {
    const { folder_id, title, description } = req.body;
    if (!folder_id || !title) {
      return res.status(400).json({ error: 'folder_id et title requis' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier (champ "file")' });
    }

    const { folder, reason } = await getFolderIfAccessible(req, folder_id);
    if (!folder) return res.status(403).json({ error: reason });

    const allowed = await canUploadToFolder(req, folder_id);
    if (!allowed) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à uploader dans ce dossier' });
    }

    const ext = (req.file.originalname.split('.').pop() || 'bin').toLowerCase();
    const storagePath = `${folder.hospital_id}/${folder_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // 1. Upload vers Supabase Storage
    await uploadFile(req.file.buffer, storagePath, req.file.mimetype);

    // 2. INSERT métadonnées
    const { data, error } = await supabaseAdmin
      .from('library_documents')
      .insert({
        folder_id,
        hospital_id: folder.hospital_id,
        title: String(title).trim(),
        description: description || null,
        storage_path: storagePath,
        file_name: req.file.originalname,
        file_type: ext,
        file_size_bytes: req.file.size,
        mime_type: req.file.mimetype,
        uploaded_by: req.user.id,
      })
      .select('id, title, file_name, file_type, file_size_bytes, created_at')
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json(data);
  } catch (err) {
    console.error('❌ POST /library/documents :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/library/documents/:id/download — URL signée (1h)
// 🔓 Tout utilisateur du même hôpital
// ============================================================
router.get('/documents/:id/download', async (req, res) => {
  try {
    const { data: doc, error } = await supabaseAdmin
      .from('library_documents')
      .select('id, hospital_id, folder_id, storage_path, title')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!doc) return res.status(404).json({ error: 'Document introuvable' });

    if (!isSuperAdmin(req) && doc.hospital_id !== req.user.hospital_id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const url = await getSignedDownloadUrl(doc.storage_path, 3600);
    res.json({ url, title: doc.title, expires_in: 3600 });
  } catch (err) {
    console.error('❌ GET /library/documents/:id/download :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE /api/library/documents/:id
// 🔒 Admin uniquement (jamais délégable)
// ============================================================
router.delete('/documents/:id', async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Seul l\'administrateur peut supprimer un document' });
    }

    const { data: doc, error } = await supabaseAdmin
      .from('library_documents')
      .select('id, hospital_id, storage_path')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!doc) return res.status(404).json({ error: 'Document introuvable' });

    if (!isSuperAdmin(req) && doc.hospital_id !== req.user.hospital_id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Supprimer du storage puis de la DB
    await deleteFile(doc.storage_path);
    await supabaseAdmin.from('library_documents').delete().eq('id', doc.id);

    res.status(204).send();
  } catch (err) {
    console.error('❌ DELETE /library/documents/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;