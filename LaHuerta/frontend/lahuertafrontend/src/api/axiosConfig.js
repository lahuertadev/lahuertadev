/**
 * Configuración global de axios para el backend Django.
 * - Envía cookies (session, CSRF) en todas las peticiones (withCredentials).
 * - Añade el token CSRF en el header X-CSRFToken para POST/PUT/PATCH/DELETE.
 */
import axios from 'axios';

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
  const method = (config.method || '').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const token = getCsrfTokenFromCookie();
    if (token) {
      config.headers['X-CSRFToken'] = token;
    }
  }
  return config;
});

export default axios;
