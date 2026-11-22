// src/hooks/usePermissions.js

// 🔑 Rôles qui bypassent toute vérification de permission
const BYPASS_ROLES = ['admin', 'super_admin', 'administrateur'];

// 🔑 Doit matcher EXACTEMENT backend/src/routes/auth.js ALL_PERMISSIONS
const ALL_PERMISSIONS = [
  'view_dashboard', 'manage_users',
  'view_patients', 'manage_patients',
  'view_consultations', 'manage_consultations',
  'view_medical', 'manage_medical',
  'view_paramedical', 'manage_paramedical',
  'view_laboratory', 'manage_laboratory',
  'view_rh', 'manage_rh',
  'view_finance', 'manage_finance',
  'view_stock', 'manage_stock',
  'view_quality', 'manage_quality',
  'view_reporting', 'manage_reporting',
  'view_security', 'manage_security',
  'view_interoperabilite', 'manage_interoperabilite',
  'view_facturation', 'manage_facturation',
  'view_pharmacy', 'manage_pharmacy',
  'view_prescriptions', 'manage_prescriptions',
];

/**
 * Décode le payload d'un JWT (base64url + UTF-8).
 * atob() seul échoue sur les JWT réels (caractères - _ + non-ASCII).
 */
function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('JWT mal formé');

  const base64Url = parts[1];
  // base64url -> base64 standard
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  // padding
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

  const binary = atob(padded);
  // binary string -> Uint8Array -> UTF-8 string
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const json = new TextDecoder('utf-8').decode(bytes);
  return JSON.parse(json);
}

export const usePermissions = () => {
  const token = localStorage.getItem('token');

  if (!token) {
    return {
      permissions: [],
      hasPermission: () => false,
      user: null,
      isBypass: false,
    };
  }

  let payload;
  try {
    payload = decodeJwtPayload(token);
  } catch (e) {
    console.error('❌ JWT illisible :', e);
    // ⚠️ On NE donne PAS toutes les permissions en cas d'erreur
    return {
      permissions: [],
      hasPermission: () => false,
      user: null,
      isBypass: false,
    };
  }

  const role = String(payload.role || '').toLowerCase();
  const isBypass = BYPASS_ROLES.includes(role);

  // Fallback : JWT sans permissions (vieux token) → liste complète pour bypass
  const permissions =
    Array.isArray(payload.permissions) && payload.permissions.length > 0
      ? payload.permissions
      : isBypass
        ? ALL_PERMISSIONS
        : [];

  return {
    permissions,
    isBypass,
    hasPermission: (permission) => {
      if (isBypass) return true;
      return permissions.includes(permission);
    },
    user: payload,
  };
};