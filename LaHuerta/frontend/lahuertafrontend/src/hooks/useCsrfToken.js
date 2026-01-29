import { useState, useEffect } from 'react';
import axios from 'axios';
import { authCsrfUrl } from '../constants/urls';

/**
 * Hook personalizado para obtener el token CSRF
 * @returns {string} El token CSRF o string vacío si aún no se ha obtenido
 */
export const useCsrfToken = () => {
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await axios.get(authCsrfUrl, {
          withCredentials: true,
        });
        setCsrfToken(response.data.csrfToken);
      } catch (err) {
        console.error('Error obteniendo CSRF token:', err);
      }
    };
    fetchCsrfToken();
  }, []);

  return csrfToken;
};

