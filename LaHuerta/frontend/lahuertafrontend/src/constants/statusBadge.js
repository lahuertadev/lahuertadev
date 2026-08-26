// Badge de estado Activo/Inactivo, mismo estilo en toda la app (grilla de Clientes, detalle, etc.)
export const getActiveBadgeStyle = (active) => ({
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: 600,
  lineHeight: '18px',
  backgroundColor: active ? '#dcfce7' : '#fee2e2',
  color: active ? '#166534' : '#991b1b',
  whiteSpace: 'nowrap',
});
