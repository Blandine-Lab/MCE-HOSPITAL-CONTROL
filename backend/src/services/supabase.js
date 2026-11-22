// backend/src/services/supabase.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error(
    '❌ Variables Supabase manquantes : SUPABASE_URL et/ou SUPABASE_SECRET_KEY dans .env'
  );
}

// Client "admin" : utilise la secret key → bypass RLS
// ⚠️ À utiliser UNIQUEMENT dans le backend, jamais exposer la clé au frontend
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'library-files';
const MAX_FILE_SIZE = parseInt(process.env.SUPABASE_MAX_FILE_SIZE || '52428800', 10);

/**
 * Upload un fichier dans le bucket Supabase Storage.
 * @param {Buffer} buffer - contenu du fichier
 * @param {string} storagePath - chemin dans le bucket (ex: "hospital-uuid/folder-uuid/doc-uuid.pdf")
 * @param {string} mimeType - type MIME
 * @returns {Promise<{path: string}>}
 */
async function uploadFile(buffer, storagePath, mimeType) {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(
      `Fichier trop volumineux (max ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} Mo)`
    );
  }

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) throw new Error(`Upload Supabase échoué : ${error.message}`);
  return { path: data.path };
}

/**
 * Génère une URL signée temporaire (1h par défaut) pour télécharger un fichier privé.
 */
async function getSignedDownloadUrl(storagePath, expiresInSeconds = 3600) {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) throw new Error(`Génération URL signée échouée : ${error.message}`);
  return data.signedUrl;
}

/**
 * Supprime un fichier du storage.
 */
async function deleteFile(storagePath) {
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
  if (error) throw new Error(`Suppression Supabase échouée : ${error.message}`);
}

module.exports = {
  supabaseAdmin,
  BUCKET,
  uploadFile,
  getSignedDownloadUrl,
  deleteFile,
};