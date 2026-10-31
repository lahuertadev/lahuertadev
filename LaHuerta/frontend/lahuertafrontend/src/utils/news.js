//* Indica si una novedad del historial entra en el filtro elegido (ver NEWS_FILTERS).
export const matchesNewsFilter = (item, filter) => {
  if (filter === 'unseen') return !item.seen;
  if (filter === 'current') return item.is_current;
  if (filter === 'expired') return !item.is_current;
  return true;
};
