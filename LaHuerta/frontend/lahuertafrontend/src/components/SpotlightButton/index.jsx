import React, { useRef } from 'react';
import useSpotlight from '../../hooks/useSpotlight';

const VARIANTS = {
  // Acción secundaria con color de acento (ej. Volver).
  outline: {
    className: 'border border-border-subtle bg-surface-card text-accent hover:border-accent/50 hover:shadow-md',
    glow: 'rgb(var(--color-accent-rgb) / 0.22)',
  },
  // Salir sin guardar: neutro, se tiñe de rojo al pasar el cursor.
  cancel: {
    className: 'border border-border-subtle bg-surface-card text-on-surface-muted hover:border-red-400 hover:text-red-500 hover:shadow-md',
    glow: 'rgb(239 68 68 / 0.18)',
  },
  // Acción principal (ej. Confirmar). Azul fijo para que el texto blanco se lea en ambos temas.
  primary: {
    className: 'border border-blue-lahuerta bg-blue-lahuerta text-white hover:shadow-md hover:brightness-110',
    glow: 'rgb(255 255 255 / 0.28)',
  },
};

const DISABLED_CLASS = 'border border-border-subtle bg-surface-low text-on-surface-muted cursor-not-allowed opacity-70';

/**
 * SpotlightButton — botón con el efecto de luz que sigue al cursor (mismo que AccessCard).
 *
 * Props:
 *   variant   — 'outline' (default) | 'cancel' | 'primary'
 *   onClick, disabled, type, aria-*
 *   className — clases extra (tamaño / ancho)
 *   children  — contenido del botón
 */
export default function SpotlightButton({ variant = 'outline', className = '', disabled = false, type = 'button', children, ...rest }) {
  const buttonRef = useRef(null);
  const { className: variantClass, glow } = VARIANTS[variant];

  useSpotlight(buttonRef);

  return (
    <button
      ref={buttonRef}
      type={type}
      disabled={disabled}
      className={`group relative inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-lg font-semibold transition-[border-color,box-shadow,color,filter] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${disabled ? DISABLED_CLASS : variantClass} ${className}`}
      {...rest}
    >
      {!disabled && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{ background: `radial-gradient(90px circle at var(--mx, 50%) var(--my, 50%), ${glow}, transparent 70%)` }}
        />
      )}
      <span className="relative inline-flex items-center gap-1.5">{children}</span>
    </button>
  );
}
