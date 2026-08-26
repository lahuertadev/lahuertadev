//* Función para extraer un mensaje de error legible de una respuesta de axios
export const extractErrorMessage = (error, fallback = 'Error al guardar. Verificá los datos e intentá de nuevo.') => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') {
    // Respuestas no-JSON (ej. HTML de nginx en un 413/502) no son mensajes válidos para mostrar
    return /^\s*<(!DOCTYPE|html)/i.test(data) ? fallback : data;
  }
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  const fieldErrors = Object.values(data).flat().filter((v) => typeof v === 'string');
  return fieldErrors[0] || fallback;
};
