// Colores de badge por categoría de producto, mismo patrón visual que el badge de "Estado" de Clientes.
// Las categorías conocidas tienen un color curado; cualquier categoría nueva (ej. "Especias") recibe
// automáticamente uno de la paleta de reserva, siempre el mismo para esa categoría (hash estable).

const KNOWN_CATEGORY_COLORS = {
  frutas:     { bg: '#fef9c3', color: '#854d0e' }, // amarillo
  verduras:   { bg: '#dcfce7', color: '#166534' }, // verde
  procesados: { bg: '#fee2e2', color: '#991b1b' }, // rojo
};

const FALLBACK_PALETTE = [
  { bg: '#dbeafe', color: '#1e40af' }, // azul
  { bg: '#f3e8ff', color: '#7e22ce' }, // violeta
  { bg: '#ffedd5', color: '#9a3412' }, // naranja
  { bg: '#ccfbf1', color: '#115e59' }, // teal
  { bg: '#fce7f3', color: '#9d174d' }, // rosa
];

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
};

export const getCategoryColor = (categoryName) => {
  if (!categoryName) return { bg: '#f0f4f7', color: '#596064' };
  const key = categoryName.trim().toLowerCase();
  if (KNOWN_CATEGORY_COLORS[key]) return KNOWN_CATEGORY_COLORS[key];
  return FALLBACK_PALETTE[hashString(key) % FALLBACK_PALETTE.length];
};
