const express = require('express');
const router = express.Router();
const { pool } = require('../../server'); // Récupère le pool exporté depuis server.js

// Middleware d'authentification
const { authenticate, requireRole } = require('../middleware/auth');

// ============================================================
// POST /api/signes-vitaux – Enregistrer une prise de signes vitaux
// ============================================================
router.post('/', authenticate, requireRole(['receptionniste', 'infirmier', 'medecin', 'admin']), async (req, res) => {
    const {
        patient_id,
        consultation_id,
        temperature,
        poids,
        tension_systolique,
        tension_diastolique,
        taille,
        frequence_cardiaque,
        commentaire
    } = req.body;

    if (!patient_id) {
        return res.status(400).json({ error: 'Le patient est requis' });
    }

    try {
        const { rows } = await pool.query(`
            INSERT INTO signes_vitaux (
                patient_id,
                consultation_id,
                enregistre_par,
                temperature,
                poids,
                tension_systolique,
                tension_diastolique,
                taille,
                frequence_cardiaque,
                commentaire
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            patient_id,
            consultation_id || null,
            req.user.id,
            temperature || null,
            poids || null,
            tension_systolique || null,
            tension_diastolique || null,
            taille || null,
            frequence_cardiaque || null,
            commentaire || null
        ]);

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('❌ POST /signes-vitaux :', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// GET /api/signes-vitaux/patient/:patientId – Historique d’un patient
// ============================================================
router.get('/patient/:patientId', authenticate, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT 
                sv.*,
                u.nom AS enregistre_par_nom,
                u.prenom AS enregistre_par_prenom,
                u.id AS enregistre_par_id
            FROM signes_vitaux sv
            LEFT JOIN utilisateurs u ON sv.enregistre_par = u.id
            WHERE sv.patient_id = $1
            ORDER BY sv.date_enregistrement DESC
        `, [req.params.patientId]);

        res.json(rows);
    } catch (err) {
        console.error('❌ GET /signes-vitaux/patient/:patientId :', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// GET /api/signes-vitaux/:id – Détail d’une prise (optionnel)
// ============================================================
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT 
                sv.*,
                u.nom AS enregistre_par_nom,
                u.prenom AS enregistre_par_prenom
            FROM signes_vitaux sv
            LEFT JOIN utilisateurs u ON sv.enregistre_par = u.id
            WHERE sv.id = $1
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Enregistrement non trouvé' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('❌ GET /signes-vitaux/:id :', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// PUT /api/signes-vitaux/:id – Modifier une prise (admin/medecin)
// ============================================================
router.put('/:id', authenticate, requireRole(['medecin', 'admin']), async (req, res) => {
    const {
        temperature,
        poids,
        tension_systolique,
        tension_diastolique,
        taille,
        frequence_cardiaque,
        commentaire
    } = req.body;

    try {
        const { rows } = await pool.query(`
            UPDATE signes_vitaux SET
                temperature = COALESCE($1, temperature),
                poids = COALESCE($2, poids),
                tension_systolique = COALESCE($3, tension_systolique),
                tension_diastolique = COALESCE($4, tension_diastolique),
                taille = COALESCE($5, taille),
                frequence_cardiaque = COALESCE($6, frequence_cardiaque),
                commentaire = COALESCE($7, commentaire),
                updated_at = NOW()
            WHERE id = $8
            RETURNING *
        `, [
            temperature,
            poids,
            tension_systolique,
            tension_diastolique,
            taille,
            frequence_cardiaque,
            commentaire,
            req.params.id
        ]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Enregistrement non trouvé' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('❌ PUT /signes-vitaux/:id :', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// DELETE /api/signes-vitaux/:id – Supprimer une prise (admin)
// ============================================================
router.delete('/:id', authenticate, requireRole(['admin']), async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM signes_vitaux WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Enregistrement non trouvé' });
        }
        res.sendStatus(204);
    } catch (err) {
        console.error('❌ DELETE /signes-vitaux/:id :', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;