import React from 'react';
import EditIcon from '@mui/icons-material/EditOutlined';
import SpotlightButton from '../SpotlightButton';

/**
 * EditButton — botón "Editar" de los detalles (DEV-150): azul translúcido (variante `soft`), con el
 * efecto de luz. En mobile ocupa el ancho; en desktop tiene un ancho mínimo. Estilo, ícono y tamaño
 * se cambian acá, para todas las pantallas.
 *
 * Props:
 *   onClick — acción al presionar (normalmente un navigate a la edición)
 *   label   — texto del botón (default 'Editar'; ej. 'Editar cliente')
 */
export default function EditButton({ onClick, label = 'Editar' }) {
  return (
    <SpotlightButton variant="soft" onClick={onClick} className="w-full sm:w-auto sm:min-w-[10rem] px-6 py-2.5 text-sm">
      <EditIcon sx={{ fontSize: 16 }} /> {label}
    </SpotlightButton>
  );
}
