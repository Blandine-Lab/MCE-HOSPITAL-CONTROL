// frontend/src/components/PermissionRoute.jsx
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import React from 'react';

export const PermissionRoute = ({ children, permission }) => {
  const { hasPermission, user } = usePermissions();

  // Si l'utilisateur est admin OU biologiste OU laborantin → autorisé sans vérifier la permission
  if (user?.role === 'admin' || user?.role === 'biologiste' || user?.role === 'laborantin') {
    return children;
  }

  // Sinon, vérifier la permission
  if (!hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
