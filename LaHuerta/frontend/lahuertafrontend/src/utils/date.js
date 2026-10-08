  //* Función para formatear la fecha
  export const formatDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}-${month}-${year}`;
  };
  //* Fecha de hoy en formato YYYY-MM-DD según la zona horaria local (no UTC).
  //* Evita que después de las 21:00 (UTC-3) se tome el día siguiente, como pasa con toISOString().
  export const getTodayDate = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  };
