const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Racine des uploads (compat avec l'existant : dossiers et fichiers déjà présents)
const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

// Slug par défaut (hôpital legacy MCE) si aucun contexte tenant n'est présent
const DEFAULT_SLUG = process.env.HOPITAL_SLUG || 'mce';

// 10 Mo — ajustable
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ============================================================
// 🏥 Sanitize du slug d'hôpital
// ------------------------------------------------------------
// Le slug vient du JWT (donc signé), mais on filtre quand même
// par défense en profondeur : on ne veut JAMAIS qu'un slug
// contenant `..`, `/`, `\` puisse faire écrire ailleurs que
// dans uploads/<slug>/.
// ============================================================
function sanitizeSlug(slug) {
  if (typeof slug !== 'string') return DEFAULT_SLUG;
  const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  return clean.length >= 1 ? clean : DEFAULT_SLUG;
}

// ============================================================
// 📁 Dossier d'uploads d'un hôpital (créé si nécessaire)
// ------------------------------------------------------------
// Utilisé par le middleware multer ET exposable à la Phase C
// pour la route /uploads protégée.
// ============================================================
function hospitalUploadsDir(slug) {
  const safe = sanitizeSlug(slug);
  const dir = path.join(UPLOADS_ROOT, safe);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    // Si on ne peut pas créer le dossier, on retombe sur la racine
    // (ne devrait jamais arriver, mais on évite de tout casser).
    console.error(`❌ Impossible de créer ${dir} :`, err.message);
    return UPLOADS_ROOT;
  }
  return dir;
}

// ============================================================
// 🔗 URL publique d'un fichier uploadé
// ------------------------------------------------------------
// À utiliser dans les réponses API pour renvoyer le bon chemin.
// Exemple : publicUrl('mce', 'abc.jpg') → '/uploads/mce/abc.jpg'
// Pour les anciens fichiers à la racine : publicUrl(null, 'abc.jpg')
// → '/uploads/abc.jpg'
// ============================================================
function publicUrl(slug, filename) {
  if (!filename) return null;
  if (!slug) return `/uploads/${filename}`;
  return `/uploads/${sanitizeSlug(slug)}/${filename}`;
}

// ============================================================
// 💾 Storage multer : scopé par hôpital
// ------------------------------------------------------------
// - Si `req.hospitalSlug` existe (injecté par `authenticate`),
//   le fichier est écrit dans uploads/<slug>/.
// - Sinon → uploads/ (racine) = comportement legacy, pour ne
//   pas casser les routes qui n'ont pas encore de contexte
//   tenant (elles seront migrées en Phase C).
// ============================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const slug = req.hospitalSlug || DEFAULT_SLUG;
      cb(null, hospitalUploadsDir(slug));
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Le timestamp seul ne suffit plus : deux hôpitaux peuvent uploader
    // au même instant et générer un nom identique. On garde la même
    // structure, mais le sous-dossier tenant fait déjà l'isolation.
    const uniqueName =
      Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  },
});

// ============================================================
// 🎯 Filtre mime
// ------------------------------------------------------------
// Images + PDF (ordonnances, dossiers scannés).
// Ajouter ici d'autres types si besoin (ex: 'application/vnd...')
// ============================================================
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith('image/') ||
    file.mimetype === 'application/pdf'
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Type de fichier non autorisé (images et PDF uniquement)'
      ),
      false
    );
  }
};

// ============================================================
// ⚙️ Instance multer
// ============================================================
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE, // 10 Mo
  },
});

// ============================================================
// Export
// ------------------------------------------------------------
// - `module.exports = upload` : API identique à avant, aucune
//   route existante n'est cassée (`upload.single`, `.array`, etc.)
// - `.hospitalUploadsDir` et `.publicUrl` : helpers pour la
//   Phase C (route /uploads protégée + réponses API)
// ============================================================
module.exports = upload;
module.exports.hospitalUploadsDir = hospitalUploadsDir;
module.exports.publicUrl = publicUrl;
module.exports.UPLOADS_ROOT = UPLOADS_ROOT;
module.exports.sanitizeSlug = sanitizeSlug;