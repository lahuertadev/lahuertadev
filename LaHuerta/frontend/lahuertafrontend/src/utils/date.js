  //* Función para formatear la fecha
  export const formatDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}-${month}-${year}`;
  };