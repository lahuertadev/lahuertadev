import { BADGE_COLORS } from './badgeColors';
// Colores de badge por categoría de producto, mismo patrón visual que el badge de "Estado" de Clientes.
// Las categorías conocidas tienen un color curado; cualquier categoría nueva (ej. "Especias") recibe
// automáticamente uno de la paleta de reserva, siempre el mismo para esa categoría (hash estable).

const KNOWN_CATEGORY_COLORS = {
  frutas:     { ...BADGE_COLORS.yellow }, // amarillo
  verduras:   { ...BADGE_COLORS.green }, // verde
  procesados: { ...BADGE_COLORS.red }, // rojo
};

const FALLBACK_PALETTE = [
  { ...BADGE_COLORS.blue }, // azul
  { ...BADGE_COLORS.violet }, // violeta
  { ...BADGE_COLORS.orange }, // naranja
  { ...BADGE_COLORS.teal }, // teal
  { ...BADGE_COLORS.pink }, // rosa
];

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
};

export const getCategoryColor = (categoryName) => {
  if (!categoryName) return { ...BADGE_COLORS.gray };
  const key = categoryName.trim().toLowerCase();
  if (KNOWN_CATEGORY_COLORS[key]) return KNOWN_CATEGORY_COLORS[key];
  return FALLBACK_PALETTE[hashString(key) % FALLBACK_PALETTE.length];
};
