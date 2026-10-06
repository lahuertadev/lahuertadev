import React from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SpotlightButton from '../SpotlightButton';

/**
 * BackButton — botón "Volver" con el efecto de luz que sigue al cursor.
 *
 * Props:
 *   onClick — acción al presionar (normalmente un navigate)
 *   label   — texto del botón (default 'Volver')
 */
export default function BackButton({ onClick, label = 'Volver' }) {
  return (
    <SpotlightButton variant="outline" onClick={onClick} className="px-3 py-1.5 text-sm">
      <ArrowBackIcon sx={{ fontSize: 18 }} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
      {label}
    </SpotlightButton>
  );
}
