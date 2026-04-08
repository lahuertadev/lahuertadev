import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { authMeUrl } from '../../constants/urls';
import { useAuth } from '../../context/AuthContext';

/**
 * Pregunta al backend si hay sesión (/auth/me/).
 * Si hay sesión: guarda el usuario en estado de autenticación y muestra las rutas privadas.
 * Si no hay sesión: redirige a /login (y guarda la ruta en location.state.from).
 */
function RequireAuth({ children }) {
  const { setUser } = useAuth();
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'unauthenticated'
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const response = await axios.get(authMeUrl, { withCredentials: true });
        if (!cancelled && response.status === 200) {
          setUser(response.data); // Guardar estado de autenticación (id, email, role)
          setStatus('authenticated');
        } else if (!cancelled) {
          setStatus('unauthenticated');
        }
      } catch {
        if (!cancelled) {
          setStatus('unauthenticated');
        }
      }
    };

    checkAuth();
    return () => { cancelled = true; };
  }, [setUser]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-lahuerta to-little-blue-lahuerta">
        <div className="w-12 h-12 border-4 border-t-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default RequireAuth;
