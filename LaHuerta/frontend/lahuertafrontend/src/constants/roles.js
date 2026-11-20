import { BADGE_COLORS } from './badgeColors';
// Etiqueta y color por rol de usuario. Fuente única para la grilla de Usuarios
// y para el badge de rol del Header, así ambos quedan siempre consistentes.
export const ROLE_CONFIG = {
  superuser: { label: 'Socio', ...BADGE_COLORS.violet },
  administrator: { label: 'Administrador', ...BADGE_COLORS.blue },
  employee: { label: 'Empleado', ...BADGE_COLORS.gray },
};
