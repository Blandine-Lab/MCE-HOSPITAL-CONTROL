// frontend/src/components/PermissionRoute.jsx
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import React from 'react';

export const PermissionRoute = ({ children, permission }) => {
  const { hasPermission, user, isBypass } = usePermissions();

  // 1. Pas de token → login (pas /unauthorized)
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Bypass admin via le hook (gère super_admin + casse)
  if (isBypass) {
    return children;
  }

  // 3. Bypass métier existants (case-insensitive, corrige 'Biologiste')
  const role = String(user.role || '').toLowerCase();
  if (role === 'biologiste' || role === 'laborantin') {
    return children;
  }

  // 4. Vérification classique
  if (!hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};