/**
 * Configuración global de axios para el backend Django.
 * - Envía cookies (session, CSRF) solo en peticiones a nuestro backend (withCredentials).
 * - Peticiones a APIs externas (ej. apis.datos.gob.ar) no envían credenciales para evitar CORS.
 * - Añade el token CSRF en el header X-CSRFToken para POST/PUT/PATCH/DELETE al backend.
 */
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

axios.defaults.withCredentials = true;

/**
 * Obtiene el valor de la cookie CSRF (Django la guarda como 'csrftoken').
 */
function getCsrfTokenFromCookie() {
  const name = 'csrftoken';
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

axios.interceptors.request.use((config) => {
  const url = (config.baseURL && !(config.url || '').startsWith('http'))
    ? `${config.baseURL}${config.url}`
    : (config.url || '');
  const isOurBackend = url.startsWith(API_BASE);
  config.withCredentials = isOurBackend;
  const method = (config.method || '').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method) && isOurBackend) {
    const token = getCsrfTokenFromCookie();
    if (token) {
      config.headers['X-CSRFToken'] = token;
    }
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const contentType = error.response?.headers?.['content-type'] || '';
    if (contentType.includes('text/html')) {
      error.message = 'Ocurrió un error, por favor intentá de nuevo.';
    } else if (error.response?.data) {
      const data = error.response.data;
      error.message =
        data?.detail ||
        data?.message ||
        data?.error ||
        'Ocurrió un error, por favor intentá de nuevo.';
    } else {
      error.message = 'Ocurrió un error, por favor intentá de nuevo.';
    }
    return Promise.reject(error);
  }
);

export default axios;
