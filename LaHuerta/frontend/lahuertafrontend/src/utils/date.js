  //* Función para formatear la fecha: dd-mm-aaaa, o con otro separador (ej. '/' → dd/mm/aaaa).
  export const formatDate = (dateString, separator = '-') => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('T')[0].split('-');
    return [day, month, year].join(separator);
  };
  //* Fecha de hoy en formato YYYY-MM-DD según la zona horaria local (no UTC).
  //* Evita que después de las 21:00 (UTC-3) se tome el día siguiente, como pasa con toISOString().
  export const getTodayDate = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  };

  //* Suma días corridos a una fecha YYYY-MM-DD y devuelve otra YYYY-MM-DD. Cruza meses y años solo
  //* (ej. 2026-01-30 + 30 → 2026-03-01). Se calcula en UTC para que el horario de verano no corra el día.
  export const addDays = (dateString, days) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + days));
    return date.toISOString().slice(0, 10);
  };
