import { useState } from 'react';

/**
 * Custom hook para manejar filtros genéricos.
 * @param {Object} initialFilterValues - Valores iniciales de los filtros.
 * @param {Function} fetchFunction - Callback para realizar la búsqueda con los filtros.
 */
const useFilters = (initialFilterValues, fetchFunction) => {
  const [filterValues, setFilterValues] = useState(initialFilterValues);

  // Actualiza los valores de los filtros
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilterValues((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
  };

  // Aplica los filtros llamando a la función de búsqueda
  const applyFilters = () => {
    fetchFunction(filterValues);
  };

  return {
    filterValues,
    handleFilterChange,
    applyFilters,
  };
};

export default useFilters;