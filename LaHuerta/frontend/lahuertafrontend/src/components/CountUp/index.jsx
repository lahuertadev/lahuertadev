import React from 'react';
import useCountUp from '../../hooks/useCountUp';
import { formatCurrency } from '../../utils/currency';

/**
 * CountUp — muestra un importe animando desde el valor anterior hasta el nuevo.
 *
 * Props:
 *   value     — número a mostrar
 *   format    — función de formato (default formatCurrency)
 *   duration  — duración de la animación en ms (default 600)
 *   className — clases del span
 */
export default function CountUp({ value, format = formatCurrency, duration = 600, className = '' }) {
  const displayed = useCountUp(value, duration);

  // tabular-nums: todos los dígitos con el mismo ancho, así el número no "baila" mientras anima.
  return <span className={`tabular-nums ${className}`}>{format(displayed)}</span>;
}
