const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { seedTenant } = require('../utils/seedTenant');

const SLUG_RE = /^[a-z0-9-]{3,40}$/;
const RESERVED_SLUGS = new Set([
  'www', 'api', 'admin', 'app', 'support', 'mail', 'ftp',
  'cdn', 'static', 'platform', 'mce', 'root', 'system',
]);

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'logos');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const name = `logo-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(png|jpe?g|gif|webp|svg\+xml)$/.test(file.mimetype)) {
      return cb(new Error("Format d'image non supporté"));
    }
    cb(null, true);
  },
});

router.post('/upload-logo', (req, res) => {
  upload.single('logo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu (champ "logo")' });
    res.json({ logo_url: `/uploads/logos/${req.file.filename}` });
  });
});

router.post('/register', async (req, res) => {
  const body = req.body || {};

  // ---- 1. Normalisation + validation ----
  const nom        = String(body.nom || '').trim();
  const slugRaw    = String(body.slug || '').trim();
  const emailAdmin = String(body.emailAdmin || '').trim().toLowerCase();
  const password   = String(body.password || '');
  const telephone  = body.telephone ? String(body.telephone).trim() : null;
  const adresse    = body.adresse   ? String(body.adresse).trim()   : null;
  const pays       = body.pays      ? String(body.pays).trim()      : null;
  const logo_url   = body.logo_url  || null;
  const couleur    = body.couleur   || '#0ea5e9';

  if (!nom || !slugRaw || !emailAdmin || !password) {
    return res.status(400).json({ error: 'Champs requis : nom, slug, emailAdmin, password' });
  }

  // 📌 Normalisation du slug AVANT validation (MCE -> mce)
  const slug = slugRaw.toLowerCase();

  if (!SLUG_RE.test(slug)) {
    return res.status(400).json({ error: 'Slug invalide (3-40 car., a-z 0-9 -)' });
  }
  if (RESERVED_SLUGS.has(slug)) {
    return res.status(400).json({ error: 'Ce slug est réservé' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Mot de passe : 8 caractères minimum' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAdmin)) {
    return res.status(400).json({ error: 'Email admin invalide' });
  }

  // 📌 Nouveau format de login
  const adminLogin = `admin@${slug}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ---- 2. Unicité slug ----
    const slugExists = await client.query('SELECT 1 FROM hospitals WHERE slug = $1', [slug]);
    if (slugExists.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: "Ce nom d'hôpital est déjà pris" });
    }

    // ---- 3. Unicité email (colonne email, PAS login) ----
    const emailExists = await client.query(
      'SELECT 1 FROM utilisateurs WHERE email = $1',
      [emailAdmin]
    );
    if (emailExists.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    // ---- 4. Hôpital ----
    const { rows: [hospital] } = await client.query(
      `INSERT INTO hospitals (slug, nom, email_admin, telephone, adresse, pays, statut, plan, logo_url, couleur)
       VALUES ($1, $2, $3, $4, $5, $6, 'essai', 'essai', $7, $8)
       RETURNING id, slug, nom, logo_url, couleur`,
      [slug, nom, emailAdmin, telephone, adresse, pays, logo_url, couleur]
    );

    // ---- 4bis. 🔑 Définir app.hospital_id pour la RLS policy de utilisateurs ----
    // Sans ce set_config, l'INSERT dans utilisateurs est refusé par la policy
    // `tenant_isolation` (WITH CHECK hospital_id = current_setting('app.hospital_id')::uuid).
    await client.query(
      `SELECT set_config('app.hospital_id', $1, true)`,
      [String(hospital.id)]
    );

    // ---- 5. Admin : login = admin@<slug>, role = 'admin' ----
    const hash = await bcrypt.hash(password, 12);
    await client.query(
      `INSERT INTO utilisateurs (hospital_id, login, email, password_hash, nom, prenom, role, actif)
       VALUES ($1, $2, $3, $4, $5, $6, 'admin', true)`,
      [
        hospital.id,
        adminLogin,        // 🔑 admin@cbb
        emailAdmin,        // email de contact distinct
        hash,
        'Admin',           // nom
        nom,               // prenom = nom de l'hôpital (affichage "Admin <Hôpital>")
      ]
    );

    await seedTenant(client, hospital.id);
    await client.query('COMMIT');

    const domain = process.env.PLATFORM_DOMAIN || 'localhost:5173';
    const scheme = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const loginUrl = `${scheme}://${hospital.slug}.${domain}`;

    console.log(`🏥 Hôpital créé : ${hospital.slug} | admin login : ${adminLogin}`);
    res.status(201).json({
      message: 'Hôpital créé avec succès',
      hospital: {
        slug: hospital.slug,
        nom: hospital.nom,
        logo_url: hospital.logo_url,
        couleur: hospital.couleur,
      },
      adminLogin,      // 📌 à afficher côté frontend
      loginUrl,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '42P01' || err.code === '42703') {
      return res.status(503).json({ error: 'Plateforme non encore initialisée', code: 'PLATFORM_NOT_READY' });
    }
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Slug ou email déjà utilisé' });
    }
    console.error('❌ hospitals/register :', err);
    res.status(500).json({ error: 'Erreur lors de la création' });
  } finally {
    client.release();
  }
});

module.exports = router;