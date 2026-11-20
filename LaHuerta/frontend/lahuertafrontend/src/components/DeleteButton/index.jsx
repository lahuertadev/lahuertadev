import React from 'react';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import SpotlightButton from '../SpotlightButton';

/**
 * DeleteButton — botón de acción destructiva de los detalles (DEV-150): rojo translúcido (variante
 * `danger`), con el efecto de luz. En mobile ocupa el ancho. Estilo, ícono y tamaño se cambian acá,
 * para todas las pantallas. Abre la confirmación (AlertDialog con DeleteMessage); no borra directo.
 *
 * Props:
 *   onClick — acción al presionar (normalmente abrir el diálogo de confirmación)
 *   label   — texto del botón (default 'Eliminar'; ej. 'Anular')
 *   icon    — ícono de MUI (default el tacho; ej. Block para Anular)
 */
export default function DeleteButton({ onClick, label = 'Eliminar', icon: Icon = DeleteIcon }) {
  return (
    <SpotlightButton variant="danger" onClick={onClick} className="w-full sm:w-auto px-6 py-2.5 text-sm">
      <Icon sx={{ fontSize: 16 }} /> {label}
    </SpotlightButton>
  );
}
