// Paleta única de las etiquetas (badges) de todo el sitio: un solo tono por color, para que no
// haya dos azules, dos verdes ni dos rojos distintos. Fondo pastel claro y texto oscuro, igual en
// los dos temas. Toda etiqueta toma su color de acá (por StatusBadge/Badge o por { bg, color }).
//
// Los estados usan solo los tres colores base (ver STATE_TONES): rojo para eliminación, anulación,
// rechazo o pendiente; amarillo para un estado intermedio; verde para uno resuelto. Los demás colores
// son para tipos (de pago, de factura, categorías, roles) o estados que no son ninguno de esos tres.
export const BADGE_COLORS = {
  // Colores base de estado.
  red:    { bg: '#fee2e2', color: '#b91c1c' },
  yellow: { bg: '#fef9c3', color: '#a16207' },
  green:  { bg: '#dcfce7', color: '#166534' },
  // Tipos y otros estados.
  blue:   { bg: '#dbeafe', color: '#1d4ed8' },
  indigo: { bg: '#e0e7ff', color: '#4338ca' },
  violet: { bg: '#f3e8ff', color: '#7e22ce' },
  pink:   { bg: '#fce7f3', color: '#9d174d' },
  orange: { bg: '#ffedd5', color: '#c2410c' },
  teal:   { bg: '#ccfbf1', color: '#115e59' },
  brown:  { bg: '#efe5dc', color: '#7c4a2d' },
  gray:   { bg: '#f1f5f9', color: '#475569' },
};

// Tonos de estado → color base.
export const STATE_TONES = {
  danger: 'red',
  warning: 'yellow',
  success: 'green',
};
