import { BADGE_COLORS } from './badgeColors';

// Tipo de medición de un tipo de unidad: define si el producto se carga por peso o por cantidad.
export const MEASUREMENT_TYPE_OPTIONS = [
  { value: 'CANTIDAD', label: 'Cantidad', color: BADGE_COLORS.blue },
  { value: 'PESO', label: 'Peso', color: BADGE_COLORS.teal },
];
