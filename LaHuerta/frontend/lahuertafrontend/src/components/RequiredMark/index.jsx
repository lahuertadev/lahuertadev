import React from 'react';

/**
 * RequiredMark — asterisco rojo que marca un campo obligatorio. Va dentro del label, después del texto:
 *   <label className={labelCls}>CUIT<RequiredMark /></label>
 * Si el campo es obligatorio solo en un caso (ej. la lista de precios con el interruptor en Sí),
 * se muestra solo cuando el campo se pide.
 * Es solo visual (aria-hidden): el campo tiene que llevar aria-required="true" para los lectores de pantalla.
 */
const RequiredMark = () => (
  <span className="text-required" aria-hidden="true"> *</span>
);

export default RequiredMark;
