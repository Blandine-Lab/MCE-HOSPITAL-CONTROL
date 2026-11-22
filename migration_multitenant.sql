-- ============================================================
-- MIGRATION MULTI-TENANT — ÉTAPE 1
-- ============================================================
-- ⚠️ AVANT D'EXÉCUTER :
-- 1. Faire un backup : Neon Console → Branches → Create branch (instantané)
-- 2. Tester d'abord sur une branche de dev si possible
-- 3. Lire chaque section avant d'exécuter
--
-- Cette migration :
--   ✅ Crée la table `hospitals`
--   ✅ Insère l'hôpital MCE existant (UUID fixe pour backfill)
--   ✅ Ajoute `hospital_id` sur toutes les tables métier
--   ✅ Backfill avec MCE
--   ✅ Passe `hospital_id` en NOT NULL
--   ✅ Crée les index composites
--   ⏳ N'ACTIVE PAS ENCORE RLS (étape 6 séparée)
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Table `hospitals`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hospitals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  nom         TEXT NOT NULL,
  email_admin TEXT,
  telephone   TEXT,
  adresse     TEXT,
  pays        TEXT,
  logo_url    TEXT,
  couleur     TEXT DEFAULT '#0ea5e9',
  statut      TEXT NOT NULL DEFAULT 'essai'
              CHECK (statut IN ('actif', 'essai', 'suspendu')),
  plan        TEXT NOT NULL DEFAULT 'essai',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. Insérer l'hôpital MCE existant
-- UUID FIXE et prévisible pour que le backfill soit reproductible.
-- ------------------------------------------------------------
INSERT INTO hospitals (id, slug, nom, statut, plan)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'mce',
  'Medical Center Elizabeth MCE',
  'actif',
  'legacy'
)
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 3. Ajouter hospital_id sur TOUTES les tables métier
-- ------------------------------------------------------------
-- Les tables suivantes NE SONT PAS scopées (référentiels globaux) :
--   hospitals          → c'est la table des tenants
--   roles              → partagés entre hôpitaux
--   permissions        → partagés entre hôpitaux
--   role_permissions   → partagés entre hôpitaux
--   migrations / pgmigrations / knex_migrations / schema_migrations
-- ------------------------------------------------------------
DO $$
DECLARE
  t text;
  excluded_tables text[] := ARRAY[
    'hospitals',
    'roles',
    'permissions',
    'role_permissions',
    'migrations',
    'pgmigrations',
    'knex_migrations',
    'knex_migrations_lock',
    'schema_migrations'
  ];
  mce_uuid uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name != ALL(excluded_tables)
    ORDER BY table_name
  LOOP
    -- Ajouter la colonne si absente
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id)',
      t
    );
    -- Backfill avec MCE
    EXECUTE format(
      'UPDATE %I SET hospital_id = %L WHERE hospital_id IS NULL',
      t, mce_uuid
    );
    -- Passer en NOT NULL
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN hospital_id SET NOT NULL',
      t
    );
    -- Index composite (hospital_id, id) pour les scans par tenant
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%s_hospital_id ON %I (hospital_id)',
      t, t
    );
    RAISE NOTICE 'Table %I : hospital_id ajouté, backfillé, NOT NULL, indexé', t;
  END LOOP;
END
$$;

-- ------------------------------------------------------------
-- 4. Vérification rapide
-- ------------------------------------------------------------
DO $$
DECLARE
  tables_without_tenant int;
BEGIN
  SELECT COUNT(*) INTO tables_without_tenant
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'hospital_id'
    AND is_nullable = 'YES';

  IF tables_without_tenant > 0 THEN
    RAISE EXCEPTION 'Il reste % colonnes hospital_id nullables — migration incomplète', tables_without_tenant;
  END IF;
END
$$;

COMMIT;

-- ============================================================
-- RÉSUMÉ POST-MIGRATION
-- ============================================================
-- À vérifier manuellement dans Neon SQL Editor après COMMIT :
--
--   -- L'hôpital MCE existe
--   SELECT id, slug, nom, statut FROM hospitals;
--
--   -- Toutes les tables métier ont un hospital_id non nul
--   SELECT table_name,
--          (SELECT COUNT(*) FROM information_schema.columns c
--           WHERE c.table_name = t.table_name
--             AND c.column_name = 'hospital_id') AS has_hospital_id
--   FROM information_schema.tables t
--   WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
--   ORDER BY table_name;
--
--   -- Toutes les lignes sont rattachées à MCE
--   SELECT COUNT(*) FROM patients WHERE hospital_id IS NULL;
--   -- doit renvoyer 0
-- ============================================================