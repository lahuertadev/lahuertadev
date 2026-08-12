import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Bloquea una ruta privada según el rol del usuario logueado.
 * Se usa dentro de RequireAuth (asume que ya hay sesión y `user` cargado).
 * Si el rol no está permitido, redirige a "/".
 */
function RequireRole({ roles, children }) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default RequireRole;
