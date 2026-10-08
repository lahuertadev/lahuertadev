// Estilo del Paper de los diálogos de lista de precios: fondo de card del tema (sin la capa
// clara que MUI le suma en modo oscuro), borde sutil y esquinas redondeadas.
// En mobile ocupa el ancho con 16px de margen (MUI por defecto deja 32px por lado).
const dialogPaperSx = {
  m: { xs: 2, sm: 4 },
  width: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' },
  backgroundColor: 'var(--color-surface-card)',
  backgroundImage: 'none',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  fontFamily: 'inherit',
};

export default dialogPaperSx;
