// src/hooks/usePermissions.js
export const usePermissions = () => {
  const token = localStorage.getItem('token');

  const allPermissions = [
    'view_dashboard',
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

  if (!token) {
    return { 
      permissions: [], 
      hasPermission: () => false,
      user: null 
    };
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const permissions = payload.permissions || allPermissions;
    return {
      permissions,
      hasPermission: (permission) => permissions.includes(permission),
      user: payload  // contient role, id, login, etc.
    };
  } catch (e) {
    return { 
      permissions: allPermissions, 
      hasPermission: () => true,
      user: null
    };
  }
};
