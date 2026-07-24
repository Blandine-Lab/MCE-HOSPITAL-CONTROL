const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'une_cle_par_defaut_mais_changez_la';

// ============================================================
// 🔑 Liste exhaustive des permissions utilisées dans l'application
//    (à adapter si vous en ajoutez ou supprimez)
// ============================================================
const ALL_PERMISSIONS = [
    'view_dashboard',
    'manage_users',
    'view_patients',
    'manage_patients',
    'view_consultations',
    'manage_consultations',
    'view_medical',
    'manage_medical',
    'view_paramedical',
    'manage_paramedical',
    'view_laboratory',
    'manage_laboratory',
    'view_rh',
    'manage_rh',
    'view_finance',
    'manage_finance',
    'view_stock',
    'manage_stock',
    'view_quality',
    'manage_quality',
    'view_reporting',
    'manage_reporting',
    'view_security',
    'manage_security',
    'view_interoperabilite',
    'manage_interoperabilite'
];

// ============================================================
// Route de connexion (CORRIGÉE pour utiliser la colonne 'code')
// ============================================================
router.post('/login', async (req, res) => {
    const { login, password } = req.body;
    try {
        // 1. Recherche de l'utilisateur
        const { rows } = await pool.query(
            'SELECT * FROM utilisateurs WHERE login = $1 AND actif = true',
            [login]
        );
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }
        const user = rows[0];

        // 2. Vérification du mot de passe
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        // 3. Récupération des permissions
        let permissions = [];
        const adminRoles = ['admin', 'Administrateur'];

        if (adminRoles.includes(user.role)) {
            // ✅ L'administrateur obtient TOUTES les permissions
            permissions = ALL_PERMISSIONS;
            console.log(`✅ Admin ${user.login} : ${permissions.length} permissions`);
        } else {
            // ❌ Pour les autres rôles, on va chercher dans la base
            try {
                const { rows: roleRows } = await pool.query(
                    'SELECT id FROM roles WHERE nom = $1',
                    [user.role]
                );
                if (roleRows.length > 0) {
                    const roleId = roleRows[0].id;
                    // ✅ CORRECTION : utiliser 'code' car la colonne s'appelle 'code'
                    const { rows: permsRows } = await pool.query(`
                        SELECT p.code FROM permissions p
                        JOIN role_permissions rp ON p.id = rp.permission_id
                        WHERE rp.role_id = $1
                    `, [roleId]);
                    permissions = permsRows.map(row => row.code);
                    console.log(`🔑 ${user.role} ${user.login} : ${permissions.length} permissions (${permissions.join(', ')})`);
                } else {
                    console.warn(`⚠️ Rôle "${user.role}" non trouvé dans la table "roles"`);
                }
            } catch (err) {
                console.error('❌ Erreur récupération permissions :', err);
                permissions = [];
            }
        }

        // 4. Génération du token JWT avec les permissions
        const token = jwt.sign(
            {
                id: user.id,
                login: user.login,
                role: user.role,
                nom: user.nom,
                prenom: user.prenom,
                permissions: permissions
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // 5. Réponse au frontend
        res.json({
            token,
            user: {
                id: user.id,
                login: user.login,
                role: user.role,
                nom: user.nom,
                prenom: user.prenom,
                permissions: permissions
            }
        });

    } catch (err) {
        console.error('❌ Erreur login :', err);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

module.exports = router;